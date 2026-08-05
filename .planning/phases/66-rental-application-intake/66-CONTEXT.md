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

### Abuse defence — load-bearing, not belt-and-braces

Dropping `used_at` removes the natural submission cap, so the rate limit and honeypot ARE
the defence rather than a backstop. This matters more than it looks:

- **D-04:** `rateLimit()` in `supabase/functions/_shared/rate-limit.ts` **fails open** when
  Upstash is unreachable (`:159`, deliberate — availability over strict limiting). With a
  reusable link that means an Upstash outage removes the only throttle. The honeypot must
  therefore be a genuine independent layer that works with zero external dependencies, not
  decoration. Research should determine whether a DB-side per-unit submission cap is also
  warranted as a fail-closed floor.

### Application fields

- **D-05:** Collect: name, email, phone; current address + current landlord contact +
  reason for moving; employment (employer, role, gross monthly income, tenure); household
  (occupant count, pets, vehicles); 1-2 references (name, relationship, phone); desired
  move-in date.
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

### Retention — FLAGGED, validate before building

- **D-11:** Non-converted applications are **anonymized, not hard-deleted**, 180 days after
  submission: PII fields replaced with `[deleted]` placeholders, a minimal non-PII stub
  retained (unit, submitted date, final status). This mirrors the established
  `anonymize_deleted_user()` pattern, which already anonymizes PII while preserving records.

  **Why not a hard purge:** fair-housing practice generally expects a housing provider to
  retain application records to defend a discrimination claim. A hard delete at 90 days
  could destroy the landlord's own evidence — protecting privacy by damaging the user.
  Anonymize-with-stub satisfies APPLY-05's "auto-purge PII" while leaving a defensible
  audit trail.

  **RESEARCH MUST VALIDATE the 180-day figure and the anonymize-vs-delete choice against
  actual fair-housing recordkeeping guidance.** I picked a defensible default; I did not
  verify it against a legal source. If the guidance says otherwise, change it and say so.

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

### Integration Points
- New public route `/apply/[token]` under `src/app/` (NOT under `(owner)/`)
- New Edge Function for the applicant insert (`verify_jwt=false`)
- New owner-side review queue under `src/app/(owner)/`
- New table(s) + RLS; owner-scoped via `owner_user_id` per project convention
- pg_cron job for the 180-day anonymize sweep, 3 AM UTC window, archive-then-delete
  discipline consistent with existing retention jobs
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
