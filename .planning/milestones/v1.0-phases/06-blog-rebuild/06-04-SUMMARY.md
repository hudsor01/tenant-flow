---
phase: 06-blog-rebuild
plan: 04
subsystem: content-ops
tags: [blog, content, n8n, seo, editorial, canonical, BLOG-04, BLOG-05, BLOG-06]
requires: ["06-01", "06-02", "06-03"]
provides: [12-paste-ready-briefs, editorial-flip-runbook, stagger-publish-cadence, BLOG-05-gate-mapping]
affects: [.planning/phases/06-blog-rebuild/06-04-BRIEFS.md, .planning/phases/06-blog-rebuild/06-04-SUMMARY.md]
tech-stack:
  added: []
  patterns: [content-brief-template, staggered-publish-cadence, editorial-flip-workflow]
key-files:
  created:
    - .planning/phases/06-blog-rebuild/06-04-BRIEFS.md
    - .planning/phases/06-blog-rebuild/06-04-SUMMARY.md
  modified: []
decisions:
  - "BLOG-05 automated SEO+tone gate satisfied by 9 DB validation triggers (06-01) + n8n preflight + Edge Function gates (06-03) + integration test (06-01 Task 3) — no separate runtime probe in Phase 6"
  - "Brief #10 canonical wiring lives in the n8n payload field `canonical_url`, NOT in the markdown body — Plan 06-02 generateMetadata emits the <link rel=\"canonical\"> tag in <head>"
  - "Staggered publish over weeks 1-4 (~3 posts/week) is OPERATIONAL; user controls flip timing in Studio"
  - "Plan 06-04 ships zero code; content generation + editorial flip are post-merge ops"
metrics:
  duration: ~15min
  completed: 2026-05-10
  tasks-completed: 2-of-3-PR-time  # Task 2 is post-merge ops
  commits: 2
---

# Phase 6 Plan 04: 12 Paste-Ready Content Briefs + Editorial Flip Runbook

12 paste-ready n8n trigger payloads (one per locked slug) + editorial-flip runbook + staggered publish cadence + BLOG-05 gate mapping; brief #10 carries `canonical_url='/compare/buildium'` in payload for the Blocker-#1 chain.

## Plan 06-04 Position in Phase 6

Plan 06-04 is Wave 4 — the final plan in Phase 6. It depends on:

- **Plan 06-01** (Wave 1) — DB cleanup + status workflow + 9 validation triggers + `canonical_url` column. Shipped 2026-05-10 in commits `caa9932b3` + `b836262ee`.
- **Plan 06-02** (Wave 2) — UI server-render rewrite + breadcrumbs + per-post OG image route + `generateMetadata().alternates.canonical` wiring. Shipped 2026-05-10 in commits `ae18a566e`, `6dae57010`, `6e3d46dc9`, `26058e2a9`, `527fa5de5`.
- **Plan 06-03** (Wave 3) — `n8n-blog-ingest` Edge Function + Deno test suite + N8N-FLOW runbook + workflow JSON + HMAC vector script. Shipped 2026-05-10 in commits `9bafa415c`, `73f7f2101`, `e69977c70`, `f863aa349`.

Plan 06-04 is `autonomous: false` because Task 2 (running the n8n flow 12 times against prod) is a human-action checkpoint that the user executes post-merge.

## What Shipped (PR-time)

### Task 1 — `06-04-BRIEFS.md` (commit `2e797907b`)

12 paste-ready briefs, one per locked title from `06-CONTEXT.md § Initial 12-Post Slate`:

| # | Slug | Cluster | Funnel | canonical_url override |
|---|------|---------|--------|------------------------|
| 1 | `whats-required-in-a-lease-agreement` | lease-law | top | — |
| 2 | `rent-increase-notice-per-state` | lease-law | middle | — |
| 3 | `late-fee-rules-by-state-2026` | lease-law | middle | — |
| 4 | `landlord-tax-deductions-2026` | tax-prep | top | — |
| 5 | `tax-document-vault-checklist` | tax-prep | bottom | — |
| 6 | `tenant-screening-checklist` | tenant-screening | top | — |
| 7 | `tenant-screening-software-compared-2026` | tenant-screening | middle | — |
| 8 | `annual-maintenance-schedule` | maintenance | middle | — |
| 9 | `track-maintenance-no-ticketing-system` | maintenance | middle | — |
| 10 | `tenantflow-vs-buildium` | software-vault | bottom | **`/compare/buildium`** |
| 11 | `lease-document-organization-system-landlords` | software-vault | bottom | — |
| 12 | `spreadsheet-to-document-vault-migration` | software-vault | bottom | — |

