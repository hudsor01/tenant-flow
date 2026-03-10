# Phase 20: Browser Audit - Research

**Researched:** 2026-03-09
**Domain:** Browser automation verification of all user-facing pages
**Confidence:** HIGH

## Summary

This phase is the final verification gate for the v1.2 milestone. The audit covers 105 non-modal page routes across 5 page groups: marketing (18 pages), blog (3 pages), auth (7 pages), tenant portal (18 pages), and owner dashboard (59 pages). Each page must be verified at 3 viewports (375px, 768px, 1440px) for visual rendering, console errors, and interactive element functionality.

The research below provides the complete page inventory per plan group, the Chrome MCP tool strategy for each verification type, auth flow details for accessing protected routes, and the interaction checklist for each page group. Phase 19 just consolidated buttons (11 to 6 variants), cards (18 to 6 variants), and the navbar -- these changes are the primary focus for visual consistency checks.

**Primary recommendation:** Execute 5 parallel plans (one per page group), each following the same audit protocol: navigate, resize, check console, test interactions, fix inline, log results.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- One plan per page group: marketing, blog, auth, tenant portal, owner dashboard
- Plans can run in parallel (Wave 1) since they cover independent page groups
- Every page in each group is audited -- no skipping duplicate patterns
- All 3 viewports (375px, 768px, 1440px) checked per page
- Claude-in-Chrome MCP is the primary audit tool (not Playwright)
- Use `mcp__claude-in-chrome__navigate` to load pages, `mcp__claude-in-chrome__resize_window` for viewport changes
- Use `mcp__claude-in-chrome__read_console_messages` to check for console errors
- Use `mcp__claude-in-chrome__read_page` / `mcp__claude-in-chrome__get_page_text` for DOM inspection
- Use `mcp__claude-in-chrome__javascript_tool` for clicking interactive elements and verifying state changes
- Fix issues inline as they're found: find issue, fix code, re-verify in browser, continue
- Any UI issue is fixable inline: CSS, layout, spacing, typography, broken interactions, missing states, console errors
- Out of scope: data bugs, missing features, backend logic errors -- log these but don't fix
- Each plan creates a structured AUDIT-LOG section in its summary
- Login via Chrome MCP: navigate to /login, enter credentials, authenticate
- Use personal dev accounts (existing owner and tenant accounts with real data)
- Both owner AND tenant roles audited
- No GIF recordings -- log is sufficient evidence
- Plans start `pnpm dev` as their first task and handle server lifecycle
- Seed test data before auditing so pages show realistic content, not empty states

### Claude's Discretion
- Order of pages within each group
- Which interactive elements to test per page (focus on primary actions)
- How to seed data if dev accounts are sparse -- use Supabase dashboard or SQL
- Whether to split owner dashboard into sub-plans if page count is too high for one plan

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VER-01 | Systematic browser automation audit of all pages (marketing, blog, auth, tenant portal, owner dashboard) verifying interactions and visual consistency | Complete page inventory below (105 pages), Chrome MCP tool mapping, interaction checklists per group |
| VER-02 | Mobile viewport testing at 375px, 768px, and 1440px breakpoints verifying responsive layouts | Viewport resize strategy, responsive patterns to verify (navbar mobile/desktop, sidebar collapse, grid breakpoints) |
</phase_requirements>

## Complete Page Inventory

### Group 1: Marketing Pages (18 pages)

All public routes. Use `PageLayout` wrapper (Navbar + Footer + GridPattern). No auth required.

| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/` | Hero section, feature cards, stats, CTA buttons, testimonials |
| 2 | `/features` | Feature showcase with tabs/sections, animations |
| 3 | `/pricing` | Pricing cards (3 tiers), FAQ accordion, stats grid, testimonials, CTA |
| 4 | `/pricing/success` | Post-checkout success state |
| 5 | `/pricing/cancel` | Post-checkout cancel state |
| 6 | `/pricing/complete` | Post-checkout completion redirect |
| 7 | `/about` | Hero section, team cards, stats, BlurFade animations |
| 8 | `/contact` | Contact form with validation |
| 9 | `/faq` | Accordion FAQ component |
| 10 | `/help` | Help cards/categories |
| 11 | `/support` | Support options/contact info |
| 12 | `/resources` | Resource cards/downloads |
| 13 | `/search` | Search input + results cards |
| 14 | `/privacy` | Static legal text page |
| 15 | `/privacy` | Static legal text page |
| 16 | `/security-policy` | Static legal/policy text page |
| 17 | `/terms` | Static legal text page |
| 18 | `/stripe/success` | Stripe Connect success state |
| 19 | `/stripe/cancel` | Stripe Connect cancel state |

**Note:** Marketing group is actually 19 pages. `/privacy`, `/terms`, `/security-policy` are similar static text pages. `/stripe/success` and `/stripe/cancel` are simple result pages that use PageLayout.

**Responsive patterns to verify:**
- Navbar: full-width sticky bar on mobile (< md), floating centered pill on desktop (>= md)
- Mobile menu: hamburger toggle, slide-down menu panel
- `flex-wrap` and grid breakpoints on feature/pricing cards
- Footer: responsive grid columns
- Section spacing via `section-spacing` class

**Phase 19 checks:**
- Button `rounded-md` consistency
- Card `rounded-md` consistency
- Navbar visual: mobile full-width vs desktop floating pill

### Group 2: Blog Pages (3 page routes)

All public. Use `PageLayout` wrapper. Data-driven (requires blog posts in DB).

| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/blog` | Category pills, comparison carousel (horizontal scroll), blog card grid, pagination |
| 2 | `/blog/category/[category]` | Category filter, blog card grid, pagination, back link |
| 3 | `/blog/[slug]` | Article hero image, markdown content (dynamic import), related posts, category navigation |

**Dynamic route data needed:**
- At least 1 blog post slug for `/blog/[slug]`
- At least 1 category slug for `/blog/category/[category]`
- Blog data comes from `blogs` table -- dev account should have existing posts

**Responsive patterns to verify:**
- Blog card grid: single column mobile, 2-col tablet, 3-col desktop
- Comparison carousel: horizontal scroll with snap on mobile
- Blog article: max-width content area, image sizing
- `BlogLoadingSkeleton` (CSS-only text-reveal animation)

### Group 3: Auth Pages (7 pages)

Mixed access -- some public, some require specific auth states. These pages do NOT use PageLayout; they have standalone layouts.

| # | Route | Auth Required | Key Elements |
|---|-------|--------------|-------------|
| 1 | `/login` | No | Split layout (image panel + form), email/password form, OAuth buttons, forgot password modal, MFA dialog |
| 2 | `/accept-invite` | No | Tenant invitation acceptance form |
| 3 | `/auth/select-role` | Yes (PENDING) | Role selection cards (Owner/Tenant), GridPattern background |
| 4 | `/auth/update-password` | No (token via URL) | Password update form, expired token error state |
| 5 | `/auth/confirm-email` | Partial | Resend email button with cooldown, error banner |
| 6 | `/auth/signout` | Yes | Signout confirmation button, redirect countdown |
| 7 | `/auth/post-checkout` | Yes | Post-checkout redirect spinner |

**Limitations:**
- `/auth/select-role` requires a PENDING user -- may need to test as-is or note as manual-check
- `/auth/update-password` requires a valid reset token in URL hash -- test the error/expired state
- `/auth/post-checkout` is a transient redirect page -- verify it renders without crashing

**Responsive patterns to verify:**
- Login split layout: hidden image panel on mobile, visible on lg+
- Form centering and max-width constraints
- Trust indicators row wrapping on mobile

### Group 4: Tenant Portal Pages (18 pages)

All require TENANT auth. Uses `TenantShell` layout with sidebar navigation.

| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/tenant` | Dashboard with lease details, payment status, maintenance summary, quick actions |
| 2 | `/tenant/profile` | Profile form (edit name, contact info) |
| 3 | `/tenant/lease` | Lease detail view (dates, terms, co-tenants) |
| 4 | `/tenant/documents` | Document list |
| 5 | `/tenant/maintenance` | Maintenance request list |
| 6 | `/tenant/maintenance/new` | New maintenance request form |
| 7 | `/tenant/maintenance/request/[id]` | Maintenance request detail |
| 8 | `/tenant/payments` | Payment overview/dashboard |
| 9 | `/tenant/payments/new` | Make a payment form |
| 10 | `/tenant/payments/history` | Payment history list |
| 11 | `/tenant/payments/methods` | Payment methods list |
| 12 | `/tenant/payments/autopay` | Autopay toggle/configuration |
| 13 | `/tenant/onboarding` | Tenant onboarding wizard |
| 14 | `/tenant/settings` | Settings overview |
| 15 | `/tenant/settings/notifications` | Notification preferences (switches/toggles) |
| 16 | `/tenant/settings/payment-methods` | Payment method management |
| 17 | `/tenant/settings/stripe` | Stripe payment setup |
| 18 | `/tenant/inspections/[id]` | Inspection detail (dynamic -- needs real ID) |

**Sidebar navigation (from `tenant-nav.tsx`):**
- Core: Dashboard, My Profile, My Lease, Maintenance, Documents
- Collapsible: Payments (Autopay, Payment Methods, Payment History)
- Bottom: Settings (with upward dropdown for Help)

**Dynamic route data needed:**
- At least 1 maintenance request ID for `/tenant/maintenance/request/[id]`
- At least 1 inspection ID for `/tenant/inspections/[id]` (may not exist)

**Responsive patterns to verify:**
- Sidebar: visible on desktop, hamburger/overlay on mobile
- Dashboard cards: responsive grid
- Form layouts: full-width on mobile, constrained on desktop
- Table/list views on mobile

### Group 5: Owner Dashboard Pages (59 pages)

All require OWNER auth. Uses `AppShell` layout with sidebar navigation.

**This is the largest group. The planner may split it into sub-plans at discretion.**

#### Core Pages (5)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/dashboard` | Stats cards, revenue chart (recharts), property performance table, quick actions, onboarding tour |
| 2 | `/profile` | Profile form |
| 3 | `/payments/methods` | Payment methods list |
| 4 | `/rent-collection` | Rent collection table with filters |
| 5 | `/maintenance/vendors` | Vendor list |

#### Properties (6)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/properties` | Property list with search, filters, pagination |
| 2 | `/properties/new` | Property creation form (multi-step) |
| 3 | `/properties/[id]` | Property detail with units list |
| 4 | `/properties/[id]/edit` | Property edit form |
| 5 | `/properties/units` | All units list view |
| 6 | `/units/page` | Units list |
| 7 | `/units/new` | Unit creation form |
| 8 | `/units/[id]/edit` | Unit edit form |

#### Tenants (4)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/tenants` | Tenant list with search |
| 2 | `/tenants/new` | Tenant invitation form |
| 3 | `/tenants/[id]` | Tenant detail |
| 4 | `/tenants/[id]/edit` | Tenant edit form |

#### Leases (4)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/leases` | Lease list with tabs/filters |
| 2 | `/leases/new` | Lease creation form (multi-step) |
| 3 | `/leases/[id]` | Lease detail |
| 4 | `/leases/[id]/edit` | Lease edit form |

#### Maintenance (4)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/maintenance` | Maintenance list (may have kanban view) |
| 2 | `/maintenance/new` | New maintenance request form |
| 3 | `/maintenance/[id]` | Maintenance detail |
| 4 | `/maintenance/[id]/edit` | Maintenance edit form |

#### Analytics (7)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/analytics` | Analytics hub/overview |
| 2 | `/analytics/overview` | Overview dashboard with charts |
| 3 | `/analytics/financial` | Financial analytics with charts |
| 4 | `/analytics/leases` | Lease analytics |
| 5 | `/analytics/maintenance` | Maintenance analytics |
| 6 | `/analytics/occupancy` | Occupancy analytics |
| 7 | `/analytics/property-performance` | Property performance charts/tables |

#### Financials (8)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/financials` | Financials hub |
| 2 | `/financials/income-statement` | Income statement report |
| 3 | `/financials/cash-flow` | Cash flow report |
| 4 | `/financials/balance-sheet` | Balance sheet report |
| 5 | `/financials/expenses` | Expense tracking |
| 6 | `/financials/billing` | Billing overview |
| 7 | `/financials/payouts` | Payout history |
| 8 | `/financials/tax-documents` | Tax documents |

