---
phase: 11
slug: blog-data-layer
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-07
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 with jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck`
- **After every plan wave:** Run `pnpm validate:quick`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | BLOG-02 | manual | `supabase` CLI or DB query after migration | N/A | ⬜ pending |
| 11-02-01 | 02 | 1 | BLOG-01 | unit | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | BLOG-03 | unit | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-03 | 02 | 1 | BLOG-04 | unit | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-04 | 02 | 1 | BLOG-05 | unit | `pnpm test:unit -- --run src/hooks/api/query-keys/blog-keys.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/api/query-keys/blog-keys.test.ts` — unit tests for BLOG-01, BLOG-03, BLOG-04, BLOG-05 (mock Supabase client, verify query construction and return shape)
- [ ] RPC verification via manual DB query for BLOG-02 (SQL function correctness)

*Existing test infrastructure covers framework and config. Only test files need creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `get_blog_categories` RPC returns correct data | BLOG-02 | SQL function runs in Postgres, not testable via Vitest unit tests | Run `select * from get_blog_categories()` via Supabase SQL editor after migration |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
