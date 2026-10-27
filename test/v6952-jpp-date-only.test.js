'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const helperPath = path.join(root, 'public/jpp-date-only.js');
const mapPath = path.join(root, 'public/map.js');
const dateOnly = require(helperPath);

function control(id, tagName = 'BUTTON', onclick = '') {
  const attributes = new Map();
  if (onclick) attributes.set('onclick', onclick);
  return {
    id,
    tagName,
    onclick,
    disabled: false,
    value: '',
    style: {},
    dataset: {},
    addEventListener() {},
    focus() {},
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; }
  };
}

function createBrowserHarness(user = { username: 'qa_rep', roleKeys: ['rep'] }) {
  const elements = new Map();
  const list = { style: {}, innerHTML: '' };
  const editor = {
    style: {},
    _html: '',
    set innerHTML(html) {
      this._html = String(html);
      for (const [id] of elements) if (!['mapListWrap', 'mapEditorWrap'].includes(id)) elements.delete(id);
      for (const [, tag, attributes] of this._html.matchAll(/<(button|input|select|textarea)\b([^>]*)>/gi)) {
        const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
        if (!id) continue;
        const onclick = /\bonclick="([^"]*)"/.exec(attributes)?.[1] || '';
        const element = control(id, tag.toUpperCase(), onclick);
        element.value = /\bvalue="([^"]*)"/.exec(attributes)?.[1] || '';
        element.disabled = /\bdisabled\b/.test(attributes);
        elements.set(id, element);
      }
    },
    get innerHTML() { return this._html; },
    querySelectorAll(selector) {
      const values = [...elements.values()];
      if (selector === 'input,select,textarea') return values.filter(item => ['INPUT', 'SELECT', 'TEXTAREA'].includes(item.tagName));
      if (selector === 'button[onclick]') return values.filter(item => item.tagName === 'BUTTON' && item.getAttribute('onclick'));
      return [];
    }
  };
  elements.set('mapListWrap', list);
  elements.set('mapEditorWrap', editor);

  const context = {
    window: null,
    document: {
      getElementById(id) { return elements.get(id) || null; },
      querySelector() { return null; }
    },
    console,
    Date,
    Intl,
    JSON,
    Math,
    Promise,
    setTimeout,
    clearTimeout,
    navigator: { clipboard: { writeText: async () => {} } },
    confirm: () => true,
    escapeHtml: value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
    showToast() {},
    apiFetch: async () => ({ ok: false }),
    getVals: () => ({}),
    getCompanies: () => []
  };
  context.window = context;
  context.window.location = { origin: 'https://example.invalid', href: '' };
  context.window.ciAuth = { getUser: () => user };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(helperPath, 'utf8'), context, { filename: 'public/jpp-date-only.js' });
  vm.runInContext(fs.readFileSync(mapPath, 'utf8'), context, { filename: 'public/map.js' });
  return {
    context,
    elements,
    list,
    editor,
    run(source) { return vm.runInContext(source, context); }
  };
}

function savedPlan(overrides = {}) {
  const groups = [{ id: 'group-1', name: 'Evaluate' }];
  const milestones = Array.from({ length: 14 }, (_, index) => ({
    id: `milestone-${index + 1}`,
    groupId: 'group-1',
    phase: 'Evaluate',
    title: `Milestone ${index + 1}`,
    owner: index % 2 ? 'joint' : 'rep',
    status: index < 3 ? 'done' : 'pending',
    dueDate: `2027-04-${String(index + 1).padStart(2, '0')}`
  }));
  return {
    id: 'plan-date-1',
    owner_id: 'owner',
    owner_username: 'qa_rep',
    canEditPlan: true,
    company: 'Calendar Integrity Customer',
    title: 'Calendar Integrity Plan',
    target_close_date: '2027-03-31',
    token: null,
    milestones,
    groups,
    ...overrides
  };
}

function browserProbe() {
  const harness = createBrowserHarness();
  harness.context.fixture = savedPlan();
  harness.run('_maps=[fixture]; renderMapList()');
  const cardHtml = harness.list.innerHTML;
  harness.run('openMap("plan-date-1")');
  return {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    formatted: harness.run('window.CIJppDateOnly.formatDateOnly("2027-03-31")'),
    cardHasCorrectDate: cardHtml.includes('Close: Mar 31, 2027'),
    cardHasShiftedDate: cardHtml.includes('Close: Mar 30, 2027'),
    editorValue: harness.elements.get('mapCloseDate')?.value,
    milestoneCount: harness.run('_mapCurrent.milestones.length')
  };
}

