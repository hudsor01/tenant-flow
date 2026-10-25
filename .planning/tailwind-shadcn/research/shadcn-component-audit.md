# shadcn/ui vendored-component audit (raw research)

> **Raw agent output, not yet verified.** A research subagent wrote this on 2026-10-25 against `main` @ `754c91802`. PLAN.md §4.5 tracks which claims are verified. Do not act on an unverified claim without re-checking it.
>
> - **Registry:** `https://ui.shadcn.com/r/styles/new-york-v4/registry.json`, 471 items (61 `registry:ui`), fetched 2026-10-25 15:39–15:42 UTC (`last-modified: Sat, 24 Oct 2026 06:25:07 GMT`).
> - **Why new-york-v4:** `components.json` has `style: "new-york"` and Tailwind v4. The legacy `r/styles/new-york/*` is the v3 / React 18 variant.

## Method

1. Downloaded 63 registry items.
2. Rewrote imports to the repo aliases (`@/registry/new-york-v4/ui/X` → `#components/ui/X`; `from "cn"` → `#lib/utils`) and formatted with the repo's Biome 2.5.14 in stdin mode.
3. Compared two diff sets: a raw one, and a normalized one that also rewrites to named React imports.
4. Compared class sets, data/aria/role attributes and props per declaration.
5. Ran `git log -S` history checks to separate genuinely new upstream parts from parts Phase 19 trimmed as dead (`d825f7b6a`).
6. Typechecked the upstream files under the repo's strict flags (TypeScript 7.0.2). Local files typecheck clean.
7. Compiled all 902 local and 933 upstream class tokens with the repo's `@tailwindcss/node` 4.3.3 and the real `globals.css`.

The local `node_modules` predates `bun.lock` (radix-ui 1.4.3 vs 1.8.1, recharts 3.8.1 vs 3.10.1, lucide-react 1.16.0 vs 1.60.0, input-otp 1.4.2 vs 1.5.0, tailwind-merge 3.6.0 vs 3.7.0), so typechecks ran against the installed versions.

## TL;DR

| Status | # | Components |
|---|---|---|
| in-sync | 3 | label, separator, `Spinner` (embedded in loading-spinner.tsx) |
| upstream-ahead | 9 | alert-dialog, avatar, checkbox\*, collapsible\*, popover, switch, textarea\*, toggle-group, tooltip (\* data-slot only) |
| locally-customized | 5 | accordion, empty, item, skeleton, sidebar/context (unused in production) |
| both | 24 | alert, badge, breadcrumb, button, button-group, calendar, card, chart, chart-tooltip, command, dialog, dropdown-menu, field, input, input-group, input-otp, progress, select, sheet, slider, table, tabs, toast (= sonner), toggle |
| n/a | 1 | combobox: local is **DiceUI**; upstream new-york-v4 is **Base UI** (`@base-ui/react`, not installed). Never take upstream combobox. |

### Claimed live defects

1. **2FA code input (input-otp).** `InputOTPSlot` lost `data-slot="input-otp-slot"` in `d6dfa2d23` (2025-11-30). So `*:data-[slot=input-otp-slot]:h-14/w-11/rounded-md/border/text-xl` in `auth/two-factor-setup-steps.tsx:158,164` and `auth/mfa-verification-dialog.tsx:132,138` match nothing. The slots keep `border-y border-r` but are spaced by `gap-2.5`, so slots 2, 3, 5 and 6 have no left border.
   - Fix: restore the 4 upstream data-slots.
   - *Already confirmed in the main session: 0 data-slots in the file and 4 consumer lines. The visual effect is not yet rendered.*
2. **Chart gridline recolouring never applies (all 12 chart consumers).**
   - `chart.tsx:74` rewrote upstream's `[stroke='#ccc']` / `[stroke='#fff']` as `[stroke='var(--color-border)']` / `[stroke='var(--color-background)']`.
   - Recharts' own defaults are `'#ccc'` (CartesianGrid, PolarGrid, ReferenceLine) and `'#fff'` (Pie), and no `<CartesianGrid>` sets a stroke, so gridlines stay `#ccc` in dark mode.
   - Fix: restore upstream's selectors and add `chart.tsx: ["hex"]` to `DRIFT_EXEMPTIONS`.
