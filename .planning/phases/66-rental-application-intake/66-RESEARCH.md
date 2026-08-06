# Phase 66: Rental Application Intake — Research

**Researched:** 2026-08-05
**Domain:** Public unauthenticated write path + PII retention law + fair-housing form design
**Confidence:** HIGH on retention law and the in-repo rails; MEDIUM on form-field fair-housing detail; the three overturned decisions are HIGH.

---

<user_constraints>
## User Constraints (from 66-CONTEXT.md)

> CONTEXT.md decisions were made by Claude under owner delegation ("you decide"), not by the
> owner directly. They are LOCKED for planning. Three of them are overturned below on
> evidence, exactly as CONTEXT.md invited. Everything not overturned stands.

### Locked Decisions

**Link model**
- **D-01:** ONE REUSABLE link per unit. Many applicants submit through the same token.
- **D-02:** Token table mirrors `lease_signing_tokens` in every respect EXCEPT `used_at`, which
  must not exist — a reusable link is never "used up". Keep `token_hash` (SHA-256 hex of a
  256-bit token, raw value shown once and never stored), `expires_at`, `revoked_at`,
  `created_by`, and a `unit_id` FK with `on delete cascade`.
- **D-03:** Default expiry 60 days, owner-revocable at any time.

**Abuse defence**
- **D-04:** `rateLimit()` fails open when Upstash is unreachable (`_shared/rate-limit.ts:159`).
  The honeypot must be a genuine independent layer with zero external dependencies. Research
  should determine whether a DB-side per-unit submission cap is also warranted as a fail-closed
  floor.

**Application fields**
- **D-05:** Collect: name, email, phone; current address + current landlord contact + reason for
  moving; employment (employer, role, gross monthly income, tenure); household (occupant count,
  pets, vehicles); 1-2 references (name, relationship, phone); desired move-in date.
- **D-06:** Explicitly NOT collected, and this list is a contract: **no SSN**, no date of birth,
  no bank or card details, no government ID number, no document/pay-stub upload.

**Review queue and conversion**
- **D-07:** Status is a `text` column with a `CHECK` constraint — `new`, `reviewing`, `approved`,
  `rejected`. No PostgreSQL ENUMs.
- **D-08:** Approving opens the EXISTING tenant create form (`src/app/(owner)/tenants/new/`)
  prefilled from the application; the owner reviews and saves. Not auto-create.
- **D-09:** The application row survives conversion and links to the created tenant
  (`converted_tenant_id`). Deleting the application must never cascade into the tenant.

**Applicant-facing communication**
- **D-10:** On-screen confirmation ONLY. No email to the applicant at any point — not a receipt,
  not a status update, and specifically not an approve/reject notice. The confirmation screen
  should say the owner will make contact directly.

**Retention — FLAGGED**
- **D-11:** Non-converted applications are anonymized, not hard-deleted, 180 days after
  submission: PII fields replaced with `[deleted]` placeholders, a minimal non-PII stub retained
  (unit, submitted date, final status). **RESEARCH MUST VALIDATE the 180-day figure and the
  anonymize-vs-delete choice.**
- **D-12:** Applications cascade on owner GDPR deletion via `anonymize_deleted_user()`.

**Route gating**
- **D-13:** `PUBLIC_ROUTES` does not exist. The proxy gates on `PRIVATE_ROUTE_PREFIXES`
  (`src/lib/routes/private-routes.ts:6`), a deny-list. `/apply/[token]` becomes public by **not**
  being added. Do not invent a `PUBLIC_ROUTES` list.
- **D-14:** The page emits `noindex, nofollow` in metadata, matching `/sign/[token]`.

### Claude's Discretion

Delegated wholesale. Planner and researcher retain normal discretion over table/column naming,
file layout, form library usage (TanStack Form per project convention), validation schema shape,
and the visual design of the public page and the review queue.

### Deferred Ideas (OUT OF SCOPE)

- Document / pay-stub upload with income verification
- Applicant status notifications (approve/reject emails) — excluded by D-10 on adverse-action
  grounds
- Single-use direct-invite links alongside the reusable posting link
- Tenant screening / background checks / credit pull — permanent positioning invariant, not a
  deferral

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APPLY-01 | Owner generates shareable application link for a vacant unit — 256-bit token stored SHA-256-hashed, public `/apply/[token]` page (mirrors `/sign/[token]`; "route added to proxy `PUBLIC_ROUTES`") | Token model §4 confirms the hash approach with one overturned detail (F-4, re-copyability). Route gating §"Route Gating Is Correct As Written" confirms D-13: the requirement text is factually wrong, `PUBLIC_ROUTES` does not exist, and the route is public by absence from `PRIVATE_ROUTE_PREFIXES`. |
| APPLY-02 | Applicant submits without an account via a `verify_jwt=false` Edge-Function-mediated insert (never anonymous RLS INSERT) with per-IP rate limit + honeypot; SSN not collected | §"Public Unauthenticated Write Path" gives the exact grant/RLS/config shape. §"Abuse Defence" replaces the naive per-IP design with a three-layer model and identifies a submit-limit keying bug that would otherwise ship (F-5). |
| APPLY-03 | Owner reviews applications per unit with status workflow (new / reviewing / approved / rejected) | D-07 stands. Status transition + `decided_at` column feeds the retention clock (F-1). |
| APPLY-04 | Approving converts the applicant into a tenant record with prefilled fields | §"Convert to Tenant" — 2 call sites, prefill by application ID not by PII query params, 3 edge cases resolved. |
| APPLY-05 | Applicant PII retention policy — auto-purge of non-converted applications after a defined window (cron) + cascade on owner GDPR deletion | **F-1/F-2 overturn the window.** §"Retention" gives 24 months, config-driven, clock from disposition. §"GDPR Cascade" gives the archive-table trap. |
| APPLY-06 | Screening responsibility explicitly disclaimed on the application surface | §"FCRA" — confirms the placement, corrects the framing (FCRA never attaches to TenantFlow here), supplies drafted copy, and derives an architectural invariant that keeps it true. |

</phase_requirements>

---

## Summary

This phase is well served by existing rails: `lease_signing_tokens` is a proven hashed-token
schema, `sign-lease-token` is a proven `verify_jwt=false` public Edge Function, `_shared/*` covers
CORS / errors / env / rate limiting / HTML escaping, and `cleanup_old_notifications()` is a proven
batched retention cron. **Zero new npm or Deno dependencies are required.** The engineering risk is
low; the risk that concentrates in this phase is legal-shaped, and it lands in three places:
the retention window, the application form's field design, and the FCRA surface.

Research overturns three CONTEXT.md decisions on evidence and confirms the rest.
**The headline is D-11: 180 days is not merely conservative, it is shorter than the shortest
fair-housing filing window that exists.** An applicant has 1 year to file a HUD complaint
(42 U.S.C. § 3610(a)(1)(A)(i)) and 2 years to file a federal civil action
(42 U.S.C. § 3613(a)(1)(A)), and § 3613(a)(1)(B) tolls that 2-year clock for the entire time a
HUD proceeding is pending — so the real exposure runs past 3 years. Three independent
practitioner sources across three states converge on 2–4 years. A 180-day auto-purge would
destroy the landlord's own defence evidence roughly six months before their exposure even peaks.
D-11's second premise is also wrong: a stub of (unit, submitted date, final status) cannot answer
"why did you deny *this* applicant" and so preserves no fair-housing defence at all. D-11's
*mechanism* (anonymize, not hard-delete) is correct and should stand; its *window* and its
*stated justification* should not.

Secondly, D-05's employment-centric income framing carries a source-of-income discrimination risk
in the ~20 states and many localities that protect it, and 42 U.S.C. § 3604(c) makes the
application *form itself* a regulated surface — it is unlawful to use a form that indicates a
preference or limitation based on a protected class. This is a field-design constraint, not a
copy-review nicety, and it should shape the schema.

Thirdly, D-02's hash-only "shown once, never stored" token storage was designed for a
credential a *tenant* holds and uses once. Here the *owner* holds a link they will paste into
Zillow, then Craigslist, then Facebook Marketplace over several weeks. Shown-once means the owner
who closes the dialog must rotate the token and break every listing they already posted. This
needs an explicit decision, not an inherited default.

**Primary recommendation:** Build on the `sign-lease-token` + `cleanup_old_notifications` rails
exactly as CONTEXT.md directs, but (1) set retention to **24 months from disposition**, config-driven
via the existing `app_config` table, anonymize-in-place with **no archive table**; (2) restructure
the income and household fields for fair-housing neutrality; (3) put the fail-closed submission cap
in the **database**, in the same failure domain as the write, and key the Upstash submit limit on
**client IP, never on the token hash**; and (4) surface the token re-copyability tension to the
owner before building.

---

## Findings That Overturn CONTEXT.md Decisions

### F-1 — D-11's 180-day window is wrong by roughly 4x. Change it to 24 months. [VERIFIED: statute]

The evidence is unambiguous and runs in one direction only: **retain longer**.

| Clock | Length | Source | Confidence |
|-------|--------|--------|-----------|
| HUD / state agency administrative complaint | **1 year** from the discriminatory act | 42 U.S.C. § 3610(a)(1)(A)(i) — "not later than one year after an alleged discriminatory housing practice has occurred or terminated" | HIGH [VERIFIED: statute text] |
| Federal civil action | **2 years** from occurrence or termination | 42 U.S.C. § 3613(a)(1)(A) — "not later than 2 years after the occurrence or the termination of an alleged discriminatory housing practice" | HIGH [VERIFIED: statute text] |
| Tolling on top of the 2 years | Entire duration of any pending HUD/agency proceeding | 42 U.S.C. § 3613(a)(1)(B) — "The computation of such 2-year period shall not include any time during which an administrative proceeding under this subchapter was pending" | HIGH [VERIFIED: statute text] |

Practitioner guidance, three independent firms/associations in three states, all converge above
two years:

| Source | Jurisdiction | Recommendation |
|--------|-------------|----------------|
| Petrie + Pettit / Pettit Law Group | Wisconsin | "you **MUST** retain all rental applications … for at least 2 years from your last interaction with an applicant that did not become your tenant" [CITED: pettit-law.com] |
| Kimball, Tirey & St. John LLP | California | 2–3 years minimum; notes tolling "can extend the statute to three or more years"; "generally, retain records for at least four years" [CITED: kts-law.com] |
| Rental Housing Association of Washington | Washington | 3 years for fair-housing; 4 years after a resident vacates for the written agreement [CITED: rhawa.org] |

**Counter-pressure check — is there anything pushing the other way?** Searched specifically for a
US rule capping how long a landlord may retain application data. There is none.

- The **FTC Disposal Rule** (16 C.F.R. Part 682) governs disposal of *consumer report* information.
  TenantFlow obtains no consumer report (that is the whole point of APPLY-06), so it does not
  attach to this table at all. [CITED: ftc.gov guidance]
- State data-security statutes (e.g. Massachusetts **201 CMR 17**) govern *how* personal
  information is protected and destroyed, not *when*. [CITED: masslandlords.net]
- **CCPA/CPRA** § 1798.105(d) has **no** explicit "defend legal claims" exception — the nearest is
  (d)(8) "comply with a legal obligation" [VERIFIED: Cal. Civ. Code § 1798.105(d) text]. But CCPA's
  business thresholds almost certainly do not reach an individual landlord, and CPRA's storage-
  limitation rule only requires retention be "reasonable and proportionate", which a documented
  FHA-defence window plainly is.
- **GDPR** Art. 17(3)(e) *does* carry an explicit "establishment, exercise or defence of legal
  claims" exception, so the project's existing GDPR machinery does not conflict either. [ASSUMED —
  from training, not re-verified this session; low risk, it is not load-bearing.]

**Recommendation:**

- Default retention: **730 days (24 months)**.
- Clock starts at **final disposition**, not submission — the FHA clock runs from the
  discriminatory act, which is the denial, not the application. Use
  `coalesce(decided_at, created_at)` so an application abandoned in `new` still ages out.
- Store the number in the existing **`app_config`** table (`supabase/migrations/20260504162155_app_config_table_for_n8n_webhooks.sql`,
  service-role-only key/value), key `applications.retention_days`, seeded `'730'`. Phase 53 already
  uses this table for `reminders_delivery_enabled`, so the pattern is established. This lets the
  window be lengthened by an operator without a migration — which matters, because a landlord
  operating in a long-SOL state may need 4 years.
- **Do not** make it per-owner in this phase. A per-owner setting invites an owner to choose a
  short window that damages their own defence, and adds a settings surface for no product benefit.
  Note it as a possible future refinement.

### F-2 — D-11's justification for anonymize-with-stub is false. The mechanism is still right, for different reasons. [VERIFIED: reasoning from cited SOL sources]

D-11 argues: *"Anonymize-with-stub satisfies APPLY-05's 'auto-purge PII' while leaving a defensible
audit trail."*

**The stub is not a defensible audit trail.** A fair-housing defence answers one question: *why did
you deny this specific applicant, and did you treat similarly-situated applicants the same way?*
Answering it requires the applicant's identity and their stated qualifications. A stub of (unit,
submitted date, final status) proves only that an application existed. From a legal-defence
standpoint, anonymize-at-N and delete-at-N are **functionally identical** — both leave the
landlord in the "he said, she said" position that Petrie + Pettit specifically warns about.

