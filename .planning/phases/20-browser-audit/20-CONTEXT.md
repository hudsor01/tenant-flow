# Phase 20: Browser Audit - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Systematic browser automation verification of every user-facing page across all 5 page groups (marketing, blog, auth, tenant portal, owner dashboard), confirming interactions and visual consistency at 375px, 768px, and 1440px viewports. Issues found are fixed inline and re-verified before the milestone ships.

</domain>

<decisions>
## Implementation Decisions

### Audit structure
- One plan per page group: marketing, blog, auth, tenant portal, owner dashboard
- Plans can run in parallel (Wave 1) since they cover independent page groups
- Every page in each group is audited — no skipping duplicate patterns
- All 3 viewports (375px, 768px, 1440px) checked per page

### Browser automation tool
- Claude-in-Chrome MCP is the primary audit tool (not Playwright)
- Use `mcp__claude-in-chrome__navigate` to load pages, `mcp__claude-in-chrome__resize_window` for viewport changes
- Use `mcp__claude-in-chrome__read_console_messages` to check for console errors
- Use `mcp__claude-in-chrome__read_page` / `mcp__claude-in-chrome__get_page_text` for DOM inspection
- Use `mcp__claude-in-chrome__javascript_tool` for clicking interactive elements and verifying state changes

### Issue resolution
- Fix issues inline as they're found: find issue → fix code → re-verify in browser → continue
- Any UI issue is fixable inline: CSS, layout, spacing, typography, broken interactions, missing states, console errors
- Out of scope: data bugs, missing features, backend logic errors — log these but don't fix
- Each plan creates a structured AUDIT-LOG section in its summary

### Auth page access
- Login via Chrome MCP: navigate to /login, enter credentials, authenticate
- Use personal dev accounts (existing owner and tenant accounts with real data)
- Both owner AND tenant roles audited — owner for dashboard pages, tenant for tenant portal pages
- Two login sessions needed (one per role)

### Success evidence
- Each page verified with: visual rendering at all viewports + console error check + interaction testing
- Structured AUDIT-LOG.md per plan: page name, viewport, status (pass/fix), what was fixed
- No GIF recordings — log is sufficient evidence
- Interactive elements clicked and verified: buttons, dropdowns, modals, toggles, navigation

### Dev server
- Plans start `pnpm dev` as their first task and handle server lifecycle
- Audit navigates to localhost:3050

### Data setup
- Seed test data before auditing so pages show realistic content, not empty states
- Use existing DB data from personal dev accounts — if sparse, seed key entities (properties, tenants, leases, maintenance requests)
- Empty states should also be verified where encountered, but primary audit should have populated data

### Claude's Discretion
- Order of pages within each group
- Which interactive elements to test per page (focus on primary actions)
- How to seed data if dev accounts are sparse — use Supabase dashboard or SQL
- Whether to split owner dashboard into sub-plans if page count is too high for one plan

</decisions>

<specifics>
## Specific Ideas

- This is the final phase of v1.2 — the audit proves the milestone is shippable
- Phase 19 just consolidated buttons (11→6), cards (18→6), and navbar — verify those changes look correct in context
- Responsive navbar behavior (full-width mobile, floating pill desktop) should be checked on every marketing page
- Check that rounded-md is consistent on all buttons and cards across page groups

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mcp__claude-in-chrome__*` tools: full browser automation suite (navigate, read, click, resize, console)
- `tests/e2e/tests/constants/routes.ts`: likely contains route definitions for all pages
- `tests/e2e/tests/helpers/ui-validation-helpers.ts`: existing UI validation patterns
- `tests/e2e/playwright.config.ts`: viewport and auth configuration patterns

### Established Patterns
- 5 page groups match app directory structure: `(owner)/`, `(tenant)/`, `(auth)/`, `blog/`, and marketing (root-level pages)
- Auth uses Supabase with `sb-*-auth-token` cookie
- Dev server runs on port 3050

### Integration Points
- ~90+ page.tsx files across all groups
- Owner dashboard: ~40+ pages (properties, units, leases, tenants, maintenance, financials, analytics, reports, settings, billing, documents, inspections)
- Tenant portal: ~15 pages (dashboard, payments, maintenance, lease, settings, documents, onboarding, inspections)
- Marketing: ~15 pages (home, features, pricing, about, blog hub + articles, contact, FAQ, help, support, resources, privacy, terms, security)
- Auth: ~5 pages (login, accept-invite, select-role, update-password, signout)
- Blog: 3 routes (hub, category, article detail)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-browser-audit*
*Context gathered: 2026-03-09*
