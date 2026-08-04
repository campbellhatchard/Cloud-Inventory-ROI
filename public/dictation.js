/* ═══════════════════════════════════════════════════════════════════
   dictation.js — microphone speech-to-text for text fields
   Adds a mic button to text inputs / textareas using the Web Speech API
   (SpeechRecognition). Degrades gracefully: the button only appears where
   the API exists (Chrome/Edge; partial in Safari), and does nothing
   harmful elsewhere. Requires HTTPS + user mic permission.

   Usage: any input/textarea with the attribute data-dictate gets a mic
   button. Call SFDictation.enhanceAll() after rendering dynamic fields.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SUPPORTED = !!SR;

  let activeRec = null, activeBtn = null, activeField = null, baseText = '';

  function stopActive() {
    if (activeRec) { try { activeRec.stop(); } catch (e) {} }
    if (activeBtn) activeBtn.classList.remove('dictating');
    activeRec = null; activeBtn = null; activeField = null;
  }

  function startDictation(field, btn) {
    if (!SUPPORTED) return;
    if (activeRec) { stopActive(); return; }   // toggle off
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    baseText = field.value ? field.value + ' ' : '';
    activeRec = rec; activeBtn = btn; activeField = field;
    btn.classList.add('dictating');

    rec.onresult = (e) => {
      let interim = '', finalTxt = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTxt += t; else interim += t;
      }
      if (finalTxt) baseText += finalTxt + ' ';
      field.value = (baseText + interim).replace(/\s+/g, ' ').replace(/^\s/, '');
      /* Fire input so the app's bindings (autosave etc.) pick it up. */
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        if (typeof showToast === 'function') showToast('Microphone access was blocked. Enable it in your browser to dictate.');
      }
      stopActive();
    };
    rec.onend = () => { if (activeBtn === btn) stopActive(); };
    try { rec.start(); } catch (e) { stopActive(); }
  }

  function makeMicButton(field) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dictate-btn';
    btn.title = 'Dictate with microphone';
    btn.setAttribute('aria-label', 'Dictate with microphone');
    btn.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><rect x="6" y="2" width="4" height="7" rx="2" fill="currentColor"/><path d="M4 8a4 4 0 008 0M8 12v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
    btn.addEventListener('click', (e) => { e.preventDefault(); startDictation(field, btn); });
    return btn;
  }

  /* Wrap a field with a mic button (idempotent). */
  function enhance(field) {
    if (!SUPPORTED || !field || field.dataset.dictateReady) return;
    if (field.disabled) return;
    field.dataset.dictateReady = '1';
    /* Position a mic button inside a relative wrapper. */
    const wrap = document.createElement('span');
    wrap.className = 'dictate-wrap';
    field.parentNode.insertBefore(wrap, field);
    wrap.appendChild(field);
    wrap.appendChild(makeMicButton(field));
  }

  function enhanceAll(root) {
    if (!SUPPORTED) return;
    (root || document).querySelectorAll('input[type="text"][data-dictate], textarea[data-dictate]').forEach(enhance);
  }

  window.SFDictation = { supported: SUPPORTED, enhance, enhanceAll, stop: stopActive };
})();
