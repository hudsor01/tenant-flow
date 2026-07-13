---
phase: 26-lease-domain-correctness
plan: 06
subsystem: database
tags: [leases, trigger, security-definer, before-update, term-lock, esign, tamper-guard]

# Dependency graph
requires:
  - phase: 26-lease-domain-correctness
    provides: "plan 26-02 disables rent adjustment on signed/pending leases; plan 26-07 ships the UI edit-gate (this is the server half of the defense-in-depth pair)"
provides:
  - "BEFORE UPDATE trigger reject_signed_lease_term_edits on public.leases rejecting financial-term column edits once tenant_signed_at set or status pending_signature"
  - "renew/terminate/finalize/unsigned-draft writes remain unaffected"
  - "RLS integration test pinning reject + renew + terminate + unsigned-draft-allow"
affects: [LEASE-04 UI edit-gate (26-07), e-sign finalize path]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BEFORE UPDATE tamper-guard trigger comparing OLD vs NEW per-column via IS DISTINCT FROM, gated on a signed/pending lock condition, raising errcode 23514 with a DETAIL hint"

key-files:
  created:
    - supabase/migrations/20260705004013_lease_terms_lock_before_update.sql
    - tests/integration/rls/lease-terms-lock.test.ts
  modified: []

key-decisions:
  - "Lock ONLY the six PDF-bearing financial-term columns (rent_amount, security_deposit, late_fee_amount, payment_day, grace_period_days, rent_currency)"
  - "Leave end_date, start_date, lease_status, late_fee_days, and ALL signature-workflow columns writable so renew (end_date+lease_status), terminate (end_date+lease_status), and the e-sign finalize/activation all succeed"
  - "Lock condition uses OLD (OLD.tenant_signed_at IS NOT NULL OR OLD.lease_status='pending_signature'); trigger fn revoked from public"

requirements-completed: [LEASE-04]

# Metrics
duration: ~30min
completed: 2026-07-04
---

# Phase 26 Plan 06: LEASE-04 Server-side Financial-term Lock

**An owner can no longer edit rent (or any of the six financial-term columns) on a lease the tenant has signed or that is out for signature — a direct PostgREST update is rejected server-side — while renew, terminate, the signing workflow, and unsigned-draft edits all keep working.**

## Migration (reconciled)

- **File:** `supabase/migrations/20260705004013_lease_terms_lock_before_update.sql`
- **Prod version (list_migrations):** `20260705004013` — repo filename matches.

## Trigger condition (exact)

`reject_signed_lease_term_edits()` — `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Raises when:

```
(OLD.tenant_signed_at IS NOT NULL OR OLD.lease_status = 'pending_signature')
AND (
     NEW.rent_amount        IS DISTINCT FROM OLD.rent_amount
  OR NEW.security_deposit   IS DISTINCT FROM OLD.security_deposit
  OR NEW.late_fee_amount    IS DISTINCT FROM OLD.late_fee_amount
  OR NEW.payment_day        IS DISTINCT FROM OLD.payment_day
  OR NEW.grace_period_days  IS DISTINCT FROM OLD.grace_period_days
  OR NEW.rent_currency      IS DISTINCT FROM OLD.rent_currency
)
```

Error: `'Cannot edit financial terms of a signed lease'` with `errcode = '23514'` + a DETAIL hint. **NOT** locked (excluded from the compared set): `end_date`, `start_date`, `lease_status`, `late_fee_days`, all signature-workflow columns (`tenant_signed_at`, `owner_signed_at`, `owner_signature_ip`, `owner_signature_method`, `tenant_signature_ip`, `tenant_signature_method`, `sent_for_signature_at`, `signed_document_path`), and subscription/`auto_pay_enabled` columns.

Trigger: `lease_terms_lock_before_update BEFORE UPDATE ON public.leases FOR EACH ROW` (idempotent `DROP TRIGGER IF EXISTS`). Coexists with the existing `sync_unit_status_on_lease_change` and `trg_security_lease_signed` AFTER triggers (BEFORE fires first, only raises when locked). `grep -c "is distinct from"` = 6.

## Grant / attribute (verified live)

`reject_signed_lease_term_edits`: `prosecdef=true`, `proconfig=[search_path=public]`, revoked from public (`postgres=EXECUTE` only) — no new advisor finding.

## Rolled-back live proofs (BEGIN … RAISE → full rollback)

Self-rolling-back DO block against prod (owner A unit/tenant; fresh leases built inside the tx):

- **(a) signed lease rent_amount update** → REJECTED (`Cannot edit financial terms of a signed lease`). PASS.
- **(b) signed lease renew** (`end_date` + `lease_status='active'`) → SUCCEEDED. PASS.
- **(c) signed lease terminate** (`end_date` + `lease_status='terminated'`) → SUCCEEDED. PASS.
- **(d) signed lease signature-column-only** (`signed_document_path`) → SUCCEEDED. PASS.
- **(d2) signed lease finalize/activation** (`owner_signed_at` + `lease_status='active'`) → SUCCEEDED. PASS.
- **(e) unsigned draft rent_amount update** → SUCCEEDED. PASS.
- **(f1) pending_signature lease rent_amount update** → REJECTED. PASS.
- **(f2) pending_signature lease end_date-only update** → SUCCEEDED. PASS.

Post-rollback: owner-A lease count `= 2` (unchanged). Zero test rows persisted.

Security advisors (post-apply): 0 ERROR; the 47 WARN are the pre-existing by-design set; the new function appears in 0 findings. No regression.

## Quality gates

- `bun run typecheck` — clean; `src/types/supabase.ts` unchanged (no `db:types` needed).
- `bun run lint` — exit 0 (one pre-existing biome schema-version INFO).
- `bun run test:unit` — 229 files / 101,920 tests pass.

## Files

- `supabase/migrations/20260705004013_lease_terms_lock_before_update.sql` — the BEFORE UPDATE trigger fn + trigger.
- `tests/integration/rls/lease-terms-lock.test.ts` — ownerA: signed-lease rent edit rejected (chai6-safe `toMatchObject({ message: stringContaining('financial terms') })`), signed-lease renew allowed, signed-lease terminate allowed, unsigned-draft rent edit allowed. Runs via `rls-security-tests.yml`.

## Interaction with 26-02

On a SIGNED lease a `rent_amount` change is correctly REJECTED here; 26-02's renew-rent adjustment applies to UNSIGNED leases and its dialog disables the rent control on signed/pending leases, so no rent change is ever attempted on a signed lease. `end_date`-only renew always works. No contradiction.

## Deviations

None — plan executed as written. PostgREST surfaces the trigger RAISE as an `error` object (not a thrown promise rejection), so the test asserts via `expect(error).toMatchObject({ message: expect.stringContaining(...) })` (still chai6-safe, satisfies the toMatchObject requirement).

## Self-Check: PASSED
- Migration + test files exist; grep finds `is distinct from` 6x.
- Trigger + attributes verified live; all 8 proofs rolled back; prod left exactly as found.

---
*Phase: 26-lease-domain-correctness*
*Completed: 2026-07-04*