3. **Cmd+K palette selectors.** `command.tsx:55` `**:[&_*[data-slot=command-input-wrapper]]:h-12` needs the wrapper two levels deep, but it is one level deep, so the rule is inert. The `**:**:**:` chains match only because of cmdk's DOM depth.
   - Fix: use upstream's `CommandDialog` className and keep the intentional `h-11`.
4. **Toast styling hooks are dead.** The `sonner-toast*` classes at `toast.tsx:18-33` lost their CSS in `d6dfa2d23`, so toasts use Sonner's defaults.
   - Upstream's `--normal-bg: var(--popover)` style map would need rewriting to `--color-popover` etc., because the project defines only `--color-*`.
5. **Progress never reports its value.** This bug is in upstream too. `progress.tsx` takes `value` but doesn't forward it to the Radix Root, so `aria-valuenow` is never set and screen readers announce "indeterminate".
   - Consumers: `usage-section.tsx:112,157` and `bulk-import-confirm-step.tsx:82`; the bulk-import bar also has no `aria-label`.
6. **Invalid variant in card (latent).** `card.tsx:42` uses `has-.card-action:grid-cols-[1fr_auto]`, which generates no CSS. `CardAction` currently has no consumers.
7. **Calendar background inside popovers.** The calendar paints `bg-background` inside `PopoverContent p-0` (`--color-popover`).
   - Upstream uses `[[data-slot=popover-content]_&]:bg-transparent`, which needs popover's data-slots.

### Claimed sync hazards

8. **Tooltip.** Upstream `Tooltip` no longer wraps itself in `TooltipProvider`, and the app has no root provider. Copying it in would throw at runtime at 9 call sites unless `providers.tsx` gains `<TooltipProvider>` in the same change.
9. **Button test.** `naming-conventions.test.tsx` asserts:
   - no `data-slot` (line 21);
   - the v3 focus ring (line 103);
   - `lg` = `h-11 px-8` (line 44);
   - `text-destructive-foreground` (line 83);
   - fewer than 30 classes (line 128) — upstream's 29 plus `min-h-11` is exactly 30, so it fails.

   It encodes the Nov-2025 "no data-slot" policy, which about 20 unit tests and 4 e2e specs (`empty-title`, `stat-*`, `tour-spotlight`) contradict.
10. **Strict TypeScript.** Under `exactOptionalPropertyTypes`, upstream dropdown-menu (`checked`), slider (`value`) and sonner (`theme`) fail with TS2375. The local workarounds are deliberate and must survive a sync.

### Housekeeping and non-shadcn findings

11. **Unused in production:** `mobile-nav.tsx`, `server-sidebar-provider.tsx` and `sidebar/context.tsx` are imported only by tests or by each other.
12. **Claimed broken classes in non-shadcn files:**
    - `grid-pattern.tsx:44-51`: literal spaces inside arbitrary values, so no CSS is generated.
    - `border-beam.tsx:77`: `after:animate-border-beam` has no keyframes anywhere, so the beam never animates (15 importers).
    - `blur-fade.tsx:60-80`: classes built at runtime are never generated, `blur-0` doesn't exist (should be `blur-none`), and `inView` defaults to true, so none of its 69 importers animates.
    - `loading-spinner.tsx:53-56`: `text-(--font-*)` compiles to `color:` with undefined variables.

## Upstream changes affecting every component

- **`cn` package (2026-09).** Every component now imports from the new npm package `cn` (0.x, shadcn-maintained).
  - Recommendation: keep `#lib/utils` (clsx + tailwind-merge) and rewrite the import on every copy, or migrate deliberately with `npx shadcn migrate cn`.
