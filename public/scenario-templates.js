/* ═══════════════════════════════════════════════════════════════════
   scenario-templates.js — Pre-populated starting scenarios by vertical

   Each template sets realistic starting values for a mid-market deal
   in that vertical. Reps can adjust any figure — templates just
   eliminate the blank-form problem for new deals.

   Values are grounded in the industry benchmarks already in industry-data.js.
   Rep still enters: company name, scenario name, rep name, actual revenue,
   users, and inventory value — templates do NOT pre-fill prospect-specific data.

   To add a template: push a new entry to SCENARIO_TEMPLATES following the
   same shape. 'data' maps directly to loadFromObject() field IDs.
   ═══════════════════════════════════════════════════════════════════ */

const SCENARIO_TEMPLATES = [
  {
    id: 'distribution',
    label: 'Wholesale Distribution',
    icon: '📦',
    industry: 'distribution',
    description: 'High-velocity pick/pack/ship operation. OTIF penalties from retailers and write-offs from shrinkage are the top drivers.',
    keyDrivers: ['Order accuracy & OTIF', 'Shrinkage & write-off', 'Labor productivity', 'Cycle count reduction'],
    data: {
      name: 'Wholesale Distribution — ROI',
      industry: 'distribution',
      /* Prospect data — rep fills these in */
      company: '',
      revenue: 80000000,    /* $80M — typical mid-market distributor */
      users: 45,
      labor: 52000,
      inventory: 12000000,  /* $12M on-hand */
      itCost: 120000,
      invest: 90000,
      /* OTIF — distributors face retailer chargebacks */
      otifBaseline: 94,
      otifTarget: 99,
      /* Shrinkage — low rate but high volume */
      annualWriteOff: 180000,
      /* WMS levers — order accuracy is the headline */
      ordersPerYr: 350000,
      costPerOrder: 3.50,
      pickRateGainPct: 18,
      orderErrorPct: 2.2,
      costPerError: 85,
      /* Expediting */
      expediteSpendYr: 320000,
      /* Counting labor */
      countDaysYr: 18,
      countPeople: 8,
      /* Investment */
      psvc: 45000, hw: 20000, train: 10000,
      discRate: 10,
      implMonths: 3,
      ramp1: 40, ramp2: 75, ramp3: 100,
      execAudience: 'mixed'
    }
  },
  {
    id: 'construction',
    label: 'Engineering & Construction',
    icon: '🏗️',
    industry: 'construction',
    description: 'Field inventory across job sites and contractor depots. Tool & material shrinkage and reconciliation labor are the top drivers. Enable field inventory.',
    keyDrivers: ['Field inventory shrinkage', 'Reconciliation labor', 'Downtime from stockouts', 'Expedite spend'],
    hasFieldInventory: true,
    data: {
      name: 'Engineering & Construction — ROI',
      industry: 'construction',
      company: '',
      revenue: 120000000,   /* $120M — mid-size contractor */
      users: 60,
      labor: 65000,
      inventory: 8000000,
      itCost: 80000,
      invest: 85000,
      /* OTIF — project delivery focus */
      otifBaseline: 88,
      otifTarget: 95,
      /* Shrinkage — construction has high tool/material loss */
      annualWriteOff: 240000,
      /* Field inventory */
      fieldInvValue: 3500000,
      fieldLeakageRate: 4.5,
      fieldLocations: 15,
      fieldReconcileCost: 650,
      fieldReconcilePerYr: 4,
      /* Downtime — project delays from stockouts are expensive */
      downtimeEventsYr: 80,
      downtimeHrsPerEvent: 2,
      downtimeCostPerHr: 4500,
      /* Expediting */
      expediteSpendYr: 380000,
      /* Counting */
      countDaysYr: 20,
      countPeople: 5,
      psvc: 40000, hw: 25000, train: 12000,
      discRate: 10,
      implMonths: 4,
      ramp1: 35, ramp2: 65, ramp3: 100,
      execAudience: 'ops'
    }
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    icon: '🏭',
    industry: 'mfg',
    description: 'Production inventory tied to line uptime. Stockout-driven downtime and WIP accuracy are the primary value drivers.',
    keyDrivers: ['Production downtime', 'Inventory accuracy', 'Labor productivity', 'Expedite spend'],
    data: {
      name: 'Manufacturing — ROI',
      industry: 'mfg',
      company: '',
      revenue: 150000000,
      users: 55,
      labor: 58000,
      inventory: 18000000,
      itCost: 140000,
      invest: 95000,
      otifBaseline: 91,
      otifTarget: 97,
      annualWriteOff: 360000,
      /* Downtime — production stops are most costly in manufacturing */
      downtimeEventsYr: 140,
      downtimeHrsPerEvent: 1.5,
      downtimeCostPerHr: 8500,
      /* WMS levers */
      ordersPerYr: 180000,
      costPerOrder: 4.20,
      pickRateGainPct: 20,
      orderErrorPct: 1.8,
      costPerError: 140,
      expediteSpendYr: 420000,
      countDaysYr: 22,
      countPeople: 9,
      psvc: 50000, hw: 30000, train: 15000,
      discRate: 10,
      implMonths: 4,
      ramp1: 35, ramp2: 70, ramp3: 100,
      execAudience: 'fin'
    }
  },
  {
    id: 'telecom',
    label: 'Telecommunications',
    icon: '📡',
    industry: 'telecom',
    description: 'Network assets and field technician inventory. First-fix rate and truck roll costs are key drivers alongside field inventory shrinkage.',
    keyDrivers: ['Field inventory shrinkage', 'Truck roll cost', 'Technician productivity', 'OTIF / SLA compliance'],
    hasFieldInventory: true,
    data: {
      name: 'Telecommunications — ROI',
      industry: 'telecom',
      company: '',
      revenue: 200000000,
      users: 120,
      labor: 72000,
      inventory: 25000000,
      itCost: 200000,
      invest: 110000,
      otifBaseline: 92,
      otifTarget: 97,
      annualWriteOff: 500000,
      /* Field inventory — technicians carry significant parts */
      fieldInvValue: 8000000,
      fieldLeakageRate: 3.5,
      fieldLocations: 45,
      fieldReconcileCost: 400,
      fieldReconcilePerYr: 6,
      /* Downtime — SLA penalties */
      downtimeEventsYr: 200,
      downtimeHrsPerEvent: 0.75,
      downtimeCostPerHr: 6000,
      expediteSpendYr: 550000,
      countDaysYr: 30,
      countPeople: 12,
      psvc: 60000, hw: 35000, train: 18000,
      discRate: 10,
      implMonths: 5,
      ramp1: 30, ramp2: 65, ramp3: 100,
      execAudience: 'mixed'
    }
  },
  {
    id: 'oil',
    label: 'Oil & Gas',
    icon: '⛽',
    industry: 'oil',
    description: 'MRO inventory for high-uptime operations. Production downtime cost per hour is very high — the ROI case is often driven by a single category.',
    keyDrivers: ['Production downtime', 'MRO shrinkage', 'Expedite spend', 'Carrying cost reduction'],
    data: {
      name: 'Oil & Gas — ROI',
      industry: 'oil',
      company: '',
      revenue: 300000000,
      users: 80,
      labor: 85000,
      inventory: 35000000,
      itCost: 250000,
      invest: 120000,
      otifBaseline: 89,
      otifTarget: 96,
      annualWriteOff: 700000,
      /* Downtime — very high hourly cost in O&G */
      downtimeEventsYr: 60,
      downtimeHrsPerEvent: 3,
      downtimeCostPerHr: 25000,
      expediteSpendYr: 800000,
      countDaysYr: 15,
      countPeople: 6,
      psvc: 55000, hw: 30000, train: 15000,
      discRate: 12,
      implMonths: 5,
      ramp1: 30, ramp2: 65, ramp3: 100,
      execAudience: 'fin'
    }
  },
  {
    id: 'food',
    label: 'Food & Beverage',
    icon: '🥫',
    industry: 'food',
    description: 'High-turnover perishable inventory. OTIF compliance with retailers and write-off from spoilage / date management are the headline drivers.',
    keyDrivers: ['OTIF compliance', 'Shrinkage & spoilage', 'Order accuracy', 'Inventory turns'],
    data: {
      name: 'Food & Beverage — ROI',
      industry: 'food',
      company: '',
      revenue: 90000000,
      users: 50,
      labor: 48000,
      inventory: 6000000,
      itCost: 100000,
      invest: 85000,
      /* High OTIF expectations from grocery retail */
      otifBaseline: 92,
      otifTarget: 98,
      annualWriteOff: 180000,
      /* WMS — high order volumes */
      ordersPerYr: 500000,
      costPerOrder: 2.80,
      pickRateGainPct: 15,
      orderErrorPct: 1.5,
      costPerError: 60,
      expediteSpendYr: 200000,
      countDaysYr: 25,
      countPeople: 10,
      /* High turns — F&B turns faster than most verticals */
      invTurnsCurrent: 12,
      invTurnsBenchmark: 15,
      psvc: 40000, hw: 20000, train: 10000,
      discRate: 10,
      implMonths: 3,
      ramp1: 40, ramp2: 80, ramp3: 100,
      execAudience: 'ops'
    }
  }
];

