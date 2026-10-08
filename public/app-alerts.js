(function (root, factory) {
  const api = factory(root || null);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    module.exports.createForRoot = factory;
  }
  if (root) root.AppAlerts = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  const STORAGE_KEY = 'ci_audio_alerts';
  const state = { alerts: new Map(), lastByKey: new Map(), audioAt: 0, audioContext: null };
  const important = new Set(['warning', 'error']);

  function inferSeverity(message) {
    const text = String(message || '').toLowerCase();
    if (/failed|could not|unable|error|denied|not saved|unavailable|requires role|required:/.test(text)) return 'error';
    if (/unsaved|warning|complete or cancel|review before|draft only|not synchronized|must be entered/.test(text)) return 'warning';
    if (/saved|created|loaded|applied|copied|sent|updated|complete/.test(text)) return 'success';
    return 'info';
  }

  function semanticsFor(severity, options = {}) {
    const level = ['info', 'success', 'warning', 'error'].includes(severity) ? severity : 'info';
    return {
      severity: level,
      role: important.has(level) ? 'alert' : 'status',
      ariaLive: important.has(level) ? 'assertive' : 'polite',
      persist: options.persist == null ? important.has(level) : options.persist === true,
      audioEligible: level !== 'info'
    };
  }

  function audioEnabled() {
    try { return Boolean(root?.localStorage) && root.localStorage.getItem(STORAGE_KEY) === 'on'; }
    catch (_) { return false; }
  }

  function setAudioEnabled(enabled) {
    try { if (root?.localStorage) root.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); }
    catch (_) { /* Preference storage failure leaves audio safely off. */ }
    syncPreferenceControls();
  }

  function toggleAudio() {
    setAudioEnabled(!audioEnabled());
    notify(audioEnabled() ? 'success' : 'info', `Audio alerts ${audioEnabled() ? 'enabled' : 'disabled'}.`, {
      key: 'audio-preference', persist: false, audio: audioEnabled()
    });
  }

  function syncPreferenceControls() {
    if (!root || !root.document) return;
    root.document.querySelectorAll('[data-audio-alert-preference]').forEach(control => {
      control.checked = audioEnabled();
      control.setAttribute('aria-checked', String(audioEnabled()));
    });
  }

  function host() {
    if (!root || !root.document) return null;
    let node = root.document.getElementById('appAlertRegion');
    if (!node) {
      node = root.document.createElement('section');
      node.id = 'appAlertRegion';
      node.className = 'app-alert-region';
      node.setAttribute('aria-label', 'Application notifications');
      root.document.body.appendChild(node);
    }
    return node;
  }

  function playCue(severity) {
    if (!root || !audioEnabled() || severity === 'info') return;
    const now = Date.now();
    if (now - state.audioAt < 900) return;
    state.audioAt = now;
    try {
      const AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!AudioContext) return;
      const context = state.audioContext || new AudioContext();
      state.audioContext = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const tones = { success: 660, warning: 440, error: 220 };
      oscillator.frequency.value = tones[severity] || 440;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + 0.17);
    } catch (_) {
      /* Audio is supplemental; browser blocking never interrupts the workflow. */
    }
  }

  function dismiss(id) {
    const entry = state.alerts.get(id);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    entry.node?.remove();
    state.alerts.delete(id);
    if (entry.key && state.lastByKey.get(entry.key)?.id === id) state.lastByKey.delete(entry.key);
  }

  function dismissKey(key) {
    const entry = state.lastByKey.get(String(key));
    if (entry?.id) dismiss(entry.id);
  }

  function clearTransient() {
    for (const [id, entry] of state.alerts) if (!entry.persist) dismiss(id);
  }

  function notify(severity, message, options = {}) {
    const semantics = semanticsFor(severity, options);
    const level = semantics.severity;
    const text = String(message || '').trim();
    if (!text) return null;
    const key = String(options.key || `${level}:${text}`);
    const now = Date.now();
    const previous = state.lastByKey.get(key);
    if (previous && state.alerts.has(previous.id)) return previous.id;
    if (previous && now - previous.at < (options.dedupeMs || 1500)) return null;

    const container = host();
    if (!container) return null;
    const id = `app-alert-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const persist = semantics.persist;
    const node = root.document.createElement('article');
    node.id = id;
    node.className = `app-alert app-alert-${level}`;
    node.setAttribute('role', semantics.role);
    node.setAttribute('aria-live', semantics.ariaLive);
    node.setAttribute('aria-atomic', 'true');
    const labels = { info: 'Information', success: 'Success', warning: 'Warning', error: 'Error' };
    const icons = { info: 'i', success: '✓', warning: '!', error: '×' };
    node.innerHTML = `<span class="app-alert-icon" aria-hidden="true">${icons[level]}</span>`
      + `<div class="app-alert-copy"><strong>${labels[level]}</strong><span></span></div>`
      + '<button type="button" class="app-alert-close" aria-label="Dismiss notification">×</button>';
    node.querySelector('.app-alert-copy span').textContent = text;
    node.querySelector('.app-alert-close').addEventListener('click', () => dismiss(id));
    container.appendChild(node);
    const entry = { node, persist, timer: null, key };
    state.alerts.set(id, entry);
    state.lastByKey.set(key, { at: now, id });
    if (!persist) entry.timer = setTimeout(() => dismiss(id), options.duration || 4800);
    if (options.audio !== false) playCue(level);
    return id;
  }

  const api = {
    notify,
    info: (message, options) => notify('info', message, options),
    success: (message, options) => notify('success', message, options),
    warning: (message, options) => notify('warning', message, options),
    error: (message, options) => notify('error', message, options),
    dismiss,
    dismissKey,
    clearTransient,
    inferSeverity,
    semanticsFor,
    isAudioEnabled: audioEnabled,
    setAudioEnabled,
    toggleAudio,
    syncPreferenceControls
  };

  if (root && root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', syncPreferenceControls);
    else syncPreferenceControls();
  }
  return api;
});
