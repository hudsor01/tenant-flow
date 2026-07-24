# Phase 55: Rent Ledger - Discussion Log

> **Audit trail only.** Not consumed by downstream agents — decisions live in CONTEXT.md.

**Date:** 2026-07-24
**Phase:** 55-rent-ledger
**Areas discussed:** Charge period anchoring, Receipt→charge model, Late rule, Revenue definition

---

## Pre-discussion scout findings
- `leases.rent_amount` is an integer (dollars) in prod — the exact column behind the MONEY-01/02 100× bugs. No rent-due-day column on leases. Legacy demolished `rent_due` table exists (do not reuse). Existing lease-derived revenue RPCs must be relabeled, not duplicated (LEDGER-07). Money-conversion rule + append-only + reversal-entries + "track since" onboarding are locked by the success criteria.

## Charge period anchoring
| Option | Selected |
|--------|----------|
| Calendar month, due on the 1st (Recommended) | ✓ |
| Lease-anchored due day | |

**User's choice:** Calendar month, due on the 1st (no due-day column to anchor otherwise).

## Receipt → charge model
| Option | Selected |
|--------|----------|
| Lease-level aggregate balance (Recommended) | |
| Per-charge allocation | ✓ |

**User's choice:** Per-charge allocation (override of the recommendation) — precise per-charge paid/partial/unpaid + per-charge late flags; receipt recorded against a specific charge; partials = discrete receipts.

## Late rule
| Option | Selected |
|--------|----------|
| Due date passed, grace = 0 (Recommended) | |
| Fixed grace period (e.g. 5 days) | ✓ |

**User's choice:** Fixed 5-day grace (override) — late when unpaid remaining AND now() > due_date + 5 days.

## Revenue definition (LEDGER-07/08)
| Option | Selected |
|--------|----------|
| Relabel existing as 'Scheduled', add 'Collected' + collection-rate (Recommended) | ✓ |
| Replace revenue with Collected (ledger-only) | |

**User's choice:** Relabel scheduled + add collected + restore collection-rate KPI (collected÷scheduled, current month); no double-counting.

## Claude's Discretion
- Table/column shapes; reversal-immutability enforcement; balance/summary RPC shape; cron slot; the optional auto-FIFO allocation convenience.

## Deferred Ideas
- Auto-late-fee rules; configurable grace; lease-anchored due days; auto-FIFO default; history backfill.
