---
phase: 35
slug: structured-data-enrichment
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-09
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | SCHEMA-01 | — | N/A | unit | `pnpm test:unit -- --run src/lib/seo/__tests__/breadcrumbs.test.ts` | YES | pending |
| 35-01-02 | 01 | 1 | SCHEMA-02, SCHEMA-08 | — | N/A | unit | `pnpm test:unit -- --run src/lib/seo/__tests__/article-schema.test.ts` | YES | pending |
| 35-02-01 | 02 | 1 | SCHEMA-03 | — | N/A | typecheck+lint | `pnpm typecheck && pnpm lint` | N/A | pending |
| 35-02-02 | 02 | 1 | SCHEMA-05 | — | N/A | typecheck+lint | `pnpm typecheck && pnpm lint` | N/A | pending |
| 35-02-03 | 02 | 1 | SCHEMA-06 | — | N/A | typecheck+lint | `pnpm typecheck && pnpm lint` | N/A | pending |
| 35-02-04 | 02 | 1 | SCHEMA-07 | — | N/A | unit | `pnpm test:unit -- --run src/lib/seo/__tests__/software-application-schema.test.ts` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/seo/__tests__/software-application-schema.test.ts` — stubs for SCHEMA-07 (SoftwareApplication comparison)

*Notes on removed Wave 0 entries:*
- `website-schema.test.ts` (was SCHEMA-03): WebSite schema is constructed inline in `src/app/page.tsx` using a plain object, not via a reusable factory. No factory = no unit-testable function. Verified by `pnpm typecheck && pnpm lint` instead.
- `howto-schema.test.ts` (was SCHEMA-05, SCHEMA-06): HowTo schema is constructed inline in the maintenance checklist page per D-04 (one-off, no factory). No factory = no unit-testable function. Verified by `pnpm typecheck && pnpm lint` instead.

*Existing test infrastructure covers breadcrumb and article schema requirements (including timeRequired per SCHEMA-08).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google Rich Results Test validates all schemas | ALL | External tool, not automatable | Run each public page URL through https://search.google.com/test/rich-results |
| JSON-LD renders in SSR HTML (not client-only) | SCHEMA-02 | Requires Next.js build + HTML inspection | `pnpm build && curl localhost:3050/blog/[slug] \| grep 'application/ld+json'` |
| WebSite schema renders on homepage | SCHEMA-03 | Inline construction, no factory to unit test | `pnpm build && curl localhost:3050 \| grep 'WebSite'` |
| HowTo schema renders on maintenance checklist | SCHEMA-06 | Inline construction, no factory to unit test | `pnpm build && curl localhost:3050/resources/seasonal-maintenance-checklist \| grep 'HowTo'` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