#### Reports (4)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/reports` | Reports hub |
| 2 | `/reports/generate` | Report generation form |
| 3 | `/reports/analytics` | Report analytics |
| 4 | `/reports/year-end` | Year-end report |

#### Documents (6)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/documents` | Document list |
| 2 | `/documents/lease-template` | Lease template builder |
| 3 | `/documents/templates/maintenance-request` | Maintenance template |
| 4 | `/documents/templates/property-inspection` | Inspection template |
| 5 | `/documents/templates/rental-application` | Application template |
| 6 | `/documents/templates/tenant-notice` | Notice template |

#### Inspections (3)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/inspections` | Inspection list |
| 2 | `/inspections/new` | New inspection form |
| 3 | `/inspections/[id]` | Inspection detail |

#### Billing (3)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/billing/plans` | Subscription plans |
| 2 | `/billing/checkout/success` | Checkout success state |
| 3 | `/billing/checkout/cancel` | Checkout cancel state |

#### Settings (3)
| # | Route | Key Elements |
|---|-------|-------------|
| 1 | `/settings` | Settings overview |
| 2 | `/settings/billing` | Billing settings |
| 3 | `/settings/payouts` | Payout settings (Stripe Connect) |

**Sidebar navigation structure (from `main-nav.tsx`):**
- Core: Dashboard, Properties, Tenants, Leases, Maintenance
- Analytics (collapsible): Overview, Financial, Property Performance
- Reports (collapsible): Generate Reports
- Financials (collapsible): Rent Collection, Income Statement, Cash Flow, Balance Sheet, Tax Documents
- Documents: Generate Lease, Lease Template
- Settings (bottom, upward dropdown): Help & Support, Keyboard Shortcuts

**Dynamic route data needed:**
- At least 1 property ID for `/properties/[id]` and `/properties/[id]/edit`
- At least 1 unit ID for `/units/[id]/edit`
- At least 1 tenant ID for `/tenants/[id]` and `/tenants/[id]/edit`
- At least 1 lease ID for `/leases/[id]` and `/leases/[id]/edit`
- At least 1 maintenance request ID for `/maintenance/[id]` and `/maintenance/[id]/edit`
- At least 1 inspection ID for `/inspections/[id]`
- Dev account should have existing data for most of these

## Chrome MCP Tool Strategy

### Tool Mapping

| Verification Task | MCP Tool | Usage Pattern |
|-------------------|----------|---------------|
| Navigate to page | `mcp__claude-in-chrome__navigate` | `navigate({ url: "http://localhost:3050/path" })` |
| Resize viewport | `mcp__claude-in-chrome__resize_window` | `resize_window({ width: 375, height: 812 })` for mobile, `{ width: 768, height: 1024 }` for tablet, `{ width: 1440, height: 900 }` for desktop |
| Read page content | `mcp__claude-in-chrome__read_page` | Returns visible DOM structure, good for verifying layout elements |
| Get text content | `mcp__claude-in-chrome__get_page_text` | Returns text content only, good for verifying headings and content |
| Check console errors | `mcp__claude-in-chrome__read_console_messages` | Check after each page load for JS errors, warnings |
| Click elements | `mcp__claude-in-chrome__javascript_tool` | `document.querySelector('button[aria-label="..."]').click()` |
| Verify DOM state | `mcp__claude-in-chrome__javascript_tool` | Query selectors to check element visibility, class presence |
| Fill form fields | `mcp__claude-in-chrome__javascript_tool` | Set input values, trigger change events |

### Viewport Dimensions

| Viewport | Width | Height | Represents |
|----------|-------|--------|------------|
| Mobile | 375 | 812 | iPhone 12/13/14 |
| Tablet | 768 | 1024 | iPad portrait |
| Desktop | 1440 | 900 | Standard laptop |

### Audit Protocol Per Page

```
1. Navigate to page
2. Wait for load (check for loading skeletons to disappear)
3. Desktop viewport (1440x900):
   a. read_page -- verify layout, headings, key elements
   b. read_console_messages -- check for errors
   c. Test primary interactions (clicks, dropdowns, tabs)
4. Tablet viewport (768x1024):
   a. read_page -- verify responsive layout changes
   b. Check grid column changes, sidebar behavior
5. Mobile viewport (375x812):
   a. read_page -- verify mobile layout
   b. Check mobile-specific UI (hamburger menu, stacked layouts)
   c. read_console_messages -- check for mobile-specific errors
6. Log result in AUDIT-LOG
```

