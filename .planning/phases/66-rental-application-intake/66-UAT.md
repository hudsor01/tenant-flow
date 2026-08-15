---
phase: 66-rental-application-intake
started: 2026-08-08
status: in_progress
tests_total: 20
tests_passed: 19
tests_blocked: 1
issues_found: 0
---

# Phase 66 UAT — Rental Application Intake

## How this phase had to be tested, and why

The usual UAT route was closed on both ends:

- **No browser preview.** Vercel builds `main` only, so this branch has no deployment.
- **No local server.** `.env.local` holds only `VERCEL_OIDC_TOKEN`, so `bun run dev` fails env
  validation. Worse, `tests/e2e/playwright.config.ts:323` starts its webServer with
  `rm -rf .next && rm -f .env.local` — running the E2E suite locally would DELETE that file.
  It was not run.

So the stack was exercised where it actually lives: **against production**, through the real
RPCs and the deployed Edge Function. Every write ran inside a `DO` block terminated by a
deliberate `raise`, so the transaction rolled back and nothing persisted. Verified after every
part: `rental_applications` 0 rows, `rental_application_links` 0 rows, `application_received`
notifications 0 rows.

Only the synthetic owners were used — `e2e-owner-a@tenantflow.app` (`218000e4…`) and
`e2e-owner-b@tenantflow.app` (`f8dd74bd…`), against their own units. No customer data touched.

## Results — 19 of 20 pass, 0 issues

### Applicant path (APPLY-01, APPLY-02)

| # | What was checked | Result |
|---|---|---|
| 1 | Owner mints a link | PASS — 64-char hex token |
| 2 | A second **active** link on the same unit is refused | PASS — `link already active` |
| 3 | Public context resolves for a real token | PASS — `valid=t`, `Bulk-Import Test Property A` |
| 4 | A garbage hash leaks nothing | PASS — `valid=f`, `invalid_token`, `property_label` NULL |
| 5 | Applicant submits without an account | PASS — `success=t` |
| 6 | A payload missing required answers is REFUSED, not stored half-empty | PASS — `invalid_payload` |
| 7 | Server-side normalization | PASS — email lowercased `uat@example.com`, state uppercased `TX` |

Test 4 is the non-enumeration property: a caller cannot tell a bad token from a real one in a
bad state, and no listing detail comes back alongside a failure.

### Owner path (APPLY-03, APPLY-04)

| # | What was checked | Result |
|---|---|---|
| 8 | Decline with **no** reason is refused | PASS — `a decline reason is required` |
| 9 | Decline with an off-vocabulary reason is refused | PASS — `invalid decline reason` |
| 10 | Approving stamps `decided_at` | PASS |
| 11 | approved -> reviewing clears `decided_at` | PASS — confirms the 66-10 finding live |
| 12 | Cross-owner read isolation | PASS — owner A sees **1**, owner B sees **0** |
| 13 | Owner B cannot write owner A's row | PASS — `application not found` |
| 14 | Owner B cannot point owner A's app at a tenant | PASS — `application not found` |
| 17a | Conversion records | PASS — `success=t` |
| 17b | Repeat conversion is benign, not an error | PASS — `success=f, reason=already_converted` |

Test 12 carries its own positive control: owner A's read is asserted **before** owner B's is
asserted absent, so the negative cannot pass on an empty table. Tests 13 and 14 return the
*same* message as a missing row — deliberate non-enumeration, verified rather than assumed.

### Retention and the trust boundary (APPLY-05, APPLY-02)

| # | What was checked | Result |
|---|---|---|
| 15 | PII is genuinely present before the sweep (positive control) | PASS — name, phone, pets, IP all set |
| 16 | The sweep clears PII and keeps the stub | PASS — name `[deleted]`; phone/pets/IP NULL; `occupant_count` 3, `status`, `property_label` and `anonymized_at` all retained |
| 17c | A **converted** row is never swept | PASS — name survived as `Converted` |
| 18 | `anon` cannot read the table | PASS — denied |
| 19 | `anon` cannot call the submit RPC | PASS — denied |

Test 16 is the one that matters for APPLY-05: it proves the mixed strategy works in practice —
placeholder for the three NOT NULL columns, hard NULL for the nullable ones, non-PII stub
retained so the landlord can still show a decision was made.

### Deployed Edge Function

| # | What was checked | Result |
|---|---|---|
| 20 | Unavailable-token path through the live function | PASS — HTTP **200** + `x-deno-execution-id`, body `{"valid":false,"reason":"invalid_token"}`; a garbage token and a well-formed 64-hex token return **byte-identical** bodies |

## The one blocked test

**BLOCKED — the Edge Function's happy path with a real token.**

Everything above proves the RPC layer and the function's failure path. What is still unproven
is a real applicant submitting through `POST /functions/v1/apply-token` end to end.

It cannot be done inside a rolled-back transaction: the Edge Function is a separate HTTP
request and cannot see an uncommitted row. It needs a **committed** link.

That is a one-way write. `rental_application_links` ships one SELECT policy and **no DELETE
policy for any role**, so a link row can be revoked but never removed. Plan 66-17 hit the same
wall and designed its E2E fixtures around it — reuse-first, steady state two permanent rows on
a synthetic owner's unit.

Options:
1. **Let CI prove it.** 66-17's spec does exactly this on the first PR run, and `e2e-smoke`
   fails hard on missing secrets. Costs nothing now; the proof arrives with the PR.
2. **Prove it now**, accepting one permanent link row on the synthetic unit
   `BULK-A-101` — the same row CI would create anyway.

Recommended: **1**. The write is identical either way, and CI runs it with the full browser
path rather than a bare curl.

## Not covered here

- Rendered geometry (UI-SPEC §E, E-1..E-21) — Playwright only, CI. jsdom computes no layout,
  which is precisely why §D-1's inert-class trap needs a real browser.
- The RLS integration suites (66-10, 39 tests) — never executed; blocked on the same
  `.env.local` gap. They run in CI's `rls-security`.
- Visual/brand review of `/apply/[token]` and `/applications` — needs a deployment.