- **Base UI is the default (2026-07).** new-york-v4 is still Radix, except combobox.
- **Unified `radix-ui` (2026-02).** Already done in `6fe6abb94`.
- **`data-slot` everywhere,** plus newer selectors keyed on it (`has-data-[slot=…]`, `*:data-[slot=…]`, `[[data-slot=popover-content]_&]`). **23 local components lack data-slots on parts they still ship** (inventory in "Missing data-slots" below).
- **`Slot.Root` vs `Slot.Slot`:** both are exported, so this is cosmetic.
- **`shadcn/tailwind.css`:** not needed. Only the Base UI combobox uses its variants, and `tw-animate-css` 1.4.0 covers the accordion keyframes.
- **RTL** is applied by the CLI at install time and isn't enabled here.
- **The shadcn CLI was removed (`6fe6abb94`):** syncs are manual copies, so `add --diff` isn't available.

## Classification (74 non-test files)

**shadcn core (a):** accordion, alert-dialog, alert, avatar, badge, breadcrumb, button-group, button, calendar, card, chart, chart-tooltip, checkbox, collapsible, command, dialog, dropdown-menu, empty, field, input-group, input-otp, input, item, label, popover, progress, select, separator, sheet, sidebar/context (partial), skeleton, slider, switch, table, tabs, textarea, toast (= sonner), toggle-group, toggle, tooltip, and the `Spinner` inside loading-spinner.
- `chart-tooltip` was split from chart by `d9ecaf31b` (the deliberate "<300 lines" refactor).

**Other registries (b):**
- Magic UI: bento-grid, blur-fade (rewritten without motion), border-beam, grid-pattern, number-ticker.
- DiceUI: combobox, file-upload (7 files), stat, stepper (9 files), tour (1696 lines).
- Supabase UI: dropzone.

**Project-custom (c):** animated-trend-indicator, card-layout, confirm-dialog, global-sync-indicator, glowing-effect, loading-spinner (except Spinner), mobile-nav (test-only), route-modal, server-sidebar-provider (test-only).

**Importer counts (top):** button 193, skeleton 70, blur-fade 69, card 68, input 44, badge 43, dialog 35, select 34, field 32, empty 30, label 29.

## Per-component recommendations

"Trimmed (P19)" = parts Phase 19 removed as dead; don't re-add them unless something needs them.