**Distribution check:** lease-law=3 / tax-prep=2 / tenant-screening=2 / maintenance=2 / software-vault=3 (3-2-2-2-3 confirmed, matches CONTEXT.md lock).

**Funnel mix:** 3 top / 5 middle / 4 bottom (matches `06-RESEARCH-content-strategy.md` § funnel mix lock).

**Blocker-#1 (canonical_url) wiring verified in briefs file:**
- Brief #10's trigger payload includes `"canonical_url": "/compare/buildium"`.
- Brief #10's system-prompt augmentation explicitly instructs Claude NOT to inject `<link rel="canonical">` HTML into the markdown body — canonical lives in `<head>` via Next.js Metadata (Plan 06-02 generateMetadata).
- Threaded end-to-end: payload field → Edge Function INSERT → `blogs.canonical_url` column → Plan 06-02 `generateMetadata().alternates.canonical` → `<link rel="canonical" href="/compare/buildium">` in `<head>`.

**Each brief contains:**
- Cluster + funnel header
- Word target (1,500–2,200; under the 3,000 word-count gate ceiling)
- Trigger payload (paste-ready JSON the user POSTs to the n8n webhook)
- System-prompt augmentation (supplements N8N-FLOW.md base outline + draft prompts with topic-specific guidance)
- Banlist + persona-phrase + DocuSeal-cap reminders inline

### Task 3 — `06-04-SUMMARY.md` (this file; commit comes next)

Documents editorial-flip workflow, stagger schedule, BLOG-05 mapping, post-publish verification curls, regression-guard confirmation.

### Task 2 — Post-merge ops (NOT part of this PR)

Task 2 is the `checkpoint:human-action` step where the user runs the n8n flow 12 times against prod to generate the 12 `'in-review'` rows. This is operationally post-merge — Plan 06-04's PR-time deliverables are the BRIEFS file + SUMMARY only. The orchestrator will pause at Task 2 and resume only when the user confirms 12 rows have landed in prod with the expected distribution and brief #10's canonical_url=`/compare/buildium` populated.

**Why post-merge:** the n8n flow is a manual, human-supervised content-generation pass. Running it requires Anthropic API calls (~$0.72 total) and human judgment to re-run on gate failures. Gating PR merge on this would force a content-generation pass before the underlying infrastructure (Plans 06-01..03) is even merged. Per CONTEXT.md publish-cadence lock, the user staggers the actual publish over 3-4 weeks post-merge.

## BLOG-05 Automated SEO+Tone Gate Mapping (Blocker-#2)

REQUIREMENTS.md BLOG-05 reads "automated SEO + tone check pre-publish". That requirement is delivered IN FULL by:

| Layer | Mechanism | Plan |
|-------|-----------|------|
| Source of truth | 9 DB validation triggers in `validate_blog_post()` — fire on every INSERT/UPDATE transitioning to `'in-review'` or `'published'`; reject with `ERRCODE 23514` and human-readable message identifying which gate failed | 06-01 (`20260510214935_phase_6_validation_triggers.sql`) |
| Fail-fast preflight | n8n Function node re-runs the same 9 gates in JavaScript before HTTP — saves a network round-trip when Claude's draft is obviously broken | 06-03 (Task 3 — `n8n-blog-ingest.workflow.json`) |
| Server-side defense-in-depth | Edge Function `n8n-blog-ingest` re-runs the same 9 gates server-side AND verifies HMAC before INSERT | 06-03 (Task 1) |
| End-to-end pin | `tests/integration/rls/blogs-status-workflow.rls.test.ts` — pins each gate's rejection behavior end-to-end against prod; runs on every PR + weekly cron | 06-01 Task 3 |
| Tone review | Human editorial flip in Supabase Studio — user reads each `'in-review'` row, applies editorial polish, flips `status='published'`. The flip IS the tone check | 06-04 Task 2 (post-merge ops) |

