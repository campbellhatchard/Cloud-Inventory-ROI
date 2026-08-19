/* ═══════════════════════════════════════════════════════════
   ui-v4.js — Cloud Inventory ROI Builder v4.0.0
   Presentation-layer enhancement only. It does not calculate,
   validate, save, or change any value. It rearranges and
   re-skins controls that already exist:

     1. Hides the live KPI bar on screens with no live model.
     2. Replaces emoji glyphs in controls with brand SVG icons.
     3. Collapses long action rows into one primary + one
        secondary + a "More" menu.
     4. Gives currency and percentage inputs a real affix
        instead of "($)" buried in the label text.

   Every element keeps its id, its inline handlers and its
   position in the DOM tree, so existing app code is unaffected.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 1. Live KPI bar belongs to the modelling context ───── */
  /* Note: 'exec' is intentionally excluded. The Executive view has its own
     scenario-aware KPI header that responds to the Conservative/Base/Aggressive
     toggle; the global (unscaled) livebar would contradict it, so we hide it here. */
  var LIVE_TABS = ['calc', 'sensitivity', 'compare'];

  function syncLivebar(name) {
    document.body.classList.toggle('livebar-off', LIVE_TABS.indexOf(name) === -1);
  }

  function hookSwitchTab() {
    if (typeof window.switchTab !== 'function' || window.switchTab.__v4) return false;
    var original = window.switchTab;
    var wrapped = function (name) {
      var result = original.apply(this, arguments);
      try { syncLivebar(name); } catch (e) {}
      return result;
    };
    wrapped.__v4 = true;
    window.switchTab = wrapped;
    return true;
  }

  /* ── 2. Icons ───────────────────────────────────────────── */
  var S = 'width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"';
  var ICONS = {
    '🔗': '<svg ' + S + '><path d="M6.5 9.5l3-3M6 4.5l1-1a2.6 2.6 0 013.7 3.7l-1 1M10 11.5l-1 1a2.6 2.6 0 01-3.7-3.7l1-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    '✉️': '<svg ' + S + '><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 4.5l6 4 6-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '✉': '<svg ' + S + '><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 4.5l6 4 6-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '📋': '<svg ' + S + '><rect x="3.5" y="2.5" width="9" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6 2.5V2a1 1 0 011-1h2a1 1 0 011 1v.5" stroke="currentColor" stroke-width="1.5"/><path d="M6 7h4M6 10h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    '📄': '<svg ' + S + '><path d="M3.5 1.5h5L12.5 5v9.5h-9v-13z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.5 1.5V5h4M5.5 8.5h5M5.5 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    '📊': '<svg ' + S + '><path d="M2.5 13.5V9M6.5 13.5V4M10.5 13.5V7M14 13.5V2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    '🖥': '<svg ' + S + '><rect x="1.5" y="2.5" width="13" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 14h5M8 11.5V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    '👥': '<svg ' + S + '><circle cx="6" cy="6" r="2.4" stroke="currentColor" stroke-width="1.4"/><path d="M1.8 13.5c0-2.3 1.9-3.7 4.2-3.7s4.2 1.4 4.2 3.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M11 5.2a2 2 0 010 3.9M12 13.5c0-1.6-.5-2.7-1.3-3.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    '✨': '<svg ' + S + '><path d="M8 1.5l1.4 3.6L13 6.5l-3.6 1.4L8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M12.5 11l.6 1.5 1.4.5-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.5.6-1.5z" fill="currentColor"/></svg>',
    '↺': '<svg ' + S + '><path d="M2.5 8a5.5 5.5 0 105.5-5.5c-1.8 0-3.4.9-4.4 2.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2 2v3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '⌂': '<svg ' + S + '><path d="M2 7l6-4.8L14 7v6.5a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    '＋': '<svg ' + S + '><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    '☰': '<svg ' + S + '><path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };
  var EMOJI_RE = /(🔗|✉️|✉|📋|📄|📊|🖥️|🖥|👥|✨|↺|⌂|＋|☰|🏢|💰|⚙️|🎯|💻|⚠️|✅|❗|🚀|📈|💡|🔍|📅|🎓)\uFE0F?\s*/g;

  function deEmoji(root) {
    var controls = (root || document).querySelectorAll('button:not([data-v4-icon]), .btn:not([data-v4-icon])');
    Array.prototype.forEach.call(controls, function (el) {
      el.setAttribute('data-v4-icon', '1');
      Array.prototype.forEach.call(el.childNodes, function (node) {
        if (node.nodeType !== 3) return;
        var text = node.nodeValue;
        if (!EMOJI_RE.test(text)) { EMOJI_RE.lastIndex = 0; return; }
        EMOJI_RE.lastIndex = 0;
        var glyph = null;
        var stripped = text.replace(EMOJI_RE, function (m, g) {
          if (!glyph && ICONS[g]) glyph = ICONS[g];
          return '';
        });
        node.nodeValue = stripped.replace(/\s{2,}/g, ' ');
        if (glyph && !el.querySelector('svg')) {
          var holder = document.createElement('span');
          holder.style.display = 'inline-flex';
          holder.innerHTML = glyph;
          el.insertBefore(holder, el.firstChild);
        }
      });
    });
    // Selects: drop decorative glyphs from option labels.
    var options = (root || document).querySelectorAll('select:not([data-v4-icon]) option');
    Array.prototype.forEach.call(options, function (opt) {
      if (EMOJI_RE.test(opt.textContent)) {
        EMOJI_RE.lastIndex = 0;
        opt.textContent = opt.textContent.replace(EMOJI_RE, '').trim();
      }
      EMOJI_RE.lastIndex = 0;
      if (opt.parentNode) opt.parentNode.setAttribute('data-v4-icon', '1');
    });
  }

  /* ── 3. Action rows: one primary, one secondary, then More ─ */
  function closeMenus(except) {
    Array.prototype.forEach.call(document.querySelectorAll('.menu.open'), function (m) {
      if (m !== except) m.classList.remove('open');
    });
  }

  function collapseRow(row) {
    if (row.getAttribute('data-v4-menu')) return;
    var buttons = Array.prototype.filter.call(row.children, function (el) {
      return el.tagName === 'BUTTON' && !el.classList.contains('ownership-filter') &&
             el.getAttribute('data-v4-keep') !== 'no-collapse' && el.style.display !== 'none';
    });
    if (buttons.length < 5) return;
    row.setAttribute('data-v4-menu', '1');

    var keep = [];
    var loud = buttons.filter(function (b) {
      return b.classList.contains('btn-primary') || b.classList.contains('btn-cta');
    });
    if (loud[0]) keep.push(loud[0]);
    var quiet = buttons.filter(function (b) { return keep.indexOf(b) === -1; });
    if (quiet[0]) keep.push(quiet[0]);

    var overflow = buttons.filter(function (b) { return keep.indexOf(b) === -1; });
    if (overflow.length < 2) { row.removeAttribute('data-v4-menu'); return; }

    var menu = document.createElement('div');
    menu.className = 'menu';
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'btn btn-ghost';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = 'More<svg width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true" style="width:10px;height:7px;"><path d="M1 1.5L5 5.5l4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.setAttribute('role', 'menu');

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains('open');
      closeMenus();
      menu.classList.toggle('open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) {
        // Flip the panel if right-alignment would push it off the left edge.
        panel.style.left = ''; panel.style.right = '';
        var box = panel.getBoundingClientRect();
        if (box.left < 8) { panel.style.left = '0'; panel.style.right = 'auto'; }
      }
    });

    menu.appendChild(trigger);
    menu.appendChild(panel);

    // Insert the menu where the first overflow button sat, then move them in.
    row.insertBefore(menu, overflow[0]);
    overflow.forEach(function (b) {
      b.classList.remove('btn-ghost', 'btn-cta', 'btn-primary', 'btn-sm');
      b.setAttribute('role', 'menuitem');
      b.addEventListener('click', function () { menu.classList.remove('open'); });
      panel.appendChild(b);
    });

    // Dividers separate exports from send/other actions.
    Array.prototype.forEach.call(row.querySelectorAll('.export-divider'), function (d) { d.remove(); });
  }

  function buildMenus(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.btn-row'), collapseRow);
  }

  /* ── 4. Currency and percentage affixes ─────────────────── */
  function affix(root) {
    var fields = (root || document).querySelectorAll('.field:not([data-v4-affix])');
    Array.prototype.forEach.call(fields, function (field) {
      var label = field.querySelector('label');
      var input = field.querySelector('input[type=number], input[type=text]');
      if (!label || !input || input.closest('.affix-wrap')) return;
      field.setAttribute('data-v4-affix', '1');

      var money = false, percent = false;
      Array.prototype.forEach.call(label.childNodes, function (node) {
        if (node.nodeType !== 3) return;
        if (node.nodeValue.indexOf('($)') > -1) {
          money = true;
          node.nodeValue = node.nodeValue.replace('($)', '').replace(/\s{2,}/g, ' ').replace(/\s+$/, '');
        }
        if (node.nodeValue.indexOf('(%)') > -1) {
          percent = true;
          node.nodeValue = node.nodeValue.replace('(%)', '').replace(/\s{2,}/g, ' ').replace(/\s+$/, '');
        }
      });
      if (!money && !percent) return;

      var wrap = document.createElement('div');
      wrap.className = 'affix-wrap';
      input.parentNode.insertBefore(wrap, input);
      var mark = document.createElement('span');
      mark.className = 'affix ' + (money ? 'affix-pre' : 'affix-post');
      mark.textContent = money ? currencySymbol() : '%';
      if (money) wrap.appendChild(mark);
      wrap.appendChild(input);
      if (percent) wrap.appendChild(mark);
    });
  }

  var SYMBOLS = { USD: '$', GBP: '£', EUR: '€', AUD: 'A$', NZD: 'NZ$' };
  function currencySymbol() {
    var sel = document.getElementById('currencySelect');
    return (sel && SYMBOLS[sel.value]) || '$';
  }
  function refreshSymbols() {
    var symbol = currencySymbol();
    Array.prototype.forEach.call(document.querySelectorAll('.affix-pre'), function (el) {
      el.textContent = symbol;
    });
  }

  /* ── Wiring ─────────────────────────────────────────────── */
  var pending = null;
  function enhance() {
    deEmoji();
    buildMenus();
    affix();
  }
  function scheduleEnhance() {
    if (pending) return;
    pending = window.setTimeout(function () { pending = null; enhance(); }, 120);
  }

  function init() {
    enhance();
    syncLivebar('calc');
    if (!hookSwitchTab()) {
      var tries = 0;
      var timer = window.setInterval(function () {
        if (hookSwitchTab() || ++tries > 40) window.clearInterval(timer);
      }, 100);
    }

    var currency = document.getElementById('currencySelect');
    if (currency) currency.addEventListener('change', refreshSymbols);

    document.addEventListener('click', function () { closeMenus(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenus();
    });

    // Panes are rendered lazily by the existing app code; re-run on change.
    // But IGNORE mutations that are only inside live-updating result containers
    // (roiGrid, execDoc, comparison, etc.) — those rebuild on every keystroke
    // via recalc(), and re-running enhance() mid-type was disrupting focus on
    // number inputs (e.g. "Revenue / job" appearing to reject entry).
    var IGNORE_IDS = ['roiGrid', 'execDoc', 'compResult', 'turnsPanel', 'rampNote',
                      'compareBody', 'sensitivityGrid', 'livebar'];
    function isIgnorable(mutation) {
      var n = mutation.target;
      while (n && n !== main) {
        if (n.id && IGNORE_IDS.indexOf(n.id) > -1) return true;
        n = n.parentNode;
      }
      return false;
    }
    var main = document.querySelector('.main-content');
    if (main && window.MutationObserver) {
      new MutationObserver(function (mutations) {
        /* Only re-enhance if at least one mutation is outside the ignore set. */
        for (var i = 0; i < mutations.length; i++) {
          if (!isIgnorable(mutations[i])) { scheduleEnhance(); return; }
        }
      }).observe(main, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