| Component | Status | Recommendation |
|---|---|---|
| accordion | local | No action (`typography-small` intentional). |
| alert | both | Add 3 data-slots; keep the `-text` AA tokens. |
| alert-dialog | upstream-ahead | Take upstream: `size`, `AlertDialogMedia`, and Action/Cancel through `<Button variant>`. That lets 13 hand-rolled destructive Action call sites become `variant="destructive"`. |
| avatar | upstream-ahead | Safe (`size`, AvatarBadge/Group); check `profile-card.tsx` fallback colour. |
| badge | both | Add data-slots (+ optional ghost/link); keep `rounded-md`, the size axis and the status variants; drop the unused trust entries. |
| breadcrumb | both | Add 7 data-slots and the separator `role="presentation"`; keep local typography. |
| button (193 importers) | both | One PR together with a rewrite of `naming-conventions.test.tsx`. **Adopt:** data attributes, shrink-0, icon auto-sizing, aria-invalid ring, v4 focus ring, outline shadow and dark variants. **Keep:** `min-h-11`/`min-w-11` touch targets, `typography-small`, `text-primary-text`, `text-destructive-foreground`. **Change:** `h-10 w-10` → `size-10`. Then a visual check of the 3px focus ring. |
| button-group | both | Data-slot selectors once select has its data-slot; `has-[>.button-group]` is inert today. |
| calendar | both | Upstream classes (transparent background in card/popover); keep `h-11`; ship with the card and popover data-slots. |
| card | both | 7 data-slots plus upstream's `has-data-[slot=card-action]` selector; keep the cva variants and `rounded-md`. |
| chart + chart-tooltip | both | Keep the split. Adopt `initialDimension`, which can replace the rAF mount delay once the warning is confirmed gone. Adopt the public Recharts types instead of internal paths, the data-slot, and the `#ccc`/`#fff` selectors with a `DRIFT_EXEMPTIONS` entry. |
| checkbox, collapsible, textarea | upstream-ahead | Add data-slots. |
| command | both | Upstream `CommandDialog` className; keep `h-11`. |
| dialog | both | Add `outline-none` on content (+ optional footer `showCloseButton`); keep `intent` and `DialogBody`. |
| dropdown-menu | both | Data-slots and the `text-destructive!` syntax; keep the `checked ?? false` TS guard. |
| empty | local | Keep (`empty-media` vs upstream `empty-icon`). |
| field | both | Port only `FieldError` de-duplication; keep string support for TanStack Form. |
| input | both | Data-slot; keep `inputSize`; drop the unused `invalid` variant. |
| input-group | both | 3 data-slots and upstream selectors; keep `h-11`. |
| input-otp | both | **Add the 4 data-slots now**; keep `size-11`. |
| item | local | None. |
| popover | upstream-ahead | Add the 3 data-slots (calendar needs them); optional Header/Title/Description. |
| progress | both | Data-slots; keep the variants; **forward `value` to Root**, with a comment noting the deviation. |
| select | both | Data-slots and selectors; **keep `position="popper"`** (upstream default is now item-aligned); keep `h-11`. |
| sheet | both | Data-slots and `showCloseButton`; keep the 44px close target; drop the redundant sr-only text. |
| sidebar/context | local, unused | Delete with `server-sidebar-provider` (Phase 6 vendors the canonical sidebar). |
| skeleton | local | Keep (`bg-muted`); optionally delete the unused cva. |
| slider | both | Data-slots only; keep the TS guard and the `bg-background` thumb. |
| switch | upstream-ahead | Safe (adds `size`). |
| table | both | Only `has-aria-expanded` rows; don't adopt upstream's `"use client"`. |
| tabs | both | Data-slots, orientation and variant; re-apply the brand active state; keep `h-11`. |
| toast (= sonner) | both | Icons and a token style map rewritten to `--color-*`; keep the theme guard and duration; delete the dead hooks; rename to `sonner.tsx`. |
| toggle | both | Keep; remove the unneeded `"use client"`. |
| toggle-group | upstream-ahead | Optional (`spacing`); check the chart range toggles. |
| tooltip | upstream-ahead | **Only together with** a root `<TooltipProvider>`. |

## Deprecated and legacy patterns (file:line)

- **Deprecated Radix toast:** none. `toast.tsx` is the Sonner wrapper; there is no use-toast or ToastProvider.
- **None found:** `@radix-ui/react-*` imports, `forwardRef`, `React.ElementRef`, `tailwindcss-animate`.
- **v3 focus ring:** `button.tsx:8`, `tour.tsx:1508`.
- **`outline-none` on focusable parts** (in v4 it is `outline-style:none`, so focus disappears in Windows high-contrast mode): accordion:38, checkbox:16, input:7, select:31, switch:16, tabs:62, textarea:9, toggle:6, item:33, input-group:13, input-otp:47, file-upload-dropzone:184, stepper-header:214, stepper-list:147, stepper-trigger:230, tour:1269.
- **Leading `!` important:** dropdown-menu.tsx:54; border-beam.tsx:73-74.
- **`[var(--x)]`:** tooltip.tsx:47.
- **Bare `rounded`:** skeleton.tsx:11; dropzone.tsx:120,128.
- **`w-N h-N` instead of `size-N`:** button.tsx:26; dropzone.tsx:120,128,192; global-sync-indicator.tsx:56,79,104.
- **`Slot.Slot`:**
  - badge:54, breadcrumb:39, button:46, item:61.
  - stepper-header:45,107,141,166,203; stepper-item:57; stepper-list:133; stepper-navigation:37,74; stepper-trigger:209.
  - tour:840,1253,1308,1425,1445,1465,1501,1638,1663.
