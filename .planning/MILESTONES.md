# Milestones

## v1.0 Marketing Surface Honesty (Shipped: 2026-05-22)

**Phases completed:** 16 phases, 33 plans, 57 tasks

**Key accomplishments:**

- Phase:
- One-liner:
- One-liner:
- Files exist:
- 1. [Rule 3 - Blocking] Cookie-less anon client in generateStaticParams
- HMAC-SHA256-gated Edge Function ingesting n8n-generated blog drafts with 9-gate defense-in-depth, canonical_url Blocker-#1 wiring, 11-case Deno test suite, and importable n8n cloud workflow.
- Files verified to exist:
- jsdom render suite pinning the Growth (Featured) pricing card's CONS-05 badge position, CONS-09 price-row `whitespace-nowrap`, and CONS-10 per-card `Save $98/year` savings line.
- jsdom render suite pinning the Standard (Starter/Max) pricing card's CONS-09 price-row `whitespace-nowrap` and CONS-10 per-card `Save $X/year` savings line, plus a bento-section pin that the removed global savings badge stays removed and a pure `calculateAnnualSavings` math pin.
- Three new Vitest regression-pin test files lock the shipped CONS-02/03/11 fixes (Multi-Property Dashboard LayoutDashboard icon, homepage aria-current wiring, no placeholder hrefs in the navbar config) so a future edit cannot silently revert them.
- 1. [Rule 3 - Blocking] Removed redundant `--run` from test commands
- 1. [Rule 1 - Bug] CONS-06 docblock triggered Vitest environment-parser crash
- Two Vitest regression-pin test files (11 tests) locking the shipped TRUST-01 real testimonials (data shape + TestimonialsSection render gate) and TRUST-03/04 /security-policy monitored-inbox documentation against future drift, plus a documented TRUST-02 review-badge deferral — no production source touched.
- Authored the TOKEN-03 drift-guard — a Vitest unit-project test that recursively scans `src/components` + `src/app` for hex/`rgb`/`bg-white`/non-zero-inline-ms drift against a 10-entry D-03 allowlist (passes green, codifying the TOKEN-02 site-wide audit) — and documented the mechanism for maintainers in `11-LINT-RULE.md`.
- All 8 drifting page `<title>` separators normalized to the canonical pipe ` | `, pinned by a new CI-enforced title-separator drift guard.
- Three new test files pinning the shipped SEO-03 JSON-LD shape, SEO-06 footer sitemap link, and the consolidated SEO-07 aria-current "green report" — plus code-inspection verifications for SEO-04 (DB-sourced blog slugs) and SEO-05 (visible breadcrumbs already pinned by existing tests).
- Signed-out visitors hitting a typo URL now land on the marketing navbar + footer with a "Back to Home" recovery button instead of a stranded auth-flavored 404 that bounced them to /login (D-01).
- 1. [Rule 1 — Bug] Removed unused `createLogger` + `logger` from `stripe-client.ts`
- `/blog` index now returns 200 OK + empty-state UI when Supabase fetch fails — failures route to Sentry with `tags: { surface: 'blog-index' }` instead of bubbling to a 5xx
- `/blog` now has a route-scoped `loading.tsx` so Next.js streaming swaps from a blog-themed skeleton directly to the resolved page — eliminating the co-rendering skeleton + empty-state UX bug
- 1. [Rule 3 — Blocking] Absolute path drift — initial Write tool calls targeted main repo, not worktree
- Flipped 24 body REQ checkboxes (`[ ]` → `[x]`) and 35 traceability table cells (`| Pending |` → `| Complete |`) in `.planning/REQUIREMENTS.md`, then bumped the footer `Last updated` stamp to 2026-05-21 with a Phase 15 sweep note — bringing the canonical traceability artifact in line with v1.0 ship state.
- Capped Vitest 4 unit-project worker fan-out at `maxWorkers: 8` (defensive hedge); 3-run zero-flake gate met with 0/105,093 failures across baseline AND final tune.
- Belt-and-suspenders regression pair (source-scan + render) locking the AUDIT-2 deferral of `/blog` from `DEFAULT_NAV_ITEMS` so future un-deferral must be a deliberate edit, not accidental drift.

