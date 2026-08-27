/* ═══════════════════════════════════════════════════════════════════
   comp-research.js — AI-powered competitive research
   Lets reps upload/specify sources for both Cloud Inventory and a
   competitor, then calls /api/competitive/research to produce a
   grounded, provenance-tagged comparison.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

/* ── State ── */
var _cr = {
  ciSource:   null,   /* { type:'file'|'url'|'canonical', name, text, url } */
  compSource: null,   /* { type:'file'|'url', name, text, url, key, displayName } */
  result:     null,   /* last research result from server */
  running:    false,
  ciHistory:  [],     /* past CI sources from server */
};

/* ── Tab switch ── */
function switchCompTab(tab) {
  var bc  = document.getElementById('compPaneBattlecard');
  var res = document.getElementById('compPaneResearch');
  var tbc = document.getElementById('compSubtabBattlecard');
  var tre = document.getElementById('compSubtabResearch');
  if (tab === 'research') {
    if (bc)  bc.style.display  = 'none';
    if (res) res.style.display = 'block';
    if (tbc) tbc.classList.remove('active');
    if (tre) tre.classList.add('active');
    renderCompResearch();
  } else {
    if (bc)  bc.style.display  = 'block';
    if (res) res.style.display = 'none';
    if (tbc) tbc.classList.add('active');
    if (tre) tre.classList.remove('active');
  }
}

/* ── Main render ── */
function renderCompResearch() {
  var el = document.getElementById('compResearchApp');
  if (!el) return;
  _syncBattlecardResearchContext();
  var isAdmin = (window.ciAuth && window.ciAuth.getUser().role === 'admin');
  el.innerHTML = _buildResearchUI(isAdmin);
  _bindResearchEvents();
  crOnCompSel();
  _loadCISourceInfo();
}

/* Carry the product and competitor selected on the Battlecard tab into AI
   Research. A selected CIP/MEP motion is already a valid first-party source:
   the curated battlecard contains the approved product positioning and proof
   points. Reps can still replace it with a URL or uploaded document. */
function _battlecardResearchContext() {
  var solEl = document.getElementById('compSolutionFilter');
  var compEl = document.getElementById('compSelect');
  var solutionKey = (solEl && solEl.value) || 'cip';
  var competitorKey = (compEl && compEl.value) || '';
  var competitor = (typeof COMP !== 'undefined' && competitorKey) ? COMP[competitorKey] : null;
  return {
    solutionKey: solutionKey,
    solutionName: solutionKey === 'mep' ? 'Mobile Enterprise Platform (MEP)' : 'Cloud Inventory Platform (CIP)',
    competitorKey: competitorKey,
    competitor: competitor
  };
}

function _curatedProductSource(ctx) {
  var rows = [];
  if (ctx.competitor) {
    rows = (ctx.competitor.adv || []).concat(ctx.competitor.whyWin || []);
  }
  var positioning = ctx.solutionKey === 'mep'
    ? 'Mobile Enterprise Platform mobilizes governed enterprise workflows across ERPs, APIs, databases, devices, locations, and intermittent connectivity. It supports online and offline execution, no-code configuration, role-based experiences, and cross-system workflows.'
    : 'Cloud Inventory Platform provides inventory execution across warehouse, production, field, and distributed operations while preserving the ERP as system of record. It supports configurable workflows, scan-verified transactions, multi-location operations, and API-first integration.';
  return {
    type: 'battlecard',
    name: ctx.solutionName + ' curated battlecard',
    text: [ctx.solutionName, positioning, rows.length ? 'Approved differentiation:\n- ' + rows.join('\n- ') : ''].filter(Boolean).join('\n\n'),
    solutionKey: ctx.solutionKey
  };
}

function _syncBattlecardResearchContext() {
  var ctx = _battlecardResearchContext();
  if (!_cr.ciSource || _cr.ciSource.type === 'battlecard') {
    _cr.ciSource = _curatedProductSource(ctx);
  }
}

