'use strict';

/* Exact field semantics for AI Help. Formula membership is intentionally not
   used as a field definition: several different inputs participate in the same
   formula but mean very different things to the person entering data. */
const DEFINITIONS = Object.freeze({
  userCount: ['Inventory users', 'Number of employees who regularly perform the in-scope inventory work.', 'Use the people who actually participate in the process; do not use total company headcount unless all employees participate.', 'people'],
  laborCost: ['Average fully burdened labor cost', 'Average annual employer cost per in-scope employee, including salary or wages, benefits, payroll taxes, and other employer-paid costs.', 'Enter a supported annual fully burdened amount per participating employee, not the combined payroll for the whole group.', 'currency_per_person_year'],
  labor: ['Average fully burdened labor cost', 'Average annual employer cost per in-scope employee, including salary or wages, benefits, payroll taxes, and other employer-paid costs.', 'Enter a supported annual fully burdened amount per participating employee, not the combined payroll for the whole group.', 'currency_per_person_year'],
  laborWastePct: ['Time spent on avoidable inventory work', 'Percentage of the in-scope employees’ working time spent on avoidable searching, reconciliation, correction, or other inventory-related rework.', 'Enter the share of working time, not a currency amount or the expected improvement.', 'percent'],
  currentAccuracy: ['Current inventory accuracy', 'Current percentage of inventory records that agree with physical inventory.', 'Use the customer’s current measured accuracy for the in-scope operation; do not enter the target accuracy here.', 'percent'],
  annualWriteOff: ['Annual write-off / shrinkage', 'Annual inventory value lost through write-offs, shrinkage, obsolescence, or unexplained adjustments in the in-scope operation.', 'Enter the current annual loss amount before Cloud Inventory improvement, supported by finance or inventory records where possible.', 'currency_per_year'],
  inventoryValue: ['Inventory value on hand', 'Average inventory value held in the in-scope operation.', 'Enter the average on-hand inventory value, not annual purchases, annual revenue, or a peak-only balance.', 'currency'],
  invTurnsCurrent: ['Current inventory turns', 'How many times the in-scope inventory is sold or consumed and replenished during a year.', 'Use the customer’s current annual inventory-turn rate.', 'turns_per_year'],
  revenue: ['Annual revenue', 'Total annual company or in-scope business revenue used as the revenue base for service-level economics.', 'Enter annual revenue, not gross profit, contribution margin, software opportunity value, or expected benefit. The model uses this only with the OTIF gap and contribution margin.', 'currency_per_year'],
  otifBaseline: ['Current OTIF', 'Current percentage of orders delivered on time and in full.', 'Enter the current measured OTIF rate, not the target.', 'percent'],
  otifTarget: ['Target OTIF', 'Expected achievable on-time-in-full percentage after improvement.', 'Enter the supported target OTIF rate; it should not be below the current OTIF baseline.', 'percent'],
  contributionMarginPct: ['Contribution margin', 'Percentage of revenue remaining after variable costs, used to avoid treating recovered revenue as if all revenue were profit.', 'Enter the customer’s contribution margin percentage, not annual revenue, gross revenue, or the expected recovery percentage.', 'percent'],
  lostSalesYr: ['Annual lost sales', 'Annual revenue currently lost because inventory availability or service failures prevent orders from being fulfilled.', 'Enter the current annual lost-sales amount before improvement; contribution margin is entered separately.', 'currency_per_year'],
  servicePenaltyCostYr: ['Service penalties and credits', 'Annual customer credits, penalties, chargebacks, or similar costs caused by service-level failures.', 'Enter the current annual cost, excluding expedite spend and lost sales that are captured in their own fields.', 'currency_per_year'],
  expediteSpendYr: ['Annual expedite spend', 'Annual premium freight or expedite cost incurred because inventory or fulfillment issues require urgent shipment.', 'Enter only the avoidable premium or expedite spend, not normal freight.', 'currency_per_year'],
  downtimeEventsYr: ['Downtime events per year', 'Number of inventory-related operating interruptions during a typical year.', 'Count only in-scope events represented by the hours and hourly cost fields.', 'events_per_year'],
  downtimeHrsPerEvent: ['Hours per downtime event', 'Average duration of an in-scope downtime event.', 'Enter average hours for one event, not total annual downtime hours.', 'hours'],
  downtimeCostPerHr: ['Cost per hour of downtime', 'Approximate business cost for one hour of the in-scope operational interruption.', 'Enter the supported hourly impact and avoid including costs already captured in another value driver.', 'currency_per_hour'],
  countDaysYr: ['Cycle-count days per year', 'Number of working days per year on which the in-scope team performs cycle counting.', 'Enter days per year, not counts per day or people involved.', 'days_per_year'],
  countPeople: ['Employees involved in cycle counting', 'Number of employees who regularly perform counts, recounts, reconciliation, or related administration.', 'Include only people who participate in the in-scope process.', 'people'],
  ordersPerYr: ['Orders per year', 'Annual number of in-scope orders or transactions used to estimate fulfillment-error volume.', 'Enter the annual in-scope order count, not revenue or inventory units.', 'orders_per_year'],
  orderErrorPct: ['Order error rate', 'Percentage of in-scope orders that require correction, rework, credit, or reshipment because of an error.', 'Enter the current error percentage, not the target improvement.', 'percent'],
  costPerError: ['Cost per order error', 'Average internal and external cost to resolve one in-scope order error.', 'Include supported labor, reshipment, credit, or other per-error cost without duplicating separately modeled penalties.', 'currency_per_error'],
  costPerOrder: ['Cost per order', 'Average operating cost associated with processing one in-scope order.', 'Enter a supported per-order operating cost, not order value or revenue.', 'currency_per_order'],
  pickRateGainPct: ['Expected pick-rate gain', 'Expected percentage productivity improvement in the in-scope picking process.', 'Enter the expected improvement percentage, not the current pick rate.', 'percent'],
  repeatVisitsYr: ['Repeat visits per year', 'Annual number of avoidable repeat field-service visits caused by missing or incorrect inventory or parts.', 'Enter the current annual repeat-visit count before improvement.', 'visits_per_year'],
  costPerTruckRoll: ['Cost per truck roll', 'Average cost of one field-service visit, including the relevant labor, vehicle, travel, and administrative cost.', 'Enter the supported average cost per visit.', 'currency_per_visit'],
  fieldInvValue: ['Field inventory value', 'Average value of inventory held outside central facilities, such as trucks, vans, lockers, job sites, or field locations.', 'Enter only field inventory within scope, not warehouse inventory already entered elsewhere.', 'currency'],
  fieldLeakageRate: ['Field inventory leakage rate', 'Annual percentage of field inventory lost through shrinkage, write-off, obsolescence, or unreturned material.', 'Enter the current annual leakage percentage, not the expected improvement.', 'percent'],
  fieldLocations: ['Field inventory locations', 'Number of in-scope trucks, vans, lockers, job sites, or other field stocking locations.', 'Count the locations that participate in the modeled reconciliation process.', 'locations'],
  fieldReconcilePerYr: ['Field reconciliations per year', 'Number of reconciliation cycles performed at each in-scope field location during a year.', 'Enter the per-location annual frequency, not the total across all locations.', 'counts_per_year'],
  fieldReconcilePersonHours: ['Person-hours per reconciliation', 'Total employee hours required to complete one reconciliation at one field location.', 'Add the time of every participant for one reconciliation; for example, two people for three hours equals six person-hours.', 'person_hours'],
  itCost: ['Current IT / legacy cost per year', 'Annual technology, support, maintenance, hosting, or legacy-system cost that the proposed solution may displace.', 'Enter only recurring cost that is genuinely avoidable and not already included in the proposed investment.', 'currency_per_year'],
  discRate: ['Discount rate', 'Annual rate used to convert future monthly net cash flows into present value for NPV.', 'Enter the approved annual discount rate as a percentage.', 'percent'],
  invest: ['Annual subscription cost', 'Annual recurring Cloud Inventory subscription used in the modeled customer investment.', 'Enter the governed annual recurring amount, excluding one-time services, hardware, and training captured separately.', 'currency_per_year']
});

function getFieldDefinition(id) {
  const row = DEFINITIONS[id];
  if (!row) return null;
  return Object.freeze({ id, label: row[0], definition: row[1], whatToEnter: row[2], unit: row[3] });
}

module.exports = { DEFINITIONS, getFieldDefinition };