### Authentication Flow

**Owner login:**
```
1. navigate({ url: "http://localhost:3050/login" })
2. javascript_tool: fill email input with owner dev email
3. javascript_tool: fill password input with owner dev password
4. javascript_tool: click sign-in button
5. Wait for redirect to /dashboard
6. Verify auth cookie is set (session persists across navigations)
```

**Tenant login:**
```
1. navigate({ url: "http://localhost:3050/login" })
2. javascript_tool: fill email input with tenant dev email
3. javascript_tool: fill password input with tenant dev password
4. javascript_tool: click sign-in button
5. Wait for redirect to /tenant
6. Verify auth cookie is set
```

**Note from MEMORY.md:** Auth cookie is `sb-bshjmbshupiibfiewpxb-auth-token` (base64 encoded). The Chrome MCP session maintains cookies across navigations within the same browser instance.

## Architecture Patterns

### Audit-Per-Page Protocol

Each plan follows this flow:

```
Plan N:
  Task 0: Start dev server (`pnpm dev`) -- wait for "Ready" output
  Task 1: Auth (if needed) -- login via Chrome MCP
  Task 2: Seed data check -- navigate to list pages, verify data exists
  Task 3-N: Audit pages (batch by sub-group within the page group)
  Final: Write AUDIT-LOG summary
```

### AUDIT-LOG Format

```markdown
## AUDIT-LOG

| Page | Viewport | Status | Issues Found | Fix Applied |
|------|----------|--------|-------------|-------------|
| /path | 375px | PASS | -- | -- |
| /path | 768px | FIX | Button overflow | Added `max-w-full` |
| /path | 1440px | PASS | -- | -- |
```

### Fix-Inline Protocol

When an issue is found:
1. Document the issue in the audit log
2. Identify the source file (read the component)
3. Apply the fix (CSS, layout, spacing, etc.)
4. Re-verify in the browser at the same viewport
5. Continue the audit

### Dev Server Lifecycle

```bash
# Start (run in background)
pnpm dev &

# Verify ready (wait for compilation complete)
# Next.js dev server outputs "Ready" when compilation is done
# Navigate to http://localhost:3050 to verify

# At end of plan: server stays running for next plan
# (parallel plans share the same dev server)
```

**Important:** Since plans run in parallel, only ONE plan should start the dev server. The others should verify it's already running. Alternatively, each plan can check if port 3050 is occupied before starting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Viewport resizing | Custom browser scripts | `mcp__claude-in-chrome__resize_window` | MCP tool handles window manager integration |
| DOM inspection | Manual element counting | `mcp__claude-in-chrome__read_page` | Returns structured DOM tree |
| Console error checking | Window.onerror hooks | `mcp__claude-in-chrome__read_console_messages` | Captures all console output including React warnings |
| Element interaction | Complex selector chains | `mcp__claude-in-chrome__javascript_tool` with simple selectors | Direct DOM access is more reliable |

## Common Pitfalls

### Pitfall 1: Stale Console Messages
**What goes wrong:** Console messages accumulate across navigations, leading to false positive error reports.
**Why it happens:** Chrome console retains messages unless explicitly cleared.
**How to avoid:** Read and clear console messages AFTER each page navigation, before checking for page-specific errors. Focus on new errors since navigation.
**Warning signs:** Seeing "Supabase" auth refresh errors that are from a previous page.

### Pitfall 2: Viewport Resize Race Condition
**What goes wrong:** Reading the page immediately after resize shows the old layout.
**Why it happens:** CSS transitions and responsive JavaScript need time to settle.
**How to avoid:** After `resize_window`, wait briefly before `read_page`. Check for layout-specific classes or elements.
**Warning signs:** Mobile menu appearing at desktop width, sidebar visible at mobile width.

### Pitfall 3: Auth Session Expiry Mid-Audit
**What goes wrong:** Pages start redirecting to /login partway through the audit.
**Why it happens:** Supabase session tokens expire. The middleware refreshes them but the browser needs to accept the new cookie.
**How to avoid:** Check for unexpected /login redirects. If detected, re-authenticate before continuing.
**Warning signs:** 302 redirects to /login, empty page content.

