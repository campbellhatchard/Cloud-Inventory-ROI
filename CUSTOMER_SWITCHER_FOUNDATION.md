# Authorized Customer Context Switching

## How the flow works

The persistent Customer Workspace header opens a responsive in-app switcher. The landing workspace remains available for initial entry, first-customer creation, and no-active-customer states. Normal switching no longer returns users to that landing screen.

The browser requests lightweight metadata from `/api/customer-switcher`. The server applies the centralized Prompt 1 capability and scope services before returning results. Full ROI, stakeholder, plan, proposal, or Solution Fit records are loaded only after selection.

## Role-aware results

- Sales Reps see owned and explicitly shared customers.
- Sales Engineers see authorized team customers and team Solution Fits.
- Sales Leaders see customers owned by reps on their assigned teams.
- Admins see all active or closed customers.
- Multi-role users receive the permission union automatically without selecting a persona.

Customer-first search and Rep-first filtering work simultaneously. Authorized users can additionally filter by SE, Team, BuyCycle stage, record status, and Solution Fit status. Search scope is displayed in the switcher.

## Switching behaviour

Selecting a customer loads its latest current scenario. The selected customer's ID—not its display name—controls scenario and version lists, preventing same-name and cross-customer mixing. The active functional area is preserved where practical, including Calculator, Discovery, Executive View, Proposal, Christie, Joint Project Plan, Stakeholders, Solution Fit, and Buyer Readiness. Solution Fit results include a direct-open action.

If work is dirty, the user must choose Save & Switch, Switch Without Saving, or Cancel. Customer-specific Discovery and AI context are cleared before the new customer is rendered. Christie and AI Assistant cannot retain the prior customer's context.

The header distinguishes the current user from the customer owner and Primary SE. Viewing another rep's opportunity never changes ownership or Created By attribution.

## Security and isolation

Customer, Rep, SE, Team, count, autocomplete, and recent-item data are scoped on the server. Per-user Recents are intersected with the latest authorized response before display. Direct customer and scenario routes retain record-level authorization and return no partial data when access is denied.

## Deliberately unchanged

- Prompt 1 remains the only authorization model.
- Customer creation retains the existing creation permissions and ownership behaviour.
- Favorites were not added; authorized per-user Recents provide the lightweight shortcut.
- The application continues to use one latest current scenario per customer as the switch default; the existing scenario selector handles additional scenarios afterward.
