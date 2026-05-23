# Phase 1: Critical Stop-Bleed (Blog Unpublish + Pricing Placeholder) — Context

**Gathered:** 2026-05-08
**Status:** Ready for planning
**Source:** Q&A round during /gsd-new-project + 4-specialist parallel research + synthesizer (replaces /gsd-discuss-phase)

<domain>
## Phase Boundary

Phase 1 stops the SEO + ad-spend hemorrhage from two specific defects on tenantflow.app, identified in the external UI audit dated 2026-05-08. It does NOT do the longer-term blog rebuild (Phase 6) or pricing restructure (Phase 5). It is the smallest possible "stop the visible bleeding" PR.

**In scope:**
- CRIT-01: bulk-unpublish broken `blogs` rows (~70+ posts rendering "Error Processing Blog") via one SQL migration. Stops Google indexing duplicate-content error pages within 2-4 weeks.
- CRIT-03: unify Max plan pricing display across 3 marketing surfaces using "Custom" placeholder (NOT 4 — audit was wrong, see Implementation Decisions). Stops the visible 4-way contradiction without committing to a price that will change in Phase 5.
- Re-bleed guard: BEFORE-INSERT trigger that rejects future n8n-pushed bad rows until Phase 6 redesigns the n8n flow. n8n is currently still pushing per user confirmation.

**Out of scope** (deferred to other phases):
- Full blog rebuild (data + UI + n8n redesign + content) → Phase 6 (BLOG-01..06)
- Full pricing restructure (revenue audit + tier rebuild + Stripe migration) → Phase 5 (PRICE-01..06)
- Lint codification of design-token rules → Phase 11 (TOKEN-03)
- Authenticated `/billing/plans` pricing display — keeps showing $199 (Stripe-truth for paying subscribers); Phase 5 fixes naturally during tier restructure
- CTA label canonicalization on non-pricing surfaces → Phase 10 (TRUST-03)

**Branch:** `gsd/phase-1-critical-stop-bleed`
**Phase requirement IDs:** CRIT-01, CRIT-03
**Cross-cutting design-token constraint:** No new hex/rgb/`bg-white`/inline-ms tokens introduced. Every color/spacing/typography/radius/shadow/duration value uses a `globals.css` token. Verified at PR review time via the perfect-PR gate.

</domain>

<decisions>
## Implementation Decisions

### CRIT-01: Blog Bulk-Unpublish (LOCKED)

- **Identification rule:** `WHERE status='published' AND (title='Error Processing Blog' OR content LIKE 'Error: Could not extract content. Response keys: %')` — defense-in-depth via two-of-three signature match. Pre-flight verification queries (count + sample + title distribution + inverse false-positive check) must run BEFORE mutation. Source: `01-RESEARCH-blog-data.md § Identification Rule`.
- **State transition:** `UPDATE blogs SET status='draft'`. NOT hard delete. NOT archive-table copy. Soft-hide is sufficient because read paths already filter `status='published'` at 4 verified sites (`blog-keys.ts:89,135,177,198`, `sitemap.ts:120`, `feed.xml/route.ts:70`, `blog_categories_rpc:18`). Source: `01-RESEARCH-blog-data.md § State Transition Recommendation`.
- **Re-bleed guard (CRITICAL — n8n still pushing):** Same migration adds BEFORE-INSERT trigger `reject_n8n_error_blogs_trigger` invoking function `reject_n8n_error_blogs()` that raises `EXCEPTION` when a new row matches `title='Error Processing Blog' OR content LIKE 'Error: Could not extract content. Response keys: %'`. Trigger SQL `comment` includes Phase 6 forward-carry breadcrumb so it survives planning-record loss. Phase 6 (BLOG-03) drops trigger as part of redesigned n8n migration.
- **Migration approach:** one-shot SQL migration applied via Supabase MCP `apply_migration`. Migration includes pre-flight `do $$` block aborting if count > 200 OR bad-row ratio > 95% (false-positive guard); the UPDATE itself; post-flight `do $$` asserting zero bad rows remain in 'published' status. Idempotent on re-run. After applying, reconcile timestamp via `mcp__supabase__list_migrations` and rename repo file to match prod-assigned timestamp before committing — per `migration-mcp-prod-drift.md` memory.
- **Rollback playbook (3-tier descending):**
  1. Capture affected primary-key list to `01-CRIT-01-affected-ids.txt` artifact during pre-flight; reverse UPDATE by ID list if quick rollback needed.
  2. If ID list lost: signature + 24-hour-window reverse UPDATE.
  3. If rollback needed weeks later: pg_dump snapshot restore.