### Pitfall 4: Dynamic Route Pages With No Data
**What goes wrong:** `/properties/[id]` pages show 404 or error because no valid entity ID was used.
**Why it happens:** Hardcoded or stale entity IDs.
**How to avoid:** First navigate to the list page (e.g., `/properties`), extract a real entity ID from the page, then navigate to the detail page.
**Warning signs:** "Not Found" pages, error boundaries triggering.

### Pitfall 5: Next.js Dev Server Hot Reload
**What goes wrong:** After fixing a file inline, the page auto-refreshes and loses form state or scroll position.
**Why it happens:** Next.js Fast Refresh triggers on file save.
**How to avoid:** Expected behavior -- after fixing, just re-navigate to the page and re-verify.
**Warning signs:** Page flash during edit cycle.

### Pitfall 6: Modal Intercept Routes
**What goes wrong:** Navigating directly to `/properties/new` might render the full page OR the modal intercept depending on how navigation happened.
**Why it happens:** Next.js parallel routes use `@modal/(.)` intercept pattern -- they only intercept soft navigations from within the app, not direct URL navigations.
**How to avoid:** For modal routes, test by navigating to the parent list page first, then clicking the "New" button to trigger the intercepting route. Also test direct URL navigation to verify the full page version.

### Pitfall 7: Charts Render Delay
**What goes wrong:** Chart components (recharts) show as blank or loading skeletons.
**Why it happens:** Charts are dynamically imported with `next/dynamic` and `ssr: false`. They need both the JS bundle to load AND the API data to arrive.
**How to avoid:** Wait for `ChartLoadingSkeleton` to disappear before verifying chart content. Look for `.recharts-surface` SVG elements.
**Warning signs:** Persistent loading skeleton, empty chart container.

## Key Interactive Elements Per Group

### Marketing Group
- Navbar mobile menu toggle (hamburger icon at < md)
- Navbar desktop navigation links
- CTA buttons ("Get Started", "View Plans")
- Pricing card toggle (monthly/annual if present)
- FAQ accordion expand/collapse
- Contact form submission
- Footer navigation links
- Search input functionality

### Blog Group
- Category pill links
- Blog card click navigation
- Pagination controls
- Comparison carousel horizontal scroll
- Related posts navigation
- Newsletter signup form

### Auth Group
- Email/password form fields with validation
- "Forgot password" modal trigger and close
- OAuth buttons (Google)
- Role selection cards (select-role page)
- Sign out confirmation button

### Tenant Portal Group
- Sidebar navigation (core items + collapsible Payments section)
- Mobile sidebar toggle
- Dashboard quick action buttons
- Maintenance request form
- Payment form
- Autopay toggle (Switch component)
- Notification settings toggles
- Payment method management

### Owner Dashboard Group
- Sidebar navigation (core + collapsible Analytics/Reports/Financials)
- Settings upward dropdown menu
- Property/Tenant/Lease/Maintenance CRUD forms
- Search inputs on list pages
- Filter dropdowns
- Table pagination
- Chart interactivity (hover tooltips)
- Kanban board drag (maintenance)
- Tab navigation (leases, analytics)
- Onboarding wizard/tour
- Stripe Connect verification banner

## Phase 19 Verification Checklist

These specific items should be checked on EVERY page they appear (not just one sample):

1. **Button consistency:** All buttons use `rounded-md` radius (was inconsistent before Phase 19 consolidation from 11 to 6 variants)
2. **Card consistency:** All cards use `rounded-md` radius (was inconsistent before Phase 19 consolidation from 18 to 6 variants)
3. **Navbar mobile:** Full-width sticky top bar at < md breakpoint
4. **Navbar desktop:** Floating centered pill at >= md breakpoint
5. **Navbar scroll behavior:** Background opacity increases on scroll (80% to 95%)

## Data Seeding Strategy

### Prerequisites for Populated Pages