The 9 gates collectively cover:
1. Word count (1,200 ≤ words ≤ 3,000)
2. H2 count (4 ≤ count(`^## `) ≤ 10)
3. Persona phrase (content contains "landlord" or "landlords")
4. Slug pattern (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, length 3–120)
5. Meta description length (50–160 chars)
6. Excerpt length (80–200 chars)
7. Category enum membership
8. Banlist (Phase 4 BANNED_PHRASES)
9. DocuSeal mention cap (≤1 per post)

**Conclusion:** there is no separate runtime "BLOG-05 automated SEO probe" in Phase 6 — the requirement is satisfied by the gate machinery shipped in 06-01 + 06-03, pinned by the integration test in 06-01 Task 3.

## Editorial Flip Workflow (Post-Merge Ops)

For each row in `'in-review'` after Task 2 has populated the 12 rows:

1. **Open Supabase Studio** → `public.blogs` table → filter `status = 'in-review'`.
2. **Review the row's columns** in the Studio row editor:
   - `title` — verify spelling, capitalization, no banlist hits in title text
   - `slug` — verify matches the locked slug from `06-04-BRIEFS.md`
   - `excerpt` — verify 80–200 chars and contains "landlord"
   - `content` — read the full draft, apply human-editorial polish
   - `meta_description` — verify 50–160 chars, persona-aligned
   - `category` — one of the 5 enum values
   - **`canonical_url`** — for brief #10 specifically, verify `/compare/buildium`
3. **Apply any human-editorial polish.** The n8n flow generates good drafts but the user is the final voice. If you edit `content`/`excerpt`/`meta_description`/`slug`, the DB `validate_blog_post()` trigger re-fires on UPDATE — a malformed edit will be rejected with `ERRCODE 23514` and a human-readable gate-failure message.
4. **For Brief #10 specifically:** DO NOT clear or modify the `canonical_url` column unless intentionally removing the canonical redirect to `/compare/buildium`. The Blocker-#1 wiring depends on this column retaining `/compare/buildium`. If cleared, Plan 06-02's `generateMetadata()` falls back to the post's own URL for `alternates.canonical`, and the post will start cannibalizing the existing `/compare/buildium` compare page. Phase 12 SEO monitors for this drift.
5. **Flip the row:** set `status='published'` AND `published_at = now()` in the Studio row editor.
6. **Wait up to 5 minutes** for Next.js ISR (`revalidate=300` from Plan 06-02) to surface the post on `/blog` and `/blog/[slug]`.
7. **Verify live:** `curl -I https://tenantflow.app/blog/{slug}` returns 200 (not 404).

If the validate trigger rejects the UPDATE, the rejection message identifies the failing gate. Fix the offending edit and retry — same enforcement on UPDATE as on INSERT.

## Stagger Publish Cadence (Post-Merge Ops, ~3 posts/week over 4 weeks)

Recommended cadence from `06-RESEARCH-content-strategy.md` § funnel mix and `06-CONTEXT.md § Publish Cadence (LOCKED)`. The user controls actual `published_at` flip timing — this is NOT a Phase 6 merge gate.

| Week | Briefs to flip to `published` | Funnel coverage | Rationale |
|------|-------------------------------|-----------------|-----------|
| **Week 1** (post-merge day 0–7) | 1, 4, 6 | All 3 top-funnel posts | Front-load top-of-funnel to seed Google indexing and capture early organic search traffic |
| **Week 2** (day 8–14) | 2, 8, 7 | Middle-funnel — lease law + maintenance + screening software | Build link equity from the week-1 top-of-funnel reads |
| **Week 3** (day 15–21) | 3, 9, 11 | Middle-to-bottom transition | Late-fee rules + maintenance tracking + lease organization create depth |
| **Week 4** (day 22–28) | 5, 10, 12 | Bottom-funnel — tax vault + Buildium comparison + spreadsheet migration | Ship conversion posts last when top-funnel reads are already driving in-bound links to the site |

`/sitemap.xml` and `/feed.xml` auto-reflect each flip via PR #674 routes — no code changes needed when each post moves to `'published'`. The sitemap `lastmod` field reads from `updated_at ?? published_at` (Phase 4 PR #674 behavior) so freshly-published posts surface as the freshest in the sitemap.

## Live Verification (Post-Final-Publish — Week 4 + 5 min)

Run these after all 12 posts have flipped to `'published'` and ISR has revalidated:

```bash
# Sitemap count of /blog/* URLs
curl -s https://tenantflow.app/sitemap.xml | grep -oE '<loc>[^<]+/blog/[a-z0-9-]+</loc>' | wc -l
# Expect: ≥12 (all 12 slugs present)

# RSS feed item count
curl -s https://tenantflow.app/feed.xml | grep -c '<item>'
# Expect: ≥12

# Spot-check 3 random slugs return 200
for slug in whats-required-in-a-lease-agreement landlord-tax-deductions-2026 tenant-screening-checklist; do
  curl -s -o /dev/null -w "$slug: %{http_code}\n" "https://tenantflow.app/blog/$slug"
done
# Expect: each → 200

# All 12 slugs verification
for slug in whats-required-in-a-lease-agreement rent-increase-notice-per-state late-fee-rules-by-state-2026 landlord-tax-deductions-2026 tax-document-vault-checklist tenant-screening-checklist tenant-screening-software-compared-2026 annual-maintenance-schedule track-maintenance-no-ticketing-system tenantflow-vs-buildium lease-document-organization-system-landlords spreadsheet-to-document-vault-migration; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://tenantflow.app/blog/$slug")
  echo "$slug: $code"
done
# Expect: all 12 → 200

# Real HTTP 404 (not soft-200) for unknown slug — verifies Plan 06-02 notFound() wiring
curl -s -o /dev/null -w "%{http_code}\n" https://tenantflow.app/blog/this-slug-does-not-exist
# Expect: 404

# OG image route responds with image/png
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  https://tenantflow.app/api/og/blog/whats-required-in-a-lease-agreement
# Expect: 200 image/png

# Persona phrase present in body of sample post (Gate #3 verification post-publish)
curl -s https://tenantflow.app/blog/landlord-tax-deductions-2026 | grep -oc 'landlord' | head -1
# Expect: ≥1

# Visible breadcrumb on post page (Plan 06-02 deliverable)
curl -s https://tenantflow.app/blog/whats-required-in-a-lease-agreement | grep -oE 'aria-label="Breadcrumb"' | head -1
# Expect: ≥1

# Brief #10 canonical tag in <head> (Blocker-#1 end-to-end verification)
curl -s https://tenantflow.app/blog/tenantflow-vs-buildium | grep -oE 'link rel="canonical"[^>]+href="[^"]*"' | head -1
# Expect: link rel="canonical" href="...compare/buildium..."
```

## HMAC Test Vector Reproducibility (Carry-Forward from Plan 06-03)

The n8n + Edge Function HMAC signing logic is verified reproducibly via:

```bash
deno run scripts/compute-hmac-vector.ts
# Expected last line: Expected sha256 (hex): f09858270b504410c6de08a909adca3da619026beb880bbd841d4af3c8a767ab
```

If the script's output diverges from the hex embedded in `N8N-FLOW.md § 5 HMAC Test Vector`, n8n and the Edge Function are out of sync. See `N8N-FLOW.md § 5` for the drift-recovery procedure.

## Phase 4 + Phase 5 Regression Guards (Carry-Forward)

Plan 06-04 ships ZERO code changes outside the two markdown artifacts. Regression guards remain green:

