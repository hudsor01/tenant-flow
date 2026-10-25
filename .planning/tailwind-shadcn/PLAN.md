# Tailwind v4 + shadcn/ui Remediation: Plan and Tracker

| | |
|---|---|
| **Status** | Research complete 2026-10-25 · **Imported into GSD as Phase 66.2 (INSERTED)** on 2026-10-25, requirements UIC-01..08 · Next: `/gsd-discuss-phase 66.2`, then `/gsd-plan-phase 66.2` |
| **Branch** | `gsd/phase-66.2-tailwind-v4-and-shadcn-ui-canonical-remediation`, checked out in the worktree `/Users/richard/Developer/tenant-flow-tw-shadcn`, so the main checkout stays on `main` for other sessions |
| **Baseline** | `main` @ `754c91802`. `src/` is identical to `fc8f828eb`, where research began; only deps moved since. Versions: tailwindcss / @tailwindcss/postcss 4.3.3, @tailwindcss/typography 0.5.20, tw-animate-css 1.4.0, tailwind-merge 3.7.0, radix-ui 1.8.1, lucide-react 1.60.0, recharts 3.10.1 (lockfile). Local `node_modules` predates the lockfile (radix-ui 1.4.3, tailwind-merge 3.6.0), so run `bun install` first. B7 was re-verified on tailwind-merge 3.7.0. |
| **Delivery** | **One branch, ONE PR** (owner decision, 2026-10-25), through the perfect-PR gate on the frozen final state. Each "Phase N" in this document is an ordered **wave inside GSD Phase 66.2**. GSD's planner turns the waves into executable `66.2-NN-PLAN.md` files. Each wave's exit metrics must hold before the next wave starts |
| **Re-measure** | `node .planning/tailwind-shadcn/audit/audit.mjs` and `node .planning/tailwind-shadcn/audit/render-check.mjs <label>` (read-only; output goes to `$TMPDIR/tenantflow-tw-audit`) |

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done (add the PR number) · `[-]` dropped (say why)

---

## 1. The dashboard sidebar question

**The owner dashboard does not use the shadcn/ui Sidebar today. It did from 2025-09-26 to 2025-12-30.** _(Corrected 2026-10-25; an earlier draft wrongly said "never".)_

- **2025-09-26:** shadcn's "Dashboard 01" block was adopted (`240199804`, `7a6a187b8`). `apps/frontend/src/app/(owner)/owner-dashboard-layout.tsx` rendered `SidebarProvider` + `components/dashboard/app-sidebar.tsx` on top of the canonical `components/ui/sidebar.tsx` (719 lines). A run of sidebar fixes followed (`61c6e7766`, `4536168ab`, `042289d83`).
- **2025-12-30, PR #474** (`775c72f1c`, titled "Fix/remove pink chart color"). It:
  - deleted `ui/sidebar.tsx`, `dashboard/app-sidebar.tsx` and `dashboard/tenant-sidebar.tsx`;
  - split the shadcn sidebar into `ui/sidebar/{context,sidebar,sidebar-group,sidebar-layout,sidebar-menu}.tsx`;
  - introduced the hand-rolled `components/shell/app-shell.tsx`, which the owner layout has used ever since.
- The sidebar you see today is `AppShellSidebar` (`src/components/shell/app-shell-sidebar.tsx`), a hand-rolled `<aside>`. It is a fixed `w-56` panel that becomes a translate-x drawer below `lg`. `AppShell` (`src/components/shell/app-shell.tsx`) owns the overlay, the Escape handling and a hand-written focus trap.
- The split shadcn files were never imported again. Four of them were deleted as fallow-confirmed dead code in `1ecfeffac` (2026-06-14).
- Why #474 switched, and whether the hand-rolled version can do anything shadcn's can't, is §1a.
- Two remnants survive and are imported only by their own tests: `src/components/ui/sidebar/context.tsx` and `src/components/ui/server-sidebar-provider.tsx`. The stock shadcn **zinc** `--sidebar-*` HSL variables also remain, in an `@theme inline` block at the end of `globals.css`. That block overrides the brand-based `--color-sidebar-*` mapping earlier in the file, so any real shadcn Sidebar would currently render off-brand.
- Phase 6 migrates the shell to the canonical shadcn Sidebar, as you asked.

---

## 2. Baseline metrics (the progress scoreboard)

Every phase's exit criteria are rows here. Update the "Now" column at the end of each phase.

| # | Metric (source) | Baseline | Target | Now |
|---|---|---|---|---|
| M1 | Files Tailwind scans (`audit.scannedFiles`) | 1,552 (whole repo: migrations, workflows, memory/) | ~914 (`src/` only) | 1,552 |
| M2 | Explicit `@source` globs matching 0 files | 1 (`"..*.{ts,tsx}"`) | 0 | 1 |
| M3 | Invalid `oklch()` literals | 1 (`--color-secondary`, chroma 3.51) | 0 | 1 |
| M4 | Non-inline `@theme` vars that reference other vars | 11 (3 fonts, 8 sidebar) | 0 | 11 |
| M5 | `@utility` names shadowing core utilities | 2 (`text-muted`, `text-caption`) | 0 | 2 |
| M6 | Light-only color tokens in use | 14 | 0, except explicitly mode-independent ones (white, black, charts) | 14 |
| M7 | `cn()` drops a custom font size next to a color | 12 sizes | 0 | 12 |
| M8 | Dead theme vars / custom props / `@utility` / keyframes / class selectors (`globals.css`) | 55 / 47 / 90 of 133 / 1 / 20 | 0 / 0 / 0 / 0 / 0 | same |
| M9 | `dashboard.css` dead classes / vars nothing defines | 33 of 39 / 4 | file removed | 33 / 4 |
| M10 | Non-canonical classes (Tailwind `canonicalizeCandidates`) | 146 classes in 68 files (53 first-party, 15 `ui/`) | 0 first-party; `ui/` tracks upstream | 146 |
| R1 | Light `bg-secondary` pixel (render-check) | **rgb(255, 0, 255)**, magenta | brand pale blue | magenta |
| R2 | `.font-mono` resolves to (render-check; live site) | **Roboto** | Geist Mono | Roboto |
| R3 | `<html>` font-family / `global-error` page font | **Times** / **Times** | Roboto stack | Times |
| R4 | Worst dark-mode text contrast (render-check) | **1.01:1** (Renew Lease), **1.12:1** (prose) | ≥ 4.5:1 text, ≥ 3:1 icons | 1.01 |
| R5 | Switch on a 390px viewport (live `/pricing`, `/signup`) | 44×44 grey donut | 32×18.4 toggle (same as desktop) | donut |