So the choice that actually matters is the **window** (F-1), not the mechanism.

**That said, keep anonymize-with-stub**, on three honest grounds rather than the false one:

1. **Consistency.** It mirrors `anonymize_deleted_user()` and the `activity` table's
   `'[deleted user activity]'` treatment. One retention idiom in the codebase, not two.
2. **Referential integrity.** `converted_tenant_id` and the owner-side queue counts survive.
   Hard-deleting rows out from under a UI that counts them creates avoidable inconsistency.
3. **Aggregate self-audit value.** The stub supports a genuinely useful non-PII statistic — how
   many applications a unit received and the distribution of dispositions — which is a real (if
   weak) disparate-impact self-check, and carries zero retention obligation because properly
   anonymized data falls outside GDPR entirely (Recital 26).

**And do not create an archive table.** CONTEXT.md's Integration Points bullet says the sweep
should follow "archive-then-delete discipline consistent with existing retention jobs." For an
*anonymization* job that is self-defeating: an archive table would preserve verbatim the exact PII
the job exists to remove. This is the Phase 52 **C2 bug in a new costume** — `anonymize_deleted_user`
deleted live `notifications` but left `notifications_archive` populated with deleted users' data
until `20260720015620` fixed it. Anonymize **in place**. Keep the batching discipline
(`LIMIT 10000`, `FOR UPDATE SKIP LOCKED`) but drop the archive half of the pattern, and say so in
the migration header so a future reviewer does not "restore consistency" and reintroduce the leak.

### F-3 — D-05's income framing carries source-of-income discrimination risk. Restructure the fields. [VERIFIED: statute + CITED: state law]

42 U.S.C. § 3604(c) makes it unlawful "To make, print, or publish … any notice, statement, or
advertisement, with respect to the sale or rental of a dwelling that indicates any preference,
limitation, or discrimination based on race, color, religion, sex, handicap, familial status, or
national origin" [VERIFIED: statute text]. **The application form is itself a regulated surface** —
this is a schema constraint, not a copy-review item.

Three concrete consequences for D-05's field list:

**(a) Income — the real exposure.** Source of income is not a federally protected class, but it is
protected by state or local law in a large and growing set of jurisdictions: California
(Gov. Code §§ 12921, 12955(d) — "lawful, verifiable income paid directly to a tenant or paid to a
representative of a tenant"), Washington (RCW 59.18.255), New York (Human Rights Law as amended
April 12, 2019), and many municipalities [CITED: equalhousing.org, nlihc.org, dhr.ny.gov,
washingtonlawhelp.org]. D-05 frames income exclusively through employment — *employer, role, gross
monthly income, tenure*. A form that only accommodates employment income structurally
disadvantages voucher, SSI, pension, disability, and child-support recipients, and communicates a
preference for employed applicants.

> **Fix:** make `employer_name`, `employer_role`, `employment_tenure_months` **optional**. Label
> the money field "Gross monthly household income from all sources." Add a neutral
> `other_income_source` / `other_income_amount` pair. Do not add a "type of income" dropdown that
> enumerates sources — that hands the owner a filter.

**(b) Household — count only.** Occupancy standards are a legitimate business interest, so asking
occupant *count* is fine. Asking for occupants' **names, ages, or relationships** goes to familial
status. D-05 already says "occupant count" — keep it literally that. Do not let the schema drift
into `occupants jsonb` with per-person detail.

**(c) Pets vs. assistance animals.** A pets question is lawful. But assistance animals are not
pets, and a form that offers only a pets field can push a disabled applicant into either
disclosing a disability or answering inaccurately. Add a short neutral note beside the pets field
— "Assistance animals are not pets and are not subject to pet policies; you do not need to
disclose one here" — and **do not** add any field asking about disability, medical need, or
documentation. [CITED: HUD FHEO-2020-01 assistance-animal guidance; MEDIUM confidence on the exact
wording, HIGH on the principle.]

D-06's exclusions all hold and several of them are load-bearing for the same reason — no DOB
avoids age/familial-status signal, no government ID number avoids national-origin signal.

### F-4 — D-02's "shown once and never stored" collides with the reusable-link UX. Decide explicitly. [Reasoned from repo precedent — needs an owner call]

`lease_signing_tokens` stores only the hash because the raw token is emailed once and held by the
*tenant*, and because that token is a bearer credential for a PII-bearing lease PDF plus a legally
binding signature. Leak = forge a signature.

The `/apply` token has a different holder, lifetime, and blast radius:

| | `/sign` token | `/apply` token |
|---|---|---|
| Held by | Tenant | **Owner** |
| Uses | Once | **Unbounded, over weeks** |
| Distribution | One email | **Pasted publicly to Zillow, Craigslist, Facebook** |
| What a leak grants | Read tenant PII, forge a signature | **Submit a spam application** |
| Practical secrecy | Genuinely secret | **Published by design** |

The token is not really a credential here; it is an unguessable, revocable, expiring **public
capability URL**. Hash-only storage means the raw value exists exactly once, in one dialog. The
owner who posts to Zillow on Monday, closes the tab, and wants to cross-post to Craigslist on
Thursday has no way to retrieve it — their only option is to rotate, which breaks the Zillow
listing they already published. Over a 60-day expiry (D-03) this will happen.

**Options:**

| Option | Cost | Benefit |
|---|---|---|
| **A. Hash-only (D-02 as written)** + prominent "copy now, you won't see this again" + low-friction Regenerate with an explicit "this breaks links you have already posted" warning | Real, recurring owner pain; predictable support burden | Preserves the DB-leak property; zero divergence from precedent |
| **B. Store the raw token** in a column with owner-scoped SELECT RLS; keep `token_hash` unique-indexed as the public lookup key | The hash stops being a security control and becomes a lookup convenience — be honest about that in the migration comment | Link re-copyable forever; constant-time public lookup unchanged; risk is proportionate to what the token grants (spam submission) |
| C. Encrypt-at-rest via Vault and decrypt for the owner | New moving part, key management | Middle ground; not justified by the stake |

**Recommendation: B**, with the reasoning written into the migration header — *this token is a
public capability URL, not a secret; it is published to third-party listing sites by design; the
SHA-256 column is retained as the public-path lookup key so the applicant-facing Edge Function
never queries by raw value.* But this is a genuine divergence from a locked decision on a
security-shaped column, so **the planner should surface it to the owner rather than silently
choosing.** If the owner prefers A, the plan must budget for a well-designed regenerate flow with
a hard warning; A is defensible, just costlier in UX.

### F-5 — The submit rate limit must key on client IP, never on the token hash. [VERIFIED: source read]

This is the exact inverse of `sign-lease-token`, and the precedent will mislead a reader who
copies it.

In `sign-lease-token`, the `context` action is fetched **server-side** from the Next.js egress IP,
so every tenant shares one IP — which is why the code deliberately keys that bucket on
`tokenHash` (`sign-lease-token/index.ts`, `prefix: "lease-context", identifier: tokenHash`), with
a comment explaining that "one tenant's loads must not exhaust another's." The `sign` action, by
contrast, comes from the tenant's own browser and keys on IP with no `identifier` override.

For `/apply`, **all applicants for a unit share ONE token by construction (D-01).** Keying the
submit limit on `tokenHash` would mean the first applicant to hit the limit — or one attacker with
one token — locks out every legitimate applicant for that unit. That is a self-inflicted denial of
service on the phase's primary use case.

- **Submit action → key on client IP** (`rateLimit()` default, no `identifier`).
- **Page-context action** (if the page fetches render context through the function, as `/sign`
  does) → this one *does* run from the shared Next.js egress IP, so it needs the two-layer
  treatment `sign-lease-token` uses: a coarse per-IP ceiling first, then a per-token bucket. Copy
  that pattern here and only here.
- **Per-token submission cap → the database, not Upstash** (see F-6).

**Set the IP limit for humans, not for bots.** A couple applying separately from one household
NATs to one IP; a coffee shop or campus NATs dozens. `getClientIp` falls back to the literal
string `"unknown"` when headers are absent, so every header-less caller shares one bucket
(`rate-limit.ts:104`). Recommend **5 submissions per hour per IP** — generous enough for a
household or a shared-network cluster, tight enough that a single-source flood needs real
infrastructure. Do not use the newsletter function's 5/minute as a template; that endpoint has no
legitimate repeat-use case.

### F-6 — The fail-closed cap belongs in the database, because that is the same failure domain as the write.

D-04 correctly identifies that `rateLimit()` fails open (`rate-limit.ts`, `catch` → `return null`,
with the comment "Fail open: if Upstash is unreachable, allow the request through"). With
`used_at` gone, an Upstash outage removes the only throttle.

The honeypot does not close that gap — a honeypot filters *naive* bots and does nothing against a
determined flood or against a human-driven one. The structural answer:

> **A rate limit enforced in a different failure domain than the write it protects can only ever
> fail open. A limit enforced in the same failure domain as the write is fail-closed by
> construction — if the datastore is unreachable, the write does not happen either.**

Put a per-link cap in the `SECURITY DEFINER` insert RPC, inside the same transaction, under the
token row's `FOR UPDATE` lock (which the RPC already needs to validate the token). Two cheap
checks:

1. **Lifetime cap** — `submission_count` column on the link row, incremented in the same
   statement. Suggested ceiling 250 per link. A real vacancy gets 10–60 applications; 250 is
   invisible to legitimate use and bounds a flood.
2. **Rolling window cap** — `select count(*) from rental_applications where link_id = $1 and
   created_at > now() - interval '1 hour'`, ceiling ~25. Requires an index on
   `(link_id, created_at)`, which the owner-side queue wants anyway.

Both return a distinct reason code the Edge Function maps to a generic 429, so the applicant sees
"too many submissions for this listing right now, please try again later" and never learns which
layer tripped.

Answering D-04's open question directly: **yes, the DB-side cap is warranted, and it is the
primary control, not a supplement.** The layering is: honeypot (free, filters naive bots) →
Upstash per-IP (fails open, filters distributed volume) → **DB per-link cap (fails closed, bounds
worst case)**.

---

## Findings That Confirm CONTEXT.md Decisions

### Route gating is correct as written (D-13, D-14) [VERIFIED: source read]

- `grep -rn "PUBLIC_ROUTES" src/` returns nothing. Confirmed.
- `src/lib/routes/private-routes.ts:6` exports `PRIVATE_ROUTE_PREFIXES`, a 15-entry deny-list.
  `src/proxy.ts` `isPrivateRoute()` matches `pathname === prefix || pathname.startsWith(prefix + "/")`,
  and the file comment states explicitly that "Anything NOT in this list is treated as public."
  `/apply` is public by absence. **Do not touch this file** — its header warns it is imported by
  both `proxy.ts` and `robots.ts`.
- `/sign` is absent from `ROBOTS_ONLY_PRIVATE_PATHS` and relies on page-level `robots: { index:
  false, follow: false }`. `/apply` should do the same.
- `src/app/sitemap.ts` is an explicit allowlist of marketing/blog/legal URLs, so no sitemap change
  is needed.

**One addition D-14 does not cover, and it matters more here than for `/sign`:** the `/apply` URL
will be *publicly linked* from Zillow and Craigslist, so crawlers will actually reach it —
unlike `/sign`, whose URL only ever appears in one email. That makes it tempting to add `/apply`
to `ROBOTS_ONLY_PRIVATE_PATHS`. **Do not.** Google's documentation is explicit: "For the noindex
rule to be effective, the page must not be blocked by a robots.txt file. If the page is blocked by
a robots.txt file, the crawler will never see the noindex rule, and the page can still appear in
search results" [CITED: developers.google.com/search/docs/crawling-indexing/block-indexing].
Adding the disallow would make indexing *more* likely, not less. Meta `noindex` alone is correct
and sufficient.

### Anonymize-not-delete as the mechanism (D-11, partial) — see F-2.

### Everything else stands

