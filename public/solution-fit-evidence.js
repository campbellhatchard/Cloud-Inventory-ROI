(function (root, factory) {
  const api = factory(root || null);
  if (typeof module === 'object' && module.exports) { module.exports = api; module.exports.createForRoot = factory; }
  if (root) root.SolutionFitEvidence = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  const IMAGE_LIMIT = 5 * 1024 * 1024;
  const IMAGE_TARGET = Math.floor(4.65 * 1024 * 1024);
  const ACCEPT = '.jpg,.jpeg,.png,.pdf,.docx,.xlsx,.pptx,image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation';
  const MIME_BY_EXTENSION = Object.freeze({
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });
  const SUPPORTED_MIME = new Set(Object.values(MIME_BY_EXTENSION));
  const categories = [
    ['', 'Choose category (optional)'], ['PHOTO', 'Photo'], ['DOCUMENT', 'Document'],
    ['CUSTOMER_EVIDENCE', 'Customer evidence'], ['DEMO_EVIDENCE', 'Demo evidence'],
    ['GAP_EVIDENCE', 'Gap evidence'], ['DESIGN_REFERENCE', 'Design reference'], ['OTHER', 'Other']
  ];
  const state = { customerId: '', canWrite: false, solutionFitId: '', storageAvailable: false, attachments: [], queue: [], context: null, onChange: null };

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
  function canonicalContentType(file) {
    const reported = String(file?.type || '').toLowerCase().split(';')[0].trim();
    if (reported) return reported;
    const extension = String(file?.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    return MIME_BY_EXTENSION[extension] || '';
  }
  function fileTypeError(file) {
    const type = canonicalContentType(file);
    if (/heic|heif/.test(type) || /\.(heic|heif)$/i.test(String(file?.name || ''))) return 'HEIC/HEIF photos are not supported by this browser workflow. Choose or export the photo as JPEG or PNG.';
    return SUPPORTED_MIME.has(type) ? '' : 'This file type is not supported.';
  }
  function contextKey(type, id) { return `${type || 'GENERAL_SOLUTION_FIT'}:${id || ''}`; }
  function notify(kind, message) { if (root?.AppAlerts?.[kind]) root.AppAlerts[kind](message, { key: `sf-evidence:${kind}:${message}` }); else root?.showToast?.(message); }
  async function responseError(response, fallback) { try { const body = await response?.json(); return body?.error || fallback; } catch (_) { return fallback; } }
  function matching(type, id) { const key = contextKey(type, id); return state.attachments.filter(item => contextKey(item.contextType, item.contextId) === key); }

  async function load({ customerId, canWrite, onChange } = {}) {
    state.customerId = String(customerId || ''); state.canWrite = canWrite === true; state.onChange = typeof onChange === 'function' ? onChange : state.onChange;
    state.attachments = []; state.solutionFitId = ''; state.storageAvailable = false;
    if (!state.customerId || !root?.apiFetch) return state;
    try {
      const response = await root.apiFetch(`/api/handoffs/${encodeURIComponent(state.customerId)}/attachments`);
      if (!response?.ok) throw new Error(await responseError(response, 'Evidence could not be loaded.'));
      const payload = await response.json();
      state.attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
      state.solutionFitId = payload.solutionFitId || '';
      state.storageAvailable = payload.storage?.available === true;
    } catch (error) {
      notify('error', error.message || 'Evidence could not be loaded.');
    }
    return state;
  }

  function controls(contextType, contextId, label = 'Evidence') {
    const count = matching(contextType, contextId).length;
    const attrs = `data-evidence-type="${esc(contextType)}" data-evidence-id="${esc(contextId || '')}" data-evidence-label="${esc(label)}"`;
    return `<span class="sf-evidence-actions">${state.canWrite ? `<button type="button" class="sf-evidence-add" ${attrs}>+ Add evidence</button>` : ''}<button type="button" class="sf-evidence-count" ${attrs} ${count || state.canWrite ? '' : 'disabled'}>Evidence (${count})</button></span>`;
  }

  function formatBytes(bytes) { const n = Number(bytes || 0); if (n < 1024) return `${n} B`; if (n < 1048576) return `${Math.round(n / 1024)} KB`; return `${(n / 1048576).toFixed(1)} MB`; }
  function options(selected) { return categories.map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join(''); }

  function existingRows() {
    const rows = matching(state.context.type, state.context.id);
    if (!rows.length) return '<div class="sf-evidence-empty">No evidence has been added for this item.</div>';
    return rows.map(item => `<article class="sf-evidence-existing" data-attachment-id="${esc(item.id)}">
      <div class="sf-evidence-file-icon" aria-hidden="true">${String(item.contentType || '').startsWith('image/') ? '▧' : '▤'}</div>
      <div><strong>${esc(item.originalFilename)}</strong><span>${esc(formatBytes(item.sizeBytes))} · ${esc(item.uploadedByName || 'Unknown user')} · ${esc(item.createdAt ? new Date(item.createdAt).toLocaleString() : '')}</span><p>${esc(item.caption || 'No caption')}</p></div>
      <div class="sf-evidence-row-actions"><button type="button" class="btn btn-ghost btn-sm" data-evidence-view="${esc(item.id)}">View / download</button>${state.canWrite ? `<button type="button" class="btn btn-ghost btn-sm" data-evidence-edit="${esc(item.id)}">Edit details</button><button type="button" class="btn btn-ghost btn-sm danger" data-evidence-remove="${esc(item.id)}">Remove</button>` : ''}</div>
    </article>`).join('');
  }

  function queueRows() {
    if (!state.queue.length) return '';
    return `<section class="sf-evidence-queue"><h4>Files to upload</h4>${state.queue.map((item, index) => `<article class="sf-evidence-queued" data-queue-index="${index}">
      <div class="sf-evidence-queued-file">${item.previewUrl ? `<img src="${esc(item.previewUrl)}" alt="Preview of ${esc(item.file.name)}">` : '<span class="sf-evidence-file-icon" aria-hidden="true">▤</span>'}<div><strong>${esc(item.file.name)}</strong><span>${esc(formatBytes(item.file.size))}</span></div></div>
      <label>Caption / description<input data-evidence-caption="${index}" value="${esc(item.caption)}" placeholder="What does this evidence show?"></label>
      <label>Category<select data-evidence-category="${index}">${options(item.category)}</select></label>
      <span class="sf-evidence-state ${esc(item.state.toLowerCase())}">${esc(item.message || item.state)}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-evidence-queue-remove="${index}" ${item.state === 'Uploading' || item.state === 'Optimizing' ? 'disabled' : ''}>Remove</button>
    </article>`).join('')}</section>`;
  }

  function modalHtml() {
    const unavailable = !state.storageAvailable && state.canWrite ? '<div class="sf-evidence-unavailable" role="alert">Evidence storage is temporarily unavailable. The Solution Fit can still be completed and saved.</div>' : '';
    return `<div class="modal sf-evidence-modal"><header><div><span class="sf-step-kicker">Solution Fit evidence</span><h3>${esc(state.context.label)}</h3><p>Add photos or documents to this governed Solution Fit item. Each file is stored and audited separately.</p></div><button type="button" class="modal-close" data-evidence-close aria-label="Close">×</button></header>
      ${unavailable}
      <section class="sf-evidence-existing-list"><h4>Saved evidence</h4>${existingRows()}</section>
      ${state.canWrite && state.storageAvailable ? `<section class="sf-evidence-chooser"><div><button type="button" class="btn btn-primary" data-evidence-camera>Take photo</button><button type="button" class="btn btn-secondary" data-evidence-choose>Choose photo / file</button></div><p>JPEG and PNG images up to 5 MB after automatic optimization. PDF, DOCX, XLSX, and PPTX up to 25 MB.</p><input type="file" data-evidence-camera-input accept="image/*" capture="environment" hidden><input type="file" data-evidence-file-input accept="${ACCEPT}" multiple hidden></section>${queueRows()}` : ''}
      <footer><button type="button" class="btn btn-ghost" data-evidence-close>Close</button>${state.canWrite && state.storageAvailable ? '<button type="button" class="btn btn-primary" data-evidence-upload '+(state.queue.length ? '' : 'disabled')+'>Upload ready files</button>' : ''}</footer>
    </div>`;
  }

  function open(contextType, contextId, label) {
    state.context = { type: contextType || 'GENERAL_SOLUTION_FIT', id: contextId || '', label: label || 'Solution Fit evidence' };
    state.queue = [];
    let overlay = root.document.getElementById('solutionFitEvidenceModal');
    if (!overlay) { overlay = root.document.createElement('div'); overlay.id = 'solutionFitEvidenceModal'; overlay.className = 'modal-overlay open'; root.document.body.appendChild(overlay); }
    renderModal();
  }

  function revokePreview(item) { if (item?.previewUrl) { root?.URL?.revokeObjectURL?.(item.previewUrl); item.previewUrl = ''; } }
  function close() { root?.document?.getElementById('solutionFitEvidenceModal')?.remove(); state.queue.forEach(revokePreview); state.queue = []; }
  function renderModal() { const overlay = root.document.getElementById('solutionFitEvidenceModal'); if (!overlay) return; overlay.innerHTML = modalHtml(); wireModal(overlay); }

  function addFiles(fileList) {
    for (const file of Array.from(fileList || [])) {
      const image = canonicalContentType(file).startsWith('image/');
      state.queue.push({ file, originalFile: file, previewUrl: image ? (root?.URL?.createObjectURL?.(file) || '') : '', caption: '', category: image ? 'PHOTO' : 'DOCUMENT', state: 'Ready', message: '' });
    }
    renderModal();
  }

  function canvasBlob(canvas, type, quality) { return new Promise(resolve => canvas.toBlob(resolve, type, quality)); }
  async function optimizeImage(file, { limitBytes = IMAGE_LIMIT, targetBytes = IMAGE_TARGET, createBitmap = root?.createImageBitmap } = {}) {
    if (!file?.type?.startsWith('image/')) return { file, optimized: false, originalSize: file?.size || 0 };
    if (file.size <= limitBytes) return { file, optimized: false, originalSize: file.size };
    if (typeof createBitmap !== 'function' || !root?.document) throw new Error('This browser cannot optimize the selected photo. Choose a smaller image.');
    const bitmap = await createBitmap(file, { imageOrientation: 'from-image' });
    try {
      let width = bitmap.width, height = bitmap.height;
      const initialScale = Math.min(1, 4096 / Math.max(width, height)); width = Math.max(1, Math.round(width * initialScale)); height = Math.max(1, Math.round(height * initialScale));
      let blob = null;
      for (let dimensionPass = 0; dimensionPass < 6; dimensionPass += 1) {
        const canvas = root.document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', { alpha: false }); context.drawImage(bitmap, 0, 0, width, height);
        for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) { blob = await canvasBlob(canvas, 'image/jpeg', quality); if (blob && blob.size <= targetBytes) break; }
        if (blob && blob.size <= targetBytes) break;
        width = Math.max(1, Math.round(width * 0.82)); height = Math.max(1, Math.round(height * 0.82));
      }
      if (!blob || blob.size > limitBytes) throw new Error('The photo could not be optimized below 5 MB. Choose a smaller image.');
      const name = file.name.replace(/\.[^.]+$/, '') + '-optimized.jpg';
      return { file: new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }), optimized: true, originalSize: file.size, width, height };
    } finally { bitmap.close?.(); }
  }

  async function uploadOne(item) {
    const unsupported = fileTypeError(item.file);
    if (unsupported) throw new Error(unsupported);
    item.state = 'Optimizing'; item.message = canonicalContentType(item.file).startsWith('image/') && item.file.size > IMAGE_LIMIT ? 'Optimizing photo…' : 'Preparing…'; renderModal();
    const optimized = await optimizeImage(item.file);
    if (optimized.file !== item.file) { revokePreview(item); item.previewUrl = root?.URL?.createObjectURL?.(optimized.file) || ''; }
    item.file = optimized.file;
    const contentType = canonicalContentType(item.file);
    if (!contentType) throw new Error('This file type is not supported.');
    item.state = 'Uploading'; item.message = 'Uploading…'; renderModal();
    const initiate = await root.apiFetch(`/api/handoffs/${encodeURIComponent(state.customerId)}/attachments/initiate`, { method: 'POST', body: JSON.stringify({ contextType: state.context.type, contextId: state.context.id || null, originalFilename: item.file.name, contentType, sizeBytes: item.file.size, caption: item.caption, evidenceCategory: item.category }) });
    if (!initiate?.ok) throw new Error(await responseError(initiate, 'Evidence could not be uploaded. Please try again.'));
    const session = await initiate.json();
    const put = await root.fetch(session.uploadUrl, { method: 'PUT', headers: session.requiredHeaders || { 'Content-Type': contentType }, body: item.file });
    if (!put.ok) throw new Error('The secure file upload did not complete. Please retry.');
    const complete = await root.apiFetch(`/api/handoffs/${encodeURIComponent(state.customerId)}/attachments/${encodeURIComponent(session.attachmentId)}/complete`, { method: 'POST', body: '{}' });
    if (!complete?.ok) throw new Error(await responseError(complete, 'Evidence could not be verified. Please retry.'));
    item.state = 'Complete'; item.message = optimized.optimized ? `Complete · optimized from ${formatBytes(optimized.originalSize)} to ${formatBytes(item.file.size)}` : 'Complete';
  }

  async function uploadQueue(button) {
    button.disabled = true;
    for (const item of state.queue) {
      if (item.state === 'Complete') continue;
      try { await uploadOne(item); }
      catch (error) { item.state = 'Failed'; item.message = error.message || 'Upload failed. Retry.'; renderModal(); }
    }
    await load({ customerId: state.customerId, canWrite: state.canWrite, onChange: state.onChange });
    renderModal(); state.onChange?.();
    const failures = state.queue.filter(item => item.state === 'Failed').length;
    if (failures) notify('error', `${failures} evidence file${failures === 1 ? '' : 's'} could not be uploaded. Review each file and retry.`); else notify('success', 'Evidence uploaded.');
  }

  async function openAttachment(id) {
    const target = root.open('about:blank', '_blank');
    if (target) { try { target.opener = null; target.document.title = 'Opening evidence…'; } catch (_) {} }
    const response = await root.apiFetch(`/api/handoffs/${encodeURIComponent(state.customerId)}/attachments/${encodeURIComponent(id)}/download`);
    if (!response?.ok) { target?.close?.(); return notify('error', await responseError(response, 'Evidence could not be opened.')); }
    const payload = await response.json();
    if (target) target.location.replace(payload.url); else root.location.assign(payload.url);
  }

  async function editAttachment(id) {
    const item = state.attachments.find(row => row.id === id); if (!item) return;
    const caption = root.prompt('Caption / description', item.caption || ''); if (caption == null) return;
    const category = root.prompt('Category: PHOTO, DOCUMENT, CUSTOMER_EVIDENCE, DEMO_EVIDENCE, GAP_EVIDENCE, DESIGN_REFERENCE, OTHER (or blank)', item.evidenceCategory || ''); if (category == null) return;
    const response = await root.apiFetch(`/api/handoffs/${encodeURIComponent(state.customerId)}/attachments/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ caption, evidenceCategory: category.trim().toUpperCase() }) });
    if (!response?.ok) return notify('error', await responseError(response, 'Evidence details could not be saved.'));
    await load({ customerId: state.customerId, canWrite: state.canWrite, onChange: state.onChange }); renderModal(); state.onChange?.(); notify('success', 'Evidence details updated.');
  }

  async function removeAttachment(id) {
    const item = state.attachments.find(row => row.id === id); if (!item || !root.confirm(`Remove “${item.originalFilename}”? The audit record will be preserved.`)) return;
    const response = await root.apiFetch(`/api/handoffs/${encodeURIComponent(state.customerId)}/attachments/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response?.ok) return notify('error', await responseError(response, 'Evidence could not be removed.'));
    await load({ customerId: state.customerId, canWrite: state.canWrite, onChange: state.onChange }); renderModal(); state.onChange?.(); notify('success', 'Evidence removed.');
  }

  function wireModal(overlay) {
    overlay.querySelectorAll('[data-evidence-close]').forEach(node => node.onclick = close);
    overlay.querySelector('[data-evidence-camera]')?.addEventListener('click', () => overlay.querySelector('[data-evidence-camera-input]').click());
    overlay.querySelector('[data-evidence-choose]')?.addEventListener('click', () => overlay.querySelector('[data-evidence-file-input]').click());
    overlay.querySelector('[data-evidence-camera-input]')?.addEventListener('change', event => addFiles(event.target.files));
    overlay.querySelector('[data-evidence-file-input]')?.addEventListener('change', event => addFiles(event.target.files));
    overlay.querySelectorAll('[data-evidence-caption]').forEach(node => node.oninput = () => { state.queue[Number(node.dataset.evidenceCaption)].caption = node.value; });
    overlay.querySelectorAll('[data-evidence-category]').forEach(node => node.onchange = () => { state.queue[Number(node.dataset.evidenceCategory)].category = node.value; });
    overlay.querySelectorAll('[data-evidence-queue-remove]').forEach(node => node.onclick = () => { const index = Number(node.dataset.evidenceQueueRemove); revokePreview(state.queue[index]); state.queue.splice(index, 1); renderModal(); });
    overlay.querySelector('[data-evidence-upload]')?.addEventListener('click', event => uploadQueue(event.currentTarget));
    overlay.querySelectorAll('[data-evidence-view]').forEach(node => node.onclick = () => openAttachment(node.dataset.evidenceView));
    overlay.querySelectorAll('[data-evidence-edit]').forEach(node => node.onclick = () => editAttachment(node.dataset.evidenceEdit));
    overlay.querySelectorAll('[data-evidence-remove]').forEach(node => node.onclick = () => removeAttachment(node.dataset.evidenceRemove));
  }

  function wire(container = root?.document) {
    container?.querySelectorAll?.('.sf-evidence-add,.sf-evidence-count').forEach(node => {
      node.onclick = () => open(node.dataset.evidenceType, node.dataset.evidenceId, node.dataset.evidenceLabel);
    });
  }

  return { load, controls, wire, open, matching, optimizeImage, canonicalContentType, fileTypeError, validateState: () => ({ ...state, attachments: [...state.attachments] }), IMAGE_LIMIT, IMAGE_TARGET, ACCEPT };
});