---

## 3. Research method and canonical sources

**Method.** Every finding below was measured, not inferred from reading code:
- **Tailwind's own engine.** `@tailwindcss/node` compiles the real `globals.css`. `@tailwindcss/oxide` scans with exactly the source rules `@tailwindcss/postcss` uses. Tailwind's built-in `designSystem.canonicalizeCandidates()` (4.3.3) flags non-canonical classes. `candidatesToCss()` detects `@utility` names that collide with core utilities.
- **Headless Chromium 151 (Playwright).** Resolved fonts, rendered pixels and WCAG contrast against the compiled CSS, plus read-only checks of the live site (`tenantflow.app` `/help`, `/faq`, `/pricing`, `/signup`, `/login`, `/contact`) at desktop and 390px.
- **tailwind-merge 3.7.0** called directly for every custom theme key.

**Sources.** Fetched 2026-10-25; quote these in PR descriptions.
- Tailwind **Theme variables**: https://tailwindcss.com/docs/theme
  - "When defining theme variables that reference other variables, use the `inline` option". The page's example is `@theme inline { --font-sans: var(--font-inter); }`, plus the warning that `var()` "is resolved where `--font-sans` is defined".
  - A project `@theme` **extends** the defaults. Only `--color-*: initial` or `--*: initial` clears a namespace.
  - The page includes the namespace table. `--z-index-*`, `--width-*`, `--max-width-*` and `--duration-*` are not documented namespaces.
  - "By default only used CSS variables will be generated".
- Tailwind **Upgrade guide**: https://tailwindcss.com/docs/upgrade-guide
  - Removed v3 utilities: `flex-shrink-*` → `shrink-*` and similar.
  - `!flex` → `flex!`: "the old way is still supported for compatibility but is deprecated".
  - Variables in arbitrary values: `bg-[--x]` → `bg-(--x)`.
  - `bg-linear-to-*` appears in the guide's code samples.
- Tailwind **Detecting classes**: https://tailwindcss.com/docs/detecting-classes-in-source-files
  - The scan starts from the current working directory.
  - `@import "tailwindcss" source("../src")`, `@source not`, `source(none)`.
  - "Don't construct class names dynamically".
- Tailwind **Dark mode**: https://tailwindcss.com/docs/dark-mode. The canonical class toggle is `@custom-variant dark (&:where(.dark, .dark *));`, which is what we have.
- Tailwind **Adding custom styles**: https://tailwindcss.com/docs/adding-custom-styles
  - `@utility` (simple and functional, `--value()`/`--modifier()`).
  - `@layer components` is the place for component classes "that you'd still like to be able to override with utility classes".
