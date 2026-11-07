/**
 * One label for expenses on the income statement and the cash flow (66.2-39);
 * the balance sheet has no expense line (it carries them in Owner Capital).
 * Every expense is on a maintenance request (expenses.maintenance_request_id is
 * NOT NULL) and has no category of its own (a "category" is a vendor name), so
 * the two statements show one line under the expenses page's own name for
 * them, "Expenses": not "Other", "Operating Expenses Paid" or "Maintenance"
 * beside $0 lines for types nothing records.
 */
export const EXPENSES_LABEL = "Expenses";