D-01, D-03, D-05 (structure, subject to F-3's field adjustments), D-06, D-07, D-08, D-09, D-10,
D-12 are confirmed. D-10 in particular is well-reasoned and reinforced by the FCRA analysis below:
a platform-sent rejection notice would be adverse-action-shaped communication from a party that
takes no adverse action, which is exactly the confusion APPLY-06 exists to prevent.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Render `/apply/[token]` page + token-validity state | Frontend Server (RSC) | — | Mirrors `/sign/[token]`: `force-dynamic` Server Component fetching context server-side. No client secret involved. |
| Applicant form input + honeypot + client validation | Browser | — | TanStack Form. Client validation is UX only; the Edge Function re-validates everything. |
| Applicant submission (write) | **Edge Function (`verify_jwt=false`)** | Database (SECURITY DEFINER RPC) | APPLY-02 mandates it. The applicant has no JWT; the token is the capability. Never an anon RLS INSERT. |
| Token validation, submission caps, insert | **Database (SECURITY DEFINER RPC)** | — | Must be atomic with the write and fail-closed (F-6). The Edge Function orchestrates; the DB decides. |
| Per-IP rate limiting | Edge Function (Upstash) | — | Fails open; a volume filter, not a boundary (F-6). |
| Owner: generate / revoke / regenerate link | Browser → Database (PostgREST + RPC) | — | Authenticated owner, RLS-scoped. Token generation must be server-side (`gen_random_bytes`) so the raw value never depends on client entropy. |
| Owner: review queue, status transitions | Browser → Database (PostgREST) | — | Standard owner-scoped RLS reads/writes with `{ count: 'exact' }` pagination. |
| Convert to tenant | Browser (existing `AddTenantForm`) | Database | D-08: human-in-the-loop. Reuses the existing form + `useCreateTenantMutation`. |
| Owner notification on submission | Database (`create_notification` inside the insert RPC) | — | NOTIF-01 single-writer invariant — never a direct `insert into notifications`. |
| Retention anonymization sweep | Database (pg_cron + SECURITY DEFINER fn) | — | Mirrors `cleanup_old_notifications()`. No Edge Function, no external call. |
| GDPR cascade | Database (`anonymize_deleted_user` redefinition) | — | D-12. |
| FCRA / fair-housing disclaimer | Browser (applicant-facing form) | — | APPLY-06 requires it on the surface the applicant sees before submitting. |

---

## Standard Stack

### Core — all already present, no installs

| Library | Version (verified in `package.json`) | Purpose | Why Standard |
|---------|--------------------------------------|---------|--------------|
| `next` | 16.2.12 | `/apply/[token]` RSC page, owner routes | Project framework [VERIFIED: package.json] |
| `react` | 19.2.8 | — | [VERIFIED: package.json] |
| `@tanstack/react-form` | ^1.32.0 | Applicant form + owner surfaces | Project convention; `useAppForm` from `src/lib/forms/form-hook.tsx` [VERIFIED: source read] |
| `@tanstack/react-query` | (in deps) | Owner queue data via `queryOptions()` factories | CLAUDE.md Zero Tolerance rule 9 |
| `zod` | ^4.4.3 | Validation schemas both sides of the boundary | Project convention [VERIFIED: package.json] |
| `@supabase/supabase-js` | ^2.105.4 | PostgREST + RPC | [VERIFIED: package.json] |
| `lucide-react` | ^1.16.0 | Icons — sole icon library | CLAUDE.md Zero Tolerance rule 10 |

### Edge Function runtime — import map already covers it

`supabase/functions/deno.json` [VERIFIED: source read] already maps every specifier this phase
needs: `@supabase/supabase-js` (esm.sh 2.97.0), `@sentry/deno@9`, `@upstash/ratelimit`,
`@upstash/redis`. **No new entry required.** The new function block in `config.toml` must carry
`import_map = "./functions/deno.json"` — omitting it fails the deploy with a bare-specifier
resolution error, which the config file documents at length.

### Supporting — in-repo modules, import directly (no barrel files)

| Module | Purpose |
|--------|---------|
| `_shared/cors.ts` | `getCorsHeaders` / `getJsonHeaders` / `handleCorsOptions` |
| `_shared/errors.ts` | `errorResponse` — never leak `err.message` |
| `_shared/env.ts` | `validateEnv` — call inside `Deno.serve`, not at module level |
| `_shared/rate-limit.ts` | `rateLimit` — read F-5/F-6 before using |
| `_shared/escape-html.ts` | Only if any applicant value reaches an HTML template |
| `_shared/supabase-client.ts` | `createAdminClient` |
| `#lib/db-insert` → `omitUndefined` | Strips `undefined` (KEEPS `null`) for `exactOptionalPropertyTypes` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge Function insert | Anonymous RLS INSERT policy on `rental_applications` | **Forbidden by APPLY-02.** Also strictly worse: an `anon` INSERT policy cannot enforce a per-link cap atomically, cannot rate-limit, and grants PostgREST a write surface that is discoverable and abusable directly, bypassing every check. |
| Honeypot + DB cap | hCaptcha / Turnstile / reCAPTCHA | Violates the "no new npm runtime dependencies" invariant, adds a third-party script to a public page (CSP change), and introduces an accessibility burden on the applicant. Revisit only if abuse is observed in production. |
| `app_config` for the retention window | Hardcoded interval in the cron function | Hardcoding forces a migration to lengthen the window — the wrong friction on a value with real legal consequence (F-1). |
| Discrete reference columns | `references jsonb` | `references` is a **reserved SQL word** and cannot be used unquoted as a column name. Beyond that, jsonb defeats the typed-mapper convention. Use `reference_1_name` … `reference_2_phone`. |

**Installation:** none. This phase installs nothing.

---

## Package Legitimacy Audit

**No packages are installed by this phase.**

`.planning/REQUIREMENTS.md` Out of Scope records "New npm runtime dependencies — Research-verified
zero needed; every feature rides an existing rail." That invariant holds here: every capability
maps to a module already in `package.json` or `supabase/functions/deno.json`
[VERIFIED: source read of both files].

| Package | Registry | Disposition |
|---------|----------|-------------|
| — | — | No new packages. Section satisfied vacuously. |

**Packages removed due to slopcheck [SLOP] verdict:** none — no packages evaluated.
**Packages flagged as suspicious [SUS]:** none.

If the planner finds a capability that appears to need a new dependency, that is a signal to
re-derive it from existing rails, not to install — and it must be escalated, because it
contradicts a recorded milestone invariant.

---

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────── APPLICANT (no account) ────────────────┐
                         │                                                        │
   Zillow / Craigslist   │   GET /apply/<raw-token>                                │
   listing link ─────────┼──────────────►  Next.js proxy                           │
                         │                 (not in PRIVATE_ROUTE_PREFIXES          │
                         │                  → passes through, no auth)             │
                         │                        │                                │
                         │                        ▼                                │
                         │                 RSC page (force-dynamic)                │
                         │                 metadata: noindex,nofollow              │
                         │                        │                                │
                         │            server-side POST {action:"context"}          │
                         │                        ▼                                │
                         │        ┌──────────────────────────────────┐             │
                         │        │  Edge Fn: apply-token            │             │
                         │        │  verify_jwt = false              │             │
                         │        └──────────────────────────────────┘             │
                         │                        │ RPC (service_role)             │
                         │                        ▼                                │
                         │             get_application_context(hash)               │
                         │              → {valid, reason, unit_label,              │
                         │                 property_label}                         │
                         │                        │                                │
                         │      ┌─────────────────┴─────────────────┐              │
                         │   invalid/expired/revoked            valid              │
                         │      ▼                                  ▼              │
                         │   uniform "unavailable" card      APPLICATION FORM       │
                         │   (no validity leak via status)   + FCRA disclaimer      │
                         │                                   + honeypot field       │
                         │                                   + form_loaded_at       │
                         │                                         │               │
                         │           browser POST {action:"submit"} │               │
                         └─────────────────────────────────────────┼───────────────┘
                                                                   ▼
                              ┌─────────────────────────────────────────────────┐
                              │  Edge Fn: apply-token — submit                   │
                              │  1. CORS origin check (exact APP_URL)            │
                              │  2. honeypot filled? → 200 {ok} SILENT DROP      │
                              │  3. form_loaded_at < 3s? → 200 {ok} SILENT DROP  │
                              │  4. rateLimit(IP, 5/hr)  ← FAILS OPEN            │
                              │  5. zod validate payload                          │
                              └─────────────────────────────────────────────────┘
                                                   │ RPC (service_role)
                                                   ▼
                    ┌────────────────────────────────────────────────────────────┐
                    │  submit_rental_application(hash, payload, ip, ua, idem)     │
                    │  SECURITY DEFINER · search_path=public · service_role only  │
                    │                                                             │
                    │  SELECT link ... FOR UPDATE       ◄── serializes            │
                    │  ├─ revoked? expired?             → reason code             │
                    │  ├─ submission_count >= 250       → 'link_capped'  FAIL-CLOSED
                    │  ├─ count(1h window) >= 25        → 'rate_capped'  FAIL-CLOSED
                    │  ├─ INSERT rental_applications                              │
                    │  │     ON CONFLICT (submission_id) DO NOTHING  ◄─ idempotent│
                    │  ├─ UPDATE link SET submission_count += 1                   │
                    │  └─ PERFORM create_notification(owner, ...)  ◄── NOTIF-01   │
                    └────────────────────────────────────────────────────────────┘
                                                   │
        ┌──────────────────────────────────────────┼──────────────────────────────────┐
        ▼                                          ▼                                  ▼
  OWNER QUEUE (authenticated, RLS)          pg_cron 03:55 UTC              anonymize_deleted_user()
  /applications                             anonymize_old_applications()   (GDPR, owner deletes acct)
   ├─ list per unit, {count:'exact'}         coalesce(decided_at,           ├─ DELETE rental_applications
   ├─ status: new→reviewing→                   created_at) < now()          └─ DELETE from any archive
   │    approved|rejected  (sets decided_at)   - app_config.retention_days      ◄── C2 LESSON
   └─ [Approve] → /tenants/new?application=<id>  (default 730)
                       │                        LIMIT 10000
                       ▼                        FOR UPDATE SKIP LOCKED
              AddTenantForm (prefill)           PII → '[deleted]', anonymized_at = now()
              → tenants row                     NO ARCHIVE TABLE (would re-leak the PII)
              → applications.converted_tenant_id
```

### Recommended Project Structure

```
src/app/apply/[token]/
├── page.tsx                    # RSC, force-dynamic, noindex — mirrors src/app/sign/[token]/page.tsx
└── apply-context.ts            # pure fetch + reason-message logic (unit-testable, mirrors sign-context.ts)

src/components/applications/
├── rental-application-form.tsx # 'use client', useAppForm, honeypot, FCRA disclaimer
├── application-form-options.ts # formOptions({ defaultValues })
├── application-fields-*.tsx    # split to stay under 300 lines/component
├── application-queue.tsx       # owner review queue
├── application-detail-sheet.tsx
└── application-status-badge.tsx

src/app/(owner)/applications/
├── page.tsx                    # queue
└── [id]/page.tsx               # detail + Approve → /tenants/new?application=<id>

src/components/units/
└── application-link-panel.tsx  # generate / copy / revoke / regenerate

src/hooks/api/query-keys/
├── application-keys.ts         # queryOptions() factories + mapRentalApplicationRow
└── application-link-keys.ts

src/lib/validation/
└── rental-applications.ts      # zod schemas shared by the client form and (mirrored) the Edge Fn

supabase/functions/apply-token/
└── index.ts                    # verify_jwt=false; actions: context | submit

supabase/migrations/
├── <ts>_rental_applications_schema.sql       # tables, RLS, grants, indexes, RPCs
├── <ts>_rental_applications_retention.sql    # app_config seed, anonymize fn, cron
└── <ts>_rental_applications_gdpr_cascade.sql # anonymize_deleted_user redefinition
```

### Pattern 1: Public unauthenticated write — the full boundary

**What:** The applicant has no JWT. The token in the URL is the capability. The Edge Function
holds the service-role key and is the *only* writer.

**When to use:** Any public write in this codebase. `sign-lease-token` and `newsletter-subscribe`
are the two precedents.

**The four layers that must all be present:**

1. **`config.toml` block** — `verify_jwt = false` + `import_map` + a comment documenting the auth
   mechanism. The file's own guidance requires the comment.
2. **Function-side** — CORS preflight first, `validateEnv` inside `Deno.serve`, honeypot, rate
   limit, zod validation, then a single RPC call. `errorResponse()` for every failure.
3. **Table grants** — Supabase's schema default privileges grant `anon` and `authenticated`
   table-level DML on new `public` tables. RLS still gates rows, but the stated posture must be
   enforced at the grant layer too. Precedent: `20260720001657` explicitly ran
   `revoke all on table public.notifications_archive from authenticated;` / `from anon;` for
   exactly this reason. **Do the same here:**

   ```sql
   revoke all on table public.rental_applications      from anon;
   revoke all on table public.rental_application_links from anon;
   ```
   (Keep `authenticated` grants — the owner reads these tables through PostgREST.)
4. **RPC grants** — `revoke all on function ... from public;` then
   `grant execute on function ... to service_role;`. Postgres auto-grants EXECUTE to PUBLIC at
   creation, and `anon`/`authenticated` inherit PUBLIC, so the revoke is load-bearing. This is
   documented at length in `20260529225039_revoke_anon_security_definer_rpcs_v2.sql`.

**RLS shape when the only writer is a service-role Edge Function:**

```sql
alter table public.rental_applications enable row level security;

-- Owner reads and manages their own applications. No INSERT policy for
-- authenticated: every row is written by submit_rental_application()
-- (SECURITY DEFINER, service_role). This mirrors lease_signing_tokens,
-- which deliberately has no write policies at all.
create policy rental_applications_select
  on public.rental_applications for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy rental_applications_update
  on public.rental_applications for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy rental_applications_delete
  on public.rental_applications for delete to authenticated
  using (owner_user_id = (select auth.uid()));

-- NO anon policies of any kind. NO authenticated INSERT policy.
-- NO `FOR ALL` on an authenticated table (rls-policies skill, one policy
-- per operation per role).
```

The UPDATE policy needs a `with check` that pins `owner_user_id` so an owner cannot re-parent a
row. Consider also constraining the settable columns — an owner should be able to change `status`,
`decided_at` and `owner_notes`, but not rewrite `applicant_email`. A column-level GRANT or a
dedicated `set_application_status` RPC is cleaner than trusting the client; recommend the RPC,
since it also needs to stamp `decided_at` atomically (which the retention clock depends on, F-1).

### Pattern 2: Token generation server-side

The raw token must never depend on client entropy and must never transit as a query parameter.

```sql
create function public.create_application_link(p_unit_id uuid, p_expires_days int default 60)
  returns table (link_id uuid, raw_token text)
  language plpgsql security definer set search_path = public
as $function$
declare
  v_owner uuid := (select auth.uid());
  v_raw   text;
begin
  if v_owner is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.units where id = p_unit_id and owner_user_id = v_owner)
    then raise exception 'unit not found'; end if;

  -- 256 bits, hex-encoded. gen_random_bytes is pgcrypto (already installed).
  v_raw := encode(gen_random_bytes(32), 'hex');

  return query
  insert into public.rental_application_links
    (unit_id, owner_user_id, token_hash, expires_at, created_by)
  values
    (p_unit_id, v_owner, encode(digest(v_raw, 'sha256'), 'hex'),
     now() + make_interval(days => p_expires_days), v_owner)
  returning id, v_raw;