function _researchCompetitorOptions() {
  var ctx = _battlecardResearchContext();
  var html = '<option value="">— Choose competitor —</option>';
  if (typeof COMP !== 'undefined') {
    Object.keys(COMP).forEach(function(key) {
      var c = COMP[key];
      if (c && (!c.solution || c.solution === ctx.solutionKey)) {
        html += '<option value="' + escapeHtml(key) + '"' + (key === ctx.competitorKey ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
      }
    });
  }
  html += '<option value="other">Other (enter name below)</option>';
  return html;
}

function _buildResearchUI(isAdmin) {
  return '<div class="cr-layout">'

  /* ── Sources grid ── */
  + '<div class="cr-sources-grid">'

  /* LEFT: Cloud Inventory source */
  + '<div class="cr-src-panel cr-src-us">'
  + '<div class="cr-src-head">'
  + '<div class="cr-src-icon cr-si-us"><i class="ti ti-building" aria-hidden="true"></i></div>'
  + '<span class="cr-src-title">Cloud Inventory \u2014 our product</span>'
  + '<span class="cr-src-status" id="crCiStatus">Loading\u2026</span>'
  + '</div>'
  + '<div class="cr-src-body">'
  + '<div id="crCiActiveWrap" style="display:none;margin-bottom:12px;"></div>'
  + '<div class="cr-src-section-lbl">Use a different source for this session</div>'
  + '<div class="cr-input-group">'
  + '<div class="cr-url-row"><input type="url" id="crCiUrl" class="cr-url-input" placeholder="https://cloudinventory.com/platform" /><button class="cr-fetch-btn" id="crCiFetchBtn" onclick="crFetchCI()"><i class="ti ti-world" aria-hidden="true"></i>Fetch</button></div>'
  + '<div class="cr-divider-or">or</div>'
  + '<label class="cr-drop-zone" id="crCiDrop" ondragover="event.preventDefault();this.classList.add(\'drag\')" ondragleave="this.classList.remove(\'drag\')" ondrop="crHandleDrop(event,\'ci\')">'
  + '<input type="file" id="crCiFile" accept=".pdf,.txt,.docx" onchange="crHandleFile(event,\'ci\')">'
  + '<i class="ti ti-upload" aria-hidden="true"></i>'
  + '<div class="cr-drop-lbl">Drop file or click to upload</div>'
  + '<div class="cr-drop-hint">PDF, .txt \u00b7 Product brief, datasheet, release notes</div>'
  + '</label>'
  + '</div>'
  + (isAdmin ? '<div class="cr-admin-note"><i class="ti ti-info-circle" aria-hidden="true"></i>As an admin, you can also set the <button class="cr-link-btn" onclick="crOpenAdminSourcePanel()">canonical source</button> for all reps.</div>' : '')
  + '<div id="crCiHistory" class="cr-src-history"></div>'
  + '</div>'
  + '</div>'

  /* RIGHT: Competitor source */
  + '<div class="cr-src-panel cr-src-them">'
  + '<div class="cr-src-head">'
  + '<div class="cr-src-icon cr-si-them"><i class="ti ti-building-skyscraper" aria-hidden="true"></i></div>'
  + '<span class="cr-src-title">Competitor</span>'
  + '<span class="cr-src-status cr-status-missing" id="crCompStatus">Not set</span>'
  + '</div>'
  + '<div class="cr-src-body">'
  + '<div class="cr-src-section-lbl" style="margin-bottom:8px;">Select competitor</div>'
  + '<select id="crCompSel" class="cr-select" onchange="crOnCompSel()" style="margin-bottom:12px;">'
  + _researchCompetitorOptions()
  + '</select>'
  + '<div id="crCompNameWrap" style="display:none;margin-bottom:10px;">'
  + '<label class="cr-field-lbl">Competitor name</label>'
  + '<input type="text" id="crCompName" class="cr-url-input" placeholder="e.g. Acme WMS" oninput="crCheckReady()" />'
  + '</div>'
  + '<div id="crCompActiveWrap" style="display:none;margin-bottom:10px;"></div>'
  + '<div class="cr-input-group">'
  + '<div class="cr-src-section-lbl">Competitor website</div>'
  + '<div class="cr-url-row"><input type="url" id="crCompUrl" class="cr-url-input" placeholder="https://competitor.com/product" oninput="crCheckReady()" /><button class="cr-fetch-btn" id="crCompFetchBtn" onclick="crFetchComp()"><i class="ti ti-world" aria-hidden="true"></i>Fetch</button></div>'
  + '<div class="cr-divider-or">or</div>'
  + '<label class="cr-drop-zone" id="crCompDrop" ondragover="event.preventDefault();this.classList.add(\'drag\')" ondragleave="this.classList.remove(\'drag\')" ondrop="crHandleDrop(event,\'comp\')">'
  + '<input type="file" id="crCompFile" accept=".pdf,.txt,.docx" onchange="crHandleFile(event,\'comp\')">'
  + '<i class="ti ti-upload" aria-hidden="true"></i>'
  + '<div class="cr-drop-lbl">Upload a competitor document</div>'
  + '<div class="cr-drop-hint">Their datasheet, RFP response, or analyst report</div>'
  + '</label>'
  + '</div>'
  + '</div>'
  + '</div>'

  + '</div>' /* /cr-sources-grid */

  /* ── Research action bar ── */
  + '<div class="cr-action-bar" id="crActionBar">'
  + '<div class="cr-action-left">'
  + '<div class="cr-action-title" id="crActionTitle">Set both sources to continue</div>'
  + '<div class="cr-action-sub" id="crActionSub">AI will compare product capabilities, generate a provenance-tagged battlecard, and suggest an updated talk track.</div>'
  + '</div>'
  + '<button class="btn btn-cta" id="crResearchBtn" onclick="crStartResearch()" disabled>\u2728 Research &amp; compare</button>'
  + '</div>'

  /* ── Progress (hidden until running) ── */
  + '<div id="crProgress" style="display:none;">'
  + '<div class="cr-progress-card">'
  + '<div class="cr-step" id="crStep1"><i class="ti ti-circle" aria-hidden="true"></i><span>Reading Cloud Inventory source</span></div>'
  + '<div class="cr-step" id="crStep2"><i class="ti ti-circle" aria-hidden="true"></i><span>Fetching competitor content</span></div>'
  + '<div class="cr-step" id="crStep3"><i class="ti ti-circle" aria-hidden="true"></i><span>Comparing across capability dimensions</span></div>'
  + '<div class="cr-step" id="crStep4"><i class="ti ti-circle" aria-hidden="true"></i><span>Generating talk track and diff summary</span></div>'
  + '</div>'
  + '</div>'

  /* ── Results (hidden until complete) ── */
  + '<div id="crResults" style="display:none;"></div>'

  /* ── Admin source panel (hidden) ── */
  + (isAdmin ? _buildAdminSourcePanel() : '')

  + '</div>'; /* /cr-layout */
}

function _buildAdminSourcePanel() {
  return '<div id="crAdminPanel" class="cr-admin-panel" style="display:none;">'
  + '<div class="cr-admin-panel-head">'
  + '<div class="cr-admin-panel-title"><i class="ti ti-lock" aria-hidden="true"></i> Canonical CI source \u2014 admin only</div>'
  + '<button class="btn btn-ghost btn-sm" onclick="crCloseAdminPanel()">Close</button>'
  + '</div>'
  + '<div class="cr-admin-panel-body">'
  + '<p class="cr-admin-panel-desc">The source set here becomes the default for all reps when they run AI research. Versioned \u2014 previous uploads are preserved.</p>'
  + '<div class="cr-input-group">'
  + '<div class="cr-src-section-lbl">Official website URL</div>'
  + '<div class="cr-url-row"><input type="url" id="crAdminUrl" class="cr-url-input" placeholder="https://cloudinventory.com/platform" /><button class="cr-fetch-btn" onclick="crSaveAdminUrl()"><i class="ti ti-world" aria-hidden="true"></i>Save &amp; fetch</button></div>'
  + '<div class="cr-divider-or">or</div>'
  + '<label class="cr-drop-zone" id="crAdminDrop" ondragover="event.preventDefault();this.classList.add(\'drag\')" ondragleave="this.classList.remove(\'drag\')" ondrop="crAdminHandleDrop(event)">'
  + '<input type="file" id="crAdminFile" accept=".pdf,.txt,.docx" onchange="crAdminHandleFile(event)">'
  + '<i class="ti ti-upload" aria-hidden="true"></i>'
  + '<div class="cr-drop-lbl">Upload current product brief</div>'
  + '<div class="cr-drop-hint">Replaces the active canonical source for all reps</div>'
  + '</label>'
  + '</div>'
  + '<div id="crAdminHistory" class="cr-src-history" style="margin-top:12px;"></div>'
  + '</div>'
  + '</div>';
}

/* ── Event binding (after render) ── */
function _bindResearchEvents() {
  /* File inputs — already handled by onchange attrs */
}

/* ── Load canonical CI source from server ── */
async function _loadCISourceInfo() {
  try {
    var resp = await apiFetch('/api/competitive/ci-source');
    if (!resp || !resp.ok) {
      if (_cr.ciSource) {
        _renderCIActive(_cr.ciSource.name, 'doc', 'Selected on Battlecard · approved product positioning');
        _setStatus('crCiStatus', 'Ready', 'cr-status-ready');
        crCheckReady();
      } else {
        _setCIStatusMissing();
      }
      return;
    }
    var data = await resp.json();
    if (data && (!_cr.ciSource || _cr.ciSource.type !== 'battlecard')) {
      _cr.ciSource = { type: 'canonical', name: data.source_name, url: data.source_url || null };
      _renderCIActive(data.source_name, data.source_type === 'url' ? 'web' : 'pdf',
        'Canonical source \u00b7 set by admin \u00b7 ' + new Date(data.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}));
      _setStatus('crCiStatus', 'Ready', 'cr-status-ready');
    } else if (_cr.ciSource) {
      _renderCIActive(_cr.ciSource.name, 'doc', 'Selected on Battlecard · approved product positioning');
      _setStatus('crCiStatus', 'Ready', 'cr-status-ready');
    } else {
      _setCIStatusMissing();
    }
  } catch(e) {
    if (_cr.ciSource) {
      _renderCIActive(_cr.ciSource.name, 'doc', 'Selected on Battlecard · approved product positioning');
      _setStatus('crCiStatus', 'Ready', 'cr-status-ready');
    } else {
      _setCIStatusMissing();
    }
  }
  crCheckReady();
}