if (process.argv.includes('--browser-probe')) {
  process.stdout.write(JSON.stringify(browserProbe()));
} else {
  test('canonical date-only formatter validates calendar components without rollover', () => {
    const cases = new Map([
      ['2027-03-31', 'Mar 31, 2027'],
      ['2027-01-01', 'Jan 1, 2027'],
      ['2027-03-14', 'Mar 14, 2027'],
      ['2027-11-07', 'Nov 7, 2027'],
      ['2027-12-31', 'Dec 31, 2027'],
      ['2028-02-29', 'Feb 29, 2028']
    ]);
    for (const [input, expected] of cases) assert.equal(dateOnly.formatDateOnly(input), expected, input);
    for (const input of [null, undefined, '', 'not-a-date', '2027-2-01', '2027-02-29', '2027-02-31']) {
      assert.equal(dateOnly.formatDateOnly(input), '', String(input));
      assert.equal(dateOnly.parseDateOnly(input), null, String(input));
    }
  });

  test('formatter and actual All Plans/editor behavior remain stable across timezone matrix', () => {
    for (const timeZone of ['UTC', 'America/Chicago', 'America/Los_Angeles', 'America/New_York']) {
      const result = spawnSync(process.execPath, [__filename, '--browser-probe'], {
        cwd: root,
        env: { ...process.env, TZ: timeZone },
        encoding: 'utf8'
      });
      assert.equal(result.status, 0, `${timeZone}: ${result.stderr}`);
      const observed = JSON.parse(result.stdout);
      assert.equal(observed.formatted, 'Mar 31, 2027', timeZone);
      assert.equal(observed.cardHasCorrectDate, true, `${timeZone} card`);
      assert.equal(observed.cardHasShiftedDate, false, `${timeZone} no prior-day shift`);
      assert.equal(observed.editorValue, '2027-03-31', `${timeZone} editor`);
      assert.equal(observed.milestoneCount, 14, `${timeZone} saved-plan hydration`);
    }
  });

  test('All Plans and editor preserve one calendar day for owner, read-only and multi-role viewers', async () => {
    const viewers = [
      [{ username: 'qa_rep', roleKeys: ['rep'] }, true],
      [{ username: 'qa_viewer', roleKeys: ['rep'] }, false],
      [{ username: 'qa_rep_leader', roleKeys: ['rep', 'sales_manager'] }, false],
      [{ username: 'qa_se', roleKeys: ['se'] }, false],
      [{ username: 'qa_rep_se', roleKeys: ['rep', 'se'] }, false]
    ];
    for (const [user, canEditPlan] of viewers) {
      const harness = createBrowserHarness(user);
      harness.context.fixture = savedPlan({ canEditPlan });
      harness.run('_maps=[fixture]; renderMapList()');
      assert.match(harness.list.innerHTML, /Close: Mar 31, 2027/, user.username);
      await harness.run('openMap("plan-date-1")');
      assert.equal(harness.elements.get('mapCloseDate').value, '2027-03-31', user.username);
      assert.equal(harness.run('_mapCurrent.target_close_date'), '2027-03-31', `${user.username} stored model unchanged`);
    }
  });

  test('editor capture preserves the governed date-only value without storage compensation', async () => {
    const harness = createBrowserHarness();
    harness.context.fixture = savedPlan();
    await harness.run('_maps=[fixture]; openMap("plan-date-1")');
    harness.elements.get('mapCloseDate').value = '2027-12-31';
    harness.run('captureMapHeaderFields()');
    assert.equal(harness.run('_mapCurrent.target_close_date'), '2027-12-31');
    assert.doesNotMatch(harness.run('JSON.stringify(_mapCurrent)'), /T12:00:00|T00:00:00|2028-01-01/);
  });

  test('empty and invalid target dates keep the approved no-target-date presentation', () => {
    for (const targetCloseDate of [null, '', '2027-02-31']) {
      const harness = createBrowserHarness();
      harness.context.fixture = savedPlan({ target_close_date: targetCloseDate });
      harness.run('_maps=[fixture]; renderMapList()');
      assert.match(harness.list.innerHTML, /No target date/, String(targetCloseDate));
      assert.doesNotMatch(harness.list.innerHTML, /Invalid Date|Jan 1, 1970/, String(targetCloseDate));
    }
  });

  test('JPP browser surfaces load one canonical helper before their production consumers', () => {
    const index = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    const prospect = fs.readFileSync(path.join(root, 'public/prospect-map.html'), 'utf8');
    const mapSource = fs.readFileSync(mapPath, 'utf8');
    assert.ok(index.indexOf('<script src="jpp-date-only.js"') < index.indexOf('<script src="map.js"'));
    assert.ok(prospect.indexOf('jpp-date-only.js') < prospect.indexOf('function fmtDate'));
    assert.doesNotMatch(mapSource, /new Date\(m\.target_close_date\)/);
    assert.doesNotMatch(prospect, /new Date\(raw \+ 'T12:00:00'\)/);
  });
}
