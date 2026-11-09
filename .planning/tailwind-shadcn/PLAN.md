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

**The owner dashboard does not use the shadcn/ui Sidebar today. It did, on and off, between 2025-08-08 and 2025-12-28.** _(Corrected twice on 2026-10-25. The first draft said "never"; the second gave the dates as 2025-09-26 to 2025-12-30. The dates below are the ones the critic verified.)_

- **2025-06-20 `713fab089`:** the first commit already had a hand-rolled `components/layout/Sidebar.tsx`, with shadcn's `ui/sidebar.tsx` vendored but unused.
- **2025-08-08 `3b7eea36f`:** shadcn `SidebarProvider` + `<Sidebar collapsible="icon">` adopted.
- **2025-09-26:** the "Dashboard 01" rebuild (`5116750f3` … `61c6e7766`). The provider was first placed in a page, then moved into the layout after users got "trapped on dashboard sub-pages".
- **2025-10-24:**
  - `bf89522aa` removed `SidebarProvider` and flattened `AppSidebar` to a div.
  - `4536168ab` restored `SidebarProvider` + `SidebarInset`, but `AppSidebar` stayed a hand-rolled card stack.
- **2025-12-04 #443 `2dcc1024a`:** the canonical `<Sidebar collapsible="offcanvas">` came back. So the canonical `<Sidebar>` element was live 2025-08-08 → 2025-10-24 and 2025-12-04 → 2025-12-28.
- **2025-12-28 `debfbf6b9`, PR #474's branch:**
  - added a Design OS export (`product-plan/`);
  - swapped the owner layout's `ServerSidebarProvider` + `AppSidebar` for the hand-rolled `<AppShell>`;
  - deleted `dashboard/{app-sidebar,nav-main,site-header,tenant-sidebar}.tsx`.
- **2025-12-30 `448ab8eec`:**
  - split the 721-line `ui/sidebar.tsx` into five files, all under the project's 300-line limit;
  - renamed the shell files to kebab-case;
  - wired up `CommandDialog`.
- **2025-12-31:** squash-merged as `775c72f1c`, titled "Fix/remove pink chart color". The PR body never mentions the sidebar, and it had 0 reviews.
- **2026-03-06 `a1baf39cf`:** the hand-rolled drawer's Escape, Tab trap, `role=dialog`/`aria-modal` and focus return were retrofitted. This implemented the phase-07 locked decision "focus returns to trigger button on close".
- **2026-06-14 `1ecfeffac`:** four of the five split files were deleted as dead code.
- Today's sidebar is `AppShellSidebar` (`src/components/shell/app-shell-sidebar.tsx`), a hand-rolled `<aside>`. It is a fixed `w-56` panel that becomes a translate-x drawer below `lg`. `AppShell` owns the overlay, Escape, the focus trap and focus return.
- Two remnants survive and are imported only by their own tests: `src/components/ui/sidebar/context.tsx` and `src/components/ui/server-sidebar-provider.tsx`. The stock shadcn **zinc** `--sidebar-*` HSL variables also remain, in an `@theme inline` block at the end of `globals.css`. That block overrides the brand-based `--color-sidebar-*` mapping earlier in the file, so any real shadcn Sidebar would currently render off-brand.
- Phase 6 migrates the shell to the canonical shadcn Sidebar, as you asked.

### 1a. Can the hand-rolled sidebar do anything shadcn's can't? Was the hand-roll ever justified?

Answered by a 30-agent workflow on 2026-10-25 and checked by a critic. Full detail: `research/sidebar-capability-comparison.md` + `…-critique.md` (the critique wins where they disagree).

**1. Capability: no.** 100 hand-rolled behaviors were inventoried, assessed against the canonical new-york-v4 source, and checked by two adversarial verifiers each.

| Verdict | Count |
|---|---|
| Native | 14 |
| Composable from shipped parts | 48 |
| App logic, independent of the sidebar primitive | 33 |
| Needs small custom code | 5 |
| **Impossible** | **0** |

Real differences, and what parity costs:

| Difference | Parity |
|---|---|
| Breakpoint: hand-roll is CSS-only at 1024px; shadcn decides in JS at 768px, mixing px and rem | One constant in a new `use-mobile.ts` (rem query) plus `md:`→`lg:`; or the `collapsible="none"` + own-Sheet route |
| One always-mounted `<aside>`: the tour target and section state survive | Tour step 5 targets the trigger; lift the section state |
| No desktop collapse, Cmd/Ctrl+B or cookie (shadcn adds all three) | Adopted (D-34/D-52), and cheap to disable |
| Focus returns to the hamburger: Radix only refocuses a `Dialog.Trigger` | A small unmount-cleanup refocus (D-47) |
| Closes on navigation | `onClick` → `setOpenMobile(false)` (D-48) |
| Cmd+K guard selector | Exclude the nav sheet |
| Widths, scrim, timing, z-index | `className`/CSS overrides |
| Visible close X (shadcn hides it) | Re-add it (D-46) |
| Landmarks, `aria-current` | Pass them through |
| Base `ul`/`li`/`a` rules leak into shadcn's lists | Neutralizers (D-49) |
| Print | Irrelevant: no owner page prints |

The Radix Sheet also **fixes** defects the hand-roll has:
- no focus moves into the drawer;
- the background stays live and scrolls;
- 13 hidden tab stops while closed;
- one Escape closes two layers;
- stale `aria-modal` state after widening;
- an unnamed dialog;
- a Settings "menu" with no menu semantics.

**2. Justification: none recorded for the swap.**
- The only related comment is about provenance: `owner-dashboard-layout.tsx:8`, "Uses the design-os AppShell pattern".
- The shell is a near-verbatim port of a **Design OS** export. `design-os-main.zip` was downloaded from github.com/buildermethods/design-os on 2025-12-21.
- Design OS's shell step asks "collapsible on mobile, or hamburger?", and the answer lived in an uncommitted `shell/spec.md` that is now lost. The export's own README recommends shadcn/ui.
- The swap landed in an unrelated PR, with no rationale and no review.
- The recorded reasons are for *keeping* the hand-roll, not for adopting it: phase 07 "Keep it pragmatic", and v9.0 phase 47 "larger, deferred". Phase 07's own research listed "Consider using Sheet for mobile sidebar" under "Don't Hand-Roll".
- Every shadcn-era sidebar failure was a wiring mistake (provider placement, a cleared nav, a route rename, a nested wrapper, hydration gating), not a component limit.