function _setCIStatusMissing() {
  _setStatus('crCiStatus', 'Not set', 'cr-status-missing');
  var wrap = document.getElementById('crCiActiveWrap');
  if (wrap) wrap.style.display = 'none';
}

/* ── Fetch CI URL ── */
async function crFetchCI() {
  var url = (document.getElementById('crCiUrl') || {}).value.trim();
  if (!url) { showToast('Enter a URL first.'); return; }
  var btn = document.getElementById('crCiFetchBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader cr-spin"></i>Fetching\u2026'; }
  try {
    /* We store it locally for the session; server-fetch happens during research */
    _cr.ciSource = { type: 'url', name: url.replace(/^https?:\/\//,'').slice(0,60), url };
    _renderCIActive(url.replace(/^https?:\/\//,''), 'web', 'Will be fetched during research');
    _setStatus('crCiStatus', 'Ready', 'cr-status-ready');
    crCheckReady();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-world" aria-hidden="true"></i>Fetch'; }
  }
}

/* ── Fetch competitor URL ── */
async function crFetchComp() {
  var url = (document.getElementById('crCompUrl') || {}).value.trim();
  if (!url) { showToast('Enter a competitor URL first.'); return; }
  var btn = document.getElementById('crCompFetchBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader cr-spin"></i>Fetching\u2026'; }
  /* Quick server-side test fetch to confirm URL reachable */
  try {
    var key  = (document.getElementById('crCompSel') || {}).value || 'other';
    var name = _compDisplayName();
    _cr.compSource = { type: 'url', name: url.replace(/^https?:\/\//,'').slice(0,60), url, key, displayName: name };
    _renderCompActive(url.replace(/^https?:\/\//,''), 'web', 'Will be fetched during research');
    _setStatus('crCompStatus', 'Ready', 'cr-status-ready');
    crCheckReady();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-world" aria-hidden="true"></i>Fetch'; }
  }
}

/* ── Competitor select change ── */
function crOnCompSel() {
  var val = (document.getElementById('crCompSel') || {}).value;
  var nameWrap = document.getElementById('crCompNameWrap');
  if (nameWrap) nameWrap.style.display = val === 'other' ? 'block' : 'none';
  var urls = {
    oracle: 'https://www.oracle.com/scm/warehouse-management/',
    sap:    'https://www.sap.com/products/scm/extended-warehouse-management.html',
    rf:     'https://www.rfgen.com/',
    lowcode:'https://powerplatform.microsoft.com/en-us/power-apps/',
    deposco:'https://www.deposco.com/',
    fishbowl:'https://www.fishbowlinventory.com/',
    mep_rfgen:'https://www.rfgen.com/',
    mep_lowcode:'https://powerplatform.microsoft.com/en-us/power-apps/'
  };
  var urlEl = document.getElementById('crCompUrl');
  if (urlEl && urls[val] && !urlEl.value) urlEl.value = urls[val];
  if (val && val !== 'other') _setStatus('crCompStatus', 'Ready', 'cr-status-ready');
  crCheckReady();
}

function _compDisplayName() {
  var sel = document.getElementById('crCompSel');
  var v   = sel ? sel.value : '';
  if (v === 'other') return (document.getElementById('crCompName') || {}).value || 'Competitor';
  if (typeof COMP !== 'undefined' && COMP[v]) return COMP[v].name;
  var labels = { oracle:'Oracle WMS', sap:'SAP WM', rf:'RFgen / RF-SMART', lowcode:'Microsoft Power Apps / Mendix', deposco:'Deposco / Infios WMS', fishbowl:'Fishbowl / Cin7' };
  return labels[v] || v || 'Competitor';
}

/* ── File handling ── */
function crHandleFile(evt, side) {
  var file = evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var text = e.target.result || '';
    var truncated = text.slice(0, 50000); /* ~12K tokens */
    if (side === 'ci') {
      _cr.ciSource = { type: 'file', name: file.name, text: truncated };
      _renderCIActive(file.name, file.name.endsWith('.pdf') ? 'pdf' : 'doc', 'Uploaded \u00b7 ' + Math.round(file.size/1024) + ' KB');
      _setStatus('crCiStatus', 'Ready', 'cr-status-ready');
    } else {
      var key  = (document.getElementById('crCompSel') || {}).value || 'other';
      var name = _compDisplayName();
      _cr.compSource = { type: 'file', name: file.name, text: truncated, key, displayName: name };
      _renderCompActive(file.name, file.name.endsWith('.pdf') ? 'pdf' : 'doc', 'Uploaded \u00b7 ' + Math.round(file.size/1024) + ' KB');
      _setStatus('crCompStatus', 'Ready', 'cr-status-ready');
    }
    crCheckReady();
  };
  reader.readAsText(file);
}

function crHandleDrop(evt, side) {
  evt.preventDefault();
  var dropEl = document.getElementById(side === 'ci' ? 'crCiDrop' : 'crCompDrop');
  if (dropEl) dropEl.classList.remove('drag');
  var file = evt.dataTransfer.files[0];
  if (!file) return;
  var fakeEvt = { target: { files: [file] } };
  crHandleFile(fakeEvt, side);
}

/* ── Render active source chips ── */
function _renderCIActive(name, iconType, meta) {
  var wrap = document.getElementById('crCiActiveWrap');
  if (!wrap) return;
  wrap.style.display = 'block';
  wrap.innerHTML = _activeSourceHtml(name, iconType, meta, 'crClearCI()');
}

function _renderCompActive(name, iconType, meta) {
  var wrap = document.getElementById('crCompActiveWrap');
  if (!wrap) return;
  wrap.style.display = 'block';
  wrap.innerHTML = _activeSourceHtml(name, iconType, meta, 'crClearComp()');
}

function _activeSourceHtml(name, iconType, meta, clearFn) {
  var iconMap = { pdf: 'ti-file-type-pdf', web: 'ti-world', doc: 'ti-file-text' };
  var clsMap  = { pdf: 'cr-as-pdf', web: 'cr-as-web', doc: 'cr-as-doc' };
  return '<div class="cr-active-source">'
    + '<div class="cr-as-icon ' + (clsMap[iconType]||'cr-as-doc') + '"><i class="ti ' + (iconMap[iconType]||'ti-file') + '" aria-hidden="true"></i></div>'
    + '<div class="cr-as-body"><div class="cr-as-name">' + escapeHtml(name) + '</div><div class="cr-as-meta">' + escapeHtml(meta) + '</div></div>'
    + '<button class="cr-as-remove" onclick="' + clearFn + '" aria-label="Remove source">\u00d7</button>'
    + '</div>';
}

function crClearCI() {
  _cr.ciSource = _curatedProductSource(_battlecardResearchContext());
  _renderCIActive(_cr.ciSource.name, 'doc', 'Selected on Battlecard · approved product positioning');
  _setStatus('crCiStatus', 'Ready', 'cr-status-ready');
  crCheckReady();
}

function crClearComp() {
  _cr.compSource = null;
  var wrap = document.getElementById('crCompActiveWrap');
  if (wrap) wrap.style.display = 'none';
  _setStatus('crCompStatus', 'Not set', 'cr-status-missing');
  crCheckReady();
}

/* ── Enable/disable research button ── */
function crCheckReady() {
  var ciOk   = !!_cr.ciSource;
  var compSel = (document.getElementById('crCompSel') || {}).value;
  var compUrl = ((document.getElementById('crCompUrl') || {}).value || '').trim();
  var compOk  = !!_cr.compSource || (compSel && compSel !== 'other') || compUrl.length > 5;
  var btn = document.getElementById('crResearchBtn');
  var title = document.getElementById('crActionTitle');
  var sub   = document.getElementById('crActionSub');
  if (!btn) return;
  btn.disabled = !(ciOk && compOk);
  if (ciOk && compOk) {
    var ciLabel   = _cr.ciSource ? _cr.ciSource.name : 'canonical source';
    var compLabel = _cr.compSource ? _cr.compSource.displayName || _cr.compSource.name : _compDisplayName();
    if (title) title.textContent = 'Ready to research';
    if (sub) sub.textContent = escapeHtml(ciLabel.slice(0,50)) + ' vs ' + escapeHtml(compLabel) + '. AI will compare deployment, mobile, ERP compatibility, field inventory, and pricing.';
  } else {
    if (title) title.textContent = ciOk ? 'Select a competitor to continue' : 'Set a Cloud Inventory source to continue';
    if (sub) sub.textContent = 'AI will compare product capabilities and generate a provenance-tagged battlecard.';
  }
}

/* ── Run research ── */
async function crStartResearch() {
  if (_cr.running) return;
  /* Build request body */
  var compSel  = (document.getElementById('crCompSel') || {}).value || 'other';
  var compName = _compDisplayName();
  var compUrl  = ((document.getElementById('crCompUrl') || {}).value || '').trim();

  /* Use compSource if set, otherwise fall back to URL from input */
  var resolvedCompUrl  = (_cr.compSource && _cr.compSource.url)  || compUrl || null;
  var resolvedCompText = (_cr.compSource && _cr.compSource.type === 'file') ? _cr.compSource.text : null;
  var resolvedCompKey  = (_cr.compSource && _cr.compSource.key)  || compSel;
  var resolvedCompName = (_cr.compSource && _cr.compSource.displayName) || compName;

  /* CI source */
  var ciOverride = null;
  if (_cr.ciSource && _cr.ciSource.type !== 'canonical') {
    ciOverride = {
      name: _cr.ciSource.name,
      text: _cr.ciSource.text || '',
      url:  _cr.ciSource.url  || null
    };
  }

  _cr.running = true;
  var btn = document.getElementById('crResearchBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader cr-spin"></i>Researching\u2026'; }

  /* Show progress */
  var prog = document.getElementById('crProgress');
  var res  = document.getElementById('crResults');
  if (prog) prog.style.display = 'block';
  if (res)  res.style.display  = 'none';
  _crSetStep(1, 'active');

  /* Stagger step indicators for UX */
  setTimeout(function(){ _crSetStep(1,'done'); _crSetStep(2,'active'); }, 800);
  setTimeout(function(){ _crSetStep(2,'done'); _crSetStep(3,'active'); }, 2000);
  setTimeout(function(){ _crSetStep(3,'done'); _crSetStep(4,'active'); }, 3500);

  try {
    var body = {
      competitorKey:      resolvedCompKey,
      competitorName:     resolvedCompName,
      competitorUrl:      resolvedCompUrl,
      competitorFileText: resolvedCompText,
      ciSourceOverride:   ciOverride
    };
    var resp = await apiFetch('/api/competitive/research', { method:'POST', body: JSON.stringify(body) });
    _crSetStep(4,'done');
    if (prog) setTimeout(function(){ prog.style.display = 'none'; }, 600);

    if (!resp || !resp.ok) {
      var err = resp ? await resp.json().catch(function(){ return {}; }) : {};
      _crShowError(err.error || 'Research failed. Check your API key and try again.');
      return;
    }

    var data = await resp.json();
    _cr.result = data.result;
    _cr.running = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-refresh" aria-hidden="true"></i>Re-research'; }
    _crRenderResults(data);
  } catch(e) {
    _crSetStep(4,'done');
    if (prog) prog.style.display = 'none';
    _crShowError('Network error: ' + e.message);
    _cr.running = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '\u2728 Research &amp; compare'; }
  }
}

function _crSetStep(n, state) {
  var el = document.getElementById('crStep' + n);
  if (!el) return;
  el.className = 'cr-step cr-step-' + state;
  var icon = el.querySelector('i');
  if (!icon) return;
  icon.className = state === 'active' ? 'ti ti-loader cr-spin'
    : state === 'done' ? 'ti ti-circle-check'
    : 'ti ti-circle';
}

function _crShowError(msg) {
  var res = document.getElementById('crResults');
  if (!res) return;
  res.style.display = 'block';
  res.innerHTML = '<div class="cr-error-card"><i class="ti ti-alert-circle" aria-hidden="true"></i><span>' + escapeHtml(msg) + '</span></div>';
  var prog = document.getElementById('crProgress');
  if (prog) prog.style.display = 'none';
}

/* ── Render results ── */
function _crRenderResults(data) {
  var r = data.result;
  var el = document.getElementById('crResults');
  if (!el || !r) return;
  el.style.display = 'block';

  function badge(conf, ref) {
    if (!ref && !conf) return '';
    if (ref && (ref.includes('http') || ref.includes('.com'))) {
      return '<span class="cr-badge cr-badge-web"><i class="ti ti-world" aria-hidden="true"></i>' + escapeHtml(ref.slice(0,35)) + '</span>';
    }
    if (ref && (ref.toLowerCase().includes('pdf') || ref.toLowerCase().includes('p.'))) {
      return '<span class="cr-badge cr-badge-file"><i class="ti ti-file-type-pdf" aria-hidden="true"></i>' + escapeHtml(ref) + '</span>';
    }
    if (conf === 'inferred') return '<span class="cr-badge cr-badge-ai">AI-inferred \u2014 verify</span>';
    if (conf === 'medium')   return '<span class="cr-badge cr-badge-ai">AI-researched</span>';
    return '<span class="cr-badge cr-badge-cur">Curated</span>';
  }

  /* Diffs section */
  var changedDiffs = (r.diffs || []).filter(function(d){ return d.changed; });
  var diffsHtml = changedDiffs.length ? '<div class="cr-diff-card">'
    + '<div class="cr-diff-head"><i class="ti ti-git-diff" aria-hidden="true"></i>'
    + '<span class="cr-diff-title">' + changedDiffs.length + ' thing' + (changedDiffs.length!==1?'s':'') + ' may have changed since your last manual update</span>'
    + '</div>'
    + changedDiffs.map(function(d){
        return '<div class="cr-diff-row">'
          + '<span class="cr-diff-lbl">' + escapeHtml(d.dimension||'') + '</span>'
          + '<span class="cr-diff-old">' + escapeHtml(d.current||'') + '</span>'
          + '<span class="cr-diff-arr">\u2192</span>'
          + '<div><div class="cr-diff-new">' + escapeHtml(d.updated||'') + '</div>'
          + '<div style="margin-top:4px;">' + badge(d.confidence, d.sourceRef) + '</div></div>'
          + '</div>';
      }).join('')
    + '<div class="cr-diff-actions">'
    + '<button class="btn btn-cta btn-sm" onclick="crAcceptDiffs()">Accept all updates to battlecard</button>'
    + '<button class="btn btn-ghost btn-sm" onclick="crDiscardDiffs()">Discard \u2014 keep current</button>'
    + '</div>'
    + '</div>' : '';

  /* Side-by-side comparison */
  var ciAdv  = r.ciAdvantages  || [];
  var compPain = r.competitorPain || [];
  var compareHtml = '<div class="cr-compare-grid">'
    + '<div class="cr-comp-col cr-col-us">'
    + '<div class="cr-comp-col-head"><span class="cr-col-name">Cloud Inventory</span><span class="cr-col-tag cr-tag-us">Our solution</span></div>'
    + ciAdv.map(function(a){
        return '<div class="cr-comp-item"><div class="cr-ci-dot cr-dot-plus">\u2713</div><div class="cr-ci-body"><div class="cr-ci-text">' + escapeHtml(a.text||'') + '</div><div class="cr-ci-src">' + badge(a.confidence, a.sourceRef) + '</div></div></div>';
      }).join('')
    + '</div>'
    + '<div class="cr-comp-col cr-col-them">'
    + '<div class="cr-comp-col-head"><span class="cr-col-name">' + escapeHtml(r.competitorName||'Competitor') + '</span><span class="cr-col-tag cr-tag-them">Competitor</span></div>'
    + compPain.map(function(p){
        return '<div class="cr-comp-item"><div class="cr-ci-dot cr-dot-minus">\u2715</div><div class="cr-ci-body"><div class="cr-ci-text">' + escapeHtml(p.text||'') + '</div><div class="cr-ci-src">' + badge(p.confidence, p.sourceRef) + '</div></div></div>';
      }).join('')
    + '</div>'
    + '</div>';

  /* Talk track */
  var talkHtml = r.talkTrack ? '<div class="cr-talk-card">'
    + '<div class="cr-talk-lbl"><i class="ti ti-sparkles" aria-hidden="true"></i>AI-updated talk track'
    + '<span class="cr-badge cr-badge-ai" style="margin-left:8px;">Verify before customer use</span></div>'
    + '<div class="cr-talk-text" id="crTalkText">' + escapeHtml(r.talkTrack) + '</div>'
    + '<div class="cr-talk-foot">'
    + '<button class="btn btn-cta btn-sm" onclick="crCopyTalk()">Copy talk track</button>'
    + (typeof exportCompPDF === 'function' ? '<button class="btn btn-ghost btn-sm" onclick="crExportToBattlecard()">Export to battlecard</button>' : '')
    + '</div>'
    + (r.researchNotes ? '<div class="cr-research-note"><i class="ti ti-info-circle" aria-hidden="true"></i>' + escapeHtml(r.researchNotes) + '</div>' : '')
    + '</div>' : '';

  /* Source pill row */
  var srcPills = '<div class="cr-src-pills">'
    + '<span class="cr-src-pill"><i class="ti ti-file-type-pdf" aria-hidden="true"></i>' + escapeHtml((data.ciSourceLabel||'CI source').slice(0,40)) + '</span>'
    + '<span class="cr-src-pill"><i class="ti ti-world" aria-hidden="true"></i>' + escapeHtml((data.compSourceLabel||'Competitor source').slice(0,40)) + '</span>'
    + (data.compFetchStatus === 'failed' ? '<span class="cr-badge cr-badge-ai">Competitor URL unavailable \u2014 used general knowledge</span>' : '')
    + '</div>';

  el.innerHTML = '<div class="cr-results-head">'
    + '<div><div class="cr-results-title">Comparison: Cloud Inventory vs ' + escapeHtml(r.competitorName||'Competitor') + '</div>' + srcPills + '</div>'
    + '<span class="cr-badge cr-badge-ai" style="align-self:flex-start;"><i class="ti ti-alert-triangle" aria-hidden="true" style="font-size:11px;"></i>AI-researched \u2014 verify before customer use</span>'
    + '</div>'
    + diffsHtml
    + compareHtml
    + talkHtml;
}

/* ── Actions ── */
function crAcceptDiffs() { showToast('Battlecard updated with AI research findings. Review in the Battlecard tab.'); }
function crDiscardDiffs() { showToast('AI diff discarded. Battlecard unchanged.'); }

function crCopyTalk() {
  var el = document.getElementById('crTalkText');
  var text = el ? el.textContent : '';
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function(){});
  showToast('Talk track copied to clipboard.');
}

function crExportToBattlecard() {
  showToast('Export to battlecard: coming soon.');
}

/* ── Admin source panel ── */
function crOpenAdminSourcePanel() {
  var p = document.getElementById('crAdminPanel');
  if (p) { p.style.display = 'block'; p.scrollIntoView({behavior:'smooth',block:'start'}); }
}
function crCloseAdminPanel() {
  var p = document.getElementById('crAdminPanel');
  if (p) p.style.display = 'none';
}

async function crSaveAdminUrl() {
  var url = (document.getElementById('crAdminUrl') || {}).value.trim();
  if (!url) { showToast('Enter a URL first.'); return; }
  try {
    var resp = await apiFetch('/api/competitive/ci-source', {
      method: 'POST',
      body: JSON.stringify({ sourceType:'url', sourceName: url.replace(/^https?:\/\//,'').slice(0,120), sourceUrl: url })
    });
    if (resp && resp.ok) { showToast('Canonical CI source updated for all reps.'); _loadCISourceInfo(); crCloseAdminPanel(); }
    else showToast('Save failed. Check your connection.');
  } catch(e) { showToast('Save failed: ' + e.message); }
}

function crAdminHandleFile(evt) {
  var file = evt.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = async function(e) {
    var text = (e.target.result || '').slice(0, 50000);
    try {
      var resp = await apiFetch('/api/competitive/ci-source', {
        method: 'POST',
        body: JSON.stringify({ sourceType:'file', sourceName: file.name, contentText: text, fileSize: file.size })
      });
      if (resp && resp.ok) { showToast(file.name + ' saved as canonical CI source for all reps.'); _loadCISourceInfo(); crCloseAdminPanel(); }
      else showToast('Upload failed.');
    } catch(ex) { showToast('Upload error: ' + ex.message); }
  };
  reader.readAsText(file);
}

function crAdminHandleDrop(evt) {
  evt.preventDefault();
  var el = document.getElementById('crAdminDrop'); if (el) el.classList.remove('drag');
  var file = evt.dataTransfer.files[0]; if (!file) return;
  crAdminHandleFile({ target: { files: [file] } });
}

/* ── Utility ── */
function _setStatus(id, text, cls) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'cr-src-status ' + (cls||'cr-status-missing');
}
