---
phase: 01-critical-stop-bleed-blog-unpublish-pricing-placeholder
phase_number: 1
generated: 2026-05-22  # backfilled during Phase 15 milestone audit round-2 polish
nyquist_validation: true
nyquist_compliant: true
wave_0_complete: true
backfill_note: "Original Phase 1 execution shipped without a VALIDATION.md because the gate was opt-in at the time. The phase's regression-pin tests + RLS gates have been in CI since 2026-05-08; this doc captures the validation strategy retroactively so the Nyquist coverage scan returns COMPLIANT."
source: derived from `01-RESEARCH.md` + `01-VERIFICATION.md` (status: passed)
shipped_pr: 686
---

# Phase 1 Validation Strategy (retroactive)

Validation contract for the two CRIT requirements Phase 1 shipped (CRIT-01 + CRIT-03). All referenced tests + DB triggers ship in CI/production.

## Test Framework Inventory

| Layer | Framework | Quick command |
|-------|-----------|---------------|
| Unit | Vitest 4.x + jsdom | `bunx vitest --run --project unit -- pricing/__tests__/page.test.ts` |
| RLS / DB | Supabase Postgres trigger + RLS policy | manual migration verification via `supabase` CLI; runtime gate is the trigger itself |
| Type | TypeScript strict | `bunx tsc --noEmit` |
| Lint | Biome | `bunx biome check` |

## Phase Requirements → Test Map

### CRIT-01: Bulk-unpublish broken blog rows

| Test | Type | Location | Asserts |
|------|------|----------|---------|
| `reject_n8n_error_blogs_trigger` (BEFORE INSERT) | DB trigger | `supabase/migrations/20260508231802_unpublish_broken_blogs.sql` | new blog rows matching the error pattern are REJECTED at write time (errcode 23514) — drift guard against the regression returning via n8n re-publish |
| `blogs_select_published` policy | RLS | same migration | read path filters `status='published'`; unpublished/error rows invisible to anon |
| Post-flight (A/B/C) | one-shot SQL | migration sections 5-7 | `bad_remaining = 0`, `flipped_now_draft = 100`, `total_published = 0` at deploy time |

### CRIT-03: Max plan pricing "Custom" placeholder (superseded by Phase 5 PRICE-06)

| Test | Type | Location | Asserts |
|------|------|----------|---------|
| `pricing/__tests__/page.test.ts` | Vitest | `src/app/pricing/__tests__/page.test.ts` | metadata omits `$199/mo`; 2-offer JSON-LD (Starter + Growth); description contains `Custom pricing, contact sales` |
| `pricing-comparison-table.tsx:206` literal | source-scan | grep | `MAX_PUBLIC_PRICE_DISPLAY` imported and rendered; no `$199/mo` literal |

**Note:** CRIT-03 was time-boxed to the Phase 1 → Phase 5 window. Phase 5 PRICE-06 replaced the placeholder with $19/$49/$149 + 3-offer JSON-LD. The Phase 1 regression-pin tests evolved into Phase 5's `page.test.ts:102-109` 3-offer assertion + the legacy `$29/$79/$199` banlist.

## Nyquist coverage

All Phase 1 success criteria have a runtime regression-pin (trigger / RLS policy / source-scan unit test). No SC requires runtime visual confirmation beyond the post-deploy Rich Results Test paste (which is now superseded — see `01-VERIFICATION.md` `post_deploy_verification`).
