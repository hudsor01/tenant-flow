# Phase 66: Rental Application Intake - Context

**Gathered:** 2026-08-05
**Status:** Ready for planning

> **Decisions were delegated.** The owner reviewed the gray areas and said "you decide."
> Every decision below is Claude's, made from the roadmap, the requirements, and the
> existing codebase. They are LOCKED for planning — but they are judgement calls, not
> owner mandates, so if research surfaces evidence against one, say so rather than
> defending it. D-09 in particular is explicitly flagged for validation.

<domain>
## Phase Boundary

Owner generates a public tokenized link for a vacant unit; applicants submit a standard
application with no account; owner works them through a status queue and converts an
approved applicant into a tenant record; applicant PII has a real retention path.

**Locked out of scope by positioning invariant, permanently:** no applicant accounts, no
SSN collection, no screening or background checks, no credit pull, no FCRA-regulated
decisioning. APPLY-06 requires this be stated on the surface itself, not just internally.

</domain>

<decisions>
## Implementation Decisions

### Link model — the roadmap contradicts itself here

APPLY-01 says both "shareable application link for a vacant unit" AND "mirrors
`/sign/[token]`". Those are different token models. Resolved in favour of "shareable",
because that is what a rental listing actually needs — an owner posts one link to Zillow
or Craigslist and many people apply. A per-applicant link would require the owner to know
every applicant before they apply, which inverts the funnel.

- **D-01:** ONE REUSABLE link per unit. Many applicants submit through the same token.
- **D-02:** Token table mirrors `lease_signing_tokens` in every respect EXCEPT `used_at`,
  which must not exist — a reusable link is never "used up". Keep `token_hash` (SHA-256
  hex of a 256-bit token, raw value shown once and never stored), `expires_at`,
  `revoked_at`, `created_by`, and a `unit_id` FK with `on delete cascade`.
- **D-03:** Default expiry 60 days, owner-revocable at any time. Listings run for weeks,
  so `/sign`'s short window is wrong here; an unbounded link is worse.

- **D-03a (resolves research finding F-4 — token re-copyability):** Store the **raw token**
  in an owner-readable column alongside `token_hash`; the owner can re-copy the link at any
  time. Do NOT use `/sign`'s shown-once-then-discard model here.

  Research flagged this for an owner decision; the owner has delegated, so it is decided:

  `/sign`'s hash-only storage protects a **secret credential held by one tenant**. This
  token is the opposite — it is a link the owner *publishes*, pasting it to Zillow, then
  Craigslist, then Facebook over a 60-day listing. Confidentiality is not the security
  property; **unguessability** is, and a 256-bit token keeps that whether or not the raw
  value is stored. Shown-once would force a rotation every time the owner needs the link
  again, silently breaking every listing already posted — a guaranteed, recurring failure
  traded against a hypothetical one.

  `token_hash` is retained as the public lookup path so the unauthenticated route never
  queries by a raw value.

  **Residual risk, stated rather than hidden:** a DB leak exposes links for units not yet
  posted publicly. The blast radius is spam applications — bounded by D-04a's fail-closed
  DB cap and the honeypot — not data exfiltration, since the applications table is
  owner-scoped by RLS. That is an acceptable trade for a link whose entire purpose is to be
  public. If the owner disagrees, the fix is shown-once plus an explicit "regenerate"
  action, and the listing-breakage cost moves to them.

### Abuse defence — load-bearing, not belt-and-braces

Dropping `used_at` removes the natural submission cap, so the rate limit and honeypot ARE
the defence rather than a backstop. This matters more than it looks:

- **D-04:** `rateLimit()` in `supabase/functions/_shared/rate-limit.ts` **fails open** when
  Upstash is unreachable (`:159`, deliberate — availability over strict limiting). With a
  reusable link that means an Upstash outage removes the only throttle. The honeypot must
  therefore be a genuine independent layer that works with zero external dependencies.

- **D-04a (ANSWERED by research):** Yes — a DB-side cap is warranted, and it is the
  **PRIMARY** control, not a floor. A limiter living in a *different failure domain* than
  the write can only ever fail open; a cap enforced inside the SECURITY DEFINER RPC, under
  the token row's existing `FOR UPDATE` lock, is **fail-closed by construction**. Upstash
  becomes the cheap outer layer, not the gate.