---

## 2. Baseline metrics (the progress scoreboard)

Every phase's exit criteria are rows here. Update the "Now" column at the end of each phase.

| # | Metric (source) | Baseline | Target | Now |
|---|---|---|---|---|
| M1 | Files Tailwind scans (`audit.scannedFiles`) | 1,552 (whole repo: migrations, workflows, memory/) | ~914 (`src/` only) | 945 (66.2-39 re-freeze after fix round 4: final 917 + 43 added − 15 deleted non-test `src/` files; fix round 4 added 11 and deleted 6, fix round 3 added 2, fix round 2 1, fix round 1 29 and 8 deletions, `src/types/jest-dom.d.ts` deleted by the merge `54fc50829`, `f39/m1-delta.json`; final 66.2-37: W5 914 + 5 added − 2 deleted) |
| M2 | Explicit `@source` globs matching 0 files | 1 (`"..*.{ts,tsx}"`) | 0 | 0 (final) |
| M3 | Invalid `oklch()` literals | 1 (`--color-secondary`, chroma 3.51) | 0 | 0 (final) |
| M4 | Non-inline `@theme` vars that reference other vars | 11 (3 fonts, 8 sidebar) | 0 | 0 (final) |
| M5 | `@utility` names shadowing core utilities | 2 (`text-muted`, `text-caption`) | 0 | 0 (final) |
| M6 | Light-only color tokens in use | 14 | 0, except explicitly mode-independent ones (white, black, charts) | chart-1 and chart-4 only, both mode-independent (f39 re-freeze: VD-53 moved every mark off chart-2/3/5; final had chart-1..5; the 8 W6 sidebar aliases resolve through `var(--card)`… and are not light-only) |
| M7 | `cn()` drops a custom font size next to a color | 12 sizes | 0 | 0, measured through `src/lib/utils.ts` `cn` (final) |
| M8 | Dead theme vars / custom props / `@utility` / keyframes / class selectors (`globals.css`) | 55 / 47 / 90 of 133 / 1 / 20 | 0 / 0 / 0 / 0 / 0 | 4 / 0 / 0 of 42 / 0 / 0 (f39 re-freeze): 0 outside the T-1 token contract. `--color-chart-2/3/5` (last use removed in `2d36cb146`, VD-53) and `--color-success-foreground` (`8446d6bbf`, VD-55) are kept by main-session decision (option B); `f39-checks.mjs --fix-round-1` allows exactly these four. Final 66.2-37: 0 / 0 / 0 of 42 / 0 / 0 |
| M9 | `dashboard.css` dead classes / vars nothing defines | 33 of 39 / 4 | file removed | file removed (final) |
| M10 | Non-canonical classes (Tailwind `canonicalizeCandidates`) | 146 classes in 68 files (53 first-party, 15 `ui/`) | 0 first-party; `ui/` tracks upstream | 0 first-party; 17 ui/ (tracks upstream) (final and f39: 48 classes, all in the 17 vendored `ui/` files, `sidebar.tsx` included) |
| R1 | Light `bg-secondary` pixel (render-check) | **rgb(255, 0, 255)**, magenta | brand pale blue | `[222,243,255]` (final) |
| R2 | `.font-mono` resolves to (render-check; live site) | **Roboto** | Geist Mono | Geist Mono stub (`.font-mono` and `<code>`, both themes) (final) |
| R3 | `<html>` font-family / `global-error` page font | **Times** / **Times** | Roboto stack | Roboto stack; global-error `<html>` carries the font variables (final) |
| R4 | Worst dark-mode text contrast (render-check) | **1.01:1** (Renew Lease), **1.12:1** (prose) | ≥ 4.5:1 text, ≥ 3:1 icons | worst 4.50 light (the renew-lease "Change:" increase, `text-success-text` on `bg-muted`, fix round 1 F1); body/icon 5.44 light; dark ≥ 7.53, prose ≥ 13.5 (f39 re-freeze; render-check pairs equal to final) |
| R5 | Switch on a 390px viewport (live `/pricing`, `/signup`) | 44×44 grey donut | 32×18.4 toggle (same as desktop) | 32×18.4, padding 0 (final) |

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
- [x] Capture baselines **on `main`**: `audit.mjs`, `render-check.mjs baseline`, and copy `$TMPDIR/tenantflow-tw-audit/*` to `…/baseline/`. 66.2-02, baseline at `.planning/tailwind-shadcn/audit/baseline/`.
- [x] Capture a screenshot matrix (light/dark × 390/1280): `/`, `/pricing`, `/help`, `/faq`, `/login`, `/signup`, `/contact`, one `/blog/<slug>`, `/privacy`. Owner surfaces get the same matrix via the `owner-axe` login, or under Phase 6. 66.2-02, baseline at `.planning/tailwind-shadcn/audit/baseline/`.