---

## v1.0 Marketing Surface Honesty (Shipped: 2026-05-22)

**Phases completed:** 16 phases, 33 plans, 57 tasks

**Key accomplishments:**

- Phase:
- One-liner:
- One-liner:
- Files exist:
- 1. [Rule 3 - Blocking] Cookie-less anon client in generateStaticParams
- HMAC-SHA256-gated Edge Function ingesting n8n-generated blog drafts with 9-gate defense-in-depth, canonical_url Blocker-#1 wiring, 11-case Deno test suite, and importable n8n cloud workflow.
- Files verified to exist:
- jsdom render suite pinning the Growth (Featured) pricing card's CONS-05 badge position, CONS-09 price-row `whitespace-nowrap`, and CONS-10 per-card `Save $98/year` savings line.
- jsdom render suite pinning the Standard (Starter/Max) pricing card's CONS-09 price-row `whitespace-nowrap` and CONS-10 per-card `Save $X/year` savings line, plus a bento-section pin that the removed global savings badge stays removed and a pure `calculateAnnualSavings` math pin.
- Three new Vitest regression-pin test files lock the shipped CONS-02/03/11 fixes (Multi-Property Dashboard LayoutDashboard icon, homepage aria-current wiring, no placeholder hrefs in the navbar config) so a future edit cannot silently revert them.
- 1. [Rule 3 - Blocking] Removed redundant `--run` from test commands
- 1. [Rule 1 - Bug] CONS-06 docblock triggered Vitest environment-parser crash
- Two Vitest regression-pin test files (11 tests) locking the shipped TRUST-01 real testimonials (data shape + TestimonialsSection render gate) and TRUST-03/04 /security-policy monitored-inbox documentation against future drift, plus a documented TRUST-02 review-badge deferral — no production source touched.
- Authored the TOKEN-03 drift-guard — a Vitest unit-project test that recursively scans `src/components` + `src/app` for hex/`rgb`/`bg-white`/non-zero-inline-ms drift against a 10-entry D-03 allowlist (passes green, codifying the TOKEN-02 site-wide audit) — and documented the mechanism for maintainers in `11-LINT-RULE.md`.
- All 8 drifting page `<title>` separators normalized to the canonical pipe ` | `, pinned by a new CI-enforced title-separator drift guard.
- Three new test files pinning the shipped SEO-03 JSON-LD shape, SEO-06 footer sitemap link, and the consolidated SEO-07 aria-current "green report" — plus code-inspection verifications for SEO-04 (DB-sourced blog slugs) and SEO-05 (visible breadcrumbs already pinned by existing tests).
- Signed-out visitors hitting a typo URL now land on the marketing navbar + footer with a "Back to Home" recovery button instead of a stranded auth-flavored 404 that bounced them to /login (D-01).
- 1. [Rule 1 — Bug] Removed unused `createLogger` + `logger` from `stripe-client.ts`
- `/blog` index now returns 200 OK + empty-state UI when Supabase fetch fails — failures route to Sentry with `tags: { surface: 'blog-index' }` instead of bubbling to a 5xx
- `/blog` now has a route-scoped `loading.tsx` so Next.js streaming swaps from a blog-themed skeleton directly to the resolved page — eliminating the co-rendering skeleton + empty-state UX bug
- 1. [Rule 3 — Blocking] Absolute path drift — initial Write tool calls targeted main repo, not worktree
- Flipped 24 body REQ checkboxes (`[ ]` → `[x]`) and 35 traceability table cells (`| Pending |` → `| Complete |`) in `.planning/REQUIREMENTS.md`, then bumped the footer `Last updated` stamp to 2026-05-21 with a Phase 15 sweep note — bringing the canonical traceability artifact in line with v1.0 ship state.
- Capped Vitest 4 unit-project worker fan-out at `maxWorkers: 8` (defensive hedge); 3-run zero-flake gate met with 0/105,093 failures across baseline AND final tune.
- Belt-and-suspenders regression pair (source-scan + render) locking the AUDIT-2 deferral of `/blog` from `DEFAULT_NAV_ITEMS` so future un-deferral must be a deliberate edit, not accidental drift.

---
