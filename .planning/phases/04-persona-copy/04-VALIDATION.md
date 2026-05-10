---
phase: 04-persona-copy
phase_number: 4
generated: 2026-05-09
nyquist_validation: true
source: derived from `04-RESEARCH.md § Validation Strategy` + Specialist 2 § Test Surface Mapping
---

# Phase 4 Validation Strategy

Validation scaffolding for Nyquist gate. Maps each phase requirement to a concrete test + automated command + file location.

## Test Framework Inventory

| Layer | Framework | Config | Quick Command |
|-------|-----------|--------|---------------|
| Unit | Vitest 4.x + jsdom | `vitest.config.ts` | `pnpm test:unit -- --run <path>` |
| E2E | Playwright | `playwright.config.ts` (`public` project) | `pnpm test:e2e -- --project=public --grep "<grep>"` |
| Type | TypeScript 5.x strict | `tsconfig.json` | `pnpm typecheck` |
| Lint | ESLint flat config | `eslint.config.js` | `pnpm lint` |
| Live verification | curl + grep | n/a | post-deploy CLI checks against `https://tenantflow.app/` |

## Phase Requirements → Test Map

### CONS-01: Persona language unification

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Homepage hero contains "landlords" persona word | e2e | `pnpm test:e2e -- --project=public --grep "Persona consistency"` | `tests/e2e/tests/public/persona-consistency.spec.ts` | 1 (Plan 04-01) |
| Homepage NOT containing "property owners" string | e2e | same spec | same file | 1 |
| About page `/about` contains "landlords" in `titleHighlight` | e2e | same spec | same file | 1 |
| About page contains ZERO occurrences of "property managers" in body text | e2e | same spec — count assertion | same file | 1 |
| `/pricing` metadata description contains "landlords" via `<meta name="description">` parse | e2e | same spec | same file | 1 |
| `/faq` hero subtitle contains "landlords" | e2e | same spec | same file | 1 |
| `/help`, `/resources`, `/features`, `/contact`, `/compare/[buildium\|appfolio\|rentredi]` contain "landlords" | e2e | same spec, multi-page loop | same file | 1 |
| Banlist guard (`marketing-copy-landlord-only.test.ts`) stays green | unit | `pnpm test:unit -- --run src/app/__tests__/marketing-copy-landlord-only.test.ts` | existing — unchanged | 1 |
| Live: production `https://tenantflow.app/` returns "landlords with 1–15 rentals" via curl | manual | `curl -s https://tenantflow.app/ \| grep -oE '(landlords with 1.15 rentals)'` returns ≥2 results | n/a — manual checkpoint | post-deploy gate |

### COPY-01: Hero subhead replacement

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Homepage hero subhead matches new wording (Candidate A) | e2e | same persona-consistency spec | same file | 1 (Plan 04-01) |
| Homepage does NOT contain contradiction phrase "tenants never have to log in" | e2e | same spec — negative assertion | same file | 1 |
| Live: curl confirms new wording present and old wording absent | manual | `curl -s https://tenantflow.app/ \| grep -oE 'operations tool for property owners\|tenants never have to log in'` returns 0 | n/a — manual checkpoint | post-deploy gate |

### COPY-02: Social-proof "Join 500+" replacement

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Pricing card featured contains "Built for landlords with 1–15 rentals" `<Badge>` | e2e | persona-consistency spec | same file | 1 (Plan 04-01) |
| ANY page does NOT contain "Join 500+" / "500+ Growth subscribers" | e2e | sitewide loop assertion | same file | 1 |
| Live: `curl -s https://tenantflow.app/pricing \| grep -oE '(500\+\|Join 500\|Growth subscribers)'` returns 0 | manual | curl check | n/a — manual checkpoint | post-deploy gate |

### COPY-03: Tenants-never-login elevation

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Hero contains `<Badge variant="trustIndicator">` rendering "Landlord-only · Tenants never log in" | e2e | persona-consistency spec | same file | 1 (Plan 04-01) |
| Badge appears above the h1 (DOM order assertion) | e2e | same spec — `toHaveTextContent` + structural query | same file | 1 |
| Mobile 375px: badge fits in viewport without horizontal scroll | e2e | extends `mobile-nav-375px.spec.ts` viewport pattern | persona-consistency.spec.ts viewport variant | 1 |
| `<Badge>` import + `<Lock>` icon import present in `marketing-home.tsx` | grep | `grep -E "import.*Badge.*from.*badge\|import.*Lock.*from.*lucide-react" src/app/marketing-home.tsx` returns 2 | n/a — file grep | 1 |

