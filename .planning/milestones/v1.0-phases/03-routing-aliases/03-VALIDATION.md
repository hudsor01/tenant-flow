---
phase: 03-routing-aliases
phase_number: 3
generated: 2026-05-22  # backfilled during Phase 15 milestone audit round-2 polish
nyquist_validation: true
nyquist_compliant: true
wave_0_complete: true
backfill_note: "Original Phase 3 execution shipped without a VALIDATION.md. The phase's E2E redirect coverage + the live curl probes documented in 03-VERIFICATION.md `post_deploy_verification` are the runtime regression-pin."
source: derived from `03-RESEARCH.md` + `03-VERIFICATION.md` (status: passed)
---

# Phase 3 Validation Strategy (retroactive)

Validation contract for CRIT-05 + CRIT-06. All referenced tests run in CI; live curl probes confirm production deploy state.

## Test Framework Inventory

| Layer | Framework | Quick command |
|-------|-----------|---------------|
| E2E | Playwright (`public` project, anonymous storageState) | `bunx playwright test tests/e2e/tests/public/routing-aliases.spec.ts` |
| Type | TypeScript strict | `bunx tsc --noEmit` |
| Live | curl | `curl -sI https://tenantflow.app/<path>` (post-deploy probe) |

## Phase Requirements → Test Map

### CRIT-05: `/signup` no longer loops to `/login`

| Test | Type | Asserts |
|------|------|---------|
| `tests/e2e/tests/public/routing-aliases.spec.ts` | E2E | `GET /signup` returns 308 with `Location: /pricing`; no `/signup` directory exists in `src/app/` |
| Live curl (re-verified 2026-05-22) | post-deploy | `HTTP/2 308` + `location: /pricing` against `https://tenantflow.app/signup` |

### CRIT-06: Long-form legal URLs alias to short paths

| Test | Type | Asserts |
|------|------|---------|
| `tests/e2e/tests/public/routing-aliases.spec.ts` | E2E | 4 alias paths (`/terms-of-service`, `/privacy-policy`, `/help-center`, `/rss-feed`) return 308 with correct `Location` headers; `/feed.xml` returns 200 with XML content-type |
| Live curl (re-verified 2026-05-22) | post-deploy | All 5 paths return 308 → expected destination; `/feed.xml` returns 200 + `application/rss+xml; charset=utf-8` |

## Nyquist coverage

All Phase 3 success criteria have an E2E regression-pin + a documented post-deploy live curl probe. No SC requires runtime visual confirmation beyond status-code + Location-header inspection (which curl provides).
