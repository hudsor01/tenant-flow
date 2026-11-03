/**
 * The basis the balance sheet, income statement and cash flow are presented
 * on, as their screens and exports state it (66.2-39 fix round 1, part P).
 * One copy: each statement page renders it (StatementBasisNote), each CSV
 * writes it under STATEMENT_BASIS_HEADING, and the two generated reports built
 * from the income statement and the cash flow (the executive summary and the
 * financial performance report) close with it as a section of its own, one
 * paragraph a sentence, in their PDF and XLSX.
 *
 * What it states, from the builders in src/hooks/api/query-keys/financial-keys.ts
 * as part N left them (no investing section, no line without a source):
 *  - Cash is the rent ledger's collectedTotal: money recorded as received, not
 *    a bank balance, and nothing is drawn from it;
 *  - the data model records no account an expense was paid from, so the cash
 *    flow carries each expense in again under Financing as "Owner Funds for
 *    Expenses" and the balance sheet adds it to Owner Capital;
 *  - the income statement's revenue is the ledger's charges by entry date, net
 *    of reversals and credits; opening balances are not revenue, they are in
 *    Owner Capital.
 */
export const STATEMENT_BASIS_HEADING = "Basis of Presentation";

export const STATEMENT_BASIS_NOTE: readonly string[] = [
	"Cash is what your rent ledger records as received.",
	"TenantFlow doesn't record which account paid an expense, so expenses are shown as paid from your own funds: the cash flow's Owner Funds for Expenses line and the balance sheet's Owner Capital.",
	"The income statement counts each charge in the period it was entered, net of reversals and credits. Opening balances are carried in Owner Capital.",
];

/** The note as one paragraph, for a report section's note. */
export const STATEMENT_BASIS_TEXT = STATEMENT_BASIS_NOTE.join(" ");