- **Next.js 16 font docs** (the repo's own copy): `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`.
  - §"With Tailwind CSS": the `variable: '--font-inter'` font is applied to `<html>`/`<body>`, then `@theme inline { --font-sans: var(--font-inter); --font-mono: var(--font-roboto-mono); }`.
  - §"Using a font definitions file": "if you need to use the same font in multiple places, you should load it in one place and import the related font object where you need it".
- shadcn/ui **Tailwind v4**: https://ui.shadcn.com/docs/tailwind-v4
  - `@theme inline`, `data-slot` on every primitive, forwardRef removed.
  - "We're deprecating the `toast` component in favor of `sonner`".
  - `tw-animate-css`, oklch, new-york as the default style.
- shadcn/ui **Theming**: https://ui.shadcn.com/docs/theming
  - Semantic background/foreground pairs.
  - "To add a new token, define it under `:root` and `.dark`, then expose it to Tailwind with `@theme inline`".
  - The scaffold keeps `:root`/`.dark` outside `@layer base`.
- **tailwind-merge** configuration (v3): https://github.com/dcastil/tailwind-merge/blob/main/packages/tailwind-merge/docs/configuration.md §Theme.
  - "If you modified one of the theme namespaces … you need to add the variable names to the `theme` object". The example is `extend: { theme: { text: ['huge'] } }`.
  - Custom colors need no config.
  - `@tailwind-merge/next` and `@tailwind-merge/vite`, which auto-derive the config, exist only as `0.0.0-dev` builds, so we don't use them.
- **@tailwindcss/typography**: dark mode is `dark:prose-invert`.

---

## 4. Findings register

Severity: **P0** visible to every visitor today · **P1** visible in a specific mode or flow · **P2** latent correctness or architecture · **P3** dead, misleading or deprecated.

### 4.1 Bugs

| ID | Sev | Finding (evidence) | Fix | Phase |
|---|---|---|---|---|
| B1 | **P0** | `--color-secondary` (light) is `oklch(95.46% 3.51 246.58)` (`globals.css:166`). Chroma 3.51 is ~10× past any display gamut; it was introduced in `3ede630bb` (#471, 2025-12-27). Chromium paints it **rgb(255, 0, 255)**. It's live in light mode, the default theme: the `/help` CTA "Start free — no card" is solid magenta. It also affects every `variant="secondary"` Button, Badge and Progress (17 call sites in 13 files) and Sheet's open-state close button. | Restore the dropped digits: `oklch(0.9546 0.0351 246.58)`, which renders rgb(222, 243, 255). | 1 |
| B2 | **P0** | `globals.css:1536` is an **unlayered** `@media (max-width: 768px)` block. It forces `min-height`/`min-width: 2.75rem` **and** `padding: var(--touch-target-padding)` on every `button`, `[role="button"]`, `input`, `select` and `textarea`. Unlayered CSS outranks every Tailwind layer, so no utility can override it. Radix renders Switch, Checkbox, Radio and Tab as `<button>`. Live at 390px, the `/pricing` billing switch and the `/signup` switch render as a **44×44 grey donut**; at 1280px they're 32×18.4. E-22 in `tests/e2e/tests/owner/applications.spec.ts` documents the same block clipping tab labels. | Move the touch-target rule into `@layer base`. Use zero-specificity `:where(…)` and exclude `[role=switch\|checkbox\|radio\|tab\|slider]`. Drop the global `padding` override, since padding belongs to the component; `Button` already carries `min-h-11`. Delete the dead `.btn`, `.form-input` and `.mobile-*` selectors in that block. | 1 |
| B3 | P1 | **Fonts.** `@theme` (non-inline) defines `--font-sans: var(--font-sans), …` and `--font-display: var(--font-display), …`, both self-references, and `--font-mono: var(--font-geist-mono), …`. The next/font variable classes sit on `<body>`, but `:root` resolves the theme vars on `<html>`. Measured results (`.font-mono` also confirmed live): **`.font-mono` → Roboto** (Geist Mono is downloaded and never rendered, across 15 uses plus `typography-inline-code`); **`<html>` → Times**; `<code>`/`<pre>` → a hard-coded system mono stack in `@layer base`; `src/app/global-error.tsx` renders its own `<html>` with **no** font variables, so the error page falls back to Times. | Follow the Next.js + Tailwind docs. Name the variables `--font-roboto` and `--font-playfair` (Geist keeps `--font-geist-mono`). Declare the three fonts once in a new `src/lib/fonts.ts`, a module that defines them; it is not a re-export barrel. Apply `${…variable}` on `<html>` in both `layout.tsx` and `global-error.tsx`. Then `@theme inline { --font-sans: var(--font-roboto), system-ui, …; --font-display: var(--font-playfair), Georgia, serif; --font-mono: var(--font-geist-mono), ui-monospace, … }`. Delete the base `code`/`pre` font-family overrides (preflight's `--default-mono-font-family` takes over) and the dead `--font-family`. | 1 |
| B4 | P1 | **The light-only "label/fill/separator" token family.** It is black-alpha (`oklch(0 0 0 / 85%)` and similar) with no dark value. The Renew Lease dialog (`leases/dialogs/renew-lease-form-fields.tsx`) measures 1.03:1, 1.01:1 and 1.01:1 for heading, body and icons in **dark mode**, which is invisible. In light mode body and icons are 3.73:1 and 2.35:1, which **fails AA**. Other consumers: `ui/loading-spinner.tsx` (default and muted variants), `auth/password-strength.tsx`, `ui/grid-pattern.tsx`, and the inline-style spinner in `properties/units/components/unit-actions.tsx:195`. | Replace the family with shadcn semantic tokens: `label-primary`→`foreground`; `label-secondary`/`label-tertiary`→`muted-foreground`; `fill-*`→`muted`; `separator`→`border`; GridPattern's `color-mix` uses `--color-foreground`. Then delete all 12 `--color-label-*`, `--color-fill-*` and `--color-separator` tokens. | 1 |
| B5 | P1 | **Prose in dark mode.** These measure **1.12–1.93:1**: the lease template preview (`leases/template/preview-panel.tsx`, owner app; `prose` on `bg-background` with no invert) and the admin blog review (`(admin)/admin/blog/blog-review-client.tsx`; headings, bold and links). | Add `dark:prose-invert`, the typography plugin's documented dark-mode switch. | 1 |
| B6 | P2 | `BorderBeam` gets `colorFrom="hsl(var(--primary))"` in `tenants/tenant-stats.tsx:33-34` and `tenants/tenant-grid.tsx:54`. `--primary` is defined nowhere, and `hsl()` cannot wrap an oklch value. The gradient is invalid when computed, so the beam never renders. | Use `var(--color-primary)` and `color-mix(in oklab, var(--color-primary) 30%, transparent)`, or omit the props; the component's own default already uses the token. | 1 |
| B7 | P2 | **tailwind-merge does not know the custom theme.** `cn("text-caption", "text-primary")` → `"text-primary"`, so the size is dropped. The same happens to all 12 live custom sizes (`text-display*`, `text-title-1..4`, `text-stat*`, `text-caption`). `leading-display`, `duration-{instant,fast,normal,slow}` and the custom spacing keys never merge either (both classes are kept). | Use `extendTailwindMerge` in `src/lib/utils.ts`: `theme.text`, `theme.leading` and `theme.spacing` with the live custom keys, and `classGroups.duration` with the custom duration names. A guard test derives the key list from `globals.css`, so the config cannot drift. | 1 |
| B8 | P2 | `@utility text-caption` (`globals.css:1252`) shadows the theme font-size utility and **bakes in** `color: muted-foreground`. So `text-caption/75` and `text-caption/60` (`auth/google-button.tsx:75,93`) set **line-height 18.75rem and 15rem**, because in v4 `/N` on a font size is a line height. This is latent today, since `showTrustIndicators` is never passed. | Delete the `@utility`. Write `text-caption text-muted-foreground` at the 18 call sites, none of which set another text color. Write `text-caption text-muted-foreground/75` and `/60` in google-button. | 1 |
| B9 | P2 | **Source detection.** `@source "..*.{ts,tsx}"` (`globals.css:5`) matches **0 files**, and auto-detection scans **1,552** files, including `supabase/migrations`, `.github/workflows` and `memory/`. That produced junk utilities (`invert`, `table-column`) and an earlier `.planning` breakage. Restricting the scan to `src/` drops only those two junk classes. | `@import "tailwindcss" source("..");` (relative to `src/app/`, so it covers `src/`). Delete the bogus `@source` and the now-redundant `.planning`/README exclusions. Keep `@source not "../**/*.test.{ts,tsx}"`. | 2 |
| B10 | P2 | **`dashboard.css`** is compiled separately through `@reference "../globals.css"`. Its six live rules use `var(--spacing-4/6/8)`, `--shadow-sm/md`, `--duration-300` and `--radius-xl`. They work only because the `globals.css` build **happens** to emit those variables. Removing the duplicated `--spacing-N` definitions (Phase 2) would silently collapse dashboard spacing. 33 of its 39 classes are dead, and 4 referenced variables are defined nowhere. | Move the six live rules into `globals.css` `@layer components`, using `--spacing(n)` and theme vars from the single build, or convert them to utilities at the call sites. Delete `dashboard.css` and its import in `(owner)/dashboard/page.tsx`. | 2 |
| B11 | P2 | **Sidebar tokens.** Stock shadcn zinc `--sidebar-*` (HSL) plus `@theme inline` (`globals.css:1755-1786`) override the brand mapping at `globals.css:193-200`. Today the only consumer is the dead `SidebarProvider` wrapper. | Phase 2 deletes the dead brand block. Phase 6 replaces the zinc block with brand-derived `--sidebar-*` values in the canonical structure. | 2, 6 |

### 4.2 Misleading code

| ID | Finding | Fix | Phase |
|---|---|---|---|
| X1 | **Tautological tests.** `src/app/__tests__/globals.test.tsx` asserts CSS variables that `src/test/unit-setup.ts` injects into jsdom as a hard-coded copy (`mockCSSVariables`). `src/test/__tests__/design-tokens.test.ts` mocks `getComputedStyle` and expects `--font-sans` to contain **`--font-spline`**, a font that doesn't exist. Neither can fail when `globals.css` changes. | Delete both, plus the `mockCSSVariables` injection, after confirming no other test needs it. Replace them with the real guards in §6. | 1 |
| X2 | **False comments in `globals.css`.** L124 says "the explicit @theme block replaces the default theme entirely" (wrong: `@theme` extends). L82 and L89 label sizes "backwards compatibility" and "Legacy" (they are default duplicates or dead). L296 says "Only define weights available in **Spline Sans**". L1323 calls titles "**Geist Sans**" (they're Roboto). L17 says Geist Mono is used "for code" (it never rendered; see B3). | Correct or delete each comment. | 2 |
| X3 | **Re-definitions of Tailwind defaults with identical values.** `--color-white`/`--color-black`, `--color-slate-*`, `--text-xs…6xl`, `--spacing-0…96` (with `--spacing: 0.25rem` the scale is automatic), `--font-weight-*` in `:root`, `--leading-none`, `--ease-in/out/in-out/linear`, and `--max-width-2xl/3xl` (which duplicate `--container-*`). `--width-full` makes `w-full` emit **two** `width` declarations. | Delete them, **after** B10 and **after** rewriting every `var(--spacing-N)`/`var(--duration-N)` reference (guard G7 enforces this). Values the brand changed stay: leading, tracking, radius, shadows, `--radius`. | 2 |
| X4 | The dark override selector `:where(.dark, .dark *)` (`globals.css:652`) re-declares about 35 tokens on **every element** in dark mode. Inheritance from `.dark` on `<html>` already does this. | Becomes a plain `.dark` in the Phase 3 restructure. | 3 |
| X5 | Comments in tests and e2e specs cite `globals.css:504`, `:517-524` and `:1536` by line number. Those lines move in every phase. | Cite the rule by selector instead. Applies to `base-rule-cascade.ts`, `responsive-font-size-cascade.ts`, `applications.spec.ts`, `apply-token.spec.ts` and `playwright.config.ts`. | 2 |
| X6 | `src/test/utils/responsive-font-size-cascade.ts` reads `--text-*` with a regex over `globals.css`. Once X3 removes the duplicated default sizes, that read breaks. | Resolve sizes through `@tailwindcss/node`'s design system (default plus project theme), not a regex over the file. | 2 |

### 4.3 Dead code

Counts come from `audit.mjs`; the full name lists are in Appendix A. Removing a dead `@utility` or an unused theme var changes **no** compiled rule for any used class. Prove it per PR with the `candidate-css.json` parity diff (§7). Plain class selectors and `:root` custom properties **are** emitted today, so their removal shows up only as deleted rules.

- `globals.css`: 55 theme vars, 47 custom properties, 90 of 133 `@utility`, 1 `@keyframes`, 20 class selectors.
- `dashboard.css`: 33 of 39 classes (see B10).
- shadcn remnants: `ui/sidebar/context.tsx` and `ui/server-sidebar-provider.tsx`, plus their tests. **Do not delete them in Phase 2**; Phase 6 replaces them with the canonical `sidebar.tsx`.

### 4.4 Deprecations / non-canonical classes (146 classes in 68 files)

| Category | Classes | Files | Canonical form |
|---|---|---|---|
| Variables in arbitrary values | 51 | 10 | `bg-(--x)`; or the token utility when one exists: `bg-[var(--color-chart-2)]`→`bg-chart-2`, `text-(--color-accent-main)`→`text-accent-main`, `mt-[var(--spacing-1)]`→`mt-1` |
| Arbitrary px/rem that equal a scale step | 27 | 38 | `h-[180px]`→`h-45`, `w-[130px]`→`w-32.5`, `rounded-[2px]`→`rounded-xs` (rem-based, so it follows the user's font size) |
| `[&>*]:` / `[&_x]:` arbitrary variants | 25 | 5 | `*:` / `**:` |
| Bracketed `data-`/`supports-`/`has-` variants | 20 | 8 | `data-[disabled]:`→`data-disabled:`, `supports-[backdrop-filter]:`→`supports-backdrop-filter:` |
| Legacy `!` important prefix | 5 | 5 | suffix `x!` |
| `bg-gradient-to-*` | 5 | 6 | `bg-linear-to-*` |
| `flex-shrink*` / `flex-grow*` (v3 names removed in v4) | 2 | 4 | `shrink*` / `grow*` |
| Other | 11 | 13 | `[grid-column:1/-1]`→`col-span-full`, `-translate-y-[50%]`→`translate-y-[-50%]`, `list-[disc]`→`list-disc`, `aspect-[16/10]`→`aspect-16/10`, `leading-[1.1]`→`leading-display`, `bg-primary/[0.03]`→`bg-primary/3`, `inset-[-2px]`→`-inset-0.5`, `z-[1]`→`z-1`, `[animation-duration:var(--x)]`→`animation-duration-(--x)` |

The 15 `src/components/ui/*` files are vendored registry code. They follow the upstream registry in Phase 5 and are **not** canonicalized independently.

### 4.5 shadcn/ui component audit

_Pending: being filled from the registry drift audit (new-york-v4 registry vs the 69 files in `src/components/ui/`)._

### 4.6 Known deviations: keep, documented (not defects)

- **Bare `rounded` = 8px.** `--radius: 0.5rem` sits in `@theme`, so `rounded` (61 uses) is 8px, not v4's default. This is part of the brand radius scale (sm 4 / md 8 / lg 12 / xl 16 / 2xl 24 px), which intentionally differs from shadcn's `calc(var(--radius) * n)` scale.
- **`button { cursor: pointer }`** in `@layer base`. shadcn v4 deliberately moved buttons back to the default cursor; we keep the pointer as a product choice.
- **`@custom-variant dark (&:where(.dark, .dark *))`** follows the Tailwind docs (zero specificity, and it matches the `.dark` element itself). shadcn's scaffold uses `(&:is(.dark *))`.

### 4.7 Deferred: needs your sign-off (each is a site-wide visual change)

| ID | Item | Recommendation |
|---|---|---|
| D-A | Roboto loads weights 300/400/500/700, so `font-semibold` (600, 197 uses) renders at 700 (already noted in CLAUDE.md). Next's font data lists Roboto as **variable** (`wght` 100–900). | Load Roboto as a variable font (one file, canonical next/font advice) and accept a true 600 for `font-semibold`. This lightens 197 elements, so review screenshots before merging. |
| D-B | Opinionated `@layer base` element rules: `p { margin-bottom }`, `ul, ol { margin; padding-left }`, `li { margin-bottom }`, global `a:not(…)` color and underline, and `[disabled] { opacity }`. They fight utilities, which caused the Phase 65/66 defects. | Remove them in a dedicated PR with a full-site screenshot diff. Out of scope here. |
| D-C | Typography uses Tailwind's gray `prose` palette, not brand tokens. | Optional brand prose theme (`--tw-prose-*` mapped to tokens) once B5 lands. |

---

### 4.8 Phase 1 fixes, pre-validated

B1, B2 and B3 were applied to a scratch **copy** of `globals.css` (the repo was untouched), compiled with 4.3.3 and measured in Chromium at a 390px viewport. The prototype is the exact CSS change Phase 1 makes.

| Probe (390px) | Today | With the fix |
|---|---|---|
| Switch (`h-[1.15rem] w-8`) | 44×44, padding 12px (the "donut") | **32×18.4, padding 0** |
| Button (`h-10 px-4 py-2 min-h-11`, secondary) | padding forced to 12px; bg `oklch(0.9546 3.51 …)` | **padding 8px 16px**, 44px tall; bg `oklch(0.9546 0.0351 …)` |
| Icon button (`size-8`) | 44×44, padding 12px | **44×44 touch target kept**, padding 0 |
| Input (`h-9 px-3 py-1`) | 44px, padding 12px | **44px**, padding 4px 12px |
| `<html>` / `.font-mono` / `<code>` / `.font-display` | Times / Roboto / system mono / Playfair | **Roboto / Geist Mono / Geist Mono / Playfair** |

Contrast with the B4 and B5 fixes applied (`render-check`'s method, WCAG ratio):

| Surface | Light today → fixed | Dark today → fixed |
|---|---|---|
| Renew Lease heading (`text-foreground` on `bg-muted`) | 11.69 → **15.16** | 1.03 → **15.46** |
| Renew Lease body/icon (`text-muted-foreground` on `bg-muted`) | 3.73 / 2.35 → **5.44** | 1.01 → **7.53** |
| Lease template preview, `dark:prose-invert` (h2/p/strong/a) | 16.98/9.86/16.98/16.98 (unchanged) | 1.12/1.93/1.12/1.12 → **19.87/13.5/19.87/19.87** |
| Admin blog review, `dark:prose-invert` (h2/p/strong/a) | unchanged | 1.12/17.74/1.12/1.12 → **19.87/17.74/19.87/19.87** |

The B2 rule as validated:

```css
@layer base {
	@media (width < 48rem) {
		:where(button:not([role="switch"], [role="checkbox"], [role="radio"], [role="tab"]), [role="button"]) {
			min-height: var(--touch-target-min);
			min-width: var(--touch-target-min);
		}
		:where(input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"], [type="hidden"]), select, textarea) {
			min-height: var(--touch-target-min);
		}
	}
}
```

---

## 5. Execution plan

### Phase 0: Prep
- [x] Branch off up-to-date `main` and run `bun install`. Done 2026-10-25: worktree on `origin/main` @ `754c91802`, `bun install --frozen-lockfile` (781 packages, lockfile versions).
- [ ] Capture baselines **on `main`**: `audit.mjs`, `render-check.mjs baseline`, and copy `$TMPDIR/tenantflow-tw-audit/*` to `…/baseline/`.
- [ ] Capture a screenshot matrix (light/dark × 390/1280): `/`, `/pricing`, `/help`, `/faq`, `/login`, `/signup`, `/contact`, one `/blog/<slug>`, `/privacy`. Owner surfaces get the same matrix via the `owner-axe` login, or under Phase 6.

### Phase 1 (wave 1): Visible bugs and permanent guards
- [ ] B1: fix `--color-secondary`.
- [ ] B2: relayer and scope the mobile touch-target rule. Re-measure the switch and checkbox on `/pricing` and `/signup` at 390px, and all inputs ≥ 44px (the E-2/E-3 48px inputs unchanged).
- [ ] B3: `src/lib/fonts.ts`, variables on `<html>` in `layout.tsx` and `global-error.tsx`, `@theme inline` fonts, drop the base `code`/`pre` font-family and `--font-family`. Update `THEME_NO_FLASH_SCRIPT_HASH` **only if** the `ThemeProvider` script changes (it shouldn't).
- [ ] B4: migrate the label/fill/separator consumers to semantic tokens and delete the family.
- [ ] B5: `dark:prose-invert` on the two prose surfaces.
- [ ] B6: fix the `BorderBeam` colors.
- [ ] B7: `extendTailwindMerge` config.
- [ ] B8: remove `@utility text-caption` (and the dead colliding `@utility text-muted`); update the 18 call sites and google-button.
- [ ] X1: delete the tautological tests and the jsdom mock injection.
- [ ] Guards G1–G6 (§6) land in this wave.
- **Exit:** R1–R5 at target; M3, M5, M7 = 0; M4 = 8 (sidebar only); M6 = 0 outside G4's allow-list (white, black, chart-1…5); every render-check contrast ≥ 4.5 (icons ≥ 3).

### Phase 2 (wave 2): Dead and misleading code, source scoping
- [ ] B9: `source("..")`, delete the bogus `@source` and redundant exclusions.
- [ ] B10: fold `dashboard.css`'s six live rules into `globals.css` and delete the file.
- [ ] Rewrite every `var(--spacing-N)` / `var(--duration-N)` / `var(--radius-*)` arbitrary reference to the scale utility **first** (G7 proves none dangle).
- [ ] Delete the Appendix A lists, X3 redundancies and the brand `--color-sidebar-*` block (B11). Keep the zinc block for Phase 6.
- [ ] X2 comments, X5 line-number citations, X6 cascade harness.
- [ ] G7 lands.
- **Exit:** M1 ≈ 914, M2 = 0, M8 all 0, M9 file gone. `candidate-css.json` diff vs baseline limited to deleted dead rules and B-fixes. Token snapshot diff vs Phase 1 is empty.

### Phase 3 (wave 3): Canonical shadcn token architecture
- [ ] Move every semantic color into shadcn form:
  - `:root { --background: …; --foreground: …; … }` and `.dark { … }`, outside `@layer base`, per the scaffold.
  - `@theme inline { --color-background: var(--background); … }`.
  - Status families (success/warning/info + `-foreground` + the `-text` AA companions) follow the theming doc's "add a new token" recipe.
- [ ] Charts become `--chart-1…5` in `:root` (and `.dark` if the palette changes). Keep the hsl conversions in the satori surfaces (`api/og`, `render-blog-cover.tsx`) in sync per CLAUDE.md.
- [ ] X4: `.dark` replaces `:where(.dark, .dark *)`.
- [ ] Confirm that every `var(--color-*)` reference in TSX still resolves. `@theme inline` still emits a variable referenced from source; this was verified with a 4.3.3 compile test.
- **Exit:** `render-check.mjs phase3` token snapshot **identical** to Phase 2's for all tokens, light and dark. Screenshot matrix unchanged.

### Phase 4 (wave 4): Canonical classes, first-party
- [ ] Re-run the canonicalizer **against the Phase 3 theme**, so suggestions like `gap-(--spacing-2)` no longer point at variables Phase 2 deleted. Apply it to the 53 first-party files.
- [ ] G8 lands with the vendored `ui/` registry files allow-listed.
- **Exit:** M10 first-party = 0. Screenshot matrix unchanged.

### Phase 5 (wave 5): shadcn component sync
- **Input:** `research/shadcn-component-audit.md`, a raw report covering 42 vendored files vs new-york-v4. It is **unverified**; only the input-otp missing-`data-slot` claim has been spot-checked.
- [ ] 66.2 research reproduces or refutes every claimed defect, sync hazard and inert class before the planner uses it. Watch especially the BlurFade claim (69 importers) and the chart gridline claim; the latter must be fixed without hex literals.
- [ ] Sync order and rules follow the report's §"Recommended sync order", restricted to verified claims.

### Phase 6 (wave 6): Owner sidebar on canonical shadcn Sidebar
- **Inputs:**
  - `research/sidebar-migration-design.md`, a raw design: decisions D1–D11, parity matrix, divergences V1–V12, cascade traps, tests.
  - The capability-comparison workflow (2026-10-25). So far 100 behaviors are inventoried and none is impossible with shadcn; the a11y group verification is still pending.
- **Locked decisions to preserve:** 56 D-07, 56 D-24, 65 D-08/D-09/D-10.
- [ ] Phase 6 Step 0 confirms the hand-rolled drawer's claimed defects with computed styles before the migration claims to fix them.

---

## 6. Permanent guards (new tests; Vitest unit project, node environment)

New file `src/app/__tests__/tailwind-theme-integrity.test.ts`. Compile the real CSS with `@tailwindcss/node`, never a regex copy of it.

| Guard | Asserts | Catches |
|---|---|---|
| G1 | Every `oklch()` in `globals.css` has L in [0,1] and C in [0,0.37] | B1 class |
| G2 | No non-`inline` `@theme` var contains `var(` | B3 / B11 class |
| G3 | No `@utility` name produces CSS when the custom utilities are removed (no shadowing) | B8 class |
| G4 | Every `--color-*` token has a dark value, or is listed in `MODE_INDEPENDENT_TOKENS` (white, black, chart-*) | B4 class |
| G5 | For every custom `--text-*`, `--leading-*`, `--spacing-*` and duration key: `cn(custom, standard)` keeps only the standard class, and `cn("text-<size>", "text-primary")` keeps both | B7 class |
| G6 | Every explicit `@source` glob matches at least one file | B9 class |
| G7 | Every `var(--<theme-namespace>-*)` referenced in `src/**/*.{ts,tsx,css}` resolves in the compiled theme (default + project). Namespaces: color, text, spacing, radius, shadow, font, leading, tracking, ease, transition-duration, duration. Runtime vars (`--radix-*`, `--tw-*`, next/font, chart-config `--color-<key>`) are allow-listed | B10 / X3 class; also the earlier `--duration-*` incident (#1024) |
| G8 | `canonicalizeCandidates` returns every first-party class unchanged (the `src/components/ui/` registry files are allow-listed) | §4.4 class |

---

## 7. Verification protocol (every wave, then the final PR)

1. `node .planning/tailwind-shadcn/audit/audit.mjs`: the wave's exit metrics.
2. **Rule parity.** `diff <(jq -S . baseline/candidate-css.json) <(jq -S . candidate-css.json)`. Every hunk must be an intended change, recorded in that wave's SUMMARY and listed in the PR body.
3. **Token parity.** `render-check.mjs <phase>`, then `diff` of `tokens-<prev>.json` vs `tokens-<phase>.json`. Phases 2–4 must be empty; Phase 1 may change only `secondary` and the deleted label/fill family.
4. `bun run validate:quick`, plus `SKIP_ENV_VALIDATION=true bun run build` (CI's `checks` builds the same way).
5. Screenshot matrix (Phase 0) diffed; owner flows through the `owner-axe` E2E project (CI).
6. Aikido full scan on changed first-party code (CLAUDE.md).
7. Perfect-PR gate: two consecutive zero-finding review cycles on the frozen final state.

---

## 8. Decisions log

| # | Decision | Why | Rejected |
|---|---|---|---|
| 1 | `--color-secondary` → `oklch(0.9546 0.0351 246.58)` | The digits "3.51" are 0.0351 missing "0.0". Lightness and hue stay as authored. | Re-pointing to `--color-muted` (changes the authored hue) |
| 2 | Font variables on `<html>`, declared once in `src/lib/fonts.ts` | Preflight resolves the default font on `<html>`, and `global-error.tsx` needs the same variables | `<body>` placement, which keeps `<html>` and the error page on Times |
| 3 | Replace the label/fill/separator family instead of adding dark values | It duplicates muted and border semantics and fails AA even in light mode | Adding `.dark` values, which keeps two parallel token systems |
| 4 | Adopt the shadcn `:root`/`.dark` + `@theme inline` structure | The shadcn CLI and registry `cssVars` write into that structure. The current hybrid is how stock zinc sidebar values ended up silently overriding the brand. | Keeping literal values in `@theme` |
| 5 | Keep Tailwind's `@custom-variant dark (&:where(.dark, .dark *))` | Documented by Tailwind; zero specificity | shadcn's `(&:is(.dark *))` |
| 6 | Vendored `ui/` files follow upstream; the canonical-class guard exempts them | Keeps future registry syncs diff-clean | Canonicalizing vendored code independently |
| 7 | Touch targets: relayer and scope the global rule now; component-owned sizing in Phase 5 | Fixes the live breakage with the smallest change; utilities regain control | Deleting the rule outright in Phase 1, which would shrink unsized icon buttons on mobile with no audit |
| 8 | twMerge via `extendTailwindMerge`, keys guarded by G5 | Documented tailwind-merge approach | `@tailwind-merge/next` (dev builds only); renaming tokens |
| 9 | One branch, one PR for all six waves (owner, 2026-10-25) | The owner wants everything gated together. The wave exit metrics keep each step independently provable inside the single PR. | One PR per wave |
| 10 | Run as GSD Phase 66.2 (decimal, INSERTED), not 74 | `phase.complete` on the highest integer would stamp v10.0 complete with 67-73 open (the 2026-08-04 renumber's root cause); 66.1 is the precedent | Integer 74; a GSD workstream, which in flat mode MOVES v10.0's ROADMAP/STATE/phases into `.planning/workstreams/` |
| 11 | Work in a sibling worktree | Other sessions share the main checkout; this follows the repo's existing worktree practice | Switching the main checkout's branch under another session |

---

## 9. Progress log

- **2026-10-25.** Research complete. Baseline recorded (§2). B1 and B2 confirmed live on production; B3's `.font-mono` confirmed live. Audit tooling committed under `.planning/tailwind-shadcn/audit/`.
- **2026-10-25.** Imported into GSD.
  - Phase 66.2 inserted (ROADMAP entry with goal, 8 success criteria and the carried constraints). Requirements UIC-01..08 added with traceability.
  - Import conflict report: 0 blockers, 4 warnings, all approved by the owner and carried as constraints.
  - Branch and worktree created.
  - `state.add-roadmap-evolution` corrupted the STATE.md frontmatter; STATE.md was restored and the entry hand-written, as STATE.md's own comment requires.

---

## Appendix A: dead code lists (`globals.css`, baseline)

**Theme vars (55):** `--text-stat-sm`, `--text-display-2xl`, `--text-display-xl`, `--text-display-md`, `--leading-loose`, `--tracking-tightest`, `--transition-duration-slower`, `--color-slate-50…950` (11), `--color-label-quaternary`, `--color-label-on-dark`, `--color-label-on-dark-secondary`, `--color-fill-quaternary`, `--color-fill-muted`, `--color-border-secondary`, `--color-accent-85`, `--color-sidebar-{foreground,primary,primary-foreground,accent,accent-foreground,border,ring}` (7, in `@theme`, plus the same 7 in `@theme inline`), `--spacing-35`, `--spacing-container-inline`, `--spacing-responsive-{xs,lg,xl}`, `--duration-75`, `--duration-150`, `--duration-medium`, `--ease-in`, `--ease-smooth`, `--ease-out-smooth`, `--ease-in-smooth`, `--ease-out-expo`, `--z-index-{toast,modal,modal-backdrop}`.

**Custom properties (47):** `--font-family`, `--icon-{xs,sm,md,lg,xl,2xl}`, `--glass-{material,border,shadow,blur}`, `--focus-ring-color`, `--scale-{hover,tap}`, `--translate-{hover-x,hover-y,slide-y}`, `--transition-{card,hover,color}`, `--transform-{lift,scale-hover}`, `--hover-border-color`, `--sidebar-transition`, `--feature-card-{hover-bg,icon-hover}`, `--navbar-btn-{hover-bg,hover-text}`, `--lightbox-nav-{bg,hover-bg}`, `--portal-feature-{hover,transition}`, `--layout-section-padding-y-hero`, `--layout-container-padding-x-{narrow,wide}`, `--layout-content-padding-{spacious,hero}`, `--layout-stack-{loose,default,tight}`, `--layout-grid-cols-{1,2,3,5}`, `--layout-navbar-height`, `.dark`'s `--color-border-secondary` and `--color-accent-85`.

**`@utility` (90):** status-{overdue,complete,error}, activity-payment, enter-{card,modal,page,sheet}, exit-modal, skeleton-{text,heading,button,card,pulse,stagger}, interactive-{lift,fade,scale,glow,item}, dashboard-widget-card, stat-card-professional, status-badge{,-success,-warning,-destructive}, icon-bg-{success,warning}, dashboard-stat-card, quick-action-button, view-toggle{,-button}, text-responsive-{display-lg,display,h2,h3,body}, touch-{friendly,card,button,interactive}, section-spacing-spacious, page-container, section-gap, mobile-{stack,container,section,dropdown-link}, grid-responsive-auto-fit, text-muted, typography-{hero,display-lg,display,display-sm,display-sans,display-sans-lg,p,lead,muted,caption,stat-lg,stat-xl,blockquote,list,inline-code,table-wrapper}, card-{elevated,bordered,glass}, content-{section,padded,compact}, gap-{standard,comfortable}, clickable-card, trust-indicator-badge, animate-{card-in,chart-bar,trend-up,trend-down,number,progress,metric,content}, hover-{smooth,lift-shadow}, icon-hover-scale, focus-{card,interactive}, skip-link.

**`@keyframes` (1):** `mobile-fade-in`.

**Class selectors (20):** `.dashboard-widget-card`, `.stat-card-professional`, `.dashboard-panel-{header,title,description,body}`, `.dashboard-stat-card`, `.quick-action-button`, `.view-toggle-button`, `.hover-lift`, `.hover-scale`, `.high-contrast`, `.mobile-{full-width,centered,padded,spaced,stack,nav-item}`, `.btn`, `.form-input`.
