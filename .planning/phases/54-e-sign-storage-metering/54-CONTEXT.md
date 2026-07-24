# Phase 54: E-sign & Storage Metering - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the sold e-sign monthly cap and per-tier storage quotas **actually enforced**, with visible current usage + upgrade prompts in Settings, while grandfathering existing over-quota owners so nobody is retroactively locked out. Requirements: METER-01..04.

**In scope:**
- METER-01 — race-safe 25/month e-sign metering for Growth (append-only `esign_events` + atomic count-and-insert RPC) hooked at the `lease-signature` `send` path immediately after `checkTierEntitlement`; Max unlimited; Starter has no e-sign (already tier-gated).
- METER-02 — current-month e-sign usage shown in Settings + upgrade prompt at/near the cap.
- METER-03 — storage usage vs plan quota shown in Settings, computed by an RPC summing `(storage.objects.metadata->>'size')::bigint` over the owner's objects across owner-attributable buckets.
- METER-04 — uploads soft-enforced against the plan quota with an upgrade prompt; pre-launch over-quota population report GATES enforcement; existing over-quota owners grandfathered (never a retroactive lockout).
- Reconcile the live storage-quota claims-integrity bug: `get_user_plan_limits` returns 100 GB for Max, but pricing sells "Unlimited document storage" → Max storage must be unlimited (`-1`).