- **Unneeded `"use client"`:** toggle.tsx:1.
- **Re-export barrels (CLAUDE.md rule #2):**
  - stepper-context.tsx:23-54, 56-62.
  - stepper-item.tsx:81.
  - stepper.tsx:193-218.
- **Duplicate helpers:** stepper-context.tsx:69 `useAsRef` and :79 `useLazyRef` duplicate `src/hooks/use-as-ref.ts` and `use-lazy-ref.ts`.

### Missing data-slots

- **None at all:** alert, badge, breadcrumb, button, button-group, calendar, card, chart, checkbox, collapsible, dropdown-menu, input, input-group, input-otp, popover, progress, select, sheet, slider, tabs, textarea, toggle, sidebar/context.
- **Partial:** alert-dialog, avatar, field, item, empty.
- **Complete:** accordion, command, dialog, label, separator, skeleton, switch, table, toggle-group, tooltip.

## Claimed inert classes (compiled with the repo's Tailwind 4.3.3)

| Location | Class | Why |
|---|---|---|
| two-factor-setup-steps:158,164; mfa-verification-dialog:132,138 | `*:data-[slot=input-otp-slot]:…` | slot not emitted |
| chart.tsx:74 | `[stroke='var(--color-border)' / 'var(--color-background)']` | Recharts renders `#ccc` / `#fff` |
| command.tsx:55 | `**:[&_*[data-slot=command-input-wrapper]]:h-12` | depth mismatch |
| card.tsx:42 | `has-.card-action:grid-cols-[1fr_auto]` | invalid variant |
| button-group.tsx:7 | `has-[>.button-group]:gap-2` | no element has that class |
| toast.tsx:18-33 | `sonner-toast*` | CSS deleted in `d6dfa2d23` |
| grid-pattern.tsx:44-51 | `fill-[color-mix(in oklab,…)]` / `stroke-[…]` | literal spaces |
| border-beam.tsx:77 | `after:animate-border-beam` | no keyframes |
| blur-fade.tsx:60-80 | runtime `translate-y-[${…}px]`, `blur-[${…}]`, and `blur-0` | never generated / invalid |
| loading-spinner.tsx:53-56 | `text-(--font-*)` | `color:` with undefined variables |

## Dependency check

All OK except:
- **`cn`:** required by every registry item and not installed. Intentional; rewrite imports to `#lib/utils`.
- **recharts:** the registry pins 3.8.0 and the repo is at 3.10.1. Compatible.
- **`@base-ui/react` (combobox):** absent, intentionally.

## Recommended sync order

1. **Restore all data-slots first.** It's additive and fixes input-otp. Rewrite `naming-conventions.test.tsx` in the same PR.
2. **Copy each component:**
   1. Fetch the item JSON.
   2. Rewrite aliases and `cn` → `#lib/utils`; use named React imports.
   3. Run Biome.
   4. Re-apply the local customizations: 44px sizing, `-text` tokens, `typography-small` / `flex-center`, dialog `intent` + `DialogBody`, the badge/card/progress/input variants, table cells without nowrap, the strict-TypeScript guards, the `bg-background` slider thumb, the chart split.
   5. Don't re-add Phase-19-trimmed parts.
3. **Order:**
   1. input-otp, plus the card/popover/select/button data-slots (with the test rewrite).
   2. calendar with card and popover.
   3. chart.
   4. command.
   5. alert-dialog (+ the 13 call sites).
   6. tooltip, only with a root provider.
   7. The additive props.
   8. Local fixes upstream lacks: Progress `value`, FieldError de-duplication, sonner token map + rename.
4. **Delete rather than sync:** mobile-nav, server-sidebar-provider, sidebar/context and their tests.
5. **Outside the shadcn sync:** grid-pattern, border-beam, blur-fade, the `hsl(var(--primary))` props, the stepper re-export barrel.
