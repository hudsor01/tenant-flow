# Phase 26 — Perfect-PR Review Log

**Gate:** two consecutive zero-finding review cycles. **Result: MET** (cycles 4 + 5).
**Reviewed:** 2026-07-05. Every finding verified against the live Supabase DB with rolled-back (`BEGIN…ROLLBACK`) proofs; every fix confirmed with repo↔prod byte-parity.

## Why the review was deep (5 cycles)
LEASE-04 (lock lease terms once the tenant signs) guards a legally-binding e-signature flow: the signed PDF is rendered at finalize from *current* DB values, so any lease column that appears on — or determines — the PDF is a tamper vector if editable during the `pending_signature` window (the UI edit form is gated, so a raw PostgREST PATCH is the threat model). The initial term-lock froze only the 6 financial columns; each review cycle surfaced the *next* class of PDF-determining column that was still editable.

## Findings by cycle (all fixed + verified)
| Cycle | Finding | Fix |
|-------|---------|-----|
| 1 | (a) term-lock left `start_date`/`end_date` editable during pending — they render on the signed PDF; (b) LEASE-02 trigger only covered future inserts — 10/12 existing leases lacked their primary `lease_tenants` row | 20260705173648 (date-lock + backfill); + proactively 20260705174052 (`governing_state`, same class) |
| 2 | `landlord_notice_address` + `immediate_family_members` render on the PDF, no pending-status action writes them, but were left editable (on a false "would break re-send" rationale) | 20260705180152 |
| 3 | **HIGH** — the FK selectors `unit_id` + `primary_tenant_id` determine the joined property/unit/tenant text on the PDF and were re-pointable during pending (RLS pins only owner_user_id) | 20260705182227 |
| 4 | CLEAN — exhaustive PDF-column classification, nothing missing | — |
| 5 | CLEAN — final independent confirmation | — |

## Final state
- **6 lease migrations** (up from the planned 2): `20260705003811` (lease_tenants AFTER-INSERT trigger + `bulk_import_create_lease` ON CONFLICT), `20260705004013` (term-lock), `20260705173648` (dates + backfill), `20260705174052` (governing_state), `20260705180152` (notice + family), `20260705182227` (unit_id + primary_tenant_id FK). All applied to prod, repo↔prod byte-parity, grants/search_path/SECURITY DEFINER preserved.
- **Complete LEASE-04 term-lock:** 13 `is distinct from` comparisons — 6 financial columns (frozen when signed OR pending) + 7 PDF-determining columns (start_date, end_date, governing_state, landlord_notice_address, immediate_family_members, unit_id, primary_tenant_id) frozen during `pending_signature`. Cycle 4/5's per-column table proves these are *exactly* the PDF-determining lease columns not written by a signing action. Renew/terminate/finalize all verified non-broken.
- **LEASE-02 backfill durable:** 0 orphan-primary leases, 0 multi-primary, 0 duplicate pairs.
- Frontend (LEASE-01/03/05/06/07/08 + LEASE-04 UI) verified: list embeds real tenant/unit/property + `.neq('inactive')` + count-based total; `isLeaseTermsLocked` gates edit form + `/edit` route + renew rent; status excludes inactive; 2-decimal money; notice→property address.
- Gates: typecheck 0, lint 0, 102,061 unit tests green. Prod: 0 inactive units/leases. Security advisor: 0 ERROR.

## Discovered follow-ups (captured, out of LEASE-04 scope → Phase 33)
- **SEC-04** — the `leases` UPDATE RLS policy validates only `owner_user_id`, not that a new `unit_id`/`primary_tenant_id` belongs to the owner (cross-owner FK integrity, all-status). The signed-PDF-tamper window is closed by the term-lock; this is the broader RLS gap.
- **SEC-05** — the e-signature audit columns (`*_signed_at`, `*_signature_name/ip/ua/method`) are not protected against post-set `value→different-value` tampering; needs an asymmetric null-transition guard (sign sets null→value, cancel sets value→null, both legitimate — a plain lock would break them).

## Residual (non-gating)
- **Owner-run edge deploy** for LEASE-07 (`lease-signature` function) — code committed, deploy out-of-band (CLI-401 pattern).
- Human walkthrough of the 8 lease flows (26-09 Task 2) — behaviors pinned by unit tests + live DB proofs.