### Phase 1 (wave 1): Visible bugs and permanent guards
- [x] B1: fix `--color-secondary`.
- [x] B2: relayer and scope the mobile touch-target rule. Re-measure the switch and checkbox on `/pricing` and `/signup` at 390px, and all inputs ≥ 44px (the E-2/E-3 48px inputs unchanged).
- [x] B3: `src/lib/fonts.ts`, variables on `<html>` in `layout.tsx` and `global-error.tsx`, `@theme inline` fonts, drop the base `code`/`pre` font-family and `--font-family`. Update `THEME_NO_FLASH_SCRIPT_HASH` **only if** the `ThemeProvider` script changes (it shouldn't).
- [x] B4: migrate the label/fill/separator consumers to semantic tokens and delete the family.
- [x] B5: `dark:prose-invert` on the two prose surfaces.
- [x] B6: fix the `BorderBeam` colors.
- [x] B7: `extendTailwindMerge` config.
- [x] B8: remove `@utility text-caption` (and the dead colliding `@utility text-muted`); update the 18 call sites and google-button.
- [x] X1: delete the tautological tests and the jsdom mock injection.
- [x] Guards G1–G6 (§6) land in this wave.
- **Exit:** R1–R5 at target; M3, M5, M7 = 0; M4 = 0 (the brand sidebar `@theme` block moved into wave 1, RESEARCH H1); M6 = 0 outside G4's allow-list (white, black, chart-1…5); every render-check contrast ≥ 4.5 (icons ≥ 3).

### Phase 2 (wave 2): Dead and misleading code, source scoping
- [x] B9: `source("..")`, delete the bogus `@source` and redundant exclusions.
- [x] B10: fold `dashboard.css`'s six live rules into `globals.css` and delete the file.
- [x] Rewrite every `var(--spacing-N)` / `var(--duration-N)` / `var(--radius-*)` arbitrary reference to the scale utility **first** (G7 proves none dangle).
- [x] Delete the Appendix A lists, X3 redundancies and the brand `--color-sidebar-*` block (B11). Keep the zinc block for Phase 6.
- [ ] X2 comments, X5 line-number citations, X6 cascade harness.
- [x] G7 lands.
- **Exit:** M1 ≈ 914, M2 = 0, M8 all 0, M9 file gone. `candidate-css.json` diff vs baseline limited to deleted dead rules and B-fixes. Token snapshot diff vs Phase 1 (fixed baseline list, RESEARCH H12) is empty except the two dead custom tokens border-secondary and accent-85, now transparent.

### Phase 3 (wave 3): Canonical shadcn token architecture
- [x] Move every semantic color into shadcn form (66.2-16; proved 66.2-17: `audit/w3/source-assertions-w3.txt` (a)-(e), `audit/w3/tokens-w3.json`):
  - `:root { --background: …; --foreground: …; … }` and `.dark { … }`, outside `@layer base`, per the scaffold.
  - `@theme inline { --color-background: var(--background); … }`.
  - Status families (success/warning/info + `-foreground` + the `-text` AA companions) follow the theming doc's "add a new token" recipe.
- [x] Charts become `--chart-1…5` in `:root` (and `.dark` if the palette changes). Keep the hsl conversions in the satori surfaces (`api/og`, `render-blog-cover.tsx`) in sync per CLAUDE.md. (`audit/w3/source-assertions-w3.txt` (b) chart rows, (c) no chart `.dark` value, (i) satori comments only)
- [x] X4: `.dark` replaces `:where(.dark, .dark *)`. (`audit/w3/source-assertions-w3.txt` (e2), `audit/w3/redproof-w3.json` inline-structure 0, `audit/w3/screens-manifest-w3.json` themeApplied)
- [x] Confirm that every `var(--color-*)` reference in TSX still resolves. `@theme inline` still emits a variable referenced from source; this was verified with a 4.3.3 compile test. (`audit/w3/source-assertions-w3.txt` (f)-(h) census, `audit/w3/tokens-w3.json` + `audit/w3/probes-w3.json` parity, `audit/w3/probes-n2cf.json` counterfactual)
- **Exit:** `render-check.mjs phase3` token snapshot **identical** to Phase 2's for all tokens, light and dark. Screenshot matrix unchanged. (proved 66.2-17)

### Phase 4 (wave 4): Canonical classes, first-party
- [x] Re-run the canonicalizer **against the Phase 3 theme**, so suggestions like `gap-(--spacing-2)` no longer point at variables Phase 2 deleted. Apply it to the 53 first-party files. (66.2-18: 86 edits in 50 files, 54 distinct pairs; proved 66.2-19: `audit/w4/report.json` M10 first-party 0, `audit/w4/pair-parity-w4.json`, `audit/w4/merge-check-w4.json`)
- [x] G8 lands with the vendored `ui/` registry files allow-listed. (66.2-18; proved 66.2-19: `audit/w4/redproof-g8-*.json` baseline 97, pre-W4 54, W4 0, mutation 1 with the `ui/` probe unreported)
- Maintainer caveat (RESEARCH): a future Tailwind release may add canonicalizations. Dependabot commits skip lefthook, but origin/main's `checks` job runs `bun run test:unit -- --coverage` on every PR since #1041 (80d282a5a), so G8 then fails on the bump PR itself and on the next lefthook commit. Input to the N21 residual in 66.2-39, whose RESEARCH row "unit tests never run in CI" predates #1041.
- **Exit:** M10 first-party = 0. Screenshot matrix unchanged. (proved 66.2-19)

### Phase 5 (wave 5): shadcn component sync
- **Input:** `research/shadcn-component-audit.md`, a raw report covering 42 vendored files vs new-york-v4. It is **unverified**; only the input-otp missing-`data-slot` claim has been spot-checked.
- [x] 66.2 research reproduces or refutes every claimed defect, sync hazard and inert class before the planner uses it. Watch especially the BlurFade claim (69 importers) and the chart gridline claim; the latter must be fixed without hex literals. (66.2 claims ledger; proved 66.2-29: `audit/w5/claims-w5.json` 24/24 claim groups, the probe-only baseline run fails the 11 before-state claims)
- [x] Sync order and rules follow the report's §"Recommended sync order", restricted to verified claims. (66.2-20..28; proved 66.2-29: `audit/w5/d05-accounting.json` 0 unlisted/phantom/untagged paths; `audit/w5/vendored-inventory.json` 73 files, problems [])

### Phase 6 (wave 6): Owner sidebar on canonical shadcn Sidebar
- **Inputs:**
  - `research/sidebar-migration-design.md`, a raw design: decisions D1–D11, parity matrix, divergences V1–V12, cascade traps, tests.
  - The capability-comparison workflow (2026-10-25). So far 100 behaviors are inventoried and none is impossible with shadcn; the a11y group verification is still pending.
- **Locked decisions to preserve:** 56 D-07, 56 D-24, 65 D-08/D-09/D-10.
- [x] Phase 6 Step 0 confirms the hand-rolled drawer's claimed defects with computed styles before the migration claims to fix them. (66.2-30: `audit/w6/step0-claims.json` S1-S8 8/8 CONFIRMED on the live post-W5 shell, each control passing)
- [x] Migration (66.2-31..36): canonical `sidebar.tsx`, shell host, MainNav, dock and tour, owner-axe spec; proved by the final gate (66.2-37: `final/vd-register.json` 37/37, `app-shell-sidebar.spec.ts` 21/21).
- [x] Owner checkpoints CP-1..CP-5 (66.2-38: all five owner defaults, `66.2-38-CP-DECISIONS.json`) and the owner-approved CP-4 layout follow-up (`audit/cp4-followup/`).
- [x] Final (66.2-39): no fallback applied, re-measured and frozen (`audit/f39/freeze.json`), one PR opened for the merge gates (PR pending).
- [x] Fix round 1 after perfect-PR cycle 1 (24 findings; 195 commits, parts A to R plus O) and the re-freeze: every Task 2 step re-run on the new state, code state `b628eb9f1`; the merge gates run again on the new head.
- [x] Fix round 2 after CI failed on `bc54b045a` and `f8de0175e` (CodeQL alerts and the sweep timeout fixed in `74f8bd9f1` and `f8de0175e`; two production-data failures resolved by owner decision) and the re-freeze: code state `f8de0175e`; the merge gates run again on the new head.
- [x] Fix round 3 after perfect-PR cycle 2 (139 findings on `36972318f`; 139 commits, Parts 1 to 8 with 6b, 6c and 7b, `852158ab4` and Part 6d) and the re-freeze: every Task 2 step re-run on the new state (the sweep, replay, Deno and bundles on `852158ab4`, inputs unchanged since), code state `b7f25511b` (`audit/f39/freeze.json`); the merge gates run again on the new head.
- [x] Fix round 4 after perfect-PR cycle 3 (70 kept findings on `3977aa58d`; 232 commits, Parts 1 to 8, 5b, 5c, 5d, 8b to 8o, `ae038ed02` and `7f6fcc67c`) and the re-freeze: every Task 2 step re-run on the new state, nothing carried, code state `7f6fcc67c` (`audit/f39/freeze.json`); the merge gates run again on the new head.

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
| 12 | CP-1: grid restored (owner, 2026-11-01, "Keep grid") | The owner kept the repaired GridPattern (VD-22) after the before/after review. The broken classes can never be the fallback | `cp1-fallback` (no grid: PageLayout default false, auth-page grids removed) |
| 13 | CP-2: upstream v4 surfaces (owner, 2026-11-01, "Keep v4") | The owner kept the registry-identical Button surfaces (VD-19), so future syncs stay diff-clean | `cp2-fallback-border-input`, `cp2-fallback-dark-outline`, `cp2-fallback-dark-ghost`, `cp2-fallback-dark-destructive` |
| 14 | CP-3: canonical rings (owner, 2026-11-01, "Keep v4 rings") | The owner kept the Button 3px `ring/50` (D-29) and the sidebar rows' 2px `--sidebar-ring` ring (VD-34) | `cp3-fallback` (today's outline + offset + 4px halo on sidebar rows) |
| 15 | CP-4: desktop collapse adopted (owner, 2026-11-01, "Keep + fix layout") | The owner kept desktop collapse, SidebarRail, Cmd/Ctrl+B and the `sidebar_state` cookie (VD-29, VD-31) and asked for the layout defects the review found (collapsed KPI value wrap at 1024/1280; Quick Actions overflow and dock-over-donut at 1024) to be fixed if this phase caused them, as a separate step before 66.2-39 | `cp4-fallback` (D-52: `lg:hidden` trigger, no rail, Cmd/Ctrl+B stopped, no cookie read) |
| 16 | CP-5: entrance motion on (owner, 2026-11-01, "Keep entrance") | The owner kept the mount-time BlurFade entrance (VD-23); it never runs under reduced motion and ends at opacity 1 | `cp5-fallback` (resting state only, `animate-none`) |