- **HTTP status (already correct):** stay with 404. Next.js `notFound()` is called pre-render at `blog/[slug]/page.tsx:61` and `:104` — emits real 404. No 410, no 301, no Indexing API, no GSC Removals tool. Google deindex window 2-4 weeks. Source: `01-RESEARCH-blog-seo.md § HTTP Status Recommendation`.
- **Sitemap + RSS (zero code change):** `src/app/sitemap.ts:117-123` and `src/app/feed.xml/route.ts:71` already filter `status='published'`. ISR (24h) drops broken rows automatically after migration. Hub `lastmod` cascade is a beneficial side effect.
- **`/blog` index empty state (already wired):** `BlogEmptyState` component renders on zero data at `blog-client.tsx:108-110` with message "No articles yet. Check back soon." No CTA addition (audit philosophy: don't be pushy).
- **Phase 6 dependency:** drop `reject_n8n_error_blogs_trigger` and `reject_n8n_error_blogs()` function as part of BLOG-03 redesigned-n8n migration. Documented in 01-RESEARCH.md `## Phase 6 Forward-Compatibility`.

### CRIT-03: Max Pricing Placeholder (LOCKED)

- **Stripe-vs-public divergence pattern:** add module-scope constant `MAX_PUBLIC_PRICE_DISPLAY = 'Custom' as const` to `src/config/pricing.ts`. Marketing surfaces import the constant directly. The `PricingConfig` type interface stays clean (no `displayPrice` field bloat). Phase 5 cleanup is `grep -r MAX_PUBLIC_PRICE_DISPLAY src/` → delete constant + 3 call sites. Source: `01-RESEARCH-pricing-ui.md § Public-vs-Stripe Divergence Pattern`.
- **JSDoc on constant:** `/** Phase 1 (CRIT-03) placeholder. Phase 5 (PRICE-*) deletes this. Search this symbol when restructuring tiers. */`
- **Surface scope (3 not 4 — audit was wrong):**
  | Surface | File | Change |
  |---------|------|--------|
  | Pricing card | `src/components/pricing/pricing-card-standard.tsx:167-168` | ✅ already shows "Custom" — NO change. Routes Max checkout to `/contact` at lines 63-66. |
  | Comparison table | `src/components/pricing/pricing-comparison-table.tsx:205` | Replace `$199/mo` literal with `MAX_PUBLIC_PRICE_DISPLAY` import. Single-line edit. |
  | JSON-LD `Product.offers[]` | `src/app/pricing/page.tsx:32-40` | Drop Max from offers array entirely. Only Starter ($29) + Growth ($79) emit as `Offer` nodes. Surface "Max — Custom pricing, contact sales" in Product-level `description` text instead. (Specialist 3 Option C — competitor consensus from 7 sites.) |
  | Homepage features grid | `src/components/sections/features-section.tsx:23-25` | ❌ NO change. "Max unlimited" is a *feature limit* description, not a price. Audit's "4 surfaces" claim was wrong. |
- **Stripe: untouched** at $199. Don't disturb billing. Phase 5 owns the restructure.
- **Authenticated `/billing/plans`: untouched.** Page reads `config.price.monthly` numeric (199) and renders `$199/month`. Specialist 4's call: paying subscribers see Stripe-truth in the app — matches their bank statement and Stripe invoice. User-confirmed via Q&A: "$199/month — Specialist 4 sticks". Phase 5 updates this naturally during tier restructure.
- **CTA label "Contact Sales":** already shipped on Max pricing card (`pricing-card-standard.tsx:243`) and `kibo-style-pricing.tsx:145`. No NEW label work in Phase 1. Other label drift (`pricing-content.tsx:147` "Connect with sales", `:180` "Schedule a walkthrough") is Phase 10 TRUST-03 scope — leave alone.
- **Annual toggle math (already correct — audit was wrong):** "Save $158" = Growth $79×12 − $790 annual = $158. Math is correct. Toggle stays globally enabled. Max card already ignores `billingCycle` (renders "Custom" regardless of toggle state).
- **Verbatim text alignment (cross-domain lock):** the visible Max card copy says "Custom" + "Contact Sales" CTA. The Product-level `description` in JSON-LD must say "Max — Custom pricing, contact sales" so Google's "structured data must match visible content" policy is satisfied.

### Audit Corrections (LOCKED)

1. ❌ Audit "4 surfaces" → ✅ 3 surfaces (homepage features grid is a feature limit, not a price)
2. ❌ Audit "Save $158 doesn't match a single-plan calculation" → ✅ math IS correct (Growth $79×12 − $790 = $158)
3. ❌ Audit implies authenticated `/billing/plans` is in scope → ✅ out of scope (Stripe-truth for subscribers)
4. 🆕 NEW: n8n re-bleed guard required (n8n confirmed still pushing — out-of-band of audit)

### Cross-Cutting Design-Token Constraint (LOCKED — applies to ALL phases)

Every visual fix must use canonical tokens defined in `src/app/globals.css`:
- Color: `--color-*` tokens only (oklch); never hex/rgb/named colors
- Surfaces: `bg-background`, `bg-card`, `bg-muted` — never `bg-white`
- Text: `text-foreground`, `text-muted-foreground` — never bare `text-muted` or hex
- Spacing/Radius/Shadow/Typography/Animation: only the scales defined in `globals.css @theme`
- Icons: `lucide-react` only
- For "Custom" cell in comparison table: `text-muted-foreground` (matches `$29/mo` symmetry); inherit `bg-muted/50` from parent row; no badge.

A PR introducing a hex/rgb/`bg-white`/inline-ms FAILS the perfect-PR review gate.

### Claude's Discretion

- Migration filename (prod-assigned timestamp wins post-apply per `migration-mcp-prod-drift.md`)
- Specific test names + structure for the new `pricing-page.test.ts` (asserts 2-offer JSON-LD output) and any unit test additions for the trigger function
- Plan file decomposition (planner picks how many plans + waves; suggested split: Plan 01 = blog migration + trigger, Plan 02 = pricing constant + comparison-table edit + JSON-LD edit + tests; can run as 2 parallel plans since touchpoints don't overlap)
- Specific commit message wording (within commitlint rules)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 research (specialists already produced; planner reads canonical synthesis)
- `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-RESEARCH.md` — canonical synthesis (read FIRST)
- `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-RESEARCH-blog-data.md` — DB-safety appendix (deeper detail on identification rule, state transition, rollback)
- `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-RESEARCH-blog-seo.md` — SEO appendix (HTTP status, sitemap, soft-404 audit)
- `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-RESEARCH-pricing-schema.md` — JSON-LD appendix (Schema.org Option C, 7-site competitor survey)
- `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-RESEARCH-pricing-ui.md` — UI appendix (constant pattern, comparison-table edit, design-token mapping)

### Project context (already-locked decisions)
- `.planning/PROJECT.md § Key Decisions` — full list of v1.0-locked decisions
- `.planning/REQUIREMENTS.md § Critical — Block Marketing Spend (CRIT)` — CRIT-01 + CRIT-03 + cross-cutting design-token constraint
- `.planning/ROADMAP.md § Phase 1` — phase goal + 4 success criteria
- `audit-ui-2026-05-08.md` (project root) — original audit; items #1, #3 (and audit's incorrect #16 already noted)

### Codebase conventions
- `CLAUDE.md` — zero-tolerance rules, schema conventions, RLS, query-key factories, migration MCP drift, RPC patterns, archive patterns, naming conventions, path aliases
- `src/app/globals.css` — canonical design token authority (the `@theme` block at top)

### Existing-pattern references (read; do NOT copy unnecessarily)
- `supabase/migrations/20260306170000_cleanup_cron_scheduling.sql` — archive-table pattern reference (DO NOT use this pattern for Phase 1; archive-then-delete is for retention SLAs, not 100-row one-shots)
- `src/components/pricing/pricing-card-standard.tsx:167-168, 63-66, 243` — existing "Custom" rendering + checkout routing for Max
- `src/components/pricing/kibo-style-pricing.tsx:143-146` — independent existing "Custom" precedent
- `src/components/pricing/pricing-comparison-table.tsx:205` — the single `$199/mo` cell to fix
- `src/app/pricing/page.tsx:22-23, 32-40` — JSON-LD `Product` schema + offers array (current state, target diff)
- `src/lib/seo/product-schema.ts` — factory for Product JSON-LD (NO change to factory; only call site changes)
- `src/lib/seo/__tests__/product-schema.test.ts:106` — existing assertion `offers[2]?.price === '199'` — factory tests STAY VALID; new page-level test must assert 2-offer production output
- `src/components/blog/blog-client.tsx:108-110` — existing `BlogEmptyState` wiring
- `src/app/blog/[slug]/page.tsx:61, 104` — existing `notFound()` calls (already correct, no change)
- `src/app/sitemap.ts:117-123` and `src/app/feed.xml/route.ts:71` — existing `status='published'` filters (already correct, no change)

### Memory references (auto-loaded but worth noting)
- `migration-mcp-prod-drift.md` — reconcile timestamps via `mcp__supabase__list_migrations` AFTER applying via Supabase MCP, then rename repo file to match prod-assigned timestamp before merging

</canonical_refs>

<specifics>
## Specific Ideas

- **Pre-flight abort thresholds (in migration):** count > 200 (sanity ceiling) OR bad-row ratio < 95% (false-positive guard — if signature catches < 95% of "matched" rows being actually broken, abort because pattern is too loose)
- **Trigger SQL `COMMENT`:** must include the string `Phase 6 / BLOG-03 will drop this trigger as part of n8n redesign — do not preserve indefinitely` so future agents see the breadcrumb
- **Affected IDs artifact path:** `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-CRIT-01-affected-ids.txt` — captured during pre-flight, committed to repo for rollback discoverability
- **Manual Rich Results Test post-deploy:** paste deployed JSON-LD at `https://search.google.com/test/rich-results` and screenshot the green check. This closes Specialist 3's MEDIUM-confidence gap (couldn't run live test in sandbox). Plan should include this as a verification task with `autonomous: false` (manual step).
- **JSON-LD `description` text:** must say "Max — Custom pricing, contact sales" verbatim (not paraphrased) to satisfy Google's "structured data must match visible content" policy; the visible card uses similar text.
- **Suggested plan decomposition:** 2 plans, parallel-eligible (no overlap):
  - Plan 01: blog migration + trigger + post-flight verification + ID artifact (touches `supabase/migrations/`, no frontend code)
  - Plan 02: pricing constant + comparison table + page.tsx JSON-LD + new page-level test (touches `src/config/`, `src/components/pricing/`, `src/app/pricing/`, `src/lib/seo/__tests__/`)
- **Test impact:**
  - `src/lib/seo/__tests__/product-schema.test.ts:106` — factory test stays valid (factory still accepts 3-offer arrays)
  - NEW: `src/app/pricing/__tests__/page.test.ts` (or equivalent) asserts production `pricing/page.tsx` outputs JSON-LD with exactly 2 offers (Starter + Growth)
  - NEW: `supabase/tests/db/blog-cleanup.test.sql` (or equivalent) asserts trigger rejects matching INSERTs

</specifics>

<deferred>
## Deferred Ideas

These came up during Q&A or research but explicitly belong to other phases. Documented to prevent scope creep into Phase 1:

- **Full blog rebuild** (data audit + UI rebuild + n8n redesign + content set) → Phase 6 (BLOG-01..06). Phase 1's trigger guard supersedes the eventual n8n fix temporarily.
- **Full pricing restructure** (revenue audit + competitor analysis + new tier proposal + Stripe migration + propagate everywhere) → Phase 5 (PRICE-01..06). Phase 1's `MAX_PUBLIC_PRICE_DISPLAY` constant is a placeholder that Phase 5 deletes.
- **Authenticated `/billing/plans` UI changes** → Phase 5 (naturally during Stripe restructure)
- **Lint codification of design-token rules** (no-hex / no-bg-white / no-inline-ms ESLint plugin or stylelint config) → Phase 11 (TOKEN-03)
- **CTA label canonicalization on non-pricing surfaces** → Phase 10 (TRUST-03). Phase 1 leaves `pricing-content.tsx:147` ("Connect with sales") and `:180` ("Schedule a walkthrough") alone.
- **Persona word selection** (research during /gsd-plan-phase 4) → Phase 4. Phase 1 doesn't touch persona-language code.
- **Replacing "Join 500+ Growth subscribers"** with "Built for landlords with 1–15 rentals" → Phase 4 (COPY-02).
- **Real testimonials, review badges, monitored inboxes** → Phase 10 (TRUST-01..04).
- **Pre-flight pause/disable of n8n workflow** during Phase 1 deploy — out of code scope (operational); the trigger guard makes it unnecessary anyway, but worth confirming with user before applying migration.

</deferred>

---

*Phase: 01-critical-stop-bleed-blog-unpublish-pricing-placeholder*
*Context gathered: 2026-05-08 via Q&A round + 4-specialist parallel research + synthesizer (NOT via /gsd-discuss-phase)*
