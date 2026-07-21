# Phase 46 Research — Marketing UI Consistency
_Fix-approach research + will-fix validation for MKTUI-01..26. Source: .planning/audits/2026-07-11-full-audit.md_

## MKTUI-01 — Search page container missing mx-auto + horizontal padding
- **Finding:** src/app/search/page.tsx:72 (high) — `containerClass="max-w-6xl py-8"` on PageLayout's `<main>` has no `mx-auto`/`px-*`, so content left-pins above 1152px and runs edge-to-edge on mobile; `py-8` also fights `page-offset-navbar` (both set padding-top on the same element).
- **Root cause:** The container convention (`max-w-* mx-auto px-6 lg:px-8`) was applied as a `containerClass` fragment instead of an inner wrapper, and only half of it. PageLayout's `<main>` (page-layout.tsx:58-64) is `flex-1 page-offset-navbar` inside a plain flex column — `max-w-6xl` without `mx-auto` left-aligns at cross-start, and `py-8`'s padding-top collides with the `page-offset-navbar` utility on the same element (cascade-order dependent).
- **Fix:** In `src/app/search/page.tsx`: drop the `containerClass` prop entirely (`<PageLayout>`), and change the inner wrapper (line 73) from `<div className="flex flex-col gap-6">` to `<div className="max-w-6xl mx-auto px-6 lg:px-8 section-spacing flex flex-col gap-6">`. `max-w-6xl` is kept (matches the blog family, which this page's BlogCard grid mirrors); `section-spacing` supplies the vertical rhythm the same way /terms and /privacy do inside PageLayout.
- **Why it fixes it:** Centers the 72rem block (`mx-auto`), restores the 24/32px gutters the verifier found missing on `<main>` and every inner wrapper, and moves vertical padding off the element carrying `page-offset-navbar`, eliminating the padding-top collision.
- **Risks / interactions:** None with other phases (no other phase touches search/page.tsx). Visual-only; verify at <640px and >1280px.
- **Files touched:** src/app/search/page.tsx

## MKTUI-02 — Terms of Service ships unfilled "[Your State]" placeholders
- **Finding:** src/app/terms/page.tsx:416 (high) — Section 11.2 arbitration venue is "[Your State/Location]" and Section 14 governing law is "[Your State]" (line 465), live on the public /terms page.
- **Root cause:** The page was created from a legal boilerplate template and the jurisdiction fields were never filled before shipping.
- **Fix:** Replace both placeholders with the company's actual operating state — line 416: "Arbitration will be conducted in <STATE>." and lines 465-466: "the laws of the State of <STATE>, without regard to conflict of law principles". The state is NOT derivable from the repo (no address anywhere in src/); the plan must include an explicit owner ask for the governing-law state before implementation. Bump the "Last Updated" date (lines 20 and 524) in the same edit, since Section 13 promises that on material changes.
- **Why it fixes it:** The verifier's evidence is the literal placeholder text at those two lines; substituting the real jurisdiction makes the arbitration-venue and governing-law clauses complete.
- **Risks / interactions:** BLOCKER-level input dependency: owner must supply the state (do not guess). Phase 45 CONTENT does not list terms/page.tsx, so no rebase risk. Legal copy only — no layout/type impact.
- **Files touched:** src/app/terms/page.tsx
- **Decision:** Chose literal in-place text (two occurrences in one file, static legal page) over a shared `GOVERNING_LAW_STATE` constant — a constant adds indirection for a value that appears twice in one file. If the owner wants the state reused elsewhere later (privacy page, footer), promote it then.

## MKTUI-03 — Features hero double-applies page-offset-navbar
- **Finding:** src/components/landing/hero-section.tsx:8 (high) — the `<section>` carries `page-offset-navbar` while its sole consumer (features-client.tsx:54) already sits inside PageLayout's `<main>`, which applies the same utility — /features gets double top padding.
- **Root cause:** Direct violation of the CLAUDE.md rule "Never re-add `page-offset-navbar` to children" — the hero was likely written before it was moved under PageLayout.
- **Fix:** In `src/components/landing/hero-section.tsx:8`, change `className="relative pb-16 overflow-hidden page-offset-navbar"` to `className="relative pb-16 overflow-hidden"`.
- **Why it fixes it:** `page-offset-navbar` is only `padding-top: var(--layout-navbar-spacing)` (globals.css:1147-1149); removing the child copy leaves exactly one application (PageLayout's `<main>`), matching every other marketing page. The `relative pb-16 overflow-hidden` first-section shape matches the resources hero exactly.
- **Risks / interactions:** /features hero starts flush at the navbar offset like all siblings — verify no visual regression against /resources. Grep confirms this component has one consumer; no other landing page affected.
- **Files touched:** src/components/landing/hero-section.tsx

## MKTUI-04 — Max plan card forced to "Contact Sales" despite being self-serve
- **Finding:** src/components/pricing/bento-pricing-section.tsx:139 (high) — Max renders with `variant="enterprise"`, whose mutation short-circuits to `/contact` (pricing-card-standard.tsx:68-71) and whose CTA reads "Contact Sales" (272-276), making Max's configured Stripe price IDs (pricing.ts:180-183) unreachable.
- **Root cause:** The `enterprise` variant is a leftover from the pre-Phase-5 era when Max had "Custom pricing, contact sales" (pricing.ts:14-19 documents that Phase 5 removed all such strings). The card component kept the contact-only branch and the bento section kept passing it.
- **Fix:** Remove the contact-sales code path entirely rather than flipping one prop: in `src/components/pricing/pricing-card-standard.tsx` delete the `variant` prop, the `isEnterprise` flag, the mutation short-circuit (lines 68-71), the `isEnterprise` branch in `handleSubscribe` (122-125), the enterprise CTA variant/classes/label branches (256-276), and the `!isEnterprise` guard on OwnerSubscribeDialog (286) — every standard card is self-serve checkout. In `bento-pricing-section.tsx` remove both `variant="starter"` (line 118) and `variant="enterprise"` (line 139). Update `src/components/pricing/__tests__/pricing-card-standard.test.tsx` (5 renders pass `variant`) and add a pin: Max card renders "Start free" and calls createCheckoutSession with the annual/monthly price ID.
- **Why it fixes it:** With the enterprise branch gone, the Max card takes the same `createCheckoutSession(stripePriceId)` path as Starter, which is exactly the unreachable path the verifier identified (price_1TVTaQ…/price_1TVTaU… now used). Deleting the variant kills the bug class — no future card can silently regress to contact-only.
- **Why not `variant="starter"`:** it leaves dead contact-sales code violating the no-dead-code standard and leaves the bug re-creatable by one prop.
- **Risks / interactions:** Phase 44 PUBUX-06 edits the same file's `onComplete` (requiresEmailConfirmation handling) — Phase 46 rebases on the post-44 state; the variant removal doesn't touch onComplete logic but the dialog guard removal is adjacent, so re-verify PUBUX-06's fix survives. Unit tests must keep the CONS-09/CONS-10 pins passing.
- **Files touched:** src/components/pricing/pricing-card-standard.tsx, src/components/pricing/bento-pricing-section.tsx, src/components/pricing/__tests__/pricing-card-standard.test.tsx
- **Decision:** Remove the enterprise variant wholesale (chosen: root cause + dead-code rule) vs. minimal `variant="starter"` swap at the call site (rejected: symptom fix, keeps dead branch). If a true enterprise/contact tier ever returns, reintroduce it deliberately with its own card component.

## MKTUI-05 — Undefined `text-responsive-display-xl` collapses hero h1s to 24-30px
- **Finding:** src/components/sections/hero-section.tsx:57 (high) — `text-responsive-display-xl` emits no CSS (globals.css defines only `text-responsive-display` and `-lg`), so h1s on /about, /faq, /help (via HeroSection), /blog (page.tsx:180) and /blog/category/* (page.tsx:178) fall back to base h1 (24-30px).
- **Root cause:** The utility scale was authored with `display` and `display-lg` steps only; the `-xl` step was referenced by four call sites but never defined. (The `@theme` legacy token `--text-display-xl: 4rem` exists but generates `text-display-xl`, a different, non-fluid class.)
- **Fix (class-wide, also carries MKTUI-19):** Add the missing utility to `src/app/globals.css` next to the existing pair (after line 1098):
  ```css
  @utility text-responsive-display-xl {
  	font-size: var(--text-display-hero);
  	line-height: var(--leading-display);
  }
  ```
  `--text-display-hero` = clamp(3rem, 8vw, 5rem) (48-80px), the intended step above `-lg` (40-64px). Zero TSX edits for this finding — all four existing usages start working.
- **Why it fixes it:** The verifier's mechanism is "Tailwind v4 emits no rule → base h1 fallback"; defining the `@utility` makes Tailwind emit the rule, restoring fluid display scale on all affected heroes, consistent with the homepage hero's 48-72px range.
- **Risks / interactions:** Phase 44 PUBUX-07 rewrites hero-section.tsx CTAs (same file, different lines — no conflict). Phase 48 SEO touches blog/category page (after 46). Visually verify /blog and /about h1s don't overflow at 320px (clamp floor 48px is the homepage's existing floor). One-line CSS addition cannot affect non-users of the class.
- **Files touched:** src/app/globals.css
- **Decision:** Define the missing fluid utility (chosen: honors authored intent xl > lg, fixes 4 call sites with one line) vs. downshifting all four usages to the existing `text-responsive-display-lg` (rejected: makes premium-cta's headline equal to its nested span — hierarchy stays broken there — and shrinks heroes below the homepage's scale).

## MKTUI-06 — Compare pages use raw palette colors instead of semantic icon tokens
- **Finding:** src/app/compare/[competitor]/compare-sections.tsx:9 (medium) — `FeatureIcon` uses `text-green-600`/`text-red-400`/`text-amber-500`/`text-blue-500` (lines 9/11/13/15) and Why-Switch checks use `text-green-600`/`text-blue-500` (174/187), while the homepage comparison-table renders identical states with dark-tuned `text-success`/`text-warning`/`text-muted-foreground` tokens.
- **Root cause:** compare-sections.tsx was written against raw Tailwind palette values instead of the project's semantic token system, so the `.dark` token overrides (globals.css:670-681) never apply to it.
- **Fix:** In `src/app/compare/[competitor]/compare-sections.tsx`, map FeatureIcon to the token set used by comparison-table.tsx: `yes` → `text-success`, `no` → `text-destructive`, `partial` → `text-warning`, `addon` → `text-info`, `na` → `text-muted-foreground` (unchanged). Why-Switch list: line 174 `text-green-600` → `text-success`; line 187 `text-blue-500` → `text-info`. Vivid tokens are correct here per the WCAG token-companion convention — these are icons, not text.
- **Why it fixes it:** The verifier's defect is (a) no dark-mode tuning and (b) the two comparison tables disagreeing on the same semantics; semantic tokens are dark-tuned via `.dark` overrides and are exactly what comparison-table.tsx (lines 237/246/254) already uses.
- **Risks / interactions:** Phase 45 CONTENT edits compare-data.ts (data, not this component) — no conflict. `text-destructive` for `no` is a hue shift from the softer `red-400`; acceptable, matches state semantics. Icons only — no AA text regression possible.
- **Files touched:** src/app/compare/[competitor]/compare-sections.tsx

## MKTUI-07 — `hover:bg-accent` card fill makes compare-index card text unreadable
- **Finding:** src/app/compare/page.tsx:57 (medium) — card hover applies the vivid green `--color-accent` fill with no text-color pairing: `text-muted-foreground` children compute 1.86:1 (light) / 1.06:1 (dark) contrast on the fill. Sibling: src/components/blog/blog-pagination.tsx:35.
- **Root cause:** This theme redefines `--color-accent` as saturated green (globals.css:163/664), not shadcn's neutral gray, so the stock shadcn `hover:bg-accent` idiom becomes a readability bug anywhere it isn't paired with `hover:text-accent-foreground` — and pairing alone can't fix multi-colored children (explicit `text-muted-foreground`/`text-primary-text` classes don't inherit a parent color change).
- **Fix:** Two call-site-appropriate applications of the same principle (never vivid accent under unadjusted text):
  1. `src/app/compare/page.tsx:57`: replace `transition-colors hover:bg-accent` with `transition-all hover:border-primary/50 hover:shadow-lg` — the established marketing card-hover treatment (identical to the resources download cards, resources/page.tsx:181). Children keep their colors and stay AA.
  2. `src/components/blog/blog-pagination.tsx:35`: append `hover:text-accent-foreground` to `linkClasses` — a single-element link whose text/chevron use inherited `currentColor`, so the pairing fully fixes it, matching the blog category chips (blog/page.tsx:198).
- **Why it fixes it:** (1) removes the low-contrast fill entirely for the multi-color card; (2) applies the exact verified-correct pattern the auditor cited for single-element controls.
- **Risks / interactions:** None cross-phase. Note for cross-cutting: unpaired `hover:bg-accent` also exists in dashboard surfaces (expiring-leases-widget, document-row, data-table-column-header, multi-select-chips) — out of MKTUI scope, flag to Phase 47 A11Y.
- **Files touched:** src/app/compare/page.tsx, src/components/blog/blog-pagination.tsx
- **Decision:** Border+shadow hover for the card (chosen: zero contrast risk, matches sibling marketing cards) vs. keeping the accent fill and adding `hover:text-accent-foreground` + `group-hover:` overrides on every child (rejected: three extra per-child overrides to preserve a hover fill nothing else in marketing uses on cards).

## MKTUI-08 — FaqsAccordion duplicated byte-for-byte in two files
- **Finding:** src/app/faq/faq-accordion.tsx:20 (medium) — byte-identical to src/components/faq-accordion.tsx; /faq imports the app copy (faq/page.tsx:4), homepage HomeFaq imports the components copy (home-faq.tsx:3).
- **Root cause:** The component was copied into the /faq route directory instead of imported from the shared components tree; no barrel/no-duplicate rules make this a straight duplication violation.
- **Fix:** Delete `src/app/faq/faq-accordion.tsx`. Change `src/app/faq/page.tsx:4` to `import { FaqsAccordion } from "#components/faq-accordion";`. Shared components live under `src/components/` — the components copy is canonical (already imported by home-faq).
- **Why it fixes it:** One source file means any future styling/behavior fix applies to both FAQ surfaces — the exact silent-drift risk the verifier flagged.
- **Risks / interactions:** IMPORTANT for Phase 47: A11Y-30 (app copy, line 84) and A11Y-34 (components copy, line 84) report the same aria-expanded defect in both files — after this dedup, A11Y-30's file no longer exists and Phase 47 fixes only `src/components/faq-accordion.tsx` (one fix covers both surfaces). Flag this in the Phase 47 handoff so its plan doesn't 404 on the deleted path.
- **Files touched:** src/app/faq/faq-accordion.tsx (deleted), src/app/faq/page.tsx

## MKTUI-09 — /features shows two competing sticky CTAs
- **Finding:** src/app/features/features-client.tsx:35 (medium) — bespoke `fixed top-4 right-4 z-50` CTA (visible past 800px scroll) coexists with the shared bottom `StickyConversionCta` (features/page.tsx:34, past 600px), and the top-right button paints inside the fixed navbar's 72px z-50 band over the navbar's own "Start free" CTA.
- **Root cause:** features-client predates the shared StickyConversionCta; when the shared bar was added to features/page.tsx the bespoke one was never removed.
- **Fix:** In `src/app/features/features-client.tsx`: delete the `stickyCtaVisible` state + scroll effect (lines 22-30) and the fixed CTA block (lines 34-53); remove the now-unused imports (`ArrowRight`, `Link`, `useEffect`, `useState`, `Button`, `cn`) and the now-unneeded `"use client"` directive (no hooks remain; every child is itself a client component where needed). Keep `StickyConversionCta` in features/page.tsx as the single sticky surface.
- **Why it fixes it:** Removes the second sticky surface and the navbar overlap outright; /features then matches /pricing, /faq, /compare/* (verifier confirmed those use only the shared bottom bar).
- **Risks / interactions:** `noUnusedLocals` will enforce the import cleanup. Dropping `"use client"` converts the file to a Server Component — safe (it only composes imported components), but if `next build` complains about any transitively-required client boundary, keep the directive and note it. No other phase touches features-client.tsx.
- **Files touched:** src/app/features/features-client.tsx

## MKTUI-10 — Help hero ships an Unsplash stock photo with a false "support team" alt
- **Finding:** src/app/help/page.tsx:45 (medium) — hero loads `images.unsplash.com/photo-1556761175-…` with alt "TenantFlow support team helping landlords with their portfolios", which is factually false.
- **Root cause:** Stock imagery was used to fill the hero's image slot, and the alt text fabricates a brand claim the image cannot support.
- **Fix:** Remove the `image` prop from the `<HeroSection>` call on /help (lines 44-47). `HeroSection` fully supports the imageless centered variant (hero-section.tsx:41-46 switches to `flex flex-col items-center … text-center` when `image` is undefined), so the hero renders as a clean centered hero with no stock photo and no false claim.
- **Why it fixes it:** Eliminates both verified defects at once — the external stock-photo dependency and the misleading alt text read to screen-reader users.
- **Risks / interactions:** Phase 45 CONTENT-23 targets the same caption (help/page.tsx:46) — CONTENT lands first and may have already rewritten the alt; this fix supersedes it by removing the image, so implement on the post-45 state and drop whatever alt CONTENT wrote. /faq and /about keep their Unsplash heroes (not cited by this finding; a full Unsplash purge is a separate product decision — noted in cross-cutting). Visual check: /help hero switches from 2-col to centered layout.
- **Files touched:** src/app/help/page.tsx
- **Decision:** Remove the image (chosen: kills the false claim and the stock-photo/API dependency; imageless variant is an established layout) vs. keeping the image with an honest generic alt (rejected: still a stock photo presented as brand imagery on a trust-sensitive support page). A follow-up replacing all marketing Unsplash heroes with generated brand art (per the blog-cover standard) belongs to a future milestone, not this finding.

## MKTUI-11 — Undefined `text-section-title` collapses pricing FAQ/CTA headings
- **Finding:** src/app/pricing/pricing-content.tsx:100 (medium) — `text-section-title` is generated nowhere, so the h2s at lines 100 and 167 render at base h2 (20-24px) instead of the 30-48px marketing section scale; same dead class at src/components/auth/update-password-form.tsx:104.
- **Root cause:** A class name was invented (probably intended as a design-system utility) but never defined in globals.css; Tailwind v4 silently emits nothing for unknown classes.
- **Fix:** Replace the dead class at all three sites — no new utility (the intent maps onto existing sibling patterns):
  1. `pricing-content.tsx:100` and `:167`: `text-section-title` → `text-3xl lg:text-4xl font-bold` (keep `tracking-tight text-foreground`), matching the dominant marketing section-heading scale (features-section.tsx h2, compare-sections h2s).
  2. `update-password-form.tsx:104`: `text-section-title` → `typography-h2` (app-UI card title scale — this is an auth card, not a marketing section).
- **Why it fixes it:** The verifier's defect is "falls back to base h2, diverging from the 30-48px siblings"; explicit sibling-matching classes restore the intended scale, and the auth CardTitle gets the app-tier utility.
- **Risks / interactions:** Phase 37 AUTH precedes 46 and may have touched update-password-form.tsx — verify line position on the post-37 tree (the fix is a class swap regardless). Phase 45 CONTENT edits pricing-content.tsx copy (lines 42/190) — different lines, rebase-trivial.
- **Files touched:** src/app/pricing/pricing-content.tsx, src/components/auth/update-password-form.tsx

## MKTUI-12 — Privacy Policy names Railway, a processor that doesn't exist
- **Finding:** src/app/privacy/page.tsx:184 (medium) — section 4.1 lists "Railway: Backend API hosting" and section 5 (line 231) claims hosting on "(Supabase, Vercel, Railway)"; the architecture has no Railway backend (PostgREST + RPCs only, per CLAUDE.md; repo-wide grep confirms Railway appears nowhere else).
- **Root cause:** The policy was written against an earlier architecture draft (or boilerplate) that assumed a separate backend host; it was never reconciled with the actual Vercel+Supabase stack.
- **Fix:** In `src/app/privacy/page.tsx`: delete the Railway `<li>` (lines 183-185) from the 4.1 processor list, and change line 231 to "…SOC 2 compliant platforms (Supabase, Vercel)". Bump "Last Updated" (line 20) — the policy itself promises that on changes (line 391).
- **Why it fixes it:** Removes the publicly named nonexistent data processor from both places the verifier identified.
- **Risks / interactions:** None — Phase 45 CONTENT does not list privacy/page.tsx. Pure copy deletion. Note: the remaining processor list (Supabase, Stripe, Vercel, Resend) matches the real stack; also matches the LogoCloud claim ("Built on Stripe, Supabase, Vercel, and Resend").
- **Files touched:** src/app/privacy/page.tsx

## MKTUI-13 — Undefined `section-content`/`section-compact` leave sections with zero vertical padding
- **Finding:** src/app/resources/page.tsx:206 (medium) — `section-content` emits no CSS (only `section-spacing`/`-compact`/`-spacious` exist), so the resources CTA plus pricing/cancel/page.tsx:20, pricing/success/success-client.tsx:47+65 render with no vertical padding; same-family dead class `section-compact` at pricing/complete/complete-client.tsx:105.
- **Root cause:** Same class of bug as MKTUI-11/15/18/24: invented utility names never defined in globals.css; Tailwind v4 emits nothing and the layout silently loses its padding.
- **Fix (class-wide with MKTUI-15/24; single "dead marketing class" sweep task):**
  1. `resources/page.tsx:206`: `section-content` → `section-spacing`.
  2. `pricing/cancel/page.tsx:20`: `section-content` → `section-spacing` (wrapper becomes `mx-auto max-w-2xl px-6 section-spacing lg:px-8`).
  3. `pricing/success/success-client.tsx:47` and `:65`: same swap.
  4. `pricing/complete/complete-client.tsx:105` (`section-compact`): subsumed by the MKTUI-22 rewrite of that wrapper (below) — the rewritten container uses `section-spacing` for family parity.
  After the sweep, grep must show zero remaining `section-content|section-compact` in src/.
- **Why it fixes it:** `section-spacing` (padding-block 5rem, globals.css:1135) is the defined utility every sibling section uses — restoring exactly the padding the verifier measured as absent.
- **Risks / interactions:** MKTUI-22 rewrites complete-client's wrapper — sequence those two edits in one task to avoid conflicting diffs. Checkout-result pages get visibly more breathing room (intended).
- **Files touched:** src/app/resources/page.tsx, src/app/pricing/cancel/page.tsx, src/app/pricing/success/success-client.tsx, src/app/pricing/complete/complete-client.tsx

## MKTUI-14 — Resource pages hard-code light-only palette colors that break dark mode
- **Finding:** src/app/resources/seasonal-maintenance-checklist/page.tsx:23 (medium) — fixed `bg-green-50 border-green-200`/`bg-amber-100 text-amber-900` season/category theming stays light in dark mode while token-based rows (`bg-background/50`) flip dark, producing dark rows inside pastel-light cards. Siblings: seasonal page lines 23-24/81-82/138-139/197-198; tax-deduction-data.ts 17-18/43-44/73-74/105-106/137-138/168-169/189-190; landlord-tax-deduction-tracker/page.tsx:69-70 (amber disclaimer); security-deposit-reference-card/page.tsx:542/548/601/610/625-626.
- **Root cause:** Dark mode is class-based token swapping; raw palette classes without `dark:` companions are invisible to it — the same failure mode as the banned `bg-white`. Decorative category theming was authored in raw palette instead of the token system.
- **Fix (one class-wide sweep across all three resource surfaces):** Replace every raw palette color with semantic-token equivalents that auto-flip via the `.dark` overrides:
  - Card/section pairs → `bg-<token>/10 border-<token>/20`; header pairs → `bg-<token>/20 text-<token>-text`.
  - Seasonal page mapping: Spring(green)→`success`, Summer(amber)→`warning`, Fall(orange)→`destructive`, Winter(blue)→`info`.
  - Tax data (`tax-deduction-data.ts` color/headerColor fields): Mortgage(blue)→`info`, Property(green)→`success`, Repairs(amber)→`warning`, Depreciation(purple)→`primary`, Professional(rose)→`destructive`, Travel(teal)→`info`, Other(gray)→`bg-muted/50 border-border` + header `bg-muted text-foreground`. (Travel/Mortgage sharing `info` is acceptable — the hues are decorative section theming, each section is separately labeled.)
  - Disclaimers (tax page 69-70, security-deposit 625-626): `border-amber-200 bg-amber-50` + `text-amber-900` → `border-warning/20 bg-warning/10` + `text-warning-text` (the `status-badge-warning` recipe already in globals.css:711-713).
  - Security-deposit legend/table dots (542/548/601/610): `bg-green-500` → `bg-success`, `bg-blue-500` → `bg-info` (non-text indicators; vivid tokens are the icon/indicator convention).
  Post-sweep gate: grep `bg-(green|amber|orange|blue|purple|rose|teal|gray)-\d|text-(green|amber|orange|blue|purple|rose|teal|gray)-\d` over src/app/resources/ returns nothing.
- **Why it fixes it:** All colors become `.dark`-tuned tokens, eliminating the verified pastel-light-card/dark-row clash; `-text` companions keep header/disclaimer text AA in both modes per the vivid-token rule.
- **Risks / interactions:** Phase 45 CONTENT-24 edits security-deposit-reference-card/page.tsx:628 ("as of 2025") — expect ±line drift; rebase on post-45 state. Print output shifts from pastel fills to token tints — verify the print stylesheet still reads (tints print acceptably; dots stay distinct). Hue identity loosens (purple→primary blue, teal→info blue): acceptable for decorative section theming.
- **Files touched:** src/app/resources/seasonal-maintenance-checklist/page.tsx, src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts, src/app/resources/landlord-tax-deduction-tracker/page.tsx, src/app/resources/security-deposit-reference-card/page.tsx
- **Decision:** Semantic tokens (chosen: matches the finding's stated correct form, the MKTUI-06 fix, and the repo's token-only direction; zero new CSS) vs. keeping the 7-hue palette with explicit `dark:` companions on every class (rejected: doubles every class string, entrenches raw-palette usage the rest of the codebase is moving away from, and still bypasses the theme's tuned dark values).

## MKTUI-15 — Undefined `page-content` leaves printable resource pages with no top spacing
- **Finding:** src/app/resources/seasonal-maintenance-checklist/page.tsx:294 (medium) — `page-content` emits no CSS, so `max-w-4xl mx-auto px-6 lg:px-8 page-content pb-16` gives only bottom padding; the "Back to Resources" row starts flush at the navbar offset. Siblings: landlord-tax-deduction-tracker/page.tsx:42, security-deposit-reference-card/page.tsx:514.
- **Root cause:** Same dead-class family as MKTUI-13 — an invented utility never defined; sibling text pages (/terms:18, /privacy:18) use the real `section-spacing`.
- **Fix (part of the dead-class sweep):** On all three wrappers, replace `page-content pb-16` with `section-spacing` (padding-block 5rem covers both top and bottom; dropping `pb-16` avoids a competing padding-bottom on the same element). Result e.g.: `max-w-4xl mx-auto px-6 lg:px-8 section-spacing`.
- **Why it fixes it:** Restores the top spacing the verifier found missing, using the exact utility the sibling legal/text pages use inside the same PageLayout.
- **Risks / interactions:** Bottom padding grows 4rem→5rem (consistent with siblings). Same files as MKTUI-14 — do both in one edit pass per file. Print styles hide nav/footer only; extra top padding prints harmlessly.
- **Files touched:** src/app/resources/seasonal-maintenance-checklist/page.tsx, src/app/resources/landlord-tax-deduction-tracker/page.tsx, src/app/resources/security-deposit-reference-card/page.tsx

## MKTUI-16 — Blog cards render the raw kebab category slug
- **Finding:** src/components/blog/blog-card.tsx:36 (medium) — `{post.category}` renders the stored kebab slug ("lease-law", "software-vault") on every card across /blog, /blog/category/*, /search, related-articles, and compare pages, while all other surfaces humanize via `categoryLabel()`.
- **Root cause:** `blogs.category` stores the slug (single-source doc: src/lib/seo/blog-categories.ts:1-12) and the mapper passes it through raw by design; BlogCard is the one presentation surface that forgot the display-label conversion.
- **Fix:** In `src/components/blog/blog-card.tsx`: `import { categoryLabel } from "#lib/seo/blog-categories";`, then guard the nullable category at the call site (lines 35-39). `BlogListItem.category` is `Pick<Blog, "category">` = `string | null` (`blogs.category` is nullable — supabase.ts:102), so a bare `categoryLabel(post.category)` FAILS strict typecheck: `categoryLabel(slug: string)` requires a non-null `string`. The current raw `<span>{post.category}</span>` tolerates null only because React renders null as nothing — replacing it with an unguarded call would drop that tolerance. Wrap the category span AND its trailing separator in a truthiness guard so null narrows out before the call:
  ```tsx
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
  	{post.category && (
  		<>
  			<span>{categoryLabel(post.category)}</span>
  			<span aria-hidden="true">-</span>
  		</>
  	)}
  	<span>{post.reading_time} min read</span>
  </div>
  ```
  Inside `post.category && …`, TypeScript narrows `string | null` → `string`, so `categoryLabel(post.category)` typechecks cleanly. This mirrors the repo's own null-guard pattern for this exact helper: blog-post-page.tsx:137 (`postCategory ? categoryLabel(categorySlug) : ""`) and blog-post-breadcrumb.tsx:39 (`categorySlug ? categoryLabel(categorySlug) : null`). The cited sibling (blog/page.tsx:200 filter chips rendering `{cat.name}`) is Phase 44's PUBUX-03 — verify it landed as `categoryLabel(cat.slug)` and do NOT double-fix; if 44 somehow skipped it, fold the chip fix into this task.
- **Why it fixes it:** `categoryLabel()` is the repo's single source of truth for slug→label (title-case fallback for unknown slugs), so every non-null BlogCard consumer gets "Lease Law"/"Software Vault" — the exact surfaces the verifier enumerated. The truthiness guard both (a) satisfies the validator's objection — null (and empty-string, since `categoryLabel("")` returns `""` per blog-categories.test.ts:32) never reaches the `string`-only helper, so `bun run typecheck` stays green under `exactOptionalPropertyTypes`/`noUncheckedIndexedAccess` — and (b) preserves the current null-tolerance while additionally removing the dangling "-" separator the raw render leaves when category is null (an incidental improvement, matching the reading-time-only shape the guarded sibling surfaces already produce).
- **Risks / interactions:** Depends on Phase 44 (PUBUX-03) landing first for the sibling chip. `categoryLabel` is a pure function safe in Server Components (BlogCard has no "use client"). No query-key or data-shape change. Single-file blast radius: the fix guards at the call site rather than widening `categoryLabel`'s signature, so no other caller of the helper is affected. Null/empty-string categories now render reading-time-only (consistent with the guarded sibling surfaces) instead of an empty span plus orphaned separator.
- **Files touched:** src/components/blog/blog-card.tsx

## MKTUI-17 — Pricing surfaces grant Starter "Priority email support", contradicting help/homepage
- **Finding:** src/components/pricing/pricing-comparison-table.tsx:128 (medium) — Support category marks "Priority email support" true for all tiers and pricing.ts:129-131 gives Starter `support: "Priority Email"`, while /help (page.tsx:37/43/56-57) and the homepage features grid (features-section.tsx:48) state "Email support on every plan. Phone and priority support on Growth and Max."
- **Root cause:** Two hardcoded copies of the support matrix (pricing config + comparison table) drifted from the support policy stated on help/homepage; nobody reconciled which claim is true.
- **Fix:** Reconcile toward "priority is a Growth/Max differentiator" (the help/homepage claim — it's also the only reading under which "priority" means anything across a 3-tier ladder):
  1. `src/config/pricing.ts` STARTER: feature string "Priority email support" → "Email support"; `support: "Priority Email"` → `support: "Email"`.
  2. `src/components/pricing/pricing-comparison-table.tsx` Support category: change "Priority email support" to `starter: false, growth: true, max: true` and add an "Email support" row above it with all three true.
  Help page and features-section copy stay as-is (already correct under this direction).
- **Why it fixes it:** The verifier's defect is the direct contradiction between public commercial surfaces; after this, all four surfaces state the same policy: email everywhere, priority+phone on Growth/Max.
- **Risks / interactions:** Phase 45 CONTENT edits BOTH files (CONTENT-01/02/03/14/18/19 remove team/API/custom-clause rows and rewrite plan features) — implement on the post-45 state; row/line numbers WILL have drifted, match by row name not line. Starter's marketed feature list shrinks slightly (accuracy > puffery, consistent with Phase 45's honesty sweep).
- **Files touched:** src/config/pricing.ts, src/components/pricing/pricing-comparison-table.tsx
- **Decision:** Reserve priority for Growth/Max (chosen: matches 2 of the 4 surfaces including the detailed /help support matrix, preserves tier differentiation, and aligns with Growth's "Phone and priority email support" feature) vs. granting Starter priority everywhere and rewording help/features (rejected: makes "priority" meaningless when every tier has it, and inflates the cheapest tier's support promise the team must then honor).

## MKTUI-18 — Undefined `inline-flex-center` breaks the FAQ hero trust badge
- **Finding:** src/components/sections/hero-section.tsx:26 (medium) — `inline-flex-center` is defined nowhere (only `flex-center` exists, globals.css:1421), so the /faq trust-badge pill is display:block full-width with the pulse dot stacked above the label. Same dead class in src/components/ui/toggle.tsx:6 and src/components/maintenance/maintenance-form.client.tsx:85.
- **Root cause:** The utility family was authored with `flex-center`/`flex-between`/`flex-start` but the inline variant was referenced three times and never defined — same dead-class family as MKTUI-13/15.
- **Fix (class-wide, one line):** Add to `src/app/globals.css` beside `flex-center` (after line 1423):
  ```css
  @utility inline-flex-center {
  	@apply inline-flex items-center justify-center;
  }
  ```
  Zero TSX edits — all three usages (marketing hero badge, toggle primitive, maintenance loading state) start rendering as intended.
- **Why it fixes it:** The verifier's mechanism is "class emits no CSS → display:block fallback"; defining the utility restores inline-flex centering on the live /faq badge (and the two app-side siblings for free).
- **Risks / interactions:** toggle.tsx (Phase 41 COMP territory) and maintenance-form.client.tsx (Phase 42) gain their intended centering without file edits — pure fix, but note the visual change in those surfaces for the verify pass. shadcn's stock toggle uses exactly `inline-flex items-center justify-center`, so the toggle becomes MORE standard, not less.
- **Files touched:** src/app/globals.css
- **Decision:** Define the utility (chosen: completes the existing `flex-center` family, one line fixes three call sites and future uses) vs. rewriting the three call sites to `inline-flex items-center justify-center` and banning the class (rejected: leaves an asymmetric utility family that invites the same typo again).

## MKTUI-19 — Premium CTA headline collapses below its own nested span
- **Finding:** src/components/sections/premium-cta.tsx:25 (medium) — undefined `text-responsive-display-2xl` makes the h2 fall back to 20-24px while its nested span uses the real `text-responsive-display-lg` (40-64px), inverting the homepage closing-CTA hierarchy.
- **Root cause:** Same missing-utility family as MKTUI-05; `-2xl` was never defined and no token above `--text-display-hero` exists.
- **Fix:** With `text-responsive-display-xl` now defined by MKTUI-05 (48-80px), change premium-cta.tsx:25 `text-responsive-display-2xl` → `text-responsive-display-xl`. Hierarchy restored: h2 main line 48-80px > "for your portfolio" span 40-64px.
- **Why it fixes it:** The verifier's defect is the inverted hierarchy (span 2-3x larger than headline); the defined xl step puts the main line back above the span at every viewport (clamp floors 48 > 40, ceilings 80 > 64).
- **Risks / interactions:** Depends on the MKTUI-05 globals.css addition (same PR, order the CSS task first). `leading-[0.9]` on a now-80px max headline — visually verify the three stacked lines at desktop width. Do NOT define a `-2xl` utility: no larger token exists and 5rem+ fixed sizes regress mobile.
- **Files touched:** src/components/sections/premium-cta.tsx (plus src/app/globals.css via MKTUI-05)

## MKTUI-20 — Blog skeleton breadcrumb offset (pt-8) disagrees with the page (pt-12)
- **Finding:** src/app/blog/loading.tsx:27 (low) — skeleton breadcrumb container uses `pt-8`, real page uses `pt-12` (blog/page.tsx:162), causing a 16px downward shift on stream-swap; category page (category/[category]/page.tsx:154) uses `pt-8`.
- **Root cause:** The breadcrumb offset was never standardized — three hand-written copies of the same container drifted.
- **Fix:** Standardize on `pt-8` (already used by 2 of 3 surfaces, including the shared loading skeleton that also streams for /blog/category/*): change `src/app/blog/page.tsx:162` `pt-12` → `pt-8`. loading.tsx and the category page stay untouched.
- **Why it fixes it:** Skeleton (pt-8) → resolved /blog page (now pt-8) = zero shift; /blog and /blog/category/* now agree, resolving both verified disagreements with a one-line edit.
- **Risks / interactions:** Phase 48 SEO touches the category page (after 46, no conflict). Blog index breadcrumb rises 16px — imperceptible, and it's the standardization target.
- **Files touched:** src/app/blog/page.tsx

## MKTUI-21 — Help resource badges mix AA-safe and vivid-accent text tokens
- **Finding:** src/app/help/page.tsx:157 (low) — two badges use `bg-primary/10 text-primary-text` (AA-safe companions) while two use `bg-accent/10 text-accent` (lines 157/171) — vivid green as 12px text, no `-text` companion exists for accent.
- **Root cause:** The vivid-token-as-text anti-pattern (the exact class the project's vivid-token guidance bans): `--color-accent` (oklch 0.6 0.17 160) was used for text where only `-text` companions are AA.
- **Fix:** Change the two `badgeColor` values at help/page.tsx:157 and :171 from `bg-accent/10 text-accent` to `bg-success/10 text-success-text`. success is the same green hue family (oklch 0.66 0.2 160 vs accent's 0.6 0.17 160), has a defined AA `-text` companion in both modes (globals.css:181/675), and preserves the intended blue/green badge alternation.
- **Why it fixes it:** All four sibling badges now use companion `-text` tokens for text (the convention the verifier cited), eliminating the AA failure while keeping the two-tone design.
- **Risks / interactions:** Phase 45 CONTENT-07 rewrites the "Manage your team and billing" card copy in the same array (line 167-172) — rebase on post-45 state; the badgeColor fields should survive but match by object, not line. Do not add a `--color-accent-text` token for one call site.
- **Files touched:** src/app/help/page.tsx

## MKTUI-22 — /pricing/complete renders chrome-less (no PageLayout)
- **Finding:** src/app/pricing/complete/page.tsx:19 (low) — CompleteClient renders bare (no navbar/footer/grid), unlike siblings /pricing/success and /pricing/cancel which wrap in PageLayout.
- **Root cause:** The page predates the PageLayout convention and kept its own legacy `min-h-screen` full-page wrapper instead of being migrated with its siblings.
- **Fix:**
  1. `src/app/pricing/complete/page.tsx`: wrap in PageLayout — `<PageLayout><Suspense fallback={…}><CompleteClient /></Suspense></PageLayout>` (import from `#components/layout/page-layout`).
  2. `src/app/pricing/complete/complete-client.tsx`: remove the legacy full-page wrappers — loading branch (line 89) `min-h-screen flex-center bg-linear-to-br from-background to-background` → `mx-auto max-w-2xl px-6 section-spacing lg:px-8 flex-center`; main branch (lines 104-106) collapse `min-h-screen bg-linear-to-br…` + `container mx-auto px-4 section-compact` + `max-w-2xl mx-auto` into one `mx-auto max-w-2xl px-6 section-spacing lg:px-8` wrapper (this also executes the MKTUI-13 `section-compact` removal).
- **Why it fixes it:** The page gets navbar/footer/grid + `page-offset-navbar` from PageLayout exactly like its verified siblings, and the container matches the family (`mx-auto max-w-2xl px-6 section-spacing lg:px-8`), removing the double-background and dead-class artifacts.
- **Risks / interactions:** Phase 44 PUBUX-10 edits complete-client.tsx (removes the merchant-only Stripe dashboard link) — rebase on post-44 state. Coordinate with MKTUI-13 (same wrapper line). Page is noindex and currently unreachable from live flows, so regression risk is minimal.
- **Files touched:** src/app/pricing/complete/page.tsx, src/app/pricing/complete/complete-client.tsx
- **Decision:** Wrap-and-conform (chosen: cheap, keeps a valid Stripe return_url target should the embedded-checkout flow ever point at it) vs. deleting the orphan route (verifier confirmed no live flow reaches it; success_url → /dashboard). If the owner prefers deletion, route it through Phase 51 HYG as dead-route removal instead — do not do both.

## MKTUI-23 — Resources hero "highlight" span de-emphasizes instead of highlighting
- **Finding:** src/app/resources/page.tsx:100 (low) — h1 wraps "landlords" in `text-foreground font-semibold` inside a `font-bold` heading — same color, LOWER weight, so the highlight reads faded; CTA h2 (lines 215-217) repeats the anti-pattern.
- **Root cause:** The `hero-highlight` utility (primary color + underline bar, globals.css:685-702) used by every other marketing hero was replaced here with a hand-rolled span that inverts emphasis.
- **Fix:** In `src/app/resources/page.tsx`: line 101 `<span className="text-foreground font-semibold">landlords</span>` → `<span className="hero-highlight">landlords</span>`; lines 215-217 `<span className="text-foreground font-semibold">Reach the team</span>` → `<span className="hero-highlight">Reach the team</span>`.
- **Why it fixes it:** Applies the exact utility the verifier confirmed on 8+ sibling heroes (including testimonials-section highlighting the same word "landlords"), restoring color+underline emphasis over the current weight-drop.
- **Risks / interactions:** Same file as MKTUI-13/24 and Phase 45's CONTENT-10 (line 32 copy) — one edit pass per file, rebase on post-45. `hero-highlight` is display:inline-block; verify line-wrap of "Reach the team" on narrow viewports.
- **Files touched:** src/app/resources/page.tsx

## MKTUI-24 — CTA button references undefined `gradient-background`
- **Finding:** src/app/resources/page.tsx:228 (low) — `gradient-background` exists in no CSS file, so the class is dead and `hover:opacity-90` is a stray leftover on the Button default background.
- **Root cause:** Dead-class family (MKTUI-13/15/18): a gradient utility was referenced but never defined; the Button silently falls back to `bg-primary`.
- **Fix (part of the dead-class sweep):** Remove both dead classes from line 228: `className="gradient-background hover:opacity-90 shadow-2xl shadow-primary/25 typography-large px-8 py-4"` → `className="shadow-2xl shadow-primary/25 typography-large px-8 py-4"`. Do not define a gradient utility — no other marketing CTA uses one (the landing hero CTA is default `bg-primary` + shadow), so the defined-output already matches the design system; the fix makes intent match output.
- **Why it fixes it:** Styling intent and rendered output now agree (the verifier's stated resolution criterion); the stray hover:opacity-90 (which dimmed a solid primary button inconsistently with sibling CTAs) goes with it.
- **Risks / interactions:** None beyond same-file coordination with MKTUI-13/23. Zero visual change except the hover no longer dims.
- **Files touched:** src/app/resources/page.tsx

## MKTUI-25 — Inline `style` attributes in marketing components (zero-tolerance rule 5)
- **Finding:** src/components/landing/feature-backgrounds.tsx:24 (low) — dead `style={{ animationDelay }}` on a non-animated `card-standard` div; line 249 inline `style={{ height: \`${height}%\` }}` for fake chart bars. Siblings: sections/hero-dashboard-mockup.tsx:107-110 (height + animationDelay), app/pricing/pricing-content.tsx:70 (animationDelay on a non-animated Card).
- **Root cause:** Two sub-classes: (a) `animationDelay` props copied from animated components onto elements with no animation — dead styles; (b) chart-bar heights driven by static numeric arrays passed as inline styles when the values are compile-time constants expressible as classes.
- **Fix (one class-wide sweep):**
  1. Delete the dead `animationDelay` styles: feature-backgrounds.tsx:24 (whole `style` prop), hero-dashboard-mockup.tsx:109 (the `animationDelay` key), pricing-content.tsx:70 (whole `style` prop). `card-standard` (globals.css:1437) and Card variant `stat` have no animation — the props are provably no-ops.
  2. Convert static bar heights to arbitrary-value classes: change the literal arrays to class strings — feature-backgrounds.tsx:244 `[45, 52, …]` → `["h-[45%]", "h-[52%]", …]` rendered as `className={cn("bg-primary/70 rounded-sm flex-1 transition-all duration-300", h)}`; hero-dashboard-mockup.tsx:99 `[35, 45, …]` → same pattern (keeping the `i === 11` bg conditional). Literal class strings are statically scannable by Tailwind v4 (template-interpolated ones are not — hence changing the array contents, not wrapping the numbers).
  Note: animated-trend-indicator.tsx:78, blog-empty-state.tsx:42, property-card-skeleton.tsx:96 also carry inline animationDelay but are app/dashboard surfaces with REAL animations — out of MKTUI scope; flagged to Phase 51 HYG for the CSS-var treatment.
- **Why it fixes it:** Removes every cited inline `style` (rule 5) — the dead ones by deletion (the verifier proved them no-ops), the live heights by moving compile-time constants into scannable utility classes.
- **Risks / interactions:** Phase 47 A11Y-12/22 edit the same two mockup files (vivid text tokens) — 46 lands first, trivial rebase for 47. Pixel-verify the two fake charts render identical bar heights after conversion (class list must enumerate every distinct height).
- **Files touched:** src/components/landing/feature-backgrounds.tsx, src/components/sections/hero-dashboard-mockup.tsx, src/app/pricing/pricing-content.tsx

## MKTUI-26 — Three homepage sections use `container px-4` instead of the standard container
- **Finding:** src/components/sections/features-section.tsx:66 (low) — FeaturesSectionDemo (`container px-(--spacing-4) mx-auto`), StatsShowcase (stats-showcase.tsx:53) and PremiumCta (premium-cta.tsx:20) use Tailwind's default `container` (up to 1536px, 16px gutters) while sibling homepage sections use `max-w-7xl mx-auto px-6 lg:px-8` (1280px, 24/32px gutters) — alternating sections are ~256px wider with narrower mobile gutters.
- **Root cause:** Three sections were authored with the stock Tailwind `container` idiom instead of the CLAUDE.md marketing container convention; no `@utility container` override exists to reconcile them.
- **Fix (class-wide):** Replace the container div class in all three files with the documented convention: features-section.tsx:66 `container px-(--spacing-4) mx-auto relative z-10` → `max-w-7xl mx-auto px-6 lg:px-8 relative z-10`; stats-showcase.tsx:53 and premium-cta.tsx:20 `container px-4 mx-auto relative z-10` → same. Post-fix gate: grep `\bcontainer\b` under src/components/sections/ + src/app/ marketing routes returns no stock-container usages on marketing surfaces (blog breadcrumb containers at max-w-6xl keep their explicit `container mx-auto max-w-6xl` — their `max-w-6xl` already caps them below container's 2xl step, and they're the blog family's own consistent pattern; leave them).
- **Why it fixes it:** All homepage sections align to the same 1280px rail with 24/32px gutters — the exact convention violation the verifier measured (~256px width delta, 24→16px mobile gutters).
- **Risks / interactions:** premium-cta.tsx is also edited by MKTUI-19 — one edit pass. Content inside these sections is centered/max-width-capped internally (max-w-5xl/3xl inner wrappers), so narrowing the rail is low-risk; verify the features bento grid at 1280px doesn't wrap awkwardly.
- **Files touched:** src/components/sections/features-section.tsx, src/components/sections/stats-showcase.tsx, src/components/sections/premium-cta.tsx

## Cross-cutting notes

**Class-wide fix groups (plan as single tasks, not per-finding):**
1. **Dead-class sweep** — MKTUI-05, -11, -13, -15, -18, -19, -24 are ONE bug class: classes referenced in TSX that no `@utility`/`@theme` rule generates (Tailwind v4 fails silently). Two missing utilities get DEFINED in globals.css (`text-responsive-display-xl`, `inline-flex-center` — they complete existing utility families with multiple call sites); the rest get SWAPPED to defined utilities (`section-spacing`, explicit type scales) or deleted (`gradient-background`). Close the sweep with a repo gate: extract all `className` string literals under marketing surfaces and grep them against `@utility`/`@theme`-generated names — zero unknown classes (candidate one-shot script; also catches any sibling this audit missed). Recommend the executor run this gate BEFORE starting to enumerate any additional dead classes and fix them in the same task.
2. **Raw-palette → semantic-token sweep** — MKTUI-06, -14, -21 (plus the -21-adjacent rule: vivid tokens for icons/dots only, `-text` companions for text). One mapping table (see MKTUI-14) applied across compare-sections + three resource surfaces + help badges. Gate: grep `(bg|text|border)-(green|red|amber|orange|blue|purple|rose|teal|gray)-\d` over src/app/{compare,resources,help} and src/components/sections returns nothing.
3. **Inline-style sweep** — MKTUI-25 covers all marketing inline styles; dead `animationDelay` props deleted, static chart heights become arbitrary-value classes.
4. **Container-convention sweep** — MKTUI-01, -26 (and -22's wrapper) all converge on `max-w-* mx-auto px-6 lg:px-8` (+ `section-spacing` for vertical rhythm).

**Phase-dependency map (execute on post-44/post-45 tree; expect line drift):**
- Phase 44 PUBUX first touches: pricing-card-standard.tsx (PUBUX-06 vs MKTUI-04), sections/hero-section.tsx (PUBUX-07 vs MKTUI-05/18 — different lines), complete-client.tsx (PUBUX-10 vs MKTUI-22), blog/page.tsx (PUBUX-03 fixes the MKTUI-16 sibling chips — verify, don't double-fix), help/page.tsx (PUBUX-04).
- Phase 45 CONTENT first touches: config/pricing.ts + pricing-comparison-table.tsx (CONTENT-01/02/03/14/18/19 vs MKTUI-17 — match rows by name, not line), help/page.tsx (CONTENT-07 badge-array copy, CONTENT-23 = the MKTUI-10 alt text — MKTUI-10's image removal supersedes), resources/page.tsx (CONTENT-10), security-deposit-reference-card/page.tsx (CONTENT-24), pricing-content.tsx (CONTENT-08/09).
- Phase 47 A11Y after 46: MKTUI-08's deletion of src/app/faq/faq-accordion.tsx makes A11Y-30 moot (its file is gone); A11Y-34 on the surviving components copy covers both surfaces. A11Y-12/22 rebase trivially on MKTUI-25's edits to feature-backgrounds/hero-dashboard-mockup. Also hand Phase 47 the unpaired `hover:bg-accent` dashboard siblings noted in MKTUI-07 (expiring-leases-widget.tsx:125, document-row.tsx:58, data-table-column-header.tsx:75, multi-select-chips.tsx:108).
- Phase 51 HYG: candidate follow-ups — delete /pricing/complete if the owner prefers removal over the MKTUI-22 wrap (Decision there), CSS-var treatment for the real (animated) inline animationDelay usages outside marketing, and the broader Unsplash-hero replacement decision from MKTUI-10.

**Owner inputs required before execution:** MKTUI-02 governing-law/arbitration state (blocking for that requirement only); MKTUI-22 keep-vs-delete preference (default: keep + wrap).

**Shared helpers:** no new TS helpers needed; the only additions are the two globals.css `@utility` definitions. `categoryLabel` (existing) gains one consumer (BlogCard). No DB/migration/type changes anywhere in this phase — all 26 fixes are presentation-layer; the integer-dollars vs numeric(10,2) money question does not arise in MKTUI (no money math is touched; pricing displays are static config dollars).

**Test impact:** pricing-card-standard.test.tsx must drop the `variant` prop (5 renders) and should gain a Max-self-serve checkout pin (MKTUI-04). No other finding has unit-test coverage today; the phase's verify pass is visual (light+dark) + `bun run validate:quick`.