- **D-04b (BUG PREVENTED — would have shipped):** The submit rate limit MUST key on **client
  IP**, never on the token hash. `sign-lease-token/index.ts:142` deliberately passes
  `identifier: tokenHash` because those fetches all share the Next.js egress IP — correct
  there, catastrophic here. Under D-01 every applicant for a unit shares ONE token by
  construction, so a token-keyed bucket lets a single applicant (or attacker) lock out every
  other applicant for that unit. Do not copy that line.

  Size the IP limits for NAT and household traffic — a couple applying from one home, or
  applicants on shared coffee-shop/library wifi, must not read as abuse.

### Application fields

- **D-05 (CORRECTED 2026-08-05):** Collect: name, email, phone; current address + current
  landlord contact + reason for moving; **income from all sources** with employer/role/tenure
  as OPTIONAL fields plus neutral other-income fields; household **occupant count only**;
  pets; vehicles; 1-2 references (name, relationship, phone); desired move-in date.

  > **Research overturned the original employment-centric framing.** Requiring employer and
  > employment income as the primary income signal is a **source-of-income discrimination
  > risk** in CA, WA, NY and roughly 20 other jurisdictions — it disadvantages applicants on
  > housing vouchers, benefits, alimony, or retirement income. And 42 U.S.C. § 3604(c) makes
  > the application form ITSELF a regulated surface, so this is a **schema constraint, not
  > copy review**: the field list has to be right, not just the wording around it.
  >
  > Household is occupant COUNT only — no ages, no relationships, no names. Familial status
  > is a protected class, and per-occupant detail invites exactly that inference.
- **D-06:** Explicitly NOT collected, and this list is a contract: **no SSN** (APPLY-02),
  no date of birth, no bank or card details, no government ID number, no document/pay-stub
  upload. Every one of those raises the PII retention obligation and the first three are
  screening-shaped, which cuts against APPLY-06.

### Review queue and conversion

- **D-07:** Status is a `text` column with a `CHECK` constraint — `new`, `reviewing`,
  `approved`, `rejected`. Project rule: no PostgreSQL ENUMs.
- **D-08:** Approving opens the EXISTING tenant create form (`src/app/(owner)/tenants/new/`)
  prefilled from the application; the owner reviews and saves. Not auto-create — applicant-
  typed data should get a human check before it becomes a durable record, and an approve
  misclick should not mint a tenant.
- **D-09:** The application row survives conversion and links to the created tenant
  (`converted_tenant_id`). Deleting the application must never cascade into the tenant.

### Applicant-facing communication

- **D-10:** On-screen confirmation ONLY. No email to the applicant at any point — not a
  receipt, not a status update, and specifically not an approve/reject notice.

  This is a liability decision, not a scope cut. A platform-sent rejection is
  adverse-action-shaped communication, and APPLY-06 exists precisely to put FCRA duties on
  the landlord rather than TenantFlow. Sending outcome emails would undercut the disclaimer
  the same phase is required to make. It also keeps applicant addresses out of the Resend
  send path entirely, so suppression handling and retention stay simple.

  The confirmation screen should say the owner will make contact directly.

### Retention — CORRECTED 2026-08-05 after research

> **D-11 was flagged for validation and research overturned it. The original decision
> (180 days) is WRONG and superseded. Recorded rather than silently edited, because the
> flag doing its job is the point.**

- **D-11 (SUPERSEDED):** ~~anonymize at 180 days~~. The window was shorter than the
  *shortest* fair-housing filing period that exists — verified from primary statute, not
  a summary:
  - HUD administrative complaint: **1 year** — 42 U.S.C. § 3610(a)(1)(A)(i)
  - Federal civil action: **2 years** — § 3613(a)(1)(A), *"not later than 2 years after the
    occurrence or the termination of an alleged discriminatory housing practice"*
  - § 3613(a)(1)(B) **tolls** that 2-year clock for the entire duration of any pending HUD
    proceeding, so real exposure runs past 3 years.

  Three practitioner sources across WI, CA and WA converge on 2-4 years, and an explicit
  negative search found nothing capping retention. So the original justification was
  directionally right — a short purge destroys the landlord's own defence — but the number
  was off by roughly 4x.

- **D-11a (REPLACES D-11):** Anonymize non-converted applications **730 days** after
  `coalesce(decided_at, created_at)` — decision date where one exists, submission date
  otherwise. The window is **config-driven via the existing `app_config` table**, not
  hardcoded: CA/WA guidance supports 1,460 days, and the right value is jurisdictional.