| Entity | Minimum Count | Needed For |
|--------|--------------|------------|
| Properties | 2+ | Properties list, dashboard stats, analytics |
| Units | 3+ (across properties) | Units list, occupancy stats |
| Tenants | 2+ | Tenant list, lease association |
| Leases | 2+ (1 active, 1 expired) | Lease list, dashboard metrics |
| Maintenance Requests | 2+ (different statuses) | Maintenance list/kanban, stats |
| Payments | 1+ | Payment history, financial reports |
| Blog Posts | 3+ (2 categories) | Blog hub, category page, article detail |
| Inspections | 1+ | Inspection detail page |

### Seeding Approach

1. **Check existing data first:** Navigate to list pages and verify data exists
2. **If sparse:** Use the application's own "New" forms to create entities (this also tests the forms)
3. **For blog data:** Blog posts likely exist from v1.1 Blog Redesign milestone
4. **For financial data:** May show empty states -- verify empty states render correctly, then seed if needed

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Chrome MCP (manual browser automation) |
| Config file | None -- MCP tool calls direct |
| Quick run command | N/A (interactive audit) |
| Full suite command | N/A (interactive audit) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VER-01 | All pages render correctly with interactions | manual-only | N/A -- Chrome MCP interactive audit | N/A |
| VER-02 | Responsive layouts at 375/768/1440px | manual-only | N/A -- Chrome MCP viewport resize | N/A |

**Justification for manual-only:** This phase IS the verification -- it uses browser automation (Chrome MCP) but is inherently interactive and observational. The output is an AUDIT-LOG documenting each page's status, not automated test files.

### Sampling Rate
- **Per task commit:** Visual verification via Chrome MCP after each fix
- **Per wave merge:** N/A -- single wave
- **Phase gate:** All pages passing in AUDIT-LOG before `/gsd:verify-work`

### Wave 0 Gaps
None -- this phase uses Chrome MCP tools, not a test framework. No test infrastructure to set up.

## Open Questions

1. **Owner dashboard sub-plan split**
   - What we know: 59 owner pages is a lot for one plan
   - What's unclear: Whether the planner should split into 2-3 sub-plans
   - Recommendation: Split into 2 sub-plans. Group A: core + properties + tenants + leases + maintenance (27 pages). Group B: analytics + financials + reports + documents + inspections + billing + settings (32 pages). This keeps each sub-plan under 35 pages.

2. **Dev server sharing across parallel plans**
   - What we know: Plans run in parallel (Wave 1)
   - What's unclear: Whether multiple plans can safely share one dev server
   - Recommendation: Have the first plan (marketing, as it needs no auth) start the dev server. Other plans verify port 3050 is occupied before proceeding. Since plans are executed sequentially by the human operator even if Wave 1 allows parallelism, this is likely moot -- but add a "verify server running" task to each plan.

3. **Entity ID discovery for dynamic routes**
   - What we know: Need real IDs for `/properties/[id]`, `/tenants/[id]`, etc.
   - What's unclear: Whether dev account has sufficient data
   - Recommendation: Each plan should navigate to the corresponding list page first, extract an entity ID via `javascript_tool` (e.g., query the first link's href), then use that ID for detail/edit pages.

## Sources

### Primary (HIGH confidence)
- Direct filesystem analysis of `src/app/` directory -- all 116 page.tsx files enumerated
- `proxy.ts` -- public vs protected route classification
- `src/components/shell/main-nav.tsx` -- owner sidebar navigation structure
- `src/components/shell/tenant-nav.tsx` -- tenant sidebar navigation structure
- `src/components/layout/navbar.tsx` -- marketing navbar responsive behavior
- `src/components/layout/page-layout.tsx` -- marketing page wrapper
- `tests/e2e/tests/constants/routes.ts` -- E2E route constants

### Secondary (MEDIUM confidence)
- CONTEXT.md -- user decisions on audit approach and tooling
- CLAUDE.md -- project architecture rules and component conventions

## Metadata

**Confidence breakdown:**
- Page inventory: HIGH -- direct filesystem scan of all page.tsx files
- Auth flow: HIGH -- proxy.ts route classification verified against app structure
- Chrome MCP tools: HIGH -- tool names match known MCP capabilities
- Responsive patterns: HIGH -- navbar and layout code reviewed directly
- Data seeding: MEDIUM -- depends on existing dev account data state

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- page inventory unlikely to change within milestone)