- **Phase 4 banlist test:** `pnpm test:unit -- --run src/components/__tests__/marketing-copy-landlord-only.test.ts` exits 0. Gate #8 (banlist) in `validate_blog_post()` enforces the same BANNED_PHRASES list at INSERT/UPDATE time — defense-in-depth, not redundant.
- **Phase 4 persona-consistency e2e:** `pnpm test:e2e -- --project=public --grep "Persona consistency"` exits 0 once the 12 posts are flipped to `'published'`. Each post body contains "landlord" or "landlords" (Gate #3 enforces at INSERT/UPDATE).
- **Phase 5 invariants:** `pricing.ts` untouched. `MAX_PUBLIC_PRICE_DISPLAY = '$149'`, `productJsonLd.offers.length === 3`, `NumberTicker.value: 500` — all unchanged.

PR-time test suite (lefthook pre-commit) passed during commit of `06-04-BRIEFS.md`:
- gitleaks: 0 leaks
- lockfile-verify: ok
- lint: 0 errors
- typecheck: 0 errors
- unit-tests: 130 test files / 98,578 tests passed (~14s)

## Cross-Cutting Design-Token Gate

Plan 06-04 modifies only the two markdown artifacts in `.planning/phases/06-blog-rebuild/`. No UI surface touched. Design-token diff (`scripts/check-design-tokens.sh` if invoked): 0 new hex / 0 new rgba / 0 new `bg-white` / 0 new inline-ms additions. Gate satisfied trivially.

## Threat Flags

No new threat surface introduced by Plan 06-04 (markdown artifacts only; no network endpoint, no auth path, no file access, no schema change). Phase 6 threat register (lines 422–442 of `06-04-PLAN.md`) remains the canonical record.

## Deferred (Post-Merge, Not Phase 6 Gate)

1. **User runs the n8n flow 12 times** to populate `blogs` with 12 `'in-review'` rows. Per `06-04-PLAN.md § Task 2`. Expected cost ~$0.72 in Sonnet 4.5 spend; expected per-run latency ~30–45s; total runtime ~6–9 minutes wall-clock.
2. **User staggers publish over 3-4 weeks** per the week-1..4 cadence above. Each flip is a Studio UPDATE; auto-reflects in sitemap + RSS via PR #674 routes.
3. **Phase 12 SEO follow-up:** monitor `tenantflow-vs-buildium` post for cannibalization with the `/compare/buildium` compare page. Already mitigated via the canonical-tag chain (Plan 06-01 column → Plan 06-03 Edge Function → Plan 06-02 metadata → `<head>`); Phase 12 adds Search Console monitoring as a belt-and-suspenders layer.
4. **n8n flow polish:** per-topic prompt tuning is an operations workstream, not a Phase 6 gate. The 9 gates protect content quality at the DB boundary; iterative prompt refinement happens through observed gate-failure patterns post-launch.

## Acceptance Criteria Verification

Per `06-04-PLAN.md § Task 1 acceptance_criteria`:

- [x] `test -f .planning/phases/06-blog-rebuild/06-04-BRIEFS.md` — true
- [x] All 12 locked slugs appear in the file — verified via grep loop, all 12 found
- [x] Exactly 12 briefs (one per locked slug) — verified `grep -cE "^## Brief [0-9]+ — " ... ` returns 12
- [x] Brief 10 payload contains `"canonical_url": "/compare/buildium"` — verified via grep
- [x] Brief 10 system-prompt augmentation explicitly tells Claude NOT to inject `<link rel="canonical">` HTML into the markdown body — present in body of brief #10
- [x] File contains a "BLOG-05" section — present
- [x] File contains a "stagger" section — "Stagger Schedule (recommended)" present
- [x] File contains an "editorial flip" reminder for brief #10 canonical preservation — present

Per `06-04-PLAN.md § Task 3 acceptance_criteria` (this file):

- [x] `test -f .planning/phases/06-blog-rebuild/06-04-SUMMARY.md` — true (about to be committed)
- [x] File contains `Editorial flip workflow` section — present
- [x] File contains `Live verification` section with curl commands — present, including canonical-tag verification for brief #10
- [x] File contains the locked publish cadence (Week 1..4 distribution) — present in "Stagger Publish Cadence" table
- [x] File contains a "BLOG-05" section explicitly mapping the requirement to gate machinery — present in "BLOG-05 Automated SEO+Tone Gate Mapping" section
- [x] File contains a "stagger" section / publish cadence — present
- [x] File contains an "editorial flip" section (brief #10 canonical preservation reminder included) — present in "Editorial Flip Workflow"
- [x] `pnpm test:unit -- --run src/components/__tests__/marketing-copy-landlord-only.test.ts` — confirmed green in pre-commit hook for Task 1 (full 98,578-test suite ran, all passed)

## Self-Check: PASSED

**Files verified to exist:**
- `.planning/phases/06-blog-rebuild/06-04-BRIEFS.md` — FOUND
- `.planning/phases/06-blog-rebuild/06-04-SUMMARY.md` — FOUND (this file)

**Commits verified:**
- Task 1 commit `2e797907b` — FOUND in `git log`
- Task 3 commit — pending, will be created after this self-check completes

**Grep verifications:**
- 12 briefs in BRIEFS.md — `grep -cE "^## Brief [0-9]+ — "` returns `12`
- All 12 locked slugs present in BRIEFS.md — verified via per-slug grep loop
- `"canonical_url": "/compare/buildium"` present in BRIEFS.md — verified
- "BLOG-05" present in SUMMARY.md — verified during composition
- "stagger" / "editorial flip" present in SUMMARY.md — verified during composition
