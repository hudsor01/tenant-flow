# Phase 13: SEO-01 Reclaim Integration - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Source:** Grounded blog-redirects.ts, the collision-guard test, the SEO audit top-10 queue, and the generator's slug handling.

<domain>
## Phase Boundary
Wire the (now-complete) blog engine to RECLAIM the deleted high-impression ghost slugs: generate a quality post AT the exact original slug, and on publish remove its 301 entry so the new post serves instead of redirecting — closing the carried-over v4.0 SEO-01 item. This is the reclaim MECHANISM (code) + the seeded queue; actually running the pipeline 10× to produce the posts is owner content-work (each draft still passes the Phase-12 judge gate + human approval). No new generation model, no cadence/scheduling (Phase 14).
</domain>

<decisions>
## Implementation Decisions (LOCKED — grounded)

### BLOG-08a — generate at the EXACT ghost slug
- `scripts/generate-blog-draft.ts` currently lets the MODEL choose the slug (json_schema) and validates it (gate: regex `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, length 3-120). Add a **`--slug <ghost-slug>`** override: after `generate()` + before `runGates()`, pin `draft.slug = slugOverride`. The top-10 ghost slugs all match the regex + are ≤90 chars (within the 3-120 gate), so the overridden slug still clears the gate cleanly. The generation TARGET hint (20-70 chars) is just a hint — the override bypasses the model's slug entirely.
- Topic + category still passed as today (`"<topic>" [category]`); the override only fixes the slug. The reclaim post is grounded in TenantFlow RAG facts like any draft, judge-gated, and lands `in-review`.

### BLOG-08b — the top-10 reclaim queue (seeded)
- Seed a queue from the audit (`.planning/seo-audit/ANALYSIS-2026-05-29.md`, Republish-reclaim table) as an exported const (e.g. `src/lib/seo/reclaim-queue.ts`) of `{ slug, topic, category }` for the top-10 by impressions. Each `slug` MUST equal the `source` (minus `/blog/`) of an existing `DELETED_BLOG_REDIRECTS` entry (assert this in a test — drift guard). The `topic` is the humanized slug; `category` maps to the closest of {lease-law, tax-prep, tenant-screening, maintenance, software-vault} (most are competitor/pricing/listicle → `software-vault`).
- Top-10 (slug · impr/qtr · current 301): rentredi-pricing-breakdown-and-hidden-fees-what-every-small-landlord-needs-to-know (927, /compare/rentredi); yardi-breeze-vs-appfolio-complete-comparison-for-2026 (742, /compare/appfolio); stessa-vs-rentredi-complete-comparison-for-2026 (596, /compare/rentredi); photography-tips-for-rental-listings (428, /blog); top-50-property-management-apps-for-small-landlords (414, /blog); rentec-direct-vs-avail-complete-comparison-for-2025 (385, /compare); top-3-property-management-apps-for-commercial-landlords (375, /blog); top-5-property-management-apps-for-first-time-landlords-remote-friendly (372, /blog); stessa-vs-turbotenant-complete-comparison-for-2026 (325, /compare); rent-manager-pricing-breakdown-and-hidden-fees-what-you-need-to-know-before-you-subscribe (303, /blog).

### BLOG-08c — remove-on-publish + collision guard stays green
- The collision-guard test `src/lib/seo/__tests__/blog-redirects.test.ts` holds a HARDCODED `LIVE_PUBLISHED_SLUGS` set (9 slugs, snapshot 2026-05-29) and asserts no `DELETED_BLOG_REDIRECTS.source` shadows a live published slug (a redirect source matching a live slug would 301-shadow the real post in next.config redirects()).
- When a reclaimed slug is published, TWO edits keep it correct: (1) DELETE that slug's entry from `DELETED_BLOG_REDIRECTS` (so it no longer 301s — the new post serves); (2) ADD the slug to the test's `LIVE_PUBLISHED_SLUGS` (so the guard now enforces that the redirect was removed — if a future edit re-adds the redirect, the test fails). Provide `scripts/reclaim-finalize.ts <slug>` that performs BOTH edits deterministically (it is a code change to commit, since the redirect map + guard are compile-time — publish is a DB action, the removal is code). The collision-guard test stays green after both edits.
- Decision for the planner: EITHER keep the static `LIVE_PUBLISHED_SLUGS` snapshot updated by the finalize script (simplest), OR make the collision test query prod published slugs dynamically (auto-enforcing, but turns a unit test into an integration test). Default to the static + finalize-script approach unless the planner finds the dynamic guard cleaner.

### Verification
- `generate-blog-draft.ts --slug top-3-property-management-apps-for-commercial-landlords "<topic>" software-vault --dry-run` produces a draft whose slug is EXACTLY that ghost slug, passing the 9 gates + judge.
- The reclaim-queue const ↔ DELETED_BLOG_REDIRECTS drift-guard test passes (every queue slug is a current redirect source).
- After `scripts/reclaim-finalize.ts <slug>`: the slug's `DELETED_BLOG_REDIRECTS` entry is gone, the slug is in `LIVE_PUBLISHED_SLUGS`, and `blog-redirects.test.ts` stays green.
</decisions>

<constraints>
- TRACKED script + data + test work → perfect-PR gate; CI green (typecheck/lint/build/E2E/rls). No `any`, no `as unknown as`, no duplicate types, kebab files, no string-literal query keys (n/a). Scripts run by the owner (creds scrubbed from the agent shell); the agent builds + unit-tests, the owner runs the pipeline + finalize.
- The reclaim post must still pass the Phase-12 judge (brand/E-E-A-T/grounding) + human approval — reclaim does NOT bypass quality. Competitor-comparison topics are grounded in TenantFlow RAG facts (the corpus has no competitor specifics) → the post is a TenantFlow-positioned take, judge-gated; that is acceptable (a quality TenantFlow post at the ghost slug reclaims the URL + ranking).
- Never auto-publish; never let a published slug ALSO be a redirect source (the collision guard enforces this).
- Slug override must STILL pass the slug gate (3-120 + regex) — all top-10 ghost slugs do; assert this.
</constraints>

<canonical_refs>
- `src/lib/seo/blog-redirects.ts` (`DELETED_BLOG_REDIRECTS: BlogRedirect[]`, {source, destination}) + `src/lib/seo/__tests__/blog-redirects.test.ts` (collision guard, `LIVE_PUBLISHED_SLUGS`).
- `scripts/generate-blog-draft.ts` (main() arg parsing ~line 500; the slug gate ~line 134; add `--slug` override).
- `.planning/seo-audit/ANALYSIS-2026-05-29.md` (the top-10 republish-reclaim queue, part B).
- `src/app/blog/[slug]/page.tsx` (`dynamicParams=false`, generateStaticParams = published slugs — a reclaimed slug's page builds on the next deploy after publish), `src/app/actions/blog-publish.ts` (Phase-12 admin approve→published).
- The seo-deleted-blog-catalogue memory.
</canonical_refs>

<deferred>
- Cadence/schedule, dedupe, monitoring → Phase 14.
- Generating all 10 reclaim posts (content work) → owner runs the pipeline per slug; Phase 13 ships the mechanism + queue + finalize tooling, not 10 published posts.
- next.config redirects() wiring already shipped (part A); not re-touched here beyond removing reclaimed entries.
</deferred>

---
*Phase: 13-seo-01-reclaim-integration — generator `--slug` override + seeded top-10 reclaim queue + `reclaim-finalize` (remove redirect + update collision guard) so a republished post serves at the exact ghost slug and reclaims its ranking. Closes v4.0 SEO-01.*
