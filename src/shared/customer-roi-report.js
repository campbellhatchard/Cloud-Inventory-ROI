'use strict';

/* One normalized, customer-safe report model for every Executive output.
   Financial values come only from calcROI; adapters may format but never
   recalculate them. */
const { calcROI } = require('./roi-engine');
const { buildExecutiveValueStory } = require('./executive-value-story');
const brand = require('./brand-system');

const text = value => String(value == null ? '' : value).trim();
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function buildCustomerROIReportData(source = {}) {
  if (!source.scenario || !source.scenario.data) throw new Error('A saved scenario is required to build customer outputs.');
  const story = buildExecutiveValueStory(source);
  const data = source.scenario.data;
  const roi = calcROI(data);
  const currency = story.meta.currency || 'USD';
  const years = roi.contractYears.map(row => ({
    year: row.year,
    months: row.months,
    benefit: row.grossBenefit,
    investment: row.investment,
    netValue: row.netBenefit,
    cumulativeBenefit: row.cumulativeBenefit,
    cumulativeInvestment: row.cumulativeInvestment,
    cumulativeNetValue: row.cumulativeNetBenefit,
    annualRoi: row.annualRoi,
    cumulativeRoi: row.cumulativeRoi,
    paybackStatus: row.paybackStatus
  }));
  const benefits = (story.economics.activeDrivers || []).map(driver => ({
    key: driver.key,
    label: driver.label,
    annualValue: number(driver.annualValue),
    status: driver.status,
    customerSupported: Boolean(driver.customerSupported)
  }));
  const investment = [
    { key: 'subscription', label: 'Annual software subscription', value: number(data.invest), recurring: true },
    { key: 'implementation', label: 'One-time implementation and services', value: number(data.otc), recurring: false }
  ].filter(item => item.value > 0);
  const stakeholders = (source.stakeholders || []).map(person => ({
    name: text(person.name), title: text(person.title), role: text(person.role), engaged: Boolean(person.engaged)
  })).filter(person => person.name);

  return Object.freeze({
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    storyRevision: story.storyRevision,
    customer: { id: source.scenario.customer_id || null, name: story.meta.customer, industry: story.meta.industry },
    opportunity: { scenarioId: source.scenario.id, baseId: source.scenario.base_id || null, version: source.scenario.version || null, solution: story.meta.solution, preparedBy: story.meta.preparedBy },
    currency,
    contract: { months: roi.contractMonths, years: roi.contractYearCount, implementationMonths: roi.implMonths },
    financials: {
      annualBenefit: roi.annualBenefit,
      year1Benefit: roi.year1Benefit,
      totalBenefit: roi.totalContractBenefit,
      totalInvestment: roi.totalContractInvestment,
      netValue: roi.totalContractNetBenefit,
      contractRoi: roi.totalContractRoi,
      npv: roi.totalContractNpv,
      paybackMonths: roi.contractPayback
    },
    assumptions: {
      discountRate: number(data.discRate),
      ramp: [roi.ramp1, roi.ramp2, roi.ramp3],
      modelVersion: story.meta.modelVersion,
      maturity: story.economics.maturity,
      customerSupportedValuePct: story.economics.customerSupportedValuePct
    },
    benefits,
    investment,
    years,
    chartData: {
      contractTimeline: years.map(row => ({ label: `Year ${row.year}`, benefit: row.cumulativeBenefit, investment: row.cumulativeInvestment, netValue: row.cumulativeNetValue, roi: row.cumulativeRoi })),
      benefitMix: benefits.map(item => ({ label: item.label, value: item.annualValue })),
      investmentMix: investment.map(item => ({ label: item.label, value: item.recurring ? item.value * roi.contractMonths / 12 : item.value }))
    },
    executiveSummary: { threeWhys: story.threeWhys, currentState: story.currentState },
    solutionFit: story.solutionAlignment,
    jointProjectPlan: story.nextSteps,
    actionPlan: source.actionPlan || null,
    stakeholders,
    customerProof: story.customerProof || [],
    branding: { productName: brand.productName, colors: brand.colors, footer: brand.audience('customer'), logoRole: brand.document.logoRole },
    story
  });
}

module.exports = { buildCustomerROIReportData };