end;
$function$;

revoke all on function public.create_application_link(uuid, int) from public;
grant execute on function public.create_application_link(uuid, int) to authenticated;
```

This RPC gates on `auth.uid()` internally and is therefore safe to grant to `authenticated` —
the same posture as the 19 functions in `20260529225039`. If F-4 option B is chosen, add the raw
token to the insert and drop it from the `returning`-only path.

### Pattern 3: Honeypot that is actually a layer

```tsx
{/* Bot trap. A real applicant never sees or focuses this. Server treats a
    non-empty value as spam and returns a silent success. Do NOT name it
    "honeypot" and do NOT use type="hidden" — both are trivially detected. */}
<div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
  <label htmlFor="company_website">Company website</label>
  <input
    id="company_website"
    name="company_website"
    type="text"
    tabIndex={-1}
    autoComplete="off"
    value={honeypot}
    onChange={(e) => setHoneypot(e.target.value)}
  />
</div>
```

Server side:

```ts
// Silent success — never 400. A 400 teaches the bot which field is the trap.
if (typeof body.company_website === "string" && body.company_website.length > 0) {
  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: getJsonHeaders(req),
  });
}

// Timing heuristic. NOT a security control — form_loaded_at is client-supplied
// and trivially forged. It filters naive bulk bots only; the DB cap is the
// actual bound. Industry guidance pairs honeypot + timing at a 3-10s threshold.
const loadedAt = Number(body.form_loaded_at);
const elapsed = Date.now() - loadedAt;
if (!Number.isFinite(loadedAt) || elapsed < 3_000 || elapsed > 86_400_000) {
  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: getJsonHeaders(req),
  });
}
```

Honeypot alone removes 80–95% of bot traffic; paired with a 3–10s timing check the figure quoted
across form-tooling vendors is ~99.5% [CITED: reform.app, formidableforms.com — MEDIUM confidence,
vendor-published figures, directionally consistent across sources].

**Accessibility:** off-screen positioning + `aria-hidden="true"` + `tabIndex={-1}` keeps the field
out of the accessibility tree and out of the tab order. Never use `display:none` alone (some bots
check for it) and never use `type="hidden"` (skipped by modern bots, and it is the single most
detected pattern).

### Pattern 4: Idempotent submission

Double-click and network-retry must not create two rows; a genuine second application must.

```ts
// Client, generated once per form mount:
const submissionId = useRef(crypto.randomUUID()).current;
```

```sql
submission_id uuid not null unique,
...
insert into public.rental_applications (...) values (...)
on conflict (submission_id) do nothing;
```

If `on conflict` swallowed the row, return success anyway — the applicant already submitted. A
page refresh mints a new `submission_id`, so a deliberate re-application still works. **Do not**
put a unique constraint on `(link_id, lower(applicant_email))` — that would block a rejected
applicant from re-applying and would break two people from one household applying with a shared
email.

Duplicate detection belongs in the **owner's queue as a visual flag**, not in a write-time
constraint.

### Anti-Patterns to Avoid

- **Anonymous RLS INSERT policy on the applications table.** Forbidden by APPLY-02 and structurally
  incapable of enforcing the caps.
- **Keying the submit rate limit on the token hash.** Self-DoS (F-5).
- **An archive table for the retention sweep.** Re-leaks the PII the sweep exists to remove (F-2).
- **`on delete cascade` on `rental_applications.unit_id`.** Units are hard-deletable
  (`unit-keys.ts:308` exposes a delete mutation), so a cascade would destroy fair-housing evidence
  the moment an owner tidies up a unit. Use `on delete set null` plus denormalized
  `property_label` / `unit_label` text snapshots taken at submission. The cascade in D-02 is for
  the *link* table, where it is correct — a link to a deleted unit is meaningless.
- **PII in query parameters.** `/tenants/new?email=…&name=…` leaks applicant PII into Vercel
  access logs, browser history, and the `Referer` header on any outbound link. Pass the
  application **id** only.
- **`references` as a column name.** Reserved SQL word.
- **Direct `insert into notifications`.** Violates the NOTIF-01 single-writer invariant. Use
  `create_notification(...)` — signature verified in
  `20260719193759_create_notification_and_reconcile_rls.sql`:
  `(p_user_id uuid, p_type text, p_title text, p_message text default null, p_entity_type text default null, p_entity_id uuid default null, p_action_url text default null)`.
- **Leaking token validity through HTTP status.** `/sign` deliberately returns `200 { valid:false,
  reason }` for every token state. Match it.
- **A `FOR ALL` policy on an authenticated table.** Cost the project a review finding already
  (C5, `20260720001657`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Random token generation | `Math.random()`, `crypto.randomUUID()` as a token, client-side entropy | `encode(gen_random_bytes(32),'hex')` in the DB | 256 bits, CSPRNG, server-side, never transits as a param. A UUID v4 is only 122 bits and is structured. |
| Token hashing | Manual hex loops | `encode(digest(t,'sha256'),'hex')` (pgcrypto) in SQL; `sha256Hex()` from `_shared/lease-signing.ts` in Deno | Both already exist and are already used by the `/sign` path. |
| Rate limiting | In-memory counters in the Edge Function | `rateLimit()` from `_shared/rate-limit.ts` | Deno isolates are ephemeral and horizontally scaled; an in-isolate counter limits nothing. Read F-5/F-6 for how to configure it. |
| Client IP extraction | `x-forwarded-for.split(',')[0]` | `getClientIp` inside `_shared/rate-limit.ts` | The **first** XFF segment is attacker-controlled — trusting it lets an attacker rotate fake IPs and bypass the limit entirely. The shared helper takes `cf-connecting-ip` then the **last** segment, and documents why. |
| CORS | Hand-rolled headers or `*` | `getCorsHeaders(req)` / `handleCorsOptions(req)` | Fail-closed when `NEXT_PUBLIC_APP_URL` is unset; returns `{}` on origin mismatch. |
| Error responses | `JSON.stringify({error: err.message})` | `errorResponse(req, status, err, ctx)` | Logs to Sentry + structured console, returns a generic `{error:'An error occurred'}`. Raw messages leak schema. |
| Env validation | `Deno.env.get()` inline | `validateEnv({required, optional})` inside `Deno.serve` | Module-level reads run at import and fail the whole isolate. |
| Retention batching | `delete from ... where created_at < ...` unbounded | `LIMIT 10000` + `FOR UPDATE SKIP LOCKED`, per `cleanup_old_notifications()` | Bounds lock duration and WAL pressure; safe under concurrency. |
| Cron scheduling | Inline SQL in `cron.schedule()` | Named SECURITY DEFINER function | CLAUDE.md rule. Inline SQL is unversioned and untestable. |
| Form state | `useState` per field | `useAppForm` from `#lib/forms/form-hook` | Project convention; typed field components. Note the documented caveat: field components assert their value type and the registry does **not** cross-check, so `NumberField` on a `string` field compiles clean and silently writes the wrong type. |
| Insert payload shaping | Manual `undefined` stripping | `omitUndefined` from `#lib/db-insert` | Handles the `exactOptionalPropertyTypes` mismatch. **KEEPS `null`, strips `undefined`** — send explicit `null` to clear a column. |
| PostgREST row typing | `as unknown as` | A `mapRentalApplicationRow()` typed mapper | CLAUDE.md Zero Tolerance rule 8. Reference: `mapDocumentRow` in `document-keys.ts:122`. |
| Bot defence | A CAPTCHA dependency | Honeypot + timing + IP limit + **DB cap** | The DB cap is the only fail-closed layer and needs no third party. Revisit CAPTCHA only on observed abuse. |

**Key insight:** every non-trivial primitive this phase needs already exists in the repo, built and
reviewed. The phase's genuine engineering novelty is small — a table, a function, a queue, a cron.
Its genuine risk is entirely in the decisions *around* those, which is why the findings section is
longer than the patterns section.

---

## Runtime State Inventory