### COPY-04: DocuSeal de-amp

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Sitewide DocuSeal mention count ≤ N (calibrated post-implementation; expected ~6-8 across pricing card×2 + comparison-table + 1 FAQ + logo cloud + JSON-LD featureList) | e2e | persona-consistency spec sitewide loop | `tests/e2e/tests/public/persona-consistency.spec.ts` | 2 (Plan 04-02) |
| Pricing page `/pricing` DocuSeal mention count ≤ 3 | e2e | per-page assertion | same file | 2 |
| About page `/about` DocuSeal mention count ≤ 1 (or 0 after about-page de-amp) | e2e | per-page assertion | same file | 2 |
| `features-client.tsx:61` integrations subtitle still contains "DocuSeal" (KEEP-AS-INFRASTRUCTURE guard) | grep | `grep -F 'DocuSeal' src/components/features/features-client.tsx` returns 1 | n/a — file grep | 2 |
| `logo-cloud.tsx` still contains DocuSeal entry (KEEP guard) | grep | `grep -c 'DocuSeal' src/components/sections/logo-cloud.tsx` returns ≥1 | n/a — file grep | 2 |
| Live: `curl -s https://tenantflow.app/ \| grep -c DocuSeal` returns ≤2 | manual | curl check | n/a — manual checkpoint | post-deploy gate |

### COPY-05: FAQ canonicalization

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Homepage FAQ entry count = 5 (`home-faq.tsx` `homeFaqs` array length) | unit | `pnpm test:unit -- --run src/components/sections/__tests__/home-faq.test.tsx` (new) | NEW: `src/components/sections/__tests__/home-faq.test.tsx` | 2 (Plan 04-02) |
| Homepage FAQ does NOT contain "Is my data secure?" | e2e | persona-consistency spec | persona-consistency.spec.ts | 2 |
| Pricing FAQ entry count = 5 (`pricing-content.tsx` `FAQS` array length) | unit | `pnpm test:unit -- --run src/app/pricing/__tests__/pricing-content.test.tsx` (new or existing) | possibly new | 2 |
| Pricing FAQ does NOT contain "How does the 14-day free trial work?" | e2e | persona-consistency spec | persona-consistency.spec.ts | 2 |
| Pricing-FAQ footer contains `<a href="/faq">` text "View all FAQs" or "See all FAQs" | e2e | persona-consistency spec | persona-consistency.spec.ts | 2 |
| FAQPage JSON-LD on `/pricing` contains 5 questions (auto-derived from `pricingFaqs`) | unit | extend `pricing/__tests__/page.test.ts` to assert mainEntity.length === 5 | existing test file | 2 |

### COPY-06: Bulk-zip softening

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Homepage contains "Tax-season zip exports" or equivalent on at least one stat tile + how-it-works step | e2e | persona-consistency spec | same file | 2 (Plan 04-02) |
| Homepage does NOT contain technical phrase "500 / request" or "Bulk-Zip Cap" label | e2e | sitewide negative assertion | same file | 2 |
| `stats-showcase.tsx` `value: 500` UNCHANGED (Phase 2 NumberTicker depends on it) | grep | `grep -E "value: 500" src/components/sections/stats-showcase.tsx` returns 1 | n/a — file grep | 2 |
| `home-faq.tsx:31` (already soft) UNCHANGED | grep | `grep -F "bulk-download a zip when tax season hits" src/components/sections/home-faq.tsx` returns 1 | n/a — file grep | 2 |

### COPY-07: Dashboard mockup names

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| `hero-dashboard-mockup.tsx` contains new names (Jamie Carter, Alex Rivera, Sam Patel) | grep | `grep -cE "Jamie Carter\|Alex Rivera\|Sam Patel" src/components/sections/hero-dashboard-mockup.tsx` returns 3 | n/a — file grep | 2 (Plan 04-02) |
| `hero-dashboard-mockup.tsx` does NOT contain old names (John Miller, Emma Wilson, David Park) | grep | `grep -cE "John Miller\|Emma Wilson\|David Park" src/components/sections/hero-dashboard-mockup.tsx` returns 0 | n/a — file grep | 2 |
| Avatar initials match new names (JC, AR, SP) | grep | `grep -E 'avatar="(JC\|AR\|SP)"' src/components/sections/hero-dashboard-mockup.tsx` returns 3 | n/a — file grep | 2 |
| `amount="DocuSeal"` replaced with `amount="E-Sign"` (paired with COPY-04 row 9) | grep | `grep -F 'amount="E-Sign"' src/components/sections/hero-dashboard-mockup.tsx` returns 1 | n/a — file grep | 2 |

### Cross-Cutting Constraint: Design Token Compliance

