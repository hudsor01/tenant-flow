# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02, 34/34 requirements) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Security Hardening** — Phases 1-3 (shipped 2026-06-02, 12/12 requirements) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Hardening & Hygiene** — Phases 1-8 (shipped 2026-06-07, 20/21 requirements; SEO-01 carried to v5.0) — see [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)
- ✅ **v5.0 AI Blog Content Engine** — Phases 9-14 (shipped 2026-06-10, 9/9 requirements) — see [milestones/v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md)
- ✅ **v6.0 Final Canonical Cleanup** — Phases 15-19 (resolved/verified 2026-06-19, 24 requirements) — see [milestones/v6.0-ROADMAP.md](milestones/v6.0-ROADMAP.md)
- ⏸️ **v7.0 TanStack Form Composition Migration** — Phases 20-24 (paused mid-flight; phases 20-22 merged, 23-24 open) — archived plan in [milestones/v7.0-ROADMAP.md](milestones/v7.0-ROADMAP.md)
- ✅ **v8.0 Correctness Restoration** — Phases 25-35 (shipped 2026-07-10, 71/72 + remediation #893) — see [milestones/v8.0-ROADMAP.md](milestones/v8.0-ROADMAP.md)
- 🔨 **v9.0 Full-Surface Remediation** — Phases 36-51 (active, started 2026-07-11, 296 requirements) — this file

---

<details>
<summary>✅ v8.0 Correctness Restoration (Phases 25-35) — SHIPPED 2026-07-10</summary>

Eradicated the 2026-07-02 whole-codebase bug-hunt findings (56 requirements across CRIT / LEASE / MAINT / INSP / TEN / BILL / DATA / PROP / FORMFIX / UIX / SEC / MKT / MISC / TZ). 11 phases, each merged as its own perfect-PR PR (#882-#892), followed by an adversarial milestone audit (71/72 PASS) whose remediation shipped in #893 (PROP-05 sibling clear-field miss; MONEY-01/02 100× rent overstatement on two read paths). DATA-04 was the single deferred requirement. Full phase detail archived in [milestones/v8.0-ROADMAP.md](milestones/v8.0-ROADMAP.md).

</details>

---

## v9.0 Full-Surface Remediation

**Goal:** Fix all 296 adversarially verified findings from the 2026-07-11 full-surface audit (`.planning/audits/2026-07-11-full-audit.md`) — codebase + public marketing pages + owner dashboard. Every confirmed finding is a tracked requirement; nothing is deferred. Findings are grouped one category per phase; each phase ships as its own perfect-PR PR.

**Structure:** 16 phases (36-51), one per requirement category. The category structure is fixed by the audit — phases are NOT merged, split, or reordered. Every REQ maps 1:1 to its category phase by construction.

### Execution disciplines (binding for every phase 36-51)

1. **Strictly sequential.** Each phase branches only after the previous phase's PR is **MERGED to main**. Never stack phase branches. This guarantees no phase can overwrite another phase's fixes (the surfaces overlap — billing/auth/forms/data/type all touch shared files).
2. **Perfect-PR gate per phase.** Every phase ships as its own PR and merges only after **two consecutive zero-finding review cycles on the frozen final state** (a mid-streak edit resets the streak).
3. **Read the phase RESEARCH.md before planning.** Before `/gsd-plan-phase NN`, its `.planning/phases/NN-*/RESEARCH.md` (fix-approach validation, written at milestone setup) MUST be read.
4. **Root-cause fixes, verified against the audit evidence.** Every fix must resolve the underlying defect (not the symptom) and be verified against the audit entry's `> Verifier:` evidence for that REQ. Plans MUST read the audit entry for each REQ before proposing a fix.
5. **Exhaustive sibling sweep for bug classes.** Class-wide defects (decimal-into-integer money forms, ÷100 money divisions, timezone one-day-early date parsing, unbounded list queries, duplicate types, string-literal query keys, undefined utility classes, hover-only controls) get one focused exhaustive sweep so every sibling lands together — never one-sibling-per-review-cycle.

**16 phases (36-51)** | **296 requirements mapped** | All covered ✓

### Phases

- [ ] **Phase 36: Billing & Subscription Lifecycle** - Checkout, trials, past_due recovery, cancellation, and webhooks all behave correctly
- [ ] **Phase 37: Auth Flows** - Email-change, magic-link, invite, recovery, sign-out, and post-checkout paths complete and error honestly
- [ ] **Phase 38: Forms & Validation** - Every form and both CSV importers save valid data with real client-side validation
- [ ] **Phase 39: Data Layer & Cache Integrity** - Mutations keep the cache truthful; every list query is bounded and correctly filtered
- [ ] **Phase 40: Type Boundaries (RPC/PostgREST)** - Validated typed mappers at every boundary so no cast fabricates or destroys data
- [ ] **Phase 41: Component Logic & Analytics Correctness** - Analytics, financial, and date-sensitive components compute correct numbers and dates
- [ ] **Phase 42: Dashboard UX & Navigation** - Modals, quick actions, confirmations, and empty states all work and route to real pages
- [ ] **Phase 43: E-sign Flow** - Token signing notifies the right party, recovers from finalize failures, keeps signer access, and rate-limits by IP
- [ ] **Phase 44: Public Site UX** - The marketing surface converts logged-out prospects without dead ends or auth walls
- [ ] **Phase 45: Marketing Content Truthfulness** - Every marketing claim maps to a shipped capability
- [ ] **Phase 46: Marketing UI Consistency** - Correct typography, spacing, containers, dark-mode-safe tokens; no dead utility classes or duplicates
- [ ] **Phase 47: Accessibility** - WCAG AA — readable tokens, named controls, keyboard-reachable actions, managed dialog focus
- [ ] **Phase 48: Routing, SEO & Performance** - ISR routes stay static, SEO metadata is correct, heavy bundles and N+1 queries removed
- [ ] **Phase 49: Client State (Zustand)** - Client state is truthful across users and navigations; dead stores removed
- [ ] **Phase 50: Admin Surface** - Honest data, captured errors, reachable and accessible admin pages
- [ ] **Phase 51: Code Hygiene** - No duplicate types, string-literal query keys, module-level clients, inline styles, or emojis

### Phase Details

### Phase 36: Billing & Subscription Lifecycle
**Goal**: The full subscription lifecycle — checkout, trial, past_due recovery, cancellation, and webhook processing — behaves correctly, and no owner is ever locked out of fixing their own billing.
**Depends on**: Phase 35 (v8.0 shipped/merged) — branches after v8.0 is on main
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06, BILL-07, BILL-08, BILL-09, BILL-10, BILL-11, BILL-12, BILL-13, BILL-14, BILL-15, BILL-16, BILL-17, BILL-18, BILL-19, BILL-20
**Success Criteria** (what must be TRUE):
  1. A past_due owner can reach the billing portal and fix their payment method — the grace period is real and no lapsed owner is locked out of every billing surface (portal button shows, banner/dunning CTAs resolve, not `/owner/billing` 404) [BILL-01/02/04/07/12/16]
  2. Checkout-session verification succeeds — `/pricing/complete` and `/pricing/success` show the true payment outcome (session_id/sessionId contract matches, expected response fields returned) [BILL-03/17]
  3. An already-subscribed owner cannot open a second concurrent subscription, and serial/repeat free trials are blocked (trial granted only to a never-trialed customer; trial price never flows through Checkout) [BILL-05/06/08]
  4. Cancellation and subscription webhooks process without silent errors — no dropped-`leases`-column failures, stuck `processing` events are reprocessed, out-of-order events cannot resurrect canceled access, and trial-will-end is handled [BILL-13/14/15/20]
  5. Stripe invoice/subscription statuses are validated at the boundary — no unhandled `expired`/`open`/`draft` union leaks to the UI, and cancel/reactivate UI is correct for trialing subscribers; two consecutive zero-finding review cycles [BILL-09/10/11/18/19]
**Plans**: TBD

### Phase 37: Auth Flows
**Goal**: Every authentication entry and exit path — email change, magic link, invite, password recovery, sign-out, post-checkout — completes correctly and surfaces honest errors.
**Depends on**: Phase 36 (merged)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12, AUTH-13
**Success Criteria** (what must be TRUE):
  1. Email-change confirmation succeeds — the callback accepts `type=email_change` instead of rejecting it [AUTH-01]
  2. A successful magic-link or invite verification lands the user in the app, not on the "link has expired" error, and invalid OTP types no longer loop the callback into a misleading `oauth_failed` [AUTH-02/09]
  3. The confirm-email resend action works for its unauthenticated audience; recovery/update-password verifies a real recovery session before showing the form [AUTH-03/07]
  4. Post-checkout redirect returns paying customers to the dashboard without a subscription-gate bounce; OAuth-failure and sign-out-failure states are shown honestly (not silently stripped or reported as success) [AUTH-05/08/10/04/06]
  5. Redirect targets carry the full destination (query string preserved) and billing-portal `returnUrl` is honored; two consecutive zero-finding review cycles [AUTH-11/12/13]
**Plans**: TBD

### Phase 38: Forms & Validation
**Goal**: Every create/edit form and both CSV importers save valid data — decimal money into money columns, no phantom fields, real client-side validation, and no unhandled mutation rejections.
**Depends on**: Phase 37 (merged)
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06, FORM-07, FORM-08, FORM-09, FORM-10, FORM-11, FORM-12, FORM-13, FORM-14, FORM-15, FORM-16, FORM-17, FORM-18, FORM-19
**Success Criteria** (what must be TRUE):
  1. Saving any lease edit succeeds — the phantom `version` field is removed and no edit fails with PGRST204 [FORM-02/04]
  2. Money inputs (rent, deposit, pet deposit/rent, late fee, maintenance cost) accept or reject decimals coherently across every lease/unit/maintenance form, the wizard, and both CSV importers — no raw 22P02 / silent-round integer-column failures (one exhaustive sibling sweep of the decimal-into-integer class) [FORM-01/03/06/08/10/11/12/14/15]
  3. Wizard step validation errors are rendered to the user, and end-date/phone/length/state/ZIP validators actually gate submission [FORM-07/09/16/17/19]
  4. Template preview/export runs schema validation, and failed mutations (emergency-contact, inspection) are caught and surfaced rather than left as unhandled promise rejections [FORM-05/13/18]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 39: Data Layer & Cache Integrity
**Goal**: Mutations keep the TanStack Query cache truthful and every list query is bounded and correctly filtered.
**Depends on**: Phase 38 (merged)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, DATA-11, DATA-12, DATA-13, DATA-14, DATA-15, DATA-16, DATA-17, DATA-18
**Success Criteria** (what must be TRUE):
  1. Editing a lease, renewing a lease, or updating an inspection no longer overwrites the enriched detail cache with a bare row — embeds/rooms/tenants stay visible after save [DATA-01/02/06]
  2. Updating a tenant immediately refreshes the tenant detail page (the key the page reads is invalidated), and renew invalidates the unit/tenant keys its siblings do [DATA-03/18]
  3. Every list query is bounded with `.limit()`/`.range()` and paginates off `count`, never `data.length` (one exhaustive sweep of the unbounded-query class) [DATA-04/07/08/09/10/13/14/15/16/17]
  4. Declared list filters are actually applied (lease `search`/`property_id`, maintenance `property_id`) and occupancy stats stop producing >100% / negative vacancy [DATA-11/12/05]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 40: Type Boundaries (RPC/PostgREST)
**Goal**: Every RPC/PostgREST boundary uses a validated typed mapper so no cast fabricates or destroys data.
**Depends on**: Phase 39 (merged)
**Requirements**: TYPE-01, TYPE-02, TYPE-03, TYPE-04, TYPE-05, TYPE-06, TYPE-07
**Success Criteria** (what must be TRUE):
  1. Editing a property preserves `acquisition_cost` and `acquisition_date` — the detail query no longer casts a column subset to a full `Property` [TYPE-01]
  2. `/analytics/financial` and the maintenance insights section render real RPC data instead of zeroed metrics and empty charts [TYPE-02/03]
  3. Financial/report/expense mappers read only keys the RPC actually emits — no phantom `expenses`/`profit`/`net_income`/counts silently defaulting to 0, no fabricated expense-row fallbacks [TYPE-04/05/06]
  4. jsonb columns (`custom_fields`) are runtime-validated before use instead of blind-cast to `DynamicField[]` [TYPE-07]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 41: Component Logic & Analytics Correctness
**Goal**: Analytics, financial, and date-sensitive components compute correct numbers and correct dates.
**Depends on**: Phase 40 (merged)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, COMP-09, COMP-10, COMP-11, COMP-12, COMP-13
**Success Criteria** (what must be TRUE):
  1. Financial/revenue/cash-flow stat cards show face-value dollars — the surviving ÷100 understatement is gone (last of the 100× money class) [COMP-01/04]
  2. Analytics overview KPIs (occupancy rate, active tenants, monthly revenue) show real values, not fields hardwired to zero [COMP-02]
  3. The quarterly income statement builds valid calendar dates for every quarter (no `2026-06-31`) so the Quarterly view works year-round [COMP-03]
  4. Date-only values (expense, lease end, work-order, move-out) render on the correct local day in every US timezone; expense/tenant pagination resets on filter change; the Export CSV and insight-summary controls actually do something [COMP-05/08/09/12/06/10/07/11/13]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 42: Dashboard UX & Navigation
**Goal**: The owner dashboard's intercepted-route modals, quick actions, confirmations, and empty states all work and route to real pages.
**Depends on**: Phase 41 (merged)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10, DASH-11, DASH-12, DASH-13, DASH-14, DASH-15, DASH-16, DASH-17, DASH-18, DASH-19, DASH-20, DASH-21, DASH-22, DASH-23
**Success Criteria** (what must be TRUE):
  1. New/Edit modals for properties, leases, units, and maintenance actually open — the `@modal` slots are rendered (maintenance gains a layout) and every `(.)edit/[id]` interceptor targets the real `/x/[id]/edit` route [DASH-01/02/03/04/05/06/07/08/15]
  2. Post-create the new-property modal closes/navigates, and every quick-action link resolves to a real route (unit details, activity, unit-filtered maintenance) [DASH-09/11/12/18]
  3. Destructive single-click actions (document delete, emergency-contact remove) require a confirmation dialog [DASH-10/21]
  4. List empty states use the mandated `Empty` compound component and key create forms autofocus their primary input [DASH-13/14/16/17/19/20/22/23]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD
**UI hint**: yes

### Phase 43: E-sign Flow
**Goal**: The token-based e-sign flow notifies the right party, recovers from finalize failures, keeps signer access, and rate-limits by IP.
**Depends on**: Phase 42 (merged)
**Requirements**: SIGN-01, SIGN-02, SIGN-03, SIGN-04, SIGN-05, SIGN-06
**Success Criteria** (what must be TRUE):
  1. When the tenant signs first, the owner is notified that a counter-signature is needed — the flow no longer stalls silently in `pending_signature` [SIGN-03]
  2. After signing, the tenant retains access to a signed copy, and revisiting the link shows the friendly "already signed / active" completed-state card instead of "signing link unavailable" [SIGN-01/04]
  3. A failed signed-PDF finalize has a retry/regeneration path — no permanent "Finalizing signed document…" state [SIGN-02]
  4. Token probing is rate-limited per IP (not per token hash), and lease status badges key on the real lowercase statuses [SIGN-06/05]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 44: Public Site UX
**Goal**: The public marketing surface converts logged-out prospects without dead ends or auth walls.
**Depends on**: Phase 43 (merged)
**Requirements**: PUBUX-01, PUBUX-02, PUBUX-03, PUBUX-04, PUBUX-05, PUBUX-06, PUBUX-07, PUBUX-08, PUBUX-09, PUBUX-10, PUBUX-11
**Success Criteria** (what must be TRUE):
  1. Pricing cards respect `requiresEmailConfirmation` — no guaranteed-401 checkout attempt when signup produced no session (both standard and featured cards) [PUBUX-01/06]
  2. Feature-card and hero CTAs link to reachable destinations — no auth-gated dead-ends for logged-out prospects, real hrefs on /faq, /about, /help, and no self-referential sticky "Start free" [PUBUX-05/07/11]
  3. Blog index category chips show the human label (not the raw kebab slug), and help-center resources and the tax lead magnet deliver what they promise [PUBUX-03/04/02]
  4. Speculative typo redirects, merchant-only Stripe-dashboard links, and dead skip-link targets are removed/fixed on every page [PUBUX-08/10/09]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD
**UI hint**: yes

### Phase 45: Marketing Content Truthfulness
**Goal**: Every marketing claim maps to a shipped capability — no nonexistent features, false trials, placeholders, or fabricated proof.
**Depends on**: Phase 44 (merged)
**Requirements**: CONTENT-01, CONTENT-02, CONTENT-03, CONTENT-04, CONTENT-05, CONTENT-06, CONTENT-07, CONTENT-08, CONTENT-09, CONTENT-10, CONTENT-11, CONTENT-12, CONTENT-13, CONTENT-14, CONTENT-15, CONTENT-16, CONTENT-17, CONTENT-18, CONTENT-19, CONTENT-20, CONTENT-21, CONTENT-22, CONTENT-23, CONTENT-24
**Success Criteria** (what must be TRUE):
  1. Nonexistent features are removed from every surface — team seats, API access, custom lease clauses, ACH (pricing config, comparison tables, compare pages, FAQ + FAQPage JSON-LD, help, resources, features) [CONTENT-01/02/03/04/06/07/08/10/12/14/19/20]
  2. Trial copy is honest and plan-scoped — no "full access to all features" or "e-sign in trial" claim for Starter trials [CONTENT-09/15/18]
  3. Fabricated proof and misframing are removed — hardcoded 5-star ratings, stock "support team" imagery, "trusted integrations" vendor misframing, undelivered newsletter/lead-magnet promises, "half the price" claim [CONTENT-05/11/13/16/17/23]
  4. Arithmetic and dated copy are corrected (AppFolio $2,988/yr, RentRedi unlimited-units contradiction, "as of 2025") [CONTENT-21/22/24]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 46: Marketing UI Consistency
**Goal**: Marketing pages render with correct typography, spacing, containers, and dark-mode-safe tokens — no dead utility classes, palette drift, or duplicate components.
**Depends on**: Phase 45 (merged)
**Requirements**: MKTUI-01, MKTUI-02, MKTUI-03, MKTUI-04, MKTUI-05, MKTUI-06, MKTUI-07, MKTUI-08, MKTUI-09, MKTUI-10, MKTUI-11, MKTUI-12, MKTUI-13, MKTUI-14, MKTUI-15, MKTUI-16, MKTUI-17, MKTUI-18, MKTUI-19, MKTUI-20, MKTUI-21, MKTUI-22, MKTUI-23, MKTUI-24, MKTUI-25, MKTUI-26
**Success Criteria** (what must be TRUE):
  1. The undefined utility classes are replaced so hero titles, section spacing, and badges render at intended size across about/faq/help/blog/pricing/resources (`text-responsive-display-xl/2xl`, `text-section-title`, `section-content`, `page-content`, `inline-flex-center`, `gradient-background`) — one exhaustive sweep of the class [MKTUI-05/11/13/15/18/19/24]
  2. Layout defects are fixed — search container centering/padding, doubled navbar offset, Max card self-serve CTA (not "Contact Sales"), competing sticky CTAs, breadcrumb layout shift [MKTUI-01/03/04/09/20]
  3. Colors use semantic tokens and survive dark mode (compare palettes, resource pages, hover states, help badges), and stock/Unsplash imagery + inline styles are removed [MKTUI-06/07/14/21/23/10/25/26/22]
  4. Live legal/privacy copy is truthful (no "[Your State]" placeholders, no phantom Railway processor) and duplicate components + category-slug labels + support-tier claims are unified [MKTUI-02/12/08/16/17]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD
**UI hint**: yes

### Phase 47: Accessibility
**Goal**: The app meets WCAG AA — readable tokens, named controls, keyboard-reachable actions, associated labels, and managed dialog focus.
**Depends on**: Phase 46 (merged)
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06, A11Y-07, A11Y-08, A11Y-09, A11Y-10, A11Y-11, A11Y-12, A11Y-13, A11Y-14, A11Y-15, A11Y-16, A11Y-17, A11Y-18, A11Y-19, A11Y-20, A11Y-21, A11Y-22, A11Y-23, A11Y-24, A11Y-25, A11Y-26, A11Y-27, A11Y-28, A11Y-29, A11Y-30, A11Y-31, A11Y-32, A11Y-33, A11Y-34, A11Y-35, A11Y-36, A11Y-37, A11Y-38, A11Y-39, A11Y-40, A11Y-41
**Success Criteria** (what must be TRUE):
  1. Status/badge text and vivid-token text meet AA contrast in both themes — no near-white `*-foreground` on 10% tints, no bare `dark:text-muted`, vivid tokens reserved for icons [A11Y-01/07/12/22]
  2. Every icon-only button and placeholder-only input has an accessible name [A11Y-02/03/04/05/15/17/27/28/31/32/33/34/36/37/38]
  3. Hover-only controls are keyboard-visible/focusable, and clear-filter/menu/column controls are real keyboard-operable buttons with `aria-expanded` + Escape handling (not `role="button"` divs) [A11Y-08/09/10/11/16/18/19/20/21/23/24/26/39/40/41]
  4. Custom dialogs manage focus, visible labels are programmatically associated with inputs, and mobile/desktop nav submenus are keyboard + screen-reader accessible [A11Y-06/25/29/13/30/35]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD
**UI hint**: yes

### Phase 48: Routing, SEO & Performance
**Goal**: ISR routes stay static, SEO metadata is correct, and heavy client bundles and N+1 queries are eliminated.
**Depends on**: Phase 47 (merged)
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, SEO-07, SEO-08, SEO-09, SEO-10, SEO-11, SEO-12, SEO-13, SEO-14, SEO-15
**Success Criteria** (what must be TRUE):
  1. ISR-declared routes stop forcing dynamic rendering via the cookie-aware Supabase client — sitemap, feed.xml, llms.txt, and llms-full.txt honor their `revalidate` [SEO-05/09/10/11]
  2. The marketing homepage and presentational admin tables ship as Server Components; recharts and the markdown pipeline stay out of the initial /dashboard and blog-post bundles [SEO-04/14/06/02]
  3. The properties page issues one consolidated query (no per-property N+1 fan-out) and the inspections list is bounded/paginated [SEO-01/07]
  4. SEO metadata is correct — no 404 breadcrumb node, no /auth-page canonical/index leak, robots covers all private prefixes, /compare hub in the sitemap, stale Netlify `_redirects` removed [SEO-03/15/12/13/08]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 49: Client State (Zustand)
**Goal**: Client state is truthful across users and navigations — dead stores removed, persisted state clamped, and phantom selections pruned.
**Depends on**: Phase 48 (merged)
**Requirements**: STATE-01, STATE-02, STATE-03, STATE-04, STATE-05, STATE-06, STATE-07, STATE-08, STATE-09, STATE-10, STATE-11, STATE-12, STATE-13
**Success Criteria** (what must be TRUE):
  1. Sign-out resets all Zustand stores — no previous user's search terms, filters, selections, or in-memory entities leak to the next user in the same tab [STATE-02]
  2. Persisted pagination is clamped to the recomputed `totalPages` (no stranding on an empty page) and stale dialog/lease snapshots don't reopen on back/forward navigation [STATE-01/03]
  3. Selection sets are pruned on single-delete so a subsequent bulk edit cannot resurrect a soft-deleted property or target already-deleted tenants [STATE-05/12]
  4. Dead stores/slices are removed (toast, loading, navigation-history, delete-dialog, duplicate view-preference, broken computed getter, untracked modal toast) and the maintenance view preference persists across reload [STATE-04/06/07/08/09/10/11/13]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 50: Admin Surface
**Goal**: The admin surface reports honest data, captures errors, and is reachable and accessible.
**Depends on**: Phase 49 (merged)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07
**Success Criteria** (what must be TRUE):
  1. Admin analytics RPC failures are captured (Sentry) instead of silently rendering "No data yet" empty states [ADMIN-01]
  2. The review queue shows real data — no fabricated "0 words" — and the destructive Reject action requires confirmation [ADMIN-02/03]
  3. `/admin` resolves (page or redirect) for authenticated admins and the admin shell's skip-to-content link works (`id="main-content"` present) [ADMIN-05/06]
  4. Admin list queries are bounded (`.limit()`/`.range()`) and presentational tables drop the unnecessary `"use client"` directive [ADMIN-04/07]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

### Phase 51: Code Hygiene
**Goal**: The codebase obeys the zero-tolerance rules — no duplicate types, string-literal query keys, module-level Supabase clients, inline styles, or emojis in code.
**Depends on**: Phase 50 (merged)
**Requirements**: HYG-01, HYG-02, HYG-03, HYG-04, HYG-05, HYG-06, HYG-07, HYG-08, HYG-09, HYG-10, HYG-11, HYG-12, HYG-13, HYG-14, HYG-15, HYG-16, HYG-17, HYG-18, HYG-19, HYG-20, HYG-21, HYG-22, HYG-23, HYG-24, HYG-25, HYG-26, HYG-27, HYG-28, HYG-29, HYG-30, HYG-31, HYG-32, HYG-33, HYG-34, HYG-35, HYG-36, HYG-37, HYG-38, HYG-39, HYG-40
**Success Criteria** (what must be TRUE):
  1. Every duplicate type definition is removed in favor of the canonical `src/types/` definitions (~25 shadows across components, hooks, lib/constants, lib/validation, stores) [HYG-03/06/07/09/10/11/12/15/16/17/18/19/20/21/22/24/26/27/31/33/34/35/36/37/38/39/40]
  2. String-literal query keys are replaced with `queryOptions()` factories under `src/hooks/api/query-keys/` [HYG-02/04/05/13/25]
  3. The module-level Supabase client is moved inside its call sites (no import-time `createClient()`) [HYG-14]
  4. Inline styles become Tailwind utilities/tokens (including remote-image backgrounds) and emoji characters are removed from code strings [HYG-01/08/23/28/29/30/32]
  5. Two consecutive zero-finding review cycles.
**Plans**: TBD

---

## Progress

**Execution Order:** Phases execute in strict numeric order 36 → 37 → … → 51, each branching only after the prior phase's PR merges to main.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 36. Billing & Subscription Lifecycle | v9.0 | 0/TBD | Not started | - |
| 37. Auth Flows | v9.0 | 0/TBD | Not started | - |
| 38. Forms & Validation | v9.0 | 0/TBD | Not started | - |
| 39. Data Layer & Cache Integrity | v9.0 | 0/TBD | Not started | - |
| 40. Type Boundaries (RPC/PostgREST) | v9.0 | 0/TBD | Not started | - |
| 41. Component Logic & Analytics Correctness | v9.0 | 0/TBD | Not started | - |
| 42. Dashboard UX & Navigation | v9.0 | 0/TBD | Not started | - |
| 43. E-sign Flow | v9.0 | 0/TBD | Not started | - |
| 44. Public Site UX | v9.0 | 0/TBD | Not started | - |
| 45. Marketing Content Truthfulness | v9.0 | 0/TBD | Not started | - |
| 46. Marketing UI Consistency | v9.0 | 0/TBD | Not started | - |
| 47. Accessibility | v9.0 | 0/TBD | Not started | - |
| 48. Routing, SEO & Performance | v9.0 | 0/TBD | Not started | - |
| 49. Client State (Zustand) | v9.0 | 0/TBD | Not started | - |
| 50. Admin Surface | v9.0 | 0/TBD | Not started | - |
| 51. Code Hygiene | v9.0 | 0/TBD | Not started | - |

---

**Coverage:** 296 requirements → 16 phases (36-51), each requirement mapped to exactly one category phase by construction. No orphans, no double-mapping. Phase numbering continues the integer sequence across milestones (v8.0 ended at 35; v9.0 is 36-51).
