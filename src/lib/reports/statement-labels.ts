/**
 * One label for expenses across the expenses page and the three statements
 * (66.2-39). Every expense is on a maintenance request
 * (expenses.maintenance_request_id is NOT NULL) and has no category of its own
 * (a "category" is a vendor name), so the statements show one line under the
 * page's own name for them, "Expenses": not "Other", "Operating Expenses
 * Paid" or "Maintenance" beside $0 lines for types nothing records.
 */
export const EXPENSES_LABEL = "Expenses";