/* ── Template picker modal ── */
function showTemplatePicker() {
  const existing = document.getElementById('templatePickerModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'templatePickerModal';

  const cards = SCENARIO_TEMPLATES.map(t => `
    <div class="tmpl-card" onclick="applyTemplate('${t.id}')">
      <div class="tmpl-icon">${t.icon}</div>
      <div class="tmpl-body">
        <div class="tmpl-label">${escapeHtml(t.label)}</div>
        <div class="tmpl-desc">${escapeHtml(t.description)}</div>
        <div class="tmpl-drivers">
          ${t.keyDrivers.map(d => `<span class="tmpl-driver">${escapeHtml(d)}</span>`).join('')}
        </div>
        ${t.hasFieldInventory ? '<div class="tmpl-fi-badge">⚡ Field inventory pre-enabled</div>' : ''}
      </div>
    </div>`).join('');

  modal.innerHTML = `
    <div class="modal" style="max-width:700px;padding:0;">
      <div class="tmpl-modal-head">
        <div>
          <div class="modal-title" style="margin:0;">Start from a template</div>
          <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">Pre-filled with typical values for each vertical. Add the company name and actual figures to complete the case.</div>
        </div>
        <button class="modal-close" onclick="document.getElementById('templatePickerModal').remove()">✕</button>
      </div>
      <div class="tmpl-grid">${cards}</div>
      <div class="tmpl-modal-foot">
        <button class="btn btn-ghost" onclick="document.getElementById('templatePickerModal').remove()">Cancel — start blank instead</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

function applyTemplate(id) {
  const t = SCENARIO_TEMPLATES.find(x => x.id === id);
  if (!t) return;

  /* Guard unsaved changes the same way loadScenario does */
  if (typeof confirmDiscardChanges === 'function' && !confirmDiscardChanges()) return;

  document.getElementById('templatePickerModal').remove();

  /* Build the full data object — template data + field-inventory flag */
  const data = Object.assign({}, t.data);

  /* Clear any current scenario state first */
  if (typeof clearForm === 'function') clearForm();

  /* Apply the template through the same path as loading a saved scenario */
  if (typeof loadFromObject === 'function') loadFromObject(data);

  /* Set field inventory flag if the template needs it */
  if (t.hasFieldInventory) {
    window._hasFieldInventory = true;
    if (typeof applyFieldInventoryState === 'function') applyFieldInventoryState(true);
  } else {
    window._hasFieldInventory = false;
    if (typeof applyFieldInventoryState === 'function') applyFieldInventoryState(false);
  }

  /* Switch to calculator tab and focus the company name field */
  if (typeof switchTab === 'function') switchTab('calc');
  setTimeout(() => {
    const co = document.getElementById('companyName');
    if (co) { co.value = ''; co.focus(); co.placeholder = 'Enter prospect company name…'; }
    const sn = document.getElementById('scenarioName');
    if (sn) sn.value = '';
    if (typeof recalc === 'function') recalc();
  }, 80);

  showToast(`${t.icon} ${t.label} template loaded — enter the company name to begin.`);
  if (typeof trackEvent === 'function') trackEvent('template_applied', { template: id });
}

window.showTemplatePicker = showTemplatePicker;
window.applyTemplate      = applyTemplate;
window.SCENARIO_TEMPLATES = SCENARIO_TEMPLATES;