> This is a greenfield feature, so the classic rename-phase inventory does not apply. Two
> categories are nevertheless live-state dependent and must be reconciled against production before
> the plan commits to specifics.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no `applications` / `rental_applications` table exists (`grep` of `src/types/supabase.ts` returns nothing) | None |
| Live service config | **pg_cron `cron.job` table.** The repo shows 3 AM slots occupied at `:00`, `:15`, `:30`, `:45`, `:50`. Migrations are not a reliable mirror of prod (see `migration-mcp-prod-drift` memory + the C7 fix that moved `cleanup-notifications` from `:45` to `:50` after a collision) | Planner MUST verify live slots via `select jobname, schedule from cron.job` before choosing. **Recommend `'55 3 * * *'`** — free in the repo view, and after `process-account-deletions` so the GDPR cascade runs first |
| Live service config | **`anonymize_deleted_user()` live definition.** `create or replace` replaces the whole body. The established practice in `20260720015620` is to redefine "from the live prod definition" with the single change added | Fetch the live `pg_get_functiondef` first; do NOT re-apply the repo copy blindly |
| OS-registered state | None | None |
| Secrets / env vars | `UPSTASH_REDIS_REST_URL` / `_TOKEN` (rate limit), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_APP_URL` — all already set for existing functions; **no new secret required** | None, assuming the new function inherits project-level secrets (it does — Supabase Edge secrets are project-scoped) |
| Build artifacts | Edge Function deploy is **not** automatic. The new `apply-token` function must be deployed explicitly, and `supabase functions deploy` 401s with the current PAT | Deploy via `bun scripts/deploy-edge-functions.ts` (disk-reading, avoids the MCP model-emission corruption trap documented in `edge-deploy-mcp-fidelity`). Verify with `curl -i` + `x-deno-execution-id` per the `config.toml` runbook |
| Build artifacts | `src/types/supabase.ts` is generated and will not contain the new tables until regenerated | `bun run db:types` after migrations apply (owner-run; PAT refresh may be needed) |

---

## Common Pitfalls

### Pitfall 1: CORS fails when the applicant arrives on a non-canonical host

**What goes wrong:** The browser POST to the Edge Function returns a response the browser refuses
to expose; the applicant sees a generic failure with no server-side error.

**Why it happens:** `getCorsHeaders` returns `{}` unless `req.headers.get("origin") === Deno.env.get("NEXT_PUBLIC_APP_URL")`
— an exact string comparison [VERIFIED: `_shared/cors.ts` source]. Any divergence (a `www.`
subdomain, a trailing slash in the env var, a preview deployment URL) breaks it. This has never
bitten `/sign` because those URLs are minted by the app itself and arrive only through email. But
`/apply` URLs are pasted by owners into third-party listing sites, retyped, shortened, and
occasionally normalized by those sites — a non-canonical host is a realistic arrival path.

**How to avoid:** Confirm the Vercel `www` → apex redirect fires as a 308 *before* the page renders
(so `origin` is already canonical by the time the form loads), verify `NEXT_PUBLIC_APP_URL` has no
trailing slash, and construct the copy-to-clipboard link from `NEXT_PUBLIC_APP_URL` rather than
`window.location.origin`. If preview-deployment testing is needed, note that CORS will fail there
by design and test on a canonical host.

**Warning signs:** Submissions succeed from the owner's own browser but fail for applicants;
Edge Function logs show a 200 with no corresponding row (they don't — the fetch never completes);
browser console shows a CORS error with no server error.

### Pitfall 2: The retention sweep destroys the landlord's defence (the phase's biggest risk)

**What goes wrong:** An applicant files a HUD complaint at month 11. The landlord's records were
anonymized at month 6. The landlord cannot produce a non-discriminatory reason for the denial and
is in the "he said, she said" position.

**Why it happens:** D-11's 180 days is shorter than the 1-year HUD window and 4x shorter than the
tolled federal civil window (F-1).

**How to avoid:** 24 months, clocked from `coalesce(decided_at, created_at)`, config-driven via
`app_config`. Write the reasoning and the statutory citations into the migration header so the
next person to "tighten privacy" sees why the number is what it is.

**Warning signs:** Any proposal to shorten the window "for privacy" without citing a legal source
that requires it. There isn't one.

### Pitfall 3: The GDPR cascade misses a second table

**What goes wrong:** An owner deletes their account. Live applications are removed. A stale copy of
applicant PII survives somewhere else indefinitely.

**Why it happens:** **This exact bug already shipped once.** `anonymize_deleted_user` deleted from
`notifications` but not `notifications_archive`, and the fix (C2, `20260720015620`) had to add
`delete from public.notifications_archive where user_id = p_user_id;`.

**How to avoid:** The F-2 recommendation of *no archive table* removes the second surface entirely,
which is the strongest form of the fix. If the planner overrides that and creates one anyway, the
cascade MUST cover both, and an RLS integration test must assert zero rows in both after deletion.

**Warning signs:** A `_archive` table appearing in the retention migration.

### Pitfall 4: The submit rate limit locks out real applicants

**What goes wrong:** Two people in one household apply separately; the second is rejected. Or an
apartment-hunting group at a coffee shop all get 429s.

**Why it happens:** Either keying on `tokenHash` (F-5 — catastrophic, one applicant blocks all) or
copying `newsletter-subscribe`'s 5/minute (too tight for NAT).

**How to avoid:** Key on client IP with **no `identifier` override**, limit 5/hour. Return a
message that names the retry path, not a bare "Too many requests."

**Warning signs:** Any `identifier: tokenHash` on the submit action.

### Pitfall 5: `config.toml` block missing `import_map`

**What goes wrong:** Deploy fails with `Failed to bundle the function (reason: Relative import path "@sentry/deno" not prefixed with / or ./ or ../)`.

**Why it happens:** Every function transitively imports `@sentry/deno` via `_shared/errors.ts`, a
bare specifier resolved through the project-wide import map. Without an explicit `import_map` line
the CLI looks for a per-function `deno.json` and finds nothing. `config.toml` documents this at
length; it is the first thing its guidance block says.

**How to avoid:** The new block must be:

```toml
# Rental application intake — PUBLIC: the applicant has no account. The
# reusable posting token in the /apply/<token> URL is the capability. Validated
# by SHA-256-hashed lookup inside a SECURITY DEFINER RPC that also enforces the
# fail-closed per-link submission caps. Per-IP rate-limited. NOT Supabase JWT.
[functions.apply-token]
verify_jwt = false
import_map = "./functions/deno.json"
```

### Pitfall 6: Prefill silently drops on one of two call sites

**What goes wrong:** Approving from the queue prefills the tenant form when the user lands on
`/tenants/new` directly, but not when the intercepting-route modal opens — or vice versa.

**Why it happens:** `AddTenantForm` is rendered from **two** places:
`src/app/(owner)/tenants/new/page.tsx` and
`src/app/(owner)/@modal/(.)tenants/new/page.tsx` [VERIFIED: source read of both]. Both construct
`addTenantFormOptions` the same way and both must forward the new prefill prop.

**How to avoid:** Add `initialValues?: Partial<AddTenantFormValues>` to `AddTenantForm`, spread it
over `addTenantFormOptions.defaultValues`, and update both call sites in the same task. A unit test
must cover both — `@modal/(.)tenants/new/page.test.tsx` already exists.

### Pitfall 7: `exactOptionalPropertyTypes` / `noUncheckedIndexedAccess` friction

**What goes wrong:** Type errors that look like nullability bugs but are strictness artifacts.

**Why it happens:** Both are on [VERIFIED: `tsconfig.json:32,35`]. A form field typed
`string | undefined` will not assign to a Supabase Insert type expecting `string | null` or
omission. Every array index and `Record` lookup is `T | undefined`.

**How to avoid:** `omitUndefined()` on every insert payload — remembering it **keeps `null`** and
strips only `undefined`, so clearing an optional column requires an explicit `null`. Guard every
indexed access before use. In the typed mapper, follow `mapDocumentRow`'s `requireString()` idiom
rather than casting.

### Pitfall 8: Adding an application fee later pulls in a per-state regime

**What goes wrong:** A future "collect a $50 application fee" feature quietly imports a body of
state law.

**Why it happens:** California Civ. Code § 1950.6 caps the screening fee (CPI-adjusted, ~$64.50 as
of Dec 2023), requires an itemized receipt, requires the fee not exceed actual out-of-pocket cost,
requires any unused portion be refunded, permits collection only when a unit is available or
reasonably expected to be, and requires a copy of the consumer credit report within seven days
[CITED: Cal. Civ. Code § 1950.6 via codes.findlaw.com, bpoa.org, aagla.org]. Several other states
have analogous rules.

**How to avoid:** Note in the plan that **not** collecting a fee is a deliberate positioning
benefit, alongside not screening. If a fee is ever proposed, it is a phase of its own with a
50-state content problem, not a form field.

### Pitfall 9: Adding an archive table or a cross-owner applicant view would create FCRA exposure

See §"FCRA" below. This is the one architectural invariant that keeps APPLY-06's disclaimer
truthful, and it is easy to violate with a feature that sounds helpful.

---

## Code Examples

### The insert RPC — atomic validation, fail-closed caps, notification

```sql
-- Source: pattern composed from sign_lease_with_token
-- (20260617142623_token_based_lease_esignature.sql) + create_notification
-- (20260719193759) + cleanup_old_notifications batching (20260719202447).

create function public.submit_rental_application(
  p_token_hash    text,
  p_submission_id uuid,
  p_payload       jsonb,
  p_ip            text,
  p_user_agent    text
)
  returns table (success boolean, reason text)
  language plpgsql
  security definer
  set search_path = public
as $function$
declare
  v_link      record;
  v_recent    integer;
  v_app_id    uuid;
  v_unit      record;
begin
  -- FOR UPDATE serializes concurrent submissions against the same link, so the
  -- caps below cannot be raced. This is the fail-closed layer: it lives in the
  -- same failure domain as the insert, unlike the Upstash limiter which fails open.
  select id, owner_user_id, unit_id, expires_at, revoked_at, submission_count
  into v_link
  from public.rental_application_links
  where token_hash = p_token_hash
  for update;

  if v_link.id is null      then return query select false, 'invalid_token'::text; return; end if;
  if v_link.revoked_at is not null then return query select false, 'revoked_token'::text; return; end if;
  if v_link.expires_at <= now()    then return query select false, 'expired_token'::text; return; end if;

  if v_link.submission_count >= 250 then
    return query select false, 'link_capped'::text; return;
  end if;

  select count(*) into v_recent
  from public.rental_applications
  where link_id = v_link.id and created_at > now() - interval '1 hour';
  if v_recent >= 25 then
    return query select false, 'rate_capped'::text; return;
  end if;

  -- Denormalized labels so the row survives a hard unit delete with a
  -- meaningful stub (units are hard-deletable; see unit-keys.ts delete mutation).
  select u.unit_number, p.name as property_name
  into v_unit
  from public.units u
  left join public.properties p on p.id = u.property_id
  where u.id = v_link.unit_id;

  insert into public.rental_applications (
    owner_user_id, link_id, unit_id, property_label, unit_label,
    submission_id, status,
    applicant_first_name, applicant_last_name, applicant_email, applicant_phone,
    -- ... remaining payload columns ...
    submitted_ip, submitted_user_agent
  )
  values (
    v_link.owner_user_id, v_link.id, v_link.unit_id,
    coalesce(v_unit.property_name, 'Property'), v_unit.unit_number,
    p_submission_id, 'new',
    p_payload->>'first_name', p_payload->>'last_name',
    lower(p_payload->>'email'), p_payload->>'phone',
    -- ...
    p_ip, left(coalesce(p_user_agent, ''), 500)
  )
  on conflict (submission_id) do nothing
  returning id into v_app_id;

  -- Duplicate submit (double-click / retry): already recorded, report success.
  if v_app_id is null then
    return query select true, 'duplicate'::text; return;
  end if;

  update public.rental_application_links
  set submission_count = submission_count + 1
  where id = v_link.id;

  -- NOTIF-01 single-writer invariant: never insert into notifications directly.
  perform public.create_notification(
    v_link.owner_user_id,
    'application',
    'New rental application',
    'A new application was submitted for ' || coalesce(v_unit.unit_number, 'a unit') || '.',
    'rental_application',
    v_app_id,
    '/applications/' || v_app_id::text
  );

  return query select true, null::text;
end;
$function$;

revoke all on function public.submit_rental_application(text, uuid, jsonb, text, text) from public;
grant execute on function public.submit_rental_application(text, uuid, jsonb, text, text) to service_role;
```

Note `'application'` must be added to the `notifications_notification_type_check` constraint —
and the C1 lesson applies: if any archive table was created with `LIKE ... INCLUDING ALL`, it
copied the old CHECK and will reject the new type when a row ages out. Verify the live constraint
before assuming.

### The retention sweep — anonymize in place, no archive

```sql
-- Source: batching pattern from cleanup_old_notifications()
-- (20260719202447_notifications_retention_cron.sql).
--
-- RETENTION WINDOW: 24 months, NOT 180 days. Do not shorten this without a
-- legal source that requires it — there is none, and the pressure runs the
-- other way. An applicant has 1 year to file a HUD complaint
-- (42 U.S.C. 3610(a)(1)(A)(i)) and 2 years to file a federal civil action
-- (42 U.S.C. 3613(a)(1)(A)), tolled for the whole duration of any pending
-- administrative proceeding (3613(a)(1)(B)) — so real exposure exceeds 3 years.
-- Purging earlier destroys the landlord's own defence evidence.
--
-- NO ARCHIVE TABLE, deliberately. The archive-then-delete pattern used
-- elsewhere would preserve verbatim the PII this job exists to remove. That is
-- the C2 bug (20260720015620) in a new costume.

create or replace function public.anonymize_old_rental_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days     integer;
  v_count    integer := 0;
begin
  select coalesce(nullif(value, '')::integer, 730) into v_days
  from public.app_config where key = 'applications.retention_days';
  v_days := coalesce(v_days, 730);

  with due as (
    select id from public.rental_applications
    where anonymized_at is null
      and converted_tenant_id is null           -- converted → the tenant record governs
      and coalesce(decided_at, created_at) < now() - make_interval(days => v_days)
    limit 10000
    for update skip locked
  )
  update public.rental_applications ra
  set applicant_first_name   = '[deleted]',
      applicant_last_name    = '[deleted]',
      applicant_email        = '[deleted]',
      applicant_phone        = null,
      current_address        = null,
      current_landlord_name  = null,
      current_landlord_phone = null,
      reason_for_moving      = null,
      employer_name          = null,
      employer_role          = null,
      gross_monthly_income   = null,
      other_income_source    = null,
      other_income_amount    = null,
      pet_details            = null,
      vehicle_details        = null,
      reference_1_name       = null,
      reference_1_relationship = null,
      reference_1_phone      = null,
      reference_2_name       = null,
      reference_2_relationship = null,
      reference_2_phone      = null,
      owner_notes            = null,           -- may contain applicant PII
      submitted_ip           = null,
      submitted_user_agent   = null,
      anonymized_at          = now()
  from due
  where ra.id = due.id;

  get diagnostics v_count = row_count;
  raise notice 'anonymize_old_rental_applications: anonymized % rows', v_count;
  return v_count;
end;
$$;

revoke all on function public.anonymize_old_rental_applications() from public;
grant execute on function public.anonymize_old_rental_applications() to service_role;

-- 3 AM window. Repo shows :00 :15 :30 :45 :50 occupied — VERIFY LIVE cron.job
-- before committing. :55 runs after process-account-deletions so the GDPR
-- cascade lands first.
select cron.schedule(
  'anonymize-rental-applications',
  '55 3 * * *',
  $$select public.anonymize_old_rental_applications()$$
);
```

The stub deliberately retains `unit_id`, `property_label`, `unit_label`, `created_at`,
`decided_at`, `status`, `occupant_count` — non-PII, and enough for an aggregate self-audit.

### GDPR cascade addition

```sql
-- Redefine anonymize_deleted_user FROM THE LIVE PROD DEFINITION (fetch via
-- pg_get_functiondef first), adding only these lines. Applications belong to a
-- departing owner: their fair-housing defence dies with the account, and the
-- applicant's PII must not persist under a deleted owner.
delete from public.rental_applications      where owner_user_id = p_user_id;
delete from public.rental_application_links where owner_user_id = p_user_id;
```

`anonymize_deleted_user` raises if the owner has active leases; applications impose no additional
block.

### Public page — mirror `/sign/[token]`

```tsx
// src/app/apply/[token]/page.tsx — mirrors src/app/sign/[token]/page.tsx
export const metadata: Metadata = {
  title: "Rental Application",
  description: "Submit a rental application to the property owner.",
  robots: { index: false, follow: false },   // D-14. Do NOT also robots.txt-disallow.
};