| Behavior | Test Type | Automated Command | Wave |
|----------|-----------|-------------------|------|
| No new hex codes in modified files | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*#[0-9a-fA-F]{3,8}\\b" \| wc -l` returns 0 | post-execution gate |
| No new `rgb(` / `rgba(` introductions | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*rgba?\\(" \| wc -l` returns 0 | post-execution gate |
| No `bg-white` introductions (use `bg-background`) | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*bg-white" \| wc -l` returns 0 | post-execution gate |
| No inline ms durations (use `--duration-*` tokens) | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*\\b[0-9]+ms\\b" \| wc -l` returns 0 | post-execution gate |

## Phase 1 CRIT-03 Cross-Check Gate (regression guard)

Phase 1 locked specific Max-pricing language. Phase 4's persona-word find-and-replace must not regress these:

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `pricing-card-standard.tsx:168` still renders "Custom" for Max | grep | `grep -F '>Custom<' src/components/pricing/pricing-card-standard.tsx` returns 1 |
| `pricing-comparison-table.tsx:206` still uses `MAX_PUBLIC_PRICE_DISPLAY` constant | grep | `grep -F '{MAX_PUBLIC_PRICE_DISPLAY}' src/components/pricing/pricing-comparison-table.tsx` returns 1 |
| `pricing/page.tsx` description still contains "Custom pricing, contact sales" | grep | `grep -F 'Custom pricing, contact sales' src/app/pricing/page.tsx` returns ≥1 |
| `productJsonLd` still excludes Max from offers (Option C) | unit | `pnpm test:unit -- --run src/app/pricing/__tests__/page.test.ts` returns 0 |

## Sampling Rate

- **Per task commit:** task-specific `<automated>` command from PLAN.md `<verify>` block
- **Per plan merge:** `pnpm typecheck && pnpm lint && pnpm test:unit` (all unit tests)
- **Wave 1 gate (Plan 04-01 complete):** above + persona-consistency.spec.ts e2e passing locally OR documented CI-only path
- **Wave 2 gate (Plan 04-02 complete):** all of the above + extended persona-consistency.spec.ts (DocuSeal count + FAQ count assertions)
- **Phase ship gate:** full suite green + Phase 1 regression guard + manual visual verification at 375px
- **Post-deploy gate:** Vercel deploy success + curl smoke against `https://tenantflow.app/` + `/pricing` + `/about` + `/faq` (all live verification commands from § Live verification in 04-RESEARCH.md)

## Wave 0 Gaps

Files that do NOT exist yet — created during Wave execution:

- `tests/e2e/tests/public/persona-consistency.spec.ts` — covers CONS-01, COPY-01, COPY-02, COPY-03, COPY-04, COPY-05 (NEW; Plan 04-01 Wave 1; extended in Plan 04-02 Wave 2)
- `src/components/sections/__tests__/home-faq.test.tsx` — covers COPY-05 entry-count assertion (NEW; Plan 04-02 Wave 2)

No framework install required:
- Vitest 4 + jsdom + Playwright `public` project all present from Phase 2/3.
- shadcn `<Badge>` primitive at `src/components/ui/badge.tsx` already exposes `trustIndicator` variant.

## Manual Verification Anchors (Phase 1 Lesson Applied)

Each plan ends with a `checkpoint:human-verify` task that requires post-deploy live verification:

| Plan | Manual Checkpoint Task | What to verify |
|------|----------------------|----------------|
| 04-01 | Final task | (a) Homepage hero subhead reads new wording; (b) `<Badge>` "Landlord-only · Tenants never log in" visible above h1; (c) `/pricing` featured card shows "Built for landlords with 1–15 rentals"; (d) all 11 marketing pages contain "landlords" persona word; (e) About page contains ZERO "property managers" |
| 04-02 | Final task | (a) DocuSeal mentions visible on `/pricing` only on the canonical 3 surfaces; (b) "Tax-season zip exports" appears across stat tile + how-it-works + features section; (c) Homepage FAQ has 5 entries; pricing FAQ has 5 entries + "See all FAQs" link to `/faq`; (d) hero dashboard mockup shows Jamie Carter / Alex Rivera / Sam Patel |

The live-verification mandate stems from Phase 1's lesson where source-only checks were insufficient; live HTTP behavior must be confirmed before claiming the phase complete.

## Security Domain

Not applicable. Phase 4 is pure copy + presentation changes — no auth, no input validation, no crypto, no PII handling, no network I/O introduced. ASVS V5 (Input Validation) trivially holds — all replacements are static string literals or static JSX.

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Test framework inventory | HIGH | Vitest + Playwright + TypeScript + ESLint all confirmed present from Phase 2/3 |
| CONS-01 + COPY-01 + COPY-02 + COPY-03 test map | HIGH | Specialist 1 + 2 provided full per-page assertion table |
| COPY-04 test map | MEDIUM-HIGH | DocuSeal-count threshold needs one calibration run |
| COPY-05 test map | HIGH | Mechanical entry-count assertions; existing JSON-LD test extends cleanly |
| COPY-06 test map | HIGH | Grep-verifiable string replacements |
| COPY-07 test map | HIGH | Grep-verifiable name/initial swaps |
| Phase 1 regression guard | HIGH | Surfaces well-isolated; spot-check guards documented in 04-RESEARCH.md |
| Manual verification anchors | HIGH | Phase 1 + Phase 2 + Phase 3 retrospectives all mandate this pattern |
| Cross-cutting design-token grep gates | HIGH | Standard patterns inherited from Phase 2 + Phase 3 |
| Wave 0 gaps | HIGH | Both new test files + extension paths identified |

---

*Validation strategy generated: 2026-05-09 — derived from research synthesis after persona word + hero subhead were locked.*