**Out of scope (own phases / deferred):**
- Changing the sold quota VALUES or pricing tiers (locked by pricing.ts — this is claims-integrity, we enforce what's sold).
- Metering any feature other than e-sign sends + storage bytes (units/properties/tenants caps already exist via `enforce_plan_limits`).
- Rent ledger, applications, comms (Phases 55+).
- Marketing/pricing copy refresh (HONEST-04, separate).
</domain>

<decisions>
## Implementation Decisions

### Quota values (LOCKED by pricing claims — not open for discussion)
- **D-00:** Values are fixed by the public pricing page (`src/config/pricing.ts`) because this milestone is claims-integrity. E-sign: Starter none · **Growth 25/mo** · Max unlimited. Storage: Trial 1 GB · Starter 10 GB · Growth 50 GB · **Max unlimited**. The only value change is fixing `get_user_plan_limits` Max storage `100 → -1` (unlimited) to match the "Unlimited document storage" claim.

### E-sign metering (METER-01/02)
- **D-01:** The 25/month cap resets on the **1st of the calendar month**. The atomic RPC counts the owner's metered send events where the event timestamp is in the current calendar month (`date_trunc('month', now())`). Simplest to compute and to display ("X of 25 used this month"); matches the literal "per month" pricing language.
- **D-02:** **`resend` is exempt — only the initial `send` action is metered.** Resends are corrections/nudges (bounced email, wrong address), not new agreements. The metering count-and-insert fires only on `action === "send"`, never on `resend`. (Per-lease dedupe within a period = Claude's discretion; the load-bearing rule is that `resend` never decrements the cap.)
- **D-01a:** Enforcement is a **hard block** for Growth at 25 (the 26th `send` is refused with an upgrade prompt) — METER-01 says "enforced". Max bypasses the count entirely (unlimited). Starter never reaches here (tier-gate blocks e-sign before metering).

### Storage metering (METER-03/04)
- **D-03:** For a **non-grandfathered** owner at their storage quota, a new upload is **hard-blocked with an inline upgrade prompt**. Reads/downloads/deletes are ALWAYS allowed (metering never traps a user's own data). "Soft-enforced" = the block is scoped to new uploads only + surfaced as an upgrade prompt, not a raw error.
- **D-04:** **Grandfather = full exemption.** Owners already over quota at enforcement launch keep read/download/delete AND upload — they get an upgrade prompt but never an upload lockout. Enforcement (D-03) applies only to owners who cross the quota *after* launch. This is the truest reading of "nobody retroactively locked out" and mirrors Phase 53's clean-slate go-live gate.
- **D-05 (gate, METER-04):** A pre-launch report enumerates owners currently over their storage quota; those `owner_user_id`s are flagged grandfathered BEFORE upload enforcement flips on. Enforcement must not go live until this snapshot exists (same discipline as Phase 53's backlog-clear gate).

### Claude's Discretion
- `esign_events` exact column shape (mirror `lease_reminders` delivery-state / append-only pattern); Idempotency of the count-and-insert (single atomic statement, `INSERT ... SELECT` guarded by a count, or advisory-lock — researcher picks the race-safe form).
- Grandfather flag storage shape: a `users.storage_grandfathered_at timestamptz` column vs a dedicated table vs a computed snapshot — planner decides.
- Near-cap warning threshold for the upgrade prompt (default **80%** of quota / **20 of 25** e-signs unless research finds a house standard). METER-02 says "at/near" — 80% is the sensible default.
- Which buckets are owner-attributable for the storage sum (property-images, lease-documents, maintenance/inspection photos, avatars, document-vault buckets). System buckets that are NOT owner-scoped (e.g. `blog-covers` — platform brand art) are excluded from an owner's usage.
- Upload-enforcement mechanism (see canonical_refs / research question below) — client-side pre-check for UX + a DB-level guard for real enforcement.

### Folded Todos
None — no pending todos matched this phase.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` §"Phase 54: E-sign & Storage Metering" — goal, 4 success criteria, the METER-04 pre-flip grandfather gate.
- `.planning/REQUIREMENTS.md` — METER-01..04 exact acceptance wording (lines ~21-26).

### Quota source of truth (claims-integrity — values are locked here)
- `src/config/pricing.ts` — the sold tiers: per-tier `storage` GB + the e-sign feature lines ("25 lease e-signs per month", "Unlimited document storage"). `checkPlanLimits()` (~line 205-230) already compares `usage.storage` vs `plan.limits.storage` — reusable shape for the Settings usage widget.
- `supabase/migrations/20260218120000_fix_plan_limits_real_tiers.sql` — `get_user_plan_limits(p_user_id text)` returns `storage_gb` per tier; **this is where Max 100→-1 gets reconciled**.

### E-sign send path (where METER-01 hooks)
- `supabase/functions/lease-signature/index.ts` — the `send` action (~line 136) already calls `checkTierEntitlement({ feature: "esign", upgrade_source: "esign_gate", entitled_plans: GROWTH_AND_MAX_PLANS })`. The metered count-and-insert goes immediately AFTER this gate, on `action === "send"` only.
- `supabase/functions/_shared/tier-gate.ts` — `checkTierEntitlement` + `GROWTH_AND_MAX_PLANS`; the returned block shape is the upgrade-prompt contract to reuse for the over-cap response.
- `supabase/functions/_shared/plan-tier.ts` — `priceIdToTier` / `PlanTier` ('trial'|'starter'|'growth'|'max') normalization; use to branch metered (growth) vs unlimited (max).

### Storage
- Bucket-creating migrations (owner-attributable set): `20251202150000_property_images_rls_and_trigger.sql`, `20251110160000_create_lease_documents_bucket.sql`, `20260318120000_maintenance_request_photos.sql` (+ `20260420*` maintenance-photos realign), `20260220110001_create_inspection_photos_bucket.sql`, `20251226163520_create_profile_avatar_storage.sql`, plus the document-vault buckets. `blog-covers` is a SYSTEM bucket (platform brand art) — exclude from owner usage.
- `supabase/schemas/storage.sql` — storage schema reference (verify `storage.objects.metadata->>'size'` availability + `owner`/path attribution before summing).

### Pattern analogs (mirror these, verified this milestone)
- `supabase/migrations/20260722005310_lease_reminders_delivery_state.sql` + `claim_lease_reminders` — append-only state table + atomic service_role-only RPC with `FOR UPDATE SKIP LOCKED`; the closest analog for `esign_events` + the race-safe count-and-insert.
- `supabase/migrations/20260505213825_enforce_plan_limits.sql` — the existing quota-enforcement RPC pattern (properties/units/tenants) to mirror for storage.
- Phase 53 go-live gate (`53-GO-LIVE-RUNBOOK.md`) — the pre-flip snapshot-then-enable discipline to mirror for the METER-04 grandfather gate.

### KEY RESEARCH QUESTION (researcher must resolve)
- **Storage upload enforcement mechanism.** Uploads go client-side direct to Supabase Storage (RLS-governed `storage.objects` INSERT), so there is no Edge-Function chokepoint. A client-side pre-check gives the upgrade-prompt UX but is bypassable. Real enforcement of D-03 needs a DB-level guard — a `BEFORE INSERT` trigger on `storage.objects` (or an INSERT RLS policy) that calls the quota RPC and rejects when over quota AND `owner_user_id` not grandfathered. Research the trigger-vs-RLS trade-off, whether `storage.objects` allows a custom BEFORE trigger on hosted Supabase, and how to read the uploading owner + running size within it.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `checkTierEntitlement` / `GROWTH_AND_MAX_PLANS` (`_shared/tier-gate.ts`) — the e-sign gate is already in place at the `send` path; metering is a strict add-after, no re-plumbing.
- `get_user_plan_limits(p_user_id)` — already returns `storage_gb` per tier; the storage-usage RPC (METER-03) reads quota from here (after the Max fix) and compares against the summed bytes.
- `checkPlanLimits()` in `pricing.ts` (~line 228) — existing `usage.storage > plan.limits.storage` comparison; reuse its shape for the Settings usage widget + prompt trigger.
- Phase 52 upgrade-prompt / Settings surface — METER-02/03 render in the same Settings area (roadmap: "shares Settings surface / upgrade-prompt pattern").

### Established Patterns
- Append-only event table + atomic service_role-only RPC (`lease_reminders` / `claim_lease_reminders`) — direct template for `esign_events` + count-and-insert.
- Pre-flip snapshot gate (Phase 53 clean-slate) — direct template for the METER-04 grandfather report gate.
- Named SECURITY DEFINER RPCs, `SET search_path = public`, `(select auth.uid())` subselect, `FOR UPDATE SKIP LOCKED` for race safety.

### Integration Points
- New: `esign_events` table + atomic metering RPC (called from `lease-signature` `send`); storage-usage RPC (`SUM(metadata->>'size')`); storage upload guard (trigger/RLS on `storage.objects`); grandfather snapshot; Settings usage widgets (e-sign + storage) with upgrade prompts.
- Changed: `get_user_plan_limits` Max storage 100→-1; `lease-signature` `send` action gains the post-gate metered insert (+ over-cap block for Growth).
- Reads from: `get_user_plan_limits` (quota), `storage.objects.metadata` (bytes), `users` subscription/tier fields.
</code_context>

<specifics>
## Specific Ideas

- This is claims-integrity: the pricing page is the source of truth. Do NOT invent quota numbers — enforce exactly what `pricing.ts` sells, and fix any DB value that contradicts it (Max storage 100→unlimited).
- Metering must be honest-but-not-hostile: hard block on NEW consumption over cap, but never trap a user's existing data (reads/downloads/deletes always work) and never retroactively lock out an existing over-quota owner (full grandfather).
</specifics>

<deferred>
## Deferred Ideas

- Per-feature usage analytics / historical usage charts beyond current-period display — future, not METER-01..04.
- Metering receipt-photo uploads specifically (TAX-02 notes they count toward storage) — the storage sum naturally includes them; no separate work here.
- Marketing/pricing copy refresh to advertise the now-real enforcement (HONEST-04) — its own phase.

### Reviewed Todos (not folded)
None — discussion stayed within phase scope.
</deferred>

---

*Phase: 54-E-sign & Storage Metering*
*Context gathered: 2026-07-23*