---

## 9. Progress log

- **2026-10-25.** Research complete. Baseline recorded (§2). B1 and B2 confirmed live on production; B3's `.font-mono` confirmed live. Audit tooling committed under `.planning/tailwind-shadcn/audit/`.
- **2026-10-25.** Imported into GSD.
  - Phase 66.2 inserted (ROADMAP entry with goal, 8 success criteria and the carried constraints). Requirements UIC-01..08 added with traceability.
  - Import conflict report: 0 blockers, 4 warnings, all approved by the owner and carried as constraints.
  - Branch and worktree created.
  - `state.add-roadmap-evolution` corrupted the STATE.md frontmatter; STATE.md was restored and the entry hand-written, as STATE.md's own comment requires.
- **2026-10-26.** Baseline captured (66.2-02) on `src/` byte-identical to `754c91802`, sha256-indexed in `.planning/tailwind-shadcn/audit/baseline/index.json`.
  - M1 today 1,553 scanned files; the in-memory `source("..")` projection scans 914 and drops exactly `invert` and `table-column`. M2-M10 reproduce §2.
  - Guard prototype reproduces G1 1 / G2 11 / G3 2 / G4 6 / G5 44 / G6 1 / G7 8 / G8 97. Token snapshot: 71 `--color-*` tokens, re-run with the fixed list is identical; css-parity self-diff 0 hunks.
  - Screenshot matrix: 92 captures (44 public, 48 owner: light/dark × 390/1280, plus `/applications` at 375 and 320), repeated after 60 s; 4 of 92 differ by sha256 between the two runs (pricing/signup at 390, 12 px at most). `/signup` redirects to `/pricing`.
  - The owner set used the local production build (`next start :3062`, `NEXT_PUBLIC_APP_URL=http://localhost:3062`) against production Supabase, signed in once per run as the synthetic owner A; it only navigated.