- **D-11b:** The stated *justification* for anonymize-over-delete was also wrong, though the
  mechanism survives. A stub of (unit, date, status) cannot answer *"why did you deny this
  applicant"*, so anonymize-at-N and delete-at-N are legally equivalent — **the window is
  what matters, not the mechanism.** Keep anonymize anyway for three honest reasons:
  codebase consistency with `anonymize_deleted_user()`, referential integrity for converted
  rows, and non-PII aggregate self-audit.

- **D-11c:** **Create NO archive table**, and this overrides the "archive-then-delete"
  instruction inherited from the other retention jobs. Archiving would preserve verbatim
  the exact PII the sweep exists to remove — the Phase 52 C2 bug in a new costume.

- **D-11d:** Retain a fixed-list `disposition_reason` on the stub. It partially restores the
  defensibility the stub otherwise lacks, at negligible cost, and it is a closed vocabulary
  so it cannot itself become free-text PII.

- **D-12:** Applications cascade on owner GDPR deletion via `anonymize_deleted_user()`
  (`supabase/migrations/20260720015620_retention_gdpr_and_writer_hardening.sql:25`).

### Route gating — the roadmap is factually wrong here

- **D-13:** APPLY-01 says the route is "added to proxy `PUBLIC_ROUTES`". **`PUBLIC_ROUTES`
  does not exist** — `grep -rn "PUBLIC_ROUTES" src/` returns nothing. The proxy gates on
  `PRIVATE_ROUTE_PREFIXES` (`src/lib/routes/private-routes.ts:6`), a deny-list; everything
  not matching a private prefix is public by default. That is exactly why `/sign/[token]`
  works today.

  So `/apply/[token]` becomes public by **not** being added to `PRIVATE_ROUTE_PREFIXES`.
  Do not invent a `PUBLIC_ROUTES` list. Do not add `/apply` to the private list.

- **D-14:** The page emits `noindex, nofollow` in metadata, matching `/sign/[token]`.
  Crawler exclusion is handled by the page, not by `ROBOTS_ONLY_PRIVATE_PATHS`.

### Claude's Discretion

Delegated wholesale — everything above is Claude's call. Planner and researcher retain
normal discretion over table/column naming, file layout, form library usage (TanStack Form
per project convention), validation schema shape, and the visual design of the public page
and the review queue.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The pattern this phase mirrors
- `supabase/migrations/20260617142623_token_based_lease_esignature.sql` — the
  `lease_signing_tokens` table (hashed-token model to copy, minus `used_at`)
- `src/app/sign/[token]/page.tsx` — the public tokenized page precedent, including its
  `noindex` metadata and its invalid/expired-token state
- `supabase/functions/sign-lease-token/` — the `verify_jwt=false` Edge Function precedent
  APPLY-02 requires

### Abuse defence
- `supabase/functions/_shared/rate-limit.ts` — Upstash sliding window; **note the
  fail-open behaviour at `:159`**, which is why D-04 treats the honeypot as load-bearing

### Route gating
- `src/lib/routes/private-routes.ts` — `PRIVATE_ROUTE_PREFIXES`; the file's own header
  warns it is imported by BOTH `proxy.ts` and `robots.ts` and must not be edited without
  updating both consumers
- `src/proxy.ts:46` — the prefix match that makes everything else public

### Retention / GDPR
- `supabase/migrations/20260720015620_retention_gdpr_and_writer_hardening.sql:25` —
  `anonymize_deleted_user()`, the cascade point and the anonymize-with-placeholders pattern
  D-11 follows

### Conversion target
- `src/app/(owner)/tenants/new/page.tsx` — the existing tenant create form D-08 prefills

