# Phase 55 — Deferred Items

Out-of-scope discoveries logged during execution. Not fixed in the plan that
found them (per the executor scope boundary).

---

## D1 — The append-only guard trigger also blocks `ON DELETE CASCADE`

**Found during:** 55-03 Task 3 (authoring the RLS integration scaffolds)
**Owning artifact:** `supabase/migrations/20260724140000_rent_ledger_schema.sql` (55-01)
**Verify in:** 55-04 (the apply + live-behavior gate)

`rent_ledger_append_only()` is a `BEFORE UPDATE OR DELETE ... FOR EACH ROW`
trigger that raises `0A000` unconditionally, for every writer. Both ledger
tables reference their parents with `ON DELETE CASCADE`:

- `rent_charges.lease_id  -> leases(id)  on delete cascade`
- `rent_charges.owner_user_id -> users(id) on delete cascade`
- `rent_receipts.charge_id / lease_id / owner_user_id` — same

A cascade issues a real `DELETE` against the referencing table, which fires the
row trigger. So once a lease has ledger rows, **deleting that lease (or its
unit / property / owner) raises and aborts** rather than cascading.

Consequences to confirm against prod in 55-04:

1. Lease deletion from the app fails for any lease with ledger history.
2. Account-deletion / GDPR paths that remove `public.users` rows (rather than
   anonymizing in place) would abort. TenantFlow anonymizes rather than deletes
   (`anonymize_deleted_user`), so this may be moot — verify.
3. RLS integration teardown cannot sweep ledger rows or their fixture leases.
   The 55-03 suites already account for this: every assertion is scoped to the
   ids the run created, and teardown is best-effort.

Not fixed here: 55-03 is a TypeScript + tests plan (no database changes), and
relaxing the guard is a schema decision (e.g. allow DELETE when the parent row
is itself being deleted, or drop the cascade in favour of a restrict + explicit
archival). Surface to the user in 55-04 before changing the immutability
guarantee — it is the load-bearing LEDGER-06 control.