- **2026-10-30.** Wave 1 gate (66.2-10) passed:
  - §7.1 audit: M2 0, M3 0, M4 0, M5 0, M6 7 (white, black, chart-1..5 only), M7 0 through `src/lib/utils.ts` `cn`; source assertions 24/24.
  - §7.2 rule parity: 22 hunks vs `baseline/candidate-css.json`, all attributed to 66.2-05..08 (class (e) empty: the D-07 literal never appears in candidate CSS).
  - §7.3 token parity: exactly 25 changes (light.secondary [222,243,255,1] plus the 12 deleted tokens in both modes); R1-R5 at target.
  - §7.4 guards and build: G1-G6 red on 754c91802 (1/11/2/7/44/1) and 0 now; validate:quick, the coverage ratchet and `next build` exit 0.
  - §7.5 screenshots and owner-axe: `baseline` vs a same-session 754c91802 capture differs 92/92 after the 2026-10-26 macOS 27.2 upgrade, so W1 was diffed against that capture (`basenow`): 22 identical, 64 intended (VD-01/02/03/04/06/10/11), 6 owner data drift. CSP: no violation beyond 754c91802 (zod's caught `Function("")` probe on `/login`, pre-existing). owner-axe 36/37 with E-22 passing; `dashboard-a11y` fails locally on 754c91802 too and passes in CI.
  - §7.6 Aikido: path scans 0 issues; the SAST engine failed inside Aikido (`unknown JSON field taint_intrafile`), carried to the owner.

- **2026-10-31.** Wave 2 gate (66.2-15) passed (after the Noise and probe rules decision, 234419439):
  - §7.1 audit: M1 916, M2 0, M8 7 / 1 / 0 of 42 / 0 / 0 (exactly the W6 remnants), M9 file removed; M3-M5 and M7 0, M6 chart-1..5 only (white and black are Tailwind defaults now); source assertions 21/21 (`source-assertions-w2.mjs`).
  - §7.2 rule parity: W1 -> W2 hunk-proof 0 unproven (469 spacing-equivalent, 11 resolved-equal, 2 scope, 30 rewrite-pair, 12 source-removed, 13 source-added); D-18 drops exactly `invert` and `table-column`; css-parity `--strict` 0 unclassified; x3 intended-check 0 mismatches.
  - §7.3 token parity: light/dark border-secondary and accent-85 now [0,0,0,0]; slate-700 R 50 -> 49 (±1); every other token byte-identical.
  - §7.4 guards and build: G1-G7 red on 754c91802 (1/11/2/7/44/2/10) and 0 now; validate:quick, the coverage ratchet and `next build` exit 0.
  - §7.5 screenshots: W1 vs W2 70 identical, 18 owner data drift, 4 noise (the pricing/signup 390 house-icon flicker, each confirmed in a same-session W2 repeat or the same-session W1-tree recapture); the same-session W1-tree recapture differs from W2 on 1 of 92 (noise). VD-12 skeleton 4/4 harness and 4/4 live. Component probes equal the W1 archive on every measured value; the only input change is `update-password-badge.classes` from the 66.2-11 `p-[var(--spacing-3)]` -> `p-3` rewrite. CSP: no violation beyond 754c91802.
  - §7.6 Aikido: orchestrator path scans 0 issues over 66.2-11..14 and over this plan's four changed files; SAST failed inside Aikido, carried to the owner.

- **2026-10-31.** Wave 3 gate (66.2-17) passed:
  - §7.1 audit: M1 916, M2 0, M3 0, M4 0, M5 0, M7 0, M8 7 / 1 / 0 of 42 / 0 / 0, M9 none: all equal W2. M6 (now measured through `@theme inline` mappings, fix `1bfd91885`) chart-1..5 only, equal W2. M10 moves only by 66.2-16's recorded delta: classes 103 -> 101, first-party files 51 -> 50 (3 pairs removed, 1 added). Source assertions 14/14 (`source-assertions-w3.mjs`): 36 moved tokens byte-identical in `:root`/`.dark`, one `@theme inline` mapping each, no `:where(.dark, .dark *)` rule, radius/shadow/text scales and the zinc sidebar equal W2; census: W2 bare refs only in `data-table.ts`, W3 none outside the 36 mappings.
  - §7.2 rule parity: css-parity `--strict` W2 vs W3: 415 color-inline, 0 spacing-equivalent, 0 added/removed, 0 unclassified; no intended entries.
  - §7.3 token parity: the archived-W2 render-check reproduces `w2/tokens-w2.json`; W3 tokens `jq -S`-identical in light, dark and whole (71 names, background alpha 1 both modes); render-check (fonts, secondary pixel, pairs, contrast, touch390) identical; all 13 component probes identical to the archived W2 run.
  - N2: data-table cells and headers [0,0,0,0] in both themes, hover/selected rows equal W2; the counterfactual (W2 `data-table.ts` on W3 CSS) paints the cells opaque (alpha 1) in both themes; `data-table.test.ts` 5/5.
  - §7.4 guards and build: G1-G7 pass (8/5/5/10/7/14/13 tests, 0 failed); red-proof G1-G7 + inline-structure 0 now, 754c91802 G4 7 and inline-structure 104; the `.dark --muted-foreground` fixture trips G4. validate:quick, the coverage ratchet (64.95/56.85/64.22/67.07) and `next build` exit 0.
  - §7.5 screenshots: W2 vs W3 91 identical, 1 noise (pricing-light-390, the 22 px house-icon region, confirmed in the same-session W3 repeat); 0 missing; owner set captured; 92/92 themeApplied; 0 CSP console errors.
  - §7.6 Aikido: MCP unavailable to the executor; the orchestrator's path scans of 66.2-15/16's files found 0 issues and SAST failed inside Aikido (`unknown JSON field taint_intrafile`), carried to the owner; this plan's two tool files (`audit.mjs`, `source-assertions-w3.mjs`) are listed for the orchestrator.

- **2026-10-31.** Wave 4 gate (66.2-19) passed:
  - §7.1 audit: M10 first-party 0 (47 classes, all in the 15 vendored `ui/` files; `src/components/ui` has no diff since the W3 gate). M1 916, M2 0, M3 0, M4 0, M5 0, M6 chart-1..5, M7 0, M8 7 / 1 / 0 of 42 / 0 / 0, M9 none: all equal W3. No canonicalizer call passes `collapse: true`; audit.mjs, canonicalize.mjs and tailwind-guards.ts all use rem 16. The 5 N13 tests hold only the canonical forms.
  - §7.2 rule parity: css-parity `--strict` W3 vs W4: 54 intended removals (every pair `from`), 42 intended additions (pair `to`s not already present), 0 spacing-equivalent, 0 color-inline, 0 unclassified. The independent merge check (PRE_W4 archive vs HEAD) gives calls 36, sites 4/158/0, unresolved 5, diffs [], with the 1 owner-approved cascade-equivalent site, equal to 66.2-18. Pair proof (`pair-parity.mjs`): 54 pairs, 21 text-equal, 9 computed-equal, 24 rem-for-px, 0 unproven; equal by set to 66.2-18's classes.
  - §7.3 token parity: `tokens-w4.json` `jq -S`-identical to W3 (71 names per mode); render-check (fonts, secondary pixel, pairs, contrast, touch390) identical.
  - §7.4 guards and build: G8 red-proof 754c91802 97 (equal to 66.2-18), PRE_W4 54 (equal to the pair set), W4 0, HEAD plus one injected first-party `flex-shrink-0` 1, the injected `ui/` `bg-gradient-to-r` unreported. G8 suite 7/7 (positive test 181 ms). validate:quick, the coverage ratchet (64.95/56.84/64.22/67.07) and `next build` exit 0.
  - §7.5 screenshots at default zoom: W3 vs W4 91 identical, 1 noise (signup-dark-390, the 22 px house-icon region, also changed in the same-session W4 repeat), 0 missing; owner set captured; 92/92 themeApplied; 0 CSP console errors. VD-13 (24 rem-for-px pairs) produces no pixel change at the 16px root.
  - §7.6 Aikido: MCP unavailable to the executor; the orchestrator's path scans of the 66.2-17/18 files found 0 issues, and SAST failed inside Aikido (`unknown JSON field taint_intrafile`), carried to the owner. `pair-parity.mjs` and `w4/compiled.css` are listed for the orchestrator.

- **2026-10-31.** Wave 5 gate (66.2-29) passed:
  - §7.1 audit: M1 914 (916 + 1 − 3, `w5/m1-delta.json`), M2-M9 equal W4, M10 first-party 0 (45 classes in 16 vendored `ui/` files). D-05 accounting from `git log --no-renames`: 0 unlisted, 0 phantom, 0 untagged over 66.2-20..28, plus one gate fix. Guards G1-G8 + inline-structure 0.
  - §7.2 rule parity: css-parity `--strict` W4 vs W5: 27 removed and 48 added keys, each attributed to a file wave 5 changed; 0 changed, 0 spacing-equivalent, 0 color-inline, 0 unclassified.
  - §7.3 token parity: `tokens-w5.json` and the render JSON identical to W4.
  - Component probes: 26 ids in both themes; `w5-claims.mjs` passes 24/24 claim groups (C1-C16, N1-N3, SHEET, D-04, D-26); every VD row proven (VD-14..VD-25, VD-30); the probe-only baseline run fails exactly C1 C2 C3 C4 C7 C9 C12a C12b C12c N1 SHEET; self-test 20 passed.
  - §7.4 validate and build: validate:quick, the coverage ratchet (65.21/57.4/64.53/67.36) and both `git archive` builds (HEAD, PRE_W5) exit 0. Gate fix `8361a45d8`: `shrink-0` on the raw cash-flow Export and tenant sort-header icons (4.5 and 2.4 → 16px at 390); all five 66.2-10 squashed-icon controls now 16px in both themes.
  - §7.5 screenshots: W4 vs W5 12 identical, 80 intended (VD-19 76, VD-20 64, VD-23 32, VD-22 28, VD-21 16, VD-16 8, VD-17 8, VD-30 4, VD-19-svg-unsquash 4); iso pair 88 identical + 4 VD-19-svg-unsquash (`/properties` 390 wrap by shift proof, `/reports/cash-flow` 390 Export icon confined to its button). CSP: 0 beyond the same-session 754c91802 control (zod's eval probe on `/login` and `/auth/update-password`).
  - §7.6 Aikido: MCP unavailable to the executor; the orchestrator scans the 166 listed paths.
  - Owner review queued for 66.2-38: CP-1 (GridPattern on 28 captures), CP-2 (Button v4 surfaces and the VD-19b unsquash/wrap captures), CP-5 (BlurFade entrances).

- **2026-10-31.** Wave 6 Step 0 (66.2-30):
  - Claims (D-42) on a local `next start` of HEAD, owner A: S1-S8 8/8 CONFIRMED, every positive control passing. S1 0 of 6 Tabs reach the open drawer; S2 AX name "" and 1 `aria-dialog-name` violation; S3 wheel scrolls the page 600 px under the open drawer; S4 the palette and the logo leave it open (x 0, overlay 1); S5 Settings is a BUTTON with no /settings link and a dead Shortcuts item; S6 the current section stays collapsed (inert, max-height 0px, opacity 0); S7 step 5 target 0% visible at 375 and 900, popover 0% at 375; S8 18 of 18 anchors underline on hover at 1024 and 1280. 0 tour-progress or table writes forwarded.
  - Registry: sidebar content sha256 `2ba1a9b9…` and use-mobile `ad0936f8…`, both unchanged since research; 13/13 anchors, 24 exports.
  - Typecheck (A4/N18): the import-rewritten canonical sidebar.tsx has 0 errors under tsc 7.0.2 against the post-W5 button/sheet/tooltip; the negative control fails with TS2322.
  - Before-set: 52 captures (`w6/sidebar-before-manifest.json`, PNGs git-ignored); the same-session repeat has 1 noise file (row-focus-dark-1280, 2 px).

- **2026-11-01.** Final gate (66.2-37) passed (also the wave 6 exit, D-43):
  - §7.1 audit: M1 917 (W5 914 + 5 − 2), M2-M5 0, M6 chart-1..5 only (audit.mjs now follows `:root` alias chains, fix `6f9a01791`), M7 0, M8 0 / 0 / 0 of 42 / 0 / 0, M9 none, M10 first-party 0. D-05 accounting over 66.2-01..36: 0 unlisted, 0 phantom, 0 untagged, 0 outside the W6 tags. `w6-assertions.mjs` 13/13 PASS on HEAD and 13 FAIL on PRE_W6; `source-assertions-w2` 21/21.
  - §7.2 rule parity: W5 -> final `--strict` 8 removed and 88 added keys, each attributed to a W6 file, 0 unclassified; cumulative baseline -> final 1,202 hunks, every one a classified hunk of one wave link (0 unclassified).
  - §7.3 token parity: W5 -> final only the 16 `sidebar*` entries, each equal to its T-2 alias in both themes; the cumulative set is the enumerated one (slate-700 R 50 -> 49, equal to W2); R1-R5 at target and the render JSON equal to W5.
  - Component probes: 26 ids equal to W5 except the W6 dock id, which meets the 66.2-35 thresholds; `w5-claims` only C11's superseded remnant check fails; vendored inventory 0 problems; VD-12 4/4 (probe reference fixed, `fb6320a72`). Guards G1-G8 + inline-structure red on 754c91802 (1/11/2/7/44/2/10/97/104) and 0 on HEAD.
  - §7.4 validate and build: validate:quick, the coverage ratchet (65.52/57.8/64.89/67.68; 754c91802 64.94/56.71/64.19/67.06) and every build exit 0.
  - §7.5 screenshots and owner flows: W5 -> final 41 identical, 48 intended (VD-27..VD-37 markers), 3 noise; iso pair 88 identical + 4 noise; cumulative vs a same-session 754c91802 capture 84 intended, 8 identical; sidebar set 52 intended + 8 new-state. CSP 0 beyond the same-session 754c91802 control. smoke/public/owner-axe 155 passed, 0 unexpected, 0 flaky, `app-shell-sidebar.spec.ts` 21/21 and E-22 passing.
  - §7.6 Aikido: 312/312 files scanned; 1 carried pre-existing finding (the Supabase local-demo anon JWT at `tests/e2e/playwright.config.ts:35`, not a secret, untouched by 66.2); SAST failed inside Aikido (`unknown JSON field taint_intrafile`).
  - VD register 37/37 (`final/vd-register.json`); owner-review evidence pack `final/evidence-pack.json`.
  - Carried: CP-1..CP-5 to 66.2-38; CI `checks`/`e2e-smoke`/`rls-security` and the perfect-PR gate to 66.2-39.

- **2026-11-01.** 66.2-38 owner review recorded: CP-1 default, CP-2 default, CP-3 default, CP-4 default, CP-5 default; fallbacks applied in 66.2-39 (none chosen). All five decided by the owner (AskUserQuestion); the CP-4 layout follow-up runs separately before 66.2-39 (`deferred-items.md`).
- **2026-11-01.** CP-4 layout follow-up done (owner: "fix everything and put it in this pr"). All three defects predate 66.2: production builds lay out identically at equal content widths, 10/10 pairs vs `754c91802`. Fixes: KPI values one unwrappable line, `efb0a6fb9`; trends row on a 56rem `dashboard` container, `036184de1`; dock band from `--dock-height`/`--dock-offset`/`--dock-clearance` as `<main>` and root scroll padding, `1a7eecd2a`; owner-axe assertions `9393102aa`. Red-proof: every new e2e and unit assertion that targets a defect failed on the pre-fix build and passes now. Owner-axe 64 passed, coverage 65.52/57.79/64.89/67.68. Evidence: `audit/cp4-followup/`, `deferred-items.md`.
- **2026-11-01.** Final (66.2-39): CP decisions applied (none: all five owner defaults), state frozen, PR opened for the merge gates.
  - Merge of `main` (`54fc50829`, 55 commits of dependency bumps and #1041/#1044) re-measured: audit M2-M10 equal to final, M1 916 (`jest-dom.d.ts` deleted on main); css-parity FINAL -> f39 9 added + 3 removed keys, all CP-4 follow-up, 0 unclassified; tokens and render equal; G1-G8 + inline-structure 0; unit 363 files / 110,597 tests, coverage 66.7/58.58/65.3/68.75; validate:quick and build exit 0; CSP equal to the 754c91802 control.
  - Code state `d2b7b5124` (`audit/f39/freeze.json`); D-04 measured against `MAIN_MERGE^2` (amendment `a8bb75744`); `.planning/` stays tracked in this PR by owner decision although main's `381c85d5f` ignores it.
- **2026-11-02.** Final (66.2-39) re-freeze after perfect-PR cycle 1: CP decisions applied (none: all five owner defaults), fix round 1 measured, state frozen, PR head refreshed for the merge gates.
  - Cycle 1 on `4476e6450`: 24 findings, all fixed in parts A and B; parts C to R and O fixed the pre-existing and data defects the owner chose to fix here (the PR body's "Fix round 1" section). 195 commits, `4476e6450..83929ceb6`.
  - Re-run on code state `4433ca833`, then `b628eb9f1` (two test comments reworded for the no-hex check): audit M1 937, M6 chart-1/chart-4 and M8 4 (the T-1 contract tokens, option B), M10 first-party 0; css-parity 0 unclassified; tokens only VD-38/VD-59; G1-G8 + inline-structure 0; unit 454 files / 113,810 tests, coverage 71.83/63.56/70.8/73.68; validate:quick 0; E2E smoke + public + owner-axe 248 passed, 5 skipped, 0 failed; screenshots against a same-session `4476e6450` build: 28 identical, 124 intended, 0 unclassified; CSP zod probe only; replay 357/357; mutation sweep 179/0/0; deno check 17/17; Edge deploy list export-report, generate-pdf, lease-signature, n8n-blog-ingest.
  - `f39-checks.mjs --fix-round-1` (189 checks) pins it; self-test 45. Ancestry by `git rev-list` (`git merge-base` is permission-blocked).
- **2026-11-04.** Final (66.2-39) re-freeze after fix round 2: CP decisions applied (none: all five owner defaults), fix round 2 measured, state frozen, PR head refreshed for the merge gates.
  - CI on `bc54b045a`: CodeQL 4 high alerts in test files (1 js/redos, 3 js/incomplete-sanitization), the mutation sweep cancelled at `timeout-minutes: 45` after 155 of 179 rows, `rls-security` (cross-link blog posts deleted from production by the n8n writer's prune step); on `f8de0175e`'s first run, `e2e-smoke` (the persona word on `/blog`). `74f8bd9f1` routes every regex name in test code through `src/test/utils/regexp-source.ts` and ends the JSX-comment ReDoS; `f8de0175e` shards the sweep into 8 matrix jobs. The owner paused the writer; 139 of the 140 deleted posts were restored (the 140th had been re-created by the writer) and six posts' persona word replaced, all in production data; CI on `f8de0175e` then passed every check.
  - Re-run on code state `f8de0175e`: audit M1 938 (the new test helper; everything else byte-identical), css-parity 0 unclassified, tokens and guards byte-identical; unit 456 files / 113,834 tests, coverage 71.85/63.58/70.81/73.69; validate:quick 0; E2E smoke + public + owner-axe 249 passed, 4 skipped, 0 failed; mutation sweep unsharded and as 8 shards 179/0/0 with the listing a disjoint cover; part A's 26 red proofs fail again. The 4433ca833, b628eb9f1 and f8de0175e builds hash identically and the compiled CSS is byte-identical, so screenshots, probes and the CSP manifest counts carry forward; replay, Deno and the vendored inventory carry forward (inputs unchanged).
  - `f39-checks.mjs --fix-round-2` (42 checks, incl. a local CodeQL-clean scan) pins it; self-test 64.
- **2026-11-06.** Final (66.2-39) re-freeze after perfect-PR cycle 2 and fix round 3: CP decisions applied (none: all five owner defaults), fix round 3 measured, state frozen, PR head refreshed for the merge gates.
  - Cycle 2 on `36972318f`: 139 distinct findings (188 confirmed, 17 refuted, 62 reviewers). Fix round 3: 139 commits, Parts 1 to 8 with 6b, 6c and 7b, then `852158ab4` and Part 6d's `5ab6b39e3` and `b7f25511b`, the fixes for the code defects the re-freeze's first two runs stopped on (a partial regex escape in two of round 3's guards; the tour step-1 footer off screen at 1280x800).
  - Re-run on code state `b7f25511b`: audit M1 940, css-parity 0 unclassified (fix round 3's 28 added and 7 removed keys each with its commit and VD row), tokens and guards byte-identical; unit 491 files / 114,159 tests, coverage 74.5/66.14/73.19/76.44; validate:quick 0; screenshots against a same-session `36972318f` build: 92 public/owner (32 identical, 60 intended), 60 sidebar (60 intended), 0 unclassified; probes 1 noise field; CSP 0 beyond the zod control; E2E smoke + public + owner-axe 257 passed, 3 skipped, 0 failed; the tour inside the viewport at every probed size (30/30 steps). Mutation sweep 185/0/0 (8 shards 24 and 23 x 7), replay 357/357, deno check 17/17 and the bundles (redeploy list unchanged) on `852158ab4`, carried with their inputs unchanged since.
  - `f39-checks.mjs --fix-round-3` (36 checks) pins it, `--fix-round-1` now maps VD-01..VD-151 (211), `--fix-round-2` reads the string-pattern escape form (44); self-test 94.
- **2026-11-09.** Final (66.2-39) re-freeze after perfect-PR cycle 3 and fix round 4: CP decisions applied (none: all five owner defaults), fix round 4 measured, state frozen, PR head refreshed for the merge gates.
  - Cycle 3 on `3977aa58d`: 71 distinct findings, 70 kept (81 confirmed, 21 refuted, 65 reviews). Fix round 4: 232 commits, `3977aa58d..7f6fcc67c`. The re-freeze's first launch stopped on M8 (six dead theme vars); the main session's no-code decision extended option B to warning- and info-foreground.
  - Re-run on code state `7f6fcc67c`: audit M1 945, M8 6 (the T-1 contract), css-parity 0 unclassified (fix round 4's 205 added, 39 removed and 1 changed key, 4 taken back, and 4 compiled-CSS changes outside the utilities, each with its commit and VD row), six token deltas, guards 0; unit 554 files / 114,699 tests, coverage 76.79/68.6/74.94/78.67; validate:quick 0; screenshots against a same-session `3977aa58d` build: 92 public/owner and 60 sidebar, all intended, 0 unclassified; probes 50 intended, 0 noise; CSP 0 beyond the zod control, headers equal; E2E smoke + public + owner-axe 281 passed, 2 skipped, 0 failed (8.9 min). Mutation sweep 185/0/0 (8 shards 24 and 23 x 7), replay 358/358, deno check 17/17, the redeploy list five functions.
  - `f39-checks.mjs --fix-round-4` (96 checks) pins it, `--fix-round-1` maps VD-01..VD-186 (246), `--fix-round-3` retires the heading-block guard (35), `--fix-round-2` 44; self-test 124.

---

## Appendix A: dead code lists (`globals.css`, baseline)

**Theme vars (55):** `--text-stat-sm`, `--text-display-2xl`, `--text-display-xl`, `--text-display-md`, `--leading-loose`, `--tracking-tightest`, `--transition-duration-slower`, `--color-slate-50…950` (11), `--color-label-quaternary`, `--color-label-on-dark`, `--color-label-on-dark-secondary`, `--color-fill-quaternary`, `--color-fill-muted`, `--color-border-secondary`, `--color-accent-85`, `--color-sidebar-{foreground,primary,primary-foreground,accent,accent-foreground,border,ring}` (7, in `@theme`, plus the same 7 in `@theme inline`), `--spacing-35`, `--spacing-container-inline`, `--spacing-responsive-{xs,lg,xl}`, `--duration-75`, `--duration-150`, `--duration-medium`, `--ease-in`, `--ease-smooth`, `--ease-out-smooth`, `--ease-in-smooth`, `--ease-out-expo`, `--z-index-{toast,modal,modal-backdrop}`.

**Custom properties (47):** `--font-family`, `--icon-{xs,sm,md,lg,xl,2xl}`, `--glass-{material,border,shadow,blur}`, `--focus-ring-color`, `--scale-{hover,tap}`, `--translate-{hover-x,hover-y,slide-y}`, `--transition-{card,hover,color}`, `--transform-{lift,scale-hover}`, `--hover-border-color`, `--sidebar-transition`, `--feature-card-{hover-bg,icon-hover}`, `--navbar-btn-{hover-bg,hover-text}`, `--lightbox-nav-{bg,hover-bg}`, `--portal-feature-{hover,transition}`, `--layout-section-padding-y-hero`, `--layout-container-padding-x-{narrow,wide}`, `--layout-content-padding-{spacious,hero}`, `--layout-stack-{loose,default,tight}`, `--layout-grid-cols-{1,2,3,5}`, `--layout-navbar-height`, `.dark`'s `--color-border-secondary` and `--color-accent-85`.

**`@utility` (90):** status-{overdue,complete,error}, activity-payment, enter-{card,modal,page,sheet}, exit-modal, skeleton-{text,heading,button,card,pulse,stagger}, interactive-{lift,fade,scale,glow,item}, dashboard-widget-card, stat-card-professional, status-badge{,-success,-warning,-destructive}, icon-bg-{success,warning}, dashboard-stat-card, quick-action-button, view-toggle{,-button}, text-responsive-{display-lg,display,h2,h3,body}, touch-{friendly,card,button,interactive}, section-spacing-spacious, page-container, section-gap, mobile-{stack,container,section,dropdown-link}, grid-responsive-auto-fit, text-muted, typography-{hero,display-lg,display,display-sm,display-sans,display-sans-lg,p,lead,muted,caption,stat-lg,stat-xl,blockquote,list,inline-code,table-wrapper}, card-{elevated,bordered,glass}, content-{section,padded,compact}, gap-{standard,comfortable}, clickable-card, trust-indicator-badge, animate-{card-in,chart-bar,trend-up,trend-down,number,progress,metric,content}, hover-{smooth,lift-shadow}, icon-hover-scale, focus-{card,interactive}, skip-link.

**`@keyframes` (1):** `mobile-fade-in`.

**Class selectors (20):** `.dashboard-widget-card`, `.stat-card-professional`, `.dashboard-panel-{header,title,description,body}`, `.dashboard-stat-card`, `.quick-action-button`, `.view-toggle-button`, `.hover-lift`, `.hover-scale`, `.high-contrast`, `.mobile-{full-width,centered,padded,spaced,stack,nav-item}`, `.btn`, `.form-input`.