### Project rules
- `CLAUDE.md` — Zero Tolerance rules; specifically no PG ENUMs (D-07), no `any`, no barrel
  files, no string-literal query keys, RLS on every table, Edge Function auth/CORS/error
  conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lease_signing_tokens`: proven hashed-token schema — copy it, drop `used_at`
- `sign-lease-token` Edge Function: proven `verify_jwt=false` + Bearer-less public path
- `_shared/rate-limit.ts`, `_shared/cors.ts`, `_shared/errors.ts`, `_shared/escape-html.ts`:
  the Edge Function rails this phase rides; zero new npm dependencies required
- `anonymize_deleted_user()`: the GDPR cascade and the anonymize-not-delete precedent
- `/tenants/new` form: the conversion target, already built
- `create_notification` RPC (Phase 52): owner notification on submission

### Established Patterns
- Public routes are public by ABSENCE from `PRIVATE_ROUTE_PREFIXES`, not by an allowlist
- Public tokenized pages emit `noindex, nofollow` and render a uniform state for
  invalid/expired tokens — `/sign/[token]` deliberately does not leak token validity via
  status code, and `/apply` should not either
- Status columns are `text` + `CHECK`, never PG ENUMs
- All list queries need `.limit()`/`.range()` and `{ count: 'exact' }` for pagination

### Verified against PRODUCTION 2026-08-06 (research could not reach Supabase MCP)

These are live facts, not inferences from the repo. All four were open questions in
RESEARCH.md's "Notes for the Planner".

- **D-15 — hash in TypeScript, never in SQL.** pgcrypto is installed in the `extensions`
  schema and `digest` exists ONLY there (`digest_in_public = 0`). A SECURITY DEFINER
  function with `SET search_path = public` therefore **cannot call `digest()`** — it would
  fail at runtime, not at migration time. The existing path already avoids this: live
  `sign_lease_with_token` has `search_path=public` and never calls `digest`; the Edge
  Function hashes with `sha256Hex()` in Deno and passes `p_token_hash` already-hashed.
  **Follow that pattern.** If some RPC genuinely must hash in SQL, it has to schema-qualify
  `extensions.digest(...)`.

- **D-16 — cron slot.** 15 jobs are active and the 3 AM UTC window is dense: minutes
  0, 5, 10, 15, 20, 30, 45 and 50 are taken (`cleanup-cron-history`,
  `cleanup-pg-net-responses`, `cleanup-security-events`, `cleanup-errors`, `expire-trials`,
  `cleanup-webhook-events`, `process-account-deletions`, `cleanup-notifications`). Free
  minutes: **25, 35, 40, 55**. Schedule the anonymize sweep at `35 3 * * *` unless the
  planner has a reason to prefer another free slot. Do not collide.

- **D-17 — the owner notification needs a schema change.** The live
  `notifications_notification_type_check` allows exactly: `maintenance`, `lease`, `payment`,
  `system`, `lease_signed`, `lease_executed`, `lease_finalize_failed`, `maintenance_created`,
  `maintenance_status`, `lease_renewal_reminder`. There is **no application value**, so
  "owner is notified on submission" (the Phase 52 dependency) requires a migration extending
  that CHECK — e.g. `application_received`. Planning must include it; `create_notification`
  will otherwise fail the constraint at runtime.

### Integration Points
- New public route `/apply/[token]` under `src/app/` (NOT under `(owner)/`)
- New Edge Function for the applicant insert (`verify_jwt=false`)
- New owner-side review queue under `src/app/(owner)/`
- New table(s) + RLS; owner-scoped via `owner_user_id` per project convention
- pg_cron job for the 730-day anonymize sweep (window read from `app_config`, per D-11a),
  3 AM UTC window, named SECURITY DEFINER function with `SET search_path = public`,
  `FOR UPDATE SKIP LOCKED`, `LIMIT 10000` — consistent with existing retention jobs EXCEPT
  that it writes **no archive table** (D-11c: archiving would preserve the very PII the
  sweep exists to remove)
- `anonymize_deleted_user()` extended to cover applications

</code_context>

<specifics>
## Specific Ideas

- The confirmation screen should tell the applicant the owner will contact them directly —
  it is the only communication they will ever receive from the platform (D-10).
- The FCRA disclaimer (APPLY-06) belongs on the applicant-facing form itself, where the
  applicant sees it before submitting, not buried in owner-side settings.

</specifics>

<deferred>
## Deferred Ideas

Surfaced while deciding; each is a new capability and belongs in its own phase.

- **Document / pay-stub upload with income verification** — pulls in Storage, signed URLs,
  quota metering and a materially heavier PII obligation (rejected in D-06).
- **Applicant status notifications (approve/reject emails)** — deliberately excluded by
  D-10 on adverse-action grounds. If it is ever wanted, it needs an explicit owner decision
  about FCRA exposure, not a quiet feature addition.
- **Single-use direct-invite links alongside the reusable posting link** — considered as a
  "both" option and rejected for this phase; two token paths roughly double the edge cases
  in a phase that already carries an Edge Function, a cron, a queue and a conversion flow.
- **Tenant screening / background checks / credit pull** — permanently out. This is a
  standing positioning invariant, not a deferral: REQUIREMENTS.md:142 records that FCRA
  liability sits with the landlord and APPLY-06 disclaims it.

</deferred>

---

*Phase: 66-Rental Application Intake*
*Context gathered: 2026-08-05*