// The token is the capability and the page must reflect live token state — never cache.
export const dynamic = "force-dynamic";
```

`apply-context.ts` mirrors `sign-context.ts` exactly, including its most important behaviour:
**every genuine token state arrives as HTTP 200 with a `reason`; only a transport/server fault maps
to a distinct recoverable reason.** That is what prevents status-code-based token enumeration.

---

## FCRA (APPLY-06) — Placement Confirmed, Framing Corrected

**CONTEXT.md's placement decision is correct.** The disclaimer belongs on the applicant-facing form,
above the submit button, where the applicant reads it before submitting. Owner-side settings text
would satisfy nobody.

**But the framing needs correcting, and the correction makes the requirement easier to meet.**

FCRA obligations attach to the **use of a consumer report**. A landlord's adverse-action duties —
name/address/phone of the screening company, notice of the right to a free copy and to dispute —
are triggered when the landlord takes adverse action *based in whole or in part on information in a
consumer report* [CITED: FTC, "Using Consumer Reports: What Landlords Need to Know"]. TenantFlow
obtains no consumer report. **FCRA therefore does not attach to TenantFlow's application intake at
all.** APPLY-06 is not a required FCRA notice; it is a scope disclaimer that (a) sets the
applicant's expectations and (b) makes explicit that any screening the landlord performs separately
carries the landlord's own FCRA duties.

**The architectural invariant that keeps this true.** A "consumer reporting agency" is any person
who "for monetary fees … regularly engages in whole or in part in the practice of assembling or
evaluating consumer credit information or other information on consumers for the purpose of
furnishing consumer reports to third parties" (15 U.S.C. § 1681a(f)) [VERIFIED: statute text]. And
"consumer report" excludes "any report containing information solely as to transactions or
experiences between the consumer and the person making the report" (§ 1681a(d)(2)(A)(i))
[VERIFIED: statute text].

TenantFlow stays outside both because the applicant submits their own information **directly to the
one landlord they are applying to**, and TenantFlow assembles nothing from third-party sources. Two
plausible future features would break that:

1. **Cross-owner applicant search or applicant history** ("this person also applied to 3 other
   properties"). That is assembling information on consumers for furnishing to third parties.
2. **Apply-once-send-to-many** — one application routed to multiple unaffiliated owners. Same
   problem.

> **Record as a standing invariant:** applications are strictly owner-scoped. No cross-owner
> aggregation, matching, search, or reuse. RLS enforces it technically; it should also be written
> down, because the violating feature will look like a good idea.

**Drafted disclaimer copy** (placed immediately above the submit control, in
`text-sm text-muted-foreground` within a bordered container so it reads as a notice, not fine
print):

> **About this application**
> TenantFlow does not screen applicants. We do not run credit checks, background checks, criminal
> history checks, or eviction searches, and we do not obtain or provide consumer reports. We are
> not a consumer reporting agency.
>
> This form is delivered directly to the property owner, who alone decides whether to rent to you.
> If the owner obtains a background or credit report about you from a screening company, that is
> separate from this form and the owner is responsible for the notices the Fair Credit Reporting Act
> requires. We will not email you about this application — the owner will contact you directly.
>
> We do not ask for your Social Security number, date of birth, or financial account details. Do
> not enter them.

The last paragraph does real work: it is the user-facing enforcement of D-06, it discourages an
applicant from volunteering an SSN into a free-text field, and it matches the D-10 promise so the
applicant is not left waiting for an email that never comes.

**Fair-housing note to pair with it** (short, near the household/income fields):

> This owner does not discriminate on the basis of race, color, religion, sex, disability, familial
> status, or national origin, or on any other basis protected by state or local law.

Frame it as the owner's statement, not TenantFlow's — the owner is the housing provider. Consider
making it template text the owner cannot delete, since 42 U.S.C. § 3604(c) regulates the form's
content and an owner-editable statement could be edited into a violation.

---

## Convert to Tenant (APPLY-04)

**What can actually be prefilled.** The `tenants` table carries: `first_name`, `last_name`, `name`,
`email`, `phone`, `date_of_birth`, `emergency_contact_*`, `identity_verified`, `ssn_last_four`,
`status`, `owner_user_id` [VERIFIED: `src/types/supabase.ts:1952`]. `AddTenantForm` submits only
`email`, `first_name`, `last_name`, `name`, `phone` [VERIFIED: source read]. The application
collects far more — address, employment, income, references — and **none of it has a home on
`tenants`**.

So: prefill exactly the five fields the form already handles. Everything else stays on the
application row and remains reachable from the tenant via the `converted_tenant_id` reverse lookup.
**Do not** widen the tenants schema to absorb application fields; that would duplicate data,
contradict "tenants are records," and create a second retention surface for applicant PII outside
the retention sweep.

**Mechanism — do not duplicate the form.**

1. Queue "Approve" → router push to `/tenants/new?application=<uuid>`.
2. `AddTenantForm` gains `initialValues?: Partial<AddTenantFormValues>`, spread over
   `addTenantFormOptions.defaultValues`.
3. Both call sites forward it (Pitfall 6).
4. The page reads the `application` param, fetches the row via an `applicationQueries.detail(id)`
   factory, and maps it.
5. On success, set `converted_tenant_id` and `status = 'approved'` in the same mutation's
   `onSuccess`, then invalidate `applicationKeys` + `tenantKeys` + `ownerDashboardKeys.all`.

**Pass the application ID only, never PII.** `?email=…&first_name=…` would put applicant PII into
Vercel access logs, browser history, and the `Referer` header of any outbound link on the page.

**Edge cases:**

| Case | Behaviour |
|------|-----------|
| Applicant already exists as a tenant | Before rendering the form, query `tenants` for `lower(email)` within the owner's scope. If matched, show a non-blocking notice — "This email already matches tenant *Name*. Link to the existing tenant instead?" — with both actions available. **Do not hard-block:** the same person legitimately applies for a second unit. |
| Application approved twice | `converted_tenant_id` is the guard. If non-null, the queue action becomes "View tenant" and the conversion mutation refuses (`if converted_tenant_id is not null then …`). Enforce in the RPC, not only in the UI — a double-click on a slow network otherwise mints two tenants. |
| Tenant later deleted | `converted_tenant_id uuid references public.tenants(id) on delete set null`. The application survives with a null pointer; surface it as "converted tenant no longer exists" rather than a dangling link. **Never `on delete cascade`** in either direction (D-09). |
| Application deleted after conversion | Nothing points from `tenants` to `rental_applications`, so no cascade is possible. Deleting the application is a clean, isolated delete. |
| Applicant approved but never converted | `status = 'approved'` with `converted_tenant_id is null` still enters the retention sweep at 24 months from `decided_at`. Correct — no tenant record exists, so the applicant is a non-converted applicant. |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Third-party e-sign / screening vendors | Token-based in-app flows, `verify_jwt=false` Edge Functions | `20260617142623` (e-sign rebuild) | The `/sign` pattern this phase mirrors is current, in production, and reviewed. |
| Root `middleware.ts` | `src/proxy.ts` | Next.js 16 | Route gating lives in `proxy.ts`; do not create `middleware.ts`. |
| Route allow-lists for public pages | Deny-list `PRIVATE_ROUTE_PREFIXES` | — | D-13. The requirement text's `PUBLIC_ROUTES` is a phantom. |
| PostgreSQL ENUMs | `text` + `CHECK` | `20251231081143` | D-07. |
| `robots.txt` disallow as an indexing control | Meta `noindex` on a crawlable page | Longstanding Google guidance | Disallowing prevents the crawler from *seeing* `noindex`, making indexing more likely. |
| Direct `insert into notifications` | `create_notification()` RPC | `20260719193759` (NOTIF-01) | Single-writer invariant. |
| Unbounded retention deletes | `LIMIT 10000` + `FOR UPDATE SKIP LOCKED` | `20260306170000` family | Bounds lock/WAL pressure. |

**Deprecated / outdated:**
- `@supabase/auth-helpers-nextjs` — banned. `@supabase/ssr` with `getAll`/`setAll` only.
- `used_at` on this phase's token table — correctly dropped by D-02.
- The `docuseal_*` columns and any vendor-mediated flow — removed in `20260617142623`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bun | build, test, lint | ✓ | 1.3.14 | — |
| node | tooling | ✓ | v26.5.0 | — |
| supabase CLI | migrations, function deploy | ✓ | 2.109.1 | — |
| **Deno** | running Edge Function tests locally (`supabase/functions/tests/`) | **✗** | — | `supabase functions serve` bundles a runtime; otherwise install Deno, or move the Edge Function's pure logic into a separately unit-testable module (see Validation Architecture) |
| pg_cron | retention sweep | ✓ (in use — 15+ scheduled jobs) | — | — |
| pgcrypto (`gen_random_bytes`, `digest`) | token generation + hashing | ✓ (`gen_random_uuid` in use; `digest` used by the `/sign` path) | — | Verify `digest` is exposed in the current search path; some Supabase projects install pgcrypto into `extensions` |
| Upstash Redis | per-IP rate limit | Assumed ✓ (used by 3 live functions) | — | Fails open by design; the DB cap (F-6) is the real bound |
| Vercel `www`→apex redirect | CORS correctness (Pitfall 1) | Assumed ✓ | — | Verify before shipping |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:**
- **Deno is not installed locally.** `supabase/functions/tests/*.ts` are Deno tests and cannot run
  on this machine as-is. Plan accordingly: either add a Deno install step, or structure the Edge
  Function so the testable logic (honeypot check, timing check, payload validation, reason→message
  mapping) lives in a plain TS module that Vitest can import, leaving only orchestration in the
  Deno entrypoint. **Strongly prefer the second** — it also gives faster feedback and matches how
  `sign-context.ts` was extracted from the `/sign` page for exactly this reason.

**Live-state verification the planner must do before finalizing** (see Runtime State Inventory):
`cron.job` slot availability, the live `anonymize_deleted_user` body, the live
`notifications_notification_type_check` allowed values, and whether `pgcrypto`'s `digest` is
callable from `public`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 4 + jsdom (`vitest.config.ts`, project `unit`) |
| Integration framework | Vitest, project `integration` — dual-client RLS against **prod** |
| E2E framework | Playwright 1.62.0 (`tests/e2e/playwright.config.ts`, baseURL `localhost:3050`) |
| Edge Function tests | Deno (`supabase/functions/tests/`) — **Deno not installed locally** |
| Quick run | `bun run test:unit` |
| Single file | `bun run test:unit -- --run src/path/to/test.ts` |
| Full suite | `bun run validate:quick` (typecheck + lint + unit) |
| RLS suite | `bun run test:integration` |
| E2E | `bun run test:e2e` |

### The repo lesson this phase must not repeat

Phase 65 shipped an inert `truncate` and a flattened `space-y` rung because **jsdom computes no
layout**, and a unit test over source can only prove a class or a string is *present*, not that it
*works*. Any assertion of the form "the component renders `class="truncate"`" is a spelling check,
not a behavioural test.

**This phase has a structural advantage Phase 65 did not: `/apply/[token]` is a public,
unauthenticated route.** Playwright can drive it end to end with no auth fixture, no storage state,
and no session setup — a real browser, real layout, real network, real Edge Function. **The
applicant-facing surface should be validated by E2E, not by jsdom assertions.** Use that.

### Phase Requirements → Test Map

| Req | Behaviour | Test type | Command | Exists? |
|-----|-----------|-----------|---------|---------|
| APPLY-01 | `create_application_link` returns a 256-bit raw token; `token_hash` is its SHA-256; owner-scoped | integration (RLS) | `bun run test:integration -- --run tests/integration/rls/rental-application-links.rls.test.ts` | ❌ Wave 0 |
| APPLY-01 | Owner A cannot read/revoke Owner B's link | integration (RLS) | same file | ❌ Wave 0 |
| APPLY-01 | `/apply/<valid>` renders the form; `/apply/<garbage>` renders the uniform unavailable card with **HTTP 200** (no validity leak) | **E2E** | `bun run test:e2e -- tests/e2e/tests/public/apply-token.spec.ts` | ❌ Wave 0 |
| APPLY-01 | Page emits `<meta name="robots" content="noindex, nofollow">` | **E2E** (real rendered head) | same file | ❌ Wave 0 |
| APPLY-01 | `/apply` is NOT in `PRIVATE_ROUTE_PREFIXES` and NOT in `ROBOTS_ONLY_PRIVATE_PATHS` | unit (drift guard) | `bun run test:unit -- --run src/lib/routes/__tests__/private-routes.test.ts` | ⚠️ extend the existing `robots.test.ts` bidirectional guard |
| APPLY-02 | **`anon` cannot INSERT into `rental_applications`** — the requirement's core invariant | integration (RLS) | `bun run test:integration -- --run tests/integration/rls/rental-applications.rls.test.ts` | ❌ Wave 0 — model on `anon-rpc-grants.rls.test.ts`, accept `REVOKED_CODES` |
| APPLY-02 | `anon` cannot EXECUTE `submit_rental_application` (service_role only) | integration (RLS) | same file | ❌ Wave 0 |
| APPLY-02 | Honeypot filled → 200 success, **zero rows written** | **E2E** (fill the off-screen field via `page.evaluate`) + integration (row count) | `apply-token.spec.ts` | ❌ Wave 0 |
| APPLY-02 | Submission < 3s after load → 200 success, zero rows | unit (extracted pure logic) | `bun run test:unit -- --run src/lib/applications/__tests__/submission-guards.test.ts` | ❌ Wave 0 |
| APPLY-02 | Per-link lifetime cap and 1-hour window cap reject when exceeded | integration (direct RPC calls as service_role) | `rental-applications.rls.test.ts` | ❌ Wave 0 |
| APPLY-02 | Duplicate `submission_id` → one row, success reported | integration | same file | ❌ Wave 0 |
| APPLY-02 | Payload with an `ssn` key is rejected/ignored — SSN never persists | unit (zod schema) + integration | `src/lib/validation/__tests__/rental-applications.test.ts` | ❌ Wave 0 |
| APPLY-02 | Full happy path: load page → fill → submit → confirmation screen | **E2E** | `apply-token.spec.ts` | ❌ Wave 0 |
| APPLY-03 | Status transitions `new`→`reviewing`→`approved`/`rejected`; CHECK rejects anything else | integration | `rental-applications.rls.test.ts` | ❌ Wave 0 |
| APPLY-03 | Transition to a terminal status stamps `decided_at` (feeds the retention clock) | integration | same file | ❌ Wave 0 |
| APPLY-03 | Owner A cannot see Owner B's applications | integration (RLS) | same file | ❌ Wave 0 |
| APPLY-03 | Queue paginates with `{ count: 'exact' }`, never `data.length` | unit (query-key factory) | `src/hooks/api/query-keys/__tests__/application-keys.test.ts` | ❌ Wave 0 |
| APPLY-04 | `AddTenantForm` prefills from `initialValues` — **asserted at BOTH call sites** | unit (component) | `src/components/tenants/__tests__/add-tenant-form.test.tsx` + `src/app/(owner)/@modal/(.)tenants/new/page.test.tsx` | ⚠️ second file exists, extend both |
| APPLY-04 | Conversion sets `converted_tenant_id`; second conversion attempt is refused | integration | `rental-applications.rls.test.ts` | ❌ Wave 0 |
| APPLY-04 | Deleting the tenant nulls `converted_tenant_id` and does NOT delete the application | integration | same file | ❌ Wave 0 |
| APPLY-04 | Deleting the application does NOT delete the tenant (D-09) | integration | same file | ❌ Wave 0 |
| APPLY-04 | No applicant PII appears in the conversion URL | unit (assert the built href has only `application=<uuid>`) | `application-queue.test.tsx` | ❌ Wave 0 |
| APPLY-05 | Sweep anonymizes rows past the window, skips converted rows, skips already-anonymized rows | integration (insert with backdated `decided_at`, invoke fn, assert) | `tests/integration/rls/rental-applications-retention.test.ts` | ❌ Wave 0 |
| APPLY-05 | Anonymized row retains the stub (`unit_id`, labels, `status`, dates) and clears every PII column | integration | same file | ❌ Wave 0 |
| APPLY-05 | Window reads `app_config.applications.retention_days`, defaults 730 when absent/empty | integration | same file | ❌ Wave 0 |
| APPLY-05 | `anonymize_deleted_user` removes the owner's applications AND links | integration | `tests/integration/rls/gdpr-cascade.rls.test.ts` (extend if present) | ⚠️ verify |
| APPLY-05 | Cron job `anonymize-rental-applications` is scheduled and collides with nothing | integration (`select … from cron.job`) | retention test file | ❌ Wave 0 |
| APPLY-06 | Disclaimer text is present on the rendered public page, above the submit control | **E2E** (real render, real position) | `apply-token.spec.ts` | ❌ Wave 0 |
| APPLY-06 | Disclaimer names: no screening, no credit check, no background check, not a CRA, owner holds FCRA duties, no SSN requested | unit (constant snapshot) + E2E (visible) | `src/components/applications/__tests__/disclaimer.test.tsx` | ❌ Wave 0 |
| F-3 | Employer fields are optional in the schema; income label is source-neutral; no occupant names/ages/relationships column exists | unit (zod) + migration review | `rental-applications.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun run test:unit` (lefthook pre-commit already enforces this plus 80%
  coverage, typecheck, lint, gitleaks).
- **Per wave merge:** `bun run validate:quick` + `bun run test:integration` for any wave that
  touched SQL.
- **Phase gate:** full unit + integration + `bun run test:e2e` green before `/gsd:verify-work`.
  E2E is non-optional this phase — it is the only layer that proves the applicant surface works.

### What CANNOT be unit-tested (be explicit; do not fake it)

| Behaviour | Why jsdom/Vitest cannot prove it | Where it must be verified |
|-----------|----------------------------------|---------------------------|
| Honeypot is genuinely invisible and unfocusable | jsdom computes **no layout** — `left:-9999px` has no rendered effect; a test asserting the class is a spelling check | Playwright: `expect(locator).not.toBeInViewport()` + Tab-order assertion + `toBeHidden()` from the a11y tree |
| Disclaimer is visible above the submit button | No layout, no geometry in jsdom | Playwright `boundingBox()` comparison |
| CORS allows the browser POST | jsdom has no CORS enforcement; Vitest mocks `fetch` | Playwright against a running server, or `curl -H "Origin: …" -i` against the deployed function |
| `verify_jwt=false` is actually set **in prod** | Config file ≠ deployed state | `curl -i -X POST "$SUPABASE_URL/functions/v1/apply-token" -H "Authorization: Bearer fake" -d '{}' \| grep x-deno-execution-id` — header present means the function ran (the `config.toml` runbook) |
| Rate limit fires at the right threshold | Upstash is external and fails open | Manual/scripted burst against a deployed function; assert 429 + `Retry-After` |
| The DB cap is fail-closed under concurrency | Vitest cannot exercise `FOR UPDATE` serialization | Integration test issuing parallel RPC calls and asserting the cap holds exactly |
| pg_cron actually fires at 03:55 | No test can wait a day | Assert the row exists in `cron.job`; verify the first live run via `cron.job_run_details` post-deploy |
| The 24-month window is *legally* correct | Not a testable property | Cited in the migration header (F-1); reviewed by a human |
| Meta `noindex` is honoured by Google | External system | Assert the tag renders (E2E); confirm in Search Console post-deploy |
| Edge Function Deno code | **Deno is not installed locally** | Extract pure logic into a Vitest-importable module; keep the Deno entrypoint to orchestration only |

### Wave 0 Gaps

- [ ] `tests/e2e/tests/public/apply-token.spec.ts` — the highest-value new file. Covers APPLY-01,
      02, 06 on a real browser with no auth fixture.
- [ ] `tests/integration/rls/rental-applications.rls.test.ts` — anon-INSERT denial (the APPLY-02
      invariant), owner isolation, caps, idempotency, conversion edges.
- [ ] `tests/integration/rls/rental-application-links.rls.test.ts` — token generation/hashing,
      owner isolation, revoke/expiry.
- [ ] `tests/integration/rls/rental-applications-retention.test.ts` — sweep behaviour, config
      default, cron registration.
- [ ] `src/lib/applications/submission-guards.ts` + tests — honeypot + timing logic extracted from
      the Edge Function so Vitest can reach it (works around the missing Deno).
- [ ] `src/lib/validation/rental-applications.ts` + tests — zod schema, SSN rejection, optional
      employer fields (F-3).
- [ ] `src/hooks/api/query-keys/application-keys.ts` + tests — `queryOptions()` factories +
      `mapRentalApplicationRow` typed mapper.
- [ ] Extend `src/app/(owner)/@modal/(.)tenants/new/page.test.tsx` and the `add-tenant-form` tests
      for `initialValues` at **both** call sites.
- [ ] Extend the `robots.test.ts` bidirectional drift guard to assert `/apply` is absent from both
      lists.
- [ ] Framework install: none needed for unit/integration/E2E. **Deno install is optional** if the
      extraction above is done.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (unusual shape) | The applicant is **unauthenticated by design**. The 256-bit token is a capability, not an identity. Auth boundary = the SECURITY DEFINER RPC's token validation, not a JWT. The owner side uses the existing Supabase Auth + proxy gate. |
| V3 Session Management | no | No applicant session is created. Nothing to fixate, rotate, or steal. |
| V4 Access Control | yes | RLS on both new tables, owner-scoped via `owner_user_id`. **No anon policies.** Explicit `revoke all on table … from anon`. `revoke all on function … from public` + `grant … to service_role`. One policy per operation per role; never `FOR ALL` on an authenticated table. |
| V5 Input Validation | yes | Zod at the Edge Function boundary (server-side, authoritative) *and* in the client form (UX only). Cap every string length before persisting — `sign-lease-token` slices `signerName` to 200 chars for exactly this reason. Typed mapper on every read boundary; never `as unknown as`. |
| V6 Cryptography | yes | `gen_random_bytes(32)` for the token; SHA-256 for the hash. Never hand-roll; never `Math.random()`. |
| V7 Error Handling / Logging | yes | `errorResponse()` only — never surface `err.message`. Uniform 200 + `reason` for all token states so status codes do not enumerate. Log rate-limit hits and cap rejections (structured JSON, as `rate-limit.ts` does) so abuse is observable. |
| V8 Data Protection | yes | This is the phase's centre of gravity. Applicant PII at rest with a 24-month bounded lifetime (F-1), no SSN/DOB/ID/financial data (D-06), no PII in URLs, no PII in emails (D-10), `Cache-Control: no-store` on any PII-bearing response, and the GDPR cascade (D-12). |
| V13 API / Web Service | yes | `verify_jwt=false` documented in `config.toml`; CORS origin-restricted and fail-closed; POST-only; JSON only. |
| V14 Configuration | yes | `import_map` in the `config.toml` block; `validateEnv` inside the handler; retention window in `app_config` rather than hardcoded. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token enumeration / brute force | Spoofing | 256-bit CSPRNG token; SHA-256-hashed lookup; uniform 200 responses that never differentiate "wrong token" from "expired token" via status code; per-IP rate limit on the context path |
| Application-flood DoS via the reusable link | Denial of Service | **DB-side per-link caps in the same failure domain as the write (F-6)** + Upstash per-IP + honeypot + timing. The DB cap is the only fail-closed layer |
| Rate-limiter-as-DoS against legitimate applicants | Denial of Service | Key the submit limit on client IP, **never** on the shared token hash (F-5); 5/hour, sized for household and NAT clusters |
| Spoofed client IP to evade the limit | Spoofing | `getClientIp` uses `cf-connecting-ip` then the **last** XFF segment — never the attacker-controlled first segment |
| Anon direct-to-PostgREST write, bypassing every check | Tampering | No anon INSERT policy; `revoke all on table … from anon`; RLS-integration test pins it |
| Cross-owner application read (IDOR) | Information Disclosure | `owner_user_id` RLS with `(select auth.uid())`; dual-client A/B integration test |
| Stored XSS via applicant free-text into an owner-facing surface | Tampering | React escapes by default; **never** `dangerouslySetInnerHTML` on applicant text. If any applicant value ever reaches an HTML email or PDF template, `escapeHtml()` from `_shared/escape-html.ts` is mandatory |
| PII leakage via URL / logs / Referer | Information Disclosure | Conversion passes the application **id** only; no PII in query params |
| PII leakage via a forgotten second copy | Information Disclosure | **No archive table** (F-2); GDPR cascade covers every table that holds applicant data — this exact class of bug already shipped once (C2) |
| Over-retention of applicant PII | Information Disclosure | Bounded 24-month sweep, config-driven, batched |
| **Under-retention destroying the landlord's legal defence** | (not STRIDE — availability of evidence) | **The dominant risk here.** 24-month window with the statutory basis written into the migration header (F-1) |
| Owner escalates their own row (re-parenting an application) | Elevation of Privilege | UPDATE policy `with check (owner_user_id = (select auth.uid()))`; status changes via a dedicated RPC that also stamps `decided_at` |
| Discriminatory form design | (regulatory) | Source-of-income-neutral income fields; occupant count only; no disability question; assistance-animal note (F-3, 42 U.S.C. § 3604(c)) |
| Accidental drift into consumer-reporting-agency status | (regulatory) | Standing invariant: applications are strictly owner-scoped; no cross-owner aggregation, matching, or reuse (15 U.S.C. § 1681a(f)) |

---

## Project Constraints (from CLAUDE.md)

Directives this phase will actually collide with — the planner should verify each:

1. **No `any` types** — use `unknown` + type guards. Edge Function bodies are `Record<string, unknown>`.
2. **No barrel files / re-exports** — import directly from the defining file.
3. **No duplicate types** — search `src/types/` before defining anything.
4. **No commented-out code.**
5. **No inline styles** — Tailwind utilities or `globals.css` custom properties. The honeypot's
   off-screen positioning must be Tailwind classes.
6. **No PostgreSQL ENUMs** — `text` + `CHECK` (D-07).
7. **No emojis in code** — Lucide icons.
8. **No `as unknown as`** — typed mapper functions at every RPC/PostgREST boundary
   (`mapDocumentRow` is the reference).
9. **No string-literal query keys** — `queryOptions()` factories in `src/hooks/api/query-keys/`.
10. **No `@radix-ui/react-icons`** — `lucide-react` only.
11. **Max 300 lines per component, 50 lines per function** — the application form must be split.
12. **Server Components by default;** `'use client'` only for hooks/events/browser APIs. The
    `/apply/[token]` page is a Server Component; only the form is a client component.
13. **All list queries need `.limit()`/`.range()`** and `{ count: 'exact' }` for pagination —
    never `data.length`.
14. **Mutations invalidate related keys + `ownerDashboardKeys.all`.**
15. **`amount` columns store dollars as `numeric(10,2)`** — income fields follow this.
16. **RLS on every table; frontend never uses service role.**
17. **`(select auth.uid())`** wrapped in a subselect in every policy.
18. **One policy per operation per role — never `FOR ALL`** on an authenticated table.
19. **All SECURITY DEFINER RPCs** validate `auth.uid()` (where user-facing) and
    `SET search_path = public`.
20. **pg_cron:** named SECURITY DEFINER functions, never inline SQL; `SET search_path = public`;
    3 AM UTC window; `FOR UPDATE SKIP LOCKED`; `LIMIT 10000`. (Archive-then-delete is the norm —
    F-2 documents why this one job must deviate.)
21. **Edge Functions:** `getCorsHeaders(req)` + early-return `handleCorsOptions(req)`;
    `errorResponse()` never leaking `err.message`; `validateEnv()` inside `Deno.serve`;
    `rateLimit()` on unauthenticated functions; `escapeHtml()` for user values in HTML.
22. **Migrations:** `YYYYMMDDHHmmss_description.sql`, lowercase SQL, header comment, RLS enabled on
    creation. **Reconcile filenames to prod-assigned timestamps via `list_migrations` after any MCP
    `apply_migration`.**
23. **`supabase.ts` is generated** — never hand-edit; `bun run db:types` is atomic.
24. **Files kebab-case; types PascalCase; constants UPPER_SNAKE_CASE.**
25. **Path aliases** must be added to BOTH `tsconfig.json#paths` and `package.json#imports` if any
    new prefix is introduced (none needed here).
26. **Accessibility:** icon-only buttons need `aria-label`; `text-muted-foreground` not
    `text-muted`; `bg-background` not `bg-white`.
27. **`useUnsavedChangesWarning(isDirty)`** on multi-step forms — worth applying to the applicant
    form, which is long.
28. **`autoFocus`** on the primary input.
29. **Never `--no-verify`; never push to main; feature branch → PR.**
30. **No new npm runtime dependencies** (REQUIREMENTS.md invariant) — satisfied.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Upstash is provisioned and reachable in prod for the new function (project-level secrets are shared across functions) | Environment Availability | Rate limiting silently fails open; the DB cap (F-6) still bounds abuse, so impact is degraded-not-broken |
| A2 | `pgcrypto`'s `digest()` is callable from `public` in this project | Pattern 2 | Token hashing in SQL fails; fallback is to hash in the Edge Function via `sha256Hex` (already used by `/sign`) |
| A3 | The 3 AM `:55` cron slot is free in **live** `cron.job` (repo view shows :00/:15/:30/:45/:50) | Runtime State Inventory | A collision could contend with another retention job; planner must verify live |
| A4 | The Vercel `www`→apex redirect fires before page render, keeping `origin` canonical | Pitfall 1 | CORS failures for applicants arriving on a non-canonical host |
| A5 | GDPR Art. 17(3)(e) contains an explicit "defence of legal claims" exception | F-1 | Not load-bearing — the US fair-housing analysis stands independently and is statute-verified |
| A6 | HUD FHEO-2020-01's assistance-animal framing supports the suggested pets-field note | F-3 | Wording may need adjustment; the underlying principle (do not ask about disability) is independently solid |
| A7 | Honeypot + timing removes ~99.5% of bot traffic | Pattern 3 | Vendor-published figure, directionally consistent across sources. If optimistic, the DB cap still bounds worst case |
| A8 | Adding `'application'` to `notifications_notification_type_check` is required and safe | Code Examples | If an archive table was created `LIKE … INCLUDING ALL`, it copied the old CHECK — the C1 bug. Verify the live constraint |
| A9 | `owner_user_id` on both new tables references `public.users(id)` per project convention | Pattern 1 | Wrong FK target breaks RLS and the GDPR cascade; verified as the canonical convention in CLAUDE.md |

---

## Open Questions (ALL RESOLVED — see 66-CONTEXT.md)

> Back-annotated after planning. None of these blocked plan work; each was decided in a
> higher-precedence artifact and is recorded here so a later reader does not reopen a
> settled question from the lowest-precedence document.
>
> | Q | Resolution |
> |---|---|
> | 1 — hash-only vs re-copyable token storage | **D-03a** — store the raw token owner-readable, so the owner can re-copy the link over the weeks a listing runs |
> | 2 — retention window | **D-11a** — 730 days, config-driven |
> | 3 — (see below) | **Deferred** — 66-UI-SPEC.md §F |
> | 4 — disposition reason capture | **D-11d** — closed-vocabulary `disposition_reason` captured at decision time |

1. **F-4 — hash-only vs. re-copyable token storage.**
   - **What we know:** the `/apply` token is a public capability URL published to listing sites; a
     leak grants only the ability to submit a spam application; the owner needs to re-copy it over
     weeks.
   - **What's unclear:** whether the owner accepts weakening D-02's "never stored" property, or
     prefers to absorb the regenerate friction.
   - **Recommendation:** surface both options to the owner during planning. Default to **B (store
     raw, keep hash as the lookup key)** with the reasoning in the migration header, because A's
     failure mode — breaking a live Zillow listing — is user-visible and recurring, while B's is a
     proportionate, documented risk reduction from "impossible" to "low stakes." Either way the
     decision must be *made*, not inherited.

2. **Retention window configurability — is 24 months enough for every owner?**
   - **What we know:** federal exposure runs to 2 years plus tolling; practitioners in CA and WA
     recommend 3–4 years.
   - **What's unclear:** the jurisdictions TenantFlow's owners actually operate in. Note that the
     ToS governing-law placeholder from v9.0 (MKTUI-02) is still open, so the project already has
     an unanswered jurisdiction question.
   - **Recommendation:** ship 730 days via `app_config` so an operator can raise it without a
     migration, and record in the migration header that CA/WA guidance would support 1,460 days.
     Do not make it per-owner in this phase.

3. **Does the retention sweep need a pre-purge owner notification?**
   - **What we know:** the sweep silently anonymizes at 24 months.
   - **What's unclear:** whether an owner would want a "these applications will be anonymized in 30
     days — export now if you need them" notice.
   - **Recommendation:** out of scope for this phase, but worth recording as a deferred idea. It is
     a `create_notification` call and a second cron predicate — cheap to add later, and it converts
     a silent data-loss event into an informed one.

4. **Should the owner be able to write notes that survive anonymization?**
   - **What we know:** `owner_notes` may contain applicant PII and so must be cleared by the sweep.
   - **What's unclear:** whether owners will want a durable non-PII disposition reason (e.g.
     "income below 3x rent") preserved in the stub — which is exactly the fair-housing evidence
     they would want most.
   - **Recommendation:** consider a separate `disposition_reason` field chosen from a fixed,
     non-PII list, retained in the stub. This is a genuinely valuable addition that partially
     restores the defence value F-2 says the stub lacks. Flag it to the owner; it is small.

---

## Sources

### Primary (HIGH confidence — statute text, verified this session)

- 42 U.S.C. § 3610(a)(1)(A)(i) — HUD complaint 1-year limit — https://www.law.cornell.edu/uscode/text/42/3610
- 42 U.S.C. § 3613(a)(1)(A) and (a)(1)(B) — 2-year civil limit + administrative tolling — https://www.law.cornell.edu/uscode/text/42/3613
- 42 U.S.C. § 3604(c) — unlawful notices/statements indicating preference or limitation — https://www.law.cornell.edu/uscode/text/42/3604
- 15 U.S.C. § 1681a(f) — "consumer reporting agency" definition; § 1681a(d)(2)(A)(i) — transactions-and-experiences exclusion — https://www.law.cornell.edu/uscode/text/15/1681a
- Cal. Civ. Code § 1798.105(d) — CCPA deletion exceptions (no explicit legal-claims exception) — https://codes.findlaw.com/ca/civil-code/civ-sect-1798-105/
- Google Search Central, "Block Search Indexing with noindex" — noindex requires the page be crawlable — https://developers.google.com/search/docs/crawling-indexing/block-indexing

### Primary (HIGH confidence — in-repo source, read this session)

- `supabase/migrations/20260617142623_token_based_lease_esignature.sql` — token schema + RPC + grant pattern
- `supabase/functions/sign-lease-token/index.ts` — `verify_jwt=false` precedent, two-layer rate limiting
- `supabase/functions/_shared/{cors,errors,env,rate-limit,escape-html,supabase-client}.ts`
- `supabase/config.toml:330-420` — Edge Function `import_map` requirement + `verify_jwt` decision guide + prod verification runbook
- `supabase/migrations/20260719202447_notifications_retention_cron.sql` — batched retention pattern
- `supabase/migrations/20260720001657_harden_notifications_archive_and_cron.sql` — `revoke … from anon` grant hardening (C1/C4), per-operation service_role policies (C5), cron-slot collision (C7)
- `supabase/migrations/20260720015620_retention_gdpr_and_writer_hardening.sql:25` — `anonymize_deleted_user`, and the C2 archive-cascade bug
- `supabase/migrations/20260719193759_create_notification_and_reconcile_rls.sql` — `create_notification` signature
- `supabase/migrations/20260504162155_app_config_table_for_n8n_webhooks.sql` — `app_config` service-role-only key/value table
- `supabase/migrations/20260529225039_revoke_anon_security_definer_rpcs_v2.sql` — REVOKE-FROM-PUBLIC discipline
- `src/lib/routes/private-routes.ts`, `src/proxy.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`
- `src/app/sign/[token]/page.tsx` + `sign-context.ts`, `src/components/leases/sign-lease-form.tsx`
- `src/app/(owner)/tenants/new/page.tsx`, `src/app/(owner)/@modal/(.)tenants/new/page.tsx`, `src/components/tenants/add-tenant-form{,-options}.{tsx,ts}`
- `src/lib/forms/form-hook.tsx`, `src/lib/db-insert.ts`, `src/hooks/api/query-keys/document-keys.ts:122`
- `tests/integration/rls/anon-rpc-grants.rls.test.ts` — the anon-denial test idiom + `REVOKED_CODES`
- `.claude/skills/rls-policies/SKILL.md`, `.claude/skills/sql-migration-rules/SKILL.md`

### Secondary (MEDIUM confidence — practitioner guidance, cross-verified against statute)

- Pettit Law Group / Petrie + Pettit (WI) — "How Long Should You Retain A Denied Rental Application?" — 2 years minimum — https://pettit-law.com/blog/landlord-tenant/how-long-should-you-retain-a-denied-rental-application
- Kimball, Tirey & St. John LLP (CA) — "Business Record Retention for Property Owners" — 2–3 years min, 4 years general, tolling to 3+ — https://www.kts-law.com/business-record-retention-for-property-owners-2/
- Rental Housing Association of Washington — "Recordkeeping & Reminders" — 3-year FH / 4-year agreement — https://www.rhawa.org/blog/recordkeeping-and-reminders-for-your-rental-operations
- FTC — "Using Consumer Reports: What Landlords Need to Know" — FCRA triggers on consumer-report use — https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know
- MassLandlords — record keeping / 201 CMR 17 — https://masslandlords.net/a-landlords-guide-to-record-keeping-and-handling-tenant-information/
- Housing Equality Center / NLIHC / NY DHR / WashingtonLawHelp — source-of-income protections (CA Gov. Code §§ 12921, 12955(d); WA RCW 59.18.255; NY HRL 2019) — https://www.equalhousing.org/fair-housing-topics/source-of-income/ · https://nlihc.org/resource/14-1-advancing-tenant-protections-source-income-protections · https://dhr.ny.gov/nysdhr-source-income · https://www.washingtonlawhelp.org/en/source-income-discrimination
- Cal. Civ. Code § 1950.6 screening-fee regime — https://codes.findlaw.com/ca/civil-code/civ-sect-1950-6/ · https://www.bpoa.org/news/charging-screening-fees-in-2025-californias-new-rules-under-civil-code-19506

### Tertiary (LOW confidence — vendor guidance, directional only)

- Honeypot + timing effectiveness figures (80–95% honeypot alone; ~99.5% paired with a 3–10s timing check) — https://www.reform.app/blog/honeypot-field-setup-checklist · https://formidableforms.com/defeat-spambots-honeypot-spam-protection/ — treated as directional; the DB cap is the actual bound.

---

## Metadata

**Confidence breakdown:**

- **Retention law (F-1, F-2):** HIGH — three statutory citations read directly from primary text,
  three independent practitioner sources across three states converging above two years, and an
  explicit negative search that found no counter-pressure. This is the most solid finding in the
  document and it contradicts the locked decision.
- **In-repo patterns / precedents:** HIGH — every claim traces to a file read this session; no
  reliance on training data about this codebase.
- **Public write path, grants, RLS:** HIGH — direct precedent in `sign-lease-token` +
  `20260720001657` + `20260529225039`, plus a live test file demonstrating the assertion idiom.
- **Abuse defence (F-5, F-6):** HIGH on the analysis (source-read of `rate-limit.ts` and
  `sign-lease-token`'s deliberately inverted keying); MEDIUM on the specific numeric thresholds,
  which are judgement calls sized for realistic traffic and should be reviewed after launch.
- **FCRA framing:** HIGH on the statutory analysis (both definitions read from primary text);
  MEDIUM on the drafted copy, which is not legal advice and should be owner-reviewed.
- **Form-field fair housing (F-3):** HIGH on § 3604(c) and on the existence of state SOI
  protections; MEDIUM on the exact per-field recommendations, which are reasoned application rather
  than cited rule.
- **Token model (F-4):** HIGH on the tension being real; the recommendation is a judgement call
  flagged for owner decision, not a research conclusion.
- **Environment availability:** HIGH for locally verified tools; MEDIUM for prod-side items
  (Upstash, cron slots, pgcrypto) which the Runtime State Inventory flags for live verification
  because Supabase MCP tools were not available in this session.

**Research date:** 2026-08-05
**Valid until:** 2026-09-04 for the technical findings (stable codebase, stable stack). The legal
findings are durable — statutes of limitation change rarely — but the source-of-income
jurisdiction list grows and should be re-checked if the disclaimer copy is ever revised.
</content>
</invoke>
