# Phase 47 Research — Accessibility
_Fix-approach research + will-fix validation for A11Y-01..41. Source: .planning/audits/2026-07-11-full-audit.md_

## A11Y-01 — Unit status badge text illegible in light mode
- **Finding:** src/app/(owner)/properties/units/components/unit-status-badge.tsx:42 (high) — badge labels use near-white `*-foreground` text on 10% tint of the same hue → white-on-white in light mode.
- **Root cause:** `statusConfig` pairs a light-alpha background with the `-foreground` token (occupied `text-accent-foreground`, available `text-primary-foreground`, maintenance `text-destructive-foreground`). Those `-foreground` tokens are the *fill's* contrasting color (near-white, oklch ~0.98), correct on a solid `bg-accent`/`bg-primary` fill but catastrophic on a 10% tint over a white card. The `dark:text-<token>` overrides mask the bug so only light mode is broken; the vivid `dark:text-destructive` also fails AA in dark per the vivid-token rule.
- **Fix:** Replace the text token in each of the four `className` strings with the theme-aware `-text` companion and drop the per-mode `dark:text-*` overrides (the `-text` tokens already carry light+dark values, globals.css:181-185 / 675-679):
  - occupied → `bg-accent/10 text-success-text border-accent/20 dark:bg-accent/20 dark:border-accent/80`
  - available → `bg-primary/10 text-primary-text border-primary/20 dark:bg-primary/20 dark:border-primary/80`
  - maintenance → `bg-destructive/10 text-destructive-text border-destructive/20 dark:bg-destructive/20 dark:border-destructive/80`
  - reserved → `bg-muted text-muted-foreground border-border dark:bg-muted/20 dark:text-muted-foreground dark:border-muted/80` (also fixes A11Y-07)
- **Why it fixes it:** The `-text` companions are documented (globals.css:173-180) as the AA-safe (>=4.5:1) foreground tokens for both themes; swapping `-foreground`→`-text` turns the ~1:1 white-on-white into readable dark-on-tint in light and readable light-on-tint in dark, resolving the verifier's "roughly 1:1 contrast" evidence. Because tailwind-merge already lets `className` beat the Badge variant's solid `bg-primary/text-white`, the new `-text` color wins for the same reason the broken one did.
- **Risks / interactions:** occupied keeps an accent-hued bg/border but success-hued text; accent (hue 160) and success (hue 158) are the same green, so visually indistinguishable. Same file + same component as A11Y-07 — fix both in one edit. Component renders in units columns + unit-detail-dialogs + unit-actions; no logic change.
- **Files touched:** src/app/(owner)/properties/units/components/unit-status-badge.tsx
- **Decision:** occupied reuses `text-success-text` (no new token, matches maintenance-card.tsx precedent). Alternative: add a dedicated `--color-accent-text` companion pair to globals.css (light `oklch(0.5 0.15 160)`, dark `oklch(0.8 0.16 160)`) to preserve the literal accent identity — rejected as higher blast radius for a visually identical result.

## A11Y-02 — Icon-only remove-clause button + unassociated clause label
- **Finding:** src/app/(owner)/documents/templates/components/clauses-editor.tsx:51 (medium) — Trash2 button has no accessible name; `<Label>Clause N</Label>` unassociated, input placeholder-only.
- **Root cause:** Lucide SVGs render `aria-hidden`, so an icon-only `<Button>` with no `aria-label` has an empty accessible name (Class 1). Radix `Label` (label.tsx) passes props through with no auto-association and Input (input.tsx) generates no id, so the visible label names nothing (Class 2).
- **Fix:** (1) Add `aria-label={`Remove clause ${index + 1}`}` to the Trash2 Button (line 51). (2) Give the row a stable id from the existing `clause.id`: `htmlFor={`clause-${clause.id}`}` on the Label and `id={`clause-${clause.id}`}` on the Input.
- **Why it fixes it:** The button gains a non-empty accessible name (resolves the CLAUDE.md icon-only-button rule the verifier cites); the htmlFor/id pair makes clicking the label focus the input and gives the input its programmatic name.
- **Risks / interactions:** None — additive attributes only. Sibling of A11Y-03/04/05 (Class 1) and A11Y-06/29/36 (Class 2).
- **Files touched:** src/app/(owner)/documents/templates/components/clauses-editor.tsx

## A11Y-03 — Icon-only remove-field button + unassociated field label
- **Finding:** src/app/(owner)/documents/templates/components/custom-fields-editor.tsx:58 (medium) — Trash2 button unnamed; `<Label>Field N</Label>` unassociated; Label/Value inputs placeholder-only.
- **Root cause:** Same two classes as A11Y-02. Rows are keyed by index (no stable id on `CustomField`).
- **Fix:** (1) `aria-label={`Remove field ${index + 1}`}` on the Trash2 Button (line 58). (2) The `<Label>Field N</Label>` (line 57) is a group heading, not a single-control label — leave as text (it need not associate). Give the two real inputs (lines 68/75) `id={`custom-field-${index}-label`}` / `id={`custom-field-${index}-value`}` and add `aria-label="Label"` / `aria-label="Value"` (matching their placeholders, which vanish on typing per WCAG 3.3.2).
- **Why it fixes it:** Button gains a name; each input gets a stable accessible name that survives typing.
- **Risks / interactions:** None; additive. Class 1 + Class 3 sibling.
- **Files touched:** src/app/(owner)/documents/templates/components/custom-fields-editor.tsx

## A11Y-04 — Icon-only remove-list-item button + unassociated list labels
- **Finding:** src/app/(owner)/documents/templates/components/dynamic-form.tsx:132 (medium) — list-item Trash2 button unnamed; `<Label>{field.label}</Label>` (line 113) and item `<Label>` (line 187) unassociated, item inputs placeholder-only.
- **Root cause:** Same two classes. `field.name` is unique per field; list index is unique per item; `itemField.key` is unique per item column — enough to synthesize stable ids.
- **Fix:** (1) `aria-label={`Remove ${field.itemLabel ?? "item"} ${index + 1}`}` on the Trash2 Button (line 132). (2) Line 113 `<Label>{field.label}</Label>` labels the whole list group, not one control — change to a plain `<p className="text-sm font-medium">` (or `<legend>`) so it does not imply an unfulfilled form-control association. (3) For the item inputs (line 190): add `id={`${field.name}-${index}-${itemField.key}`}` and set `htmlFor` to the same on the item Label at line 187.
- **Why it fixes it:** Button gains a name; the group heading no longer falsely claims to label a control; each item input gets a programmatic name via htmlFor/id.
- **Risks / interactions:** `field.name` values are validated to `^[a-zA-Z][a-zA-Z0-9_]*$` (form-builder-panel VALID_FIELD_NAME_PATTERN) so the synthesized ids are DOM-id-safe. Additive otherwise. Class 1 + Class 2 sibling.
- **Files touched:** src/app/(owner)/documents/templates/components/dynamic-form.tsx

## A11Y-05 — Icon-only remove-custom-field button has no aria-label
- **Finding:** src/app/(owner)/documents/templates/components/form-builder-panel.tsx:150 (medium) — Trash2 remove-field button unnamed.
- **Root cause:** Class 1 (icon-only button, empty accessible name).
- **Fix:** Add `aria-label={`Remove custom field ${index + 1}`}` to the Button at line 150.
- **Why it fixes it:** Gives the destructive control a non-empty accessible name, satisfying the CLAUDE.md icon-only-button rule the verifier cites.
- **Risks / interactions:** None; additive. Same file as A11Y-06.
- **Files touched:** src/app/(owner)/documents/templates/components/form-builder-panel.tsx

## A11Y-06 — Form-builder inputs have visible labels with no programmatic association
- **Finding:** src/app/(owner)/documents/templates/components/form-builder-panel.tsx:161 (medium) — five `<Label>` (161/170/185/205/216) lack htmlFor; paired Inputs (162/171/217) and the Type Select (186) and Options input have no id → empty accessible name (axe "label" failure).
- **Root cause:** Class 2 — Radix Label + bare Input generate no ids; nothing links the visible labels to their controls.
- **Fix:** Introduce a per-row id base (e.g. `const rowId = `builder-field-${index}`` — index is already the map key). Wire each pair: `htmlFor={`${rowId}-label`}`/`id` (Label input 161/162), `${rowId}-key` (170/171), `${rowId}-type` on `<Label htmlFor>` + `<SelectTrigger id={`${rowId}-type`}>` (185/186), `${rowId}-section` (205/206), `${rowId}-options` (216/217). SelectTrigger accepts an `id` (used the same way in dynamic-form.tsx:234).
- **Why it fixes it:** Each control gains a programmatic name and label-click focus, clearing the axe form-field-has-label / WCAG 4.1.2 failure the verifier confirmed. The Section input keeps its placeholder fallback but now has a real label too.
- **Risks / interactions:** None; additive. Depends on nothing. Class 2 sibling.
- **Files touched:** src/app/(owner)/documents/templates/components/form-builder-panel.tsx

## A11Y-07 — Bare `dark:text-muted` on reserved badge (dark-on-dark)
- **Finding:** src/app/(owner)/properties/units/components/unit-status-badge.tsx:50 (medium) — reserved status uses `dark:bg-muted/20 dark:text-muted`; `--muted` is a surface token, so "Reserved" renders dark-on-dark (~1.1:1) in dark mode.
- **Root cause:** `text-muted` uses the muted *surface* color as text; CLAUDE.md mandates `text-muted-foreground` for muted text and forbids bare `text-muted`.
- **Fix:** Folded into the A11Y-01 rewrite of `statusConfig.reserved` → `bg-muted text-muted-foreground border-border dark:bg-muted/20 dark:text-muted-foreground dark:border-muted/80` (theme-aware `text-muted-foreground` in both modes).
- **Why it fixes it:** `--muted-foreground` is the readable foreground token (light oklch 0.48, dark 0.74) that clears contrast on the muted tint in both themes, resolving the ~1.1:1 evidence.
- **Risks / interactions:** Same file/edit as A11Y-01 — apply the four-status rewrite once. No logic change.
- **Files touched:** src/app/(owner)/properties/units/components/unit-status-badge.tsx

## A11Y-08 — Date-filter clear control is a role="button" div with no key handler
- **Finding:** src/components/data-table/data-table-date-filter.tsx:180 (medium) — nested `role="button" tabIndex={0}` div with `onClick={onReset}` only, inside the PopoverTrigger Button; keyboard cannot reach onReset.
- **Root cause:** Class 6 (shared with A11Y-09/10). The clear affordance is rendered as the trigger button's leading icon; to avoid a `<button>`-in-`<button>` the upstream lib used a `role="button"` div but never added `onKeyDown`, so divs get no native Enter/Space activation.
- **Fix (un-nest into a sibling real `<button>`):** Move the clear affordance out of the PopoverTrigger `<Button>` so there is no `<button>`-in-`<button>`. Wrap the `<PopoverTrigger asChild>` in a `relative inline-flex items-center` container and, when `hasValue`, render the clear control as a sibling native `<button type="button">` overlaying the vacated leading-icon slot: `<button type="button" aria-label={`Clear ${title} filter`} onClick={onReset} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><XCircle className="size-4" /></button>`. Inside the trigger `Button`, delete the `role="button" tabIndex={0}` div (lines 179-187) entirely; render `<CalendarIcon />` only when `!hasValue`, and add left padding to the trigger when `hasValue` (`className={cn("border-dashed font-normal", hasValue && "pl-8")}`) so the overlaid clear button sits where the icon was. Radix Popover uses React context, so wrapping the trigger in a positioning div does not break trigger/content anchoring.
- **Why it fixes it:** A native `<button>` rendered as a sibling of (not a descendant of) the trigger is keyboard-operable for free (native Enter/Space), gains a visible focus ring, and — because it is no longer nested inside the trigger's `<button>` — eliminates the axe nested-interactive / invalid-markup defect the verifier explicitly cited, while still reading visually as the chip's leading clear icon. This is the un-nesting the finding text prescribes ("a sibling real `<button>` outside the trigger").
- **Risks / interactions:** `onReset` keeps its `MouseEvent` signature and still fires from the native button's `onClick`; its `event.stopPropagation()` is now harmless (the button no longer sits inside the trigger, so clicking it cannot toggle the popover), so **no signature change and no `onKeyDown` are needed**. z-order: the clear button at `z-10` overlays only the leading-icon slot; clicking the label still opens the popover. A11Y-09 (faceted) and A11Y-10 (slider) are Class 6 siblings with the identical nested-`role="button"`-div defect and must take the same sibling-`<button>` un-nesting — the class-wide keydown-on-div approach does NOT clear their nested-interactive markup either. COMP (41) may touch data-table; rebase.
- **Files touched:** src/components/data-table/data-table-date-filter.tsx
- **Decision:** Un-nest into a sibling native `<button>` (root-cause fix; removes the button-in-button). The earlier keydown-on-div approach is rejected: it restores keyboard activation but leaves the `role="button" tabIndex={0}` div nested inside the trigger `<button>` — the exact axe nested-interactive / invalid-markup defect the verifier flagged. Alternative recorded: hoist the reset into a full separate control row above the chip — rejected as a larger visual change than the absolutely-positioned sibling overlay. (Supersedes the Class 6 cross-cutting note's keydown-on-div choice for this REQ and its 09/10 siblings.)

## A11Y-09 — Faceted-filter clear control is a role="button" div with no key handler
- **Finding:** src/components/data-table/data-table-faceted-filter.tsx:83 (medium) — same nested `role="button"` div, `onClick={onReset}`, no `onKeyDown`.
- **Root cause:** Class 6, identical to A11Y-08.
- **Fix:** Apply the same shared `onKeyDown` (Enter/Space → `onReset()`, prevent default + stop propagation). `onReset` here already accepts an optional event, so no signature change needed.
- **Why it fixes it:** Same WCAG 2.1.1 restoration. A keyboard-reachable "Clear filters" CommandItem exists in the popover (lines 168-178) as a backstop, but the labeled trigger control becomes operable too.
- **Risks / interactions:** None beyond Class 6. `"use no memo"` directive at top is unrelated.
- **Files touched:** src/components/data-table/data-table-faceted-filter.tsx

## A11Y-10 — Slider-filter clear control is a role="button" div with no key handler
- **Finding:** src/components/data-table/data-table-slider-filter.tsx:135 (medium) — nested `role="button"` div, `onClick={onReset}`, no `onKeyDown`.
- **Root cause:** Class 6, identical.
- **Fix:** Same shared `onKeyDown`. `onReset` here guards `event.target instanceof HTMLDivElement` before `stopPropagation`; adjust so the keyboard path (no DOM event) still resets — call `onReset()` and make the guard tolerate a missing/keyboard event, or route the keydown to `column.setFilterValue(undefined)` directly.
- **Why it fixes it:** Restores keyboard reset; a real `<Button>Clear</Button>` already exists in PopoverContent (lines 227-234) as a backstop but the trigger control becomes operable.
- **Risks / interactions:** The `onReset` guard refactor is the only subtlety — keep the click-path behavior (stopPropagation on the div) intact. Class 6 sibling.
- **Files touched:** src/components/data-table/data-table-slider-filter.tsx

## A11Y-11 — Hover-only pending-photo remove button invisible on keyboard focus
- **Finding:** src/components/inspections/inspection-photo-upload.tsx:295 (medium) — `opacity-0 group-hover:opacity-100` with no focus companion on a tab-focusable `<button>`.
- **Root cause:** Class 5 (hover-only reveal). `opacity:0` keeps the element in tab order but hides it and its focus ring, so keyboard focus lands on an invisible control (WCAG 2.4.7).
- **Fix:** Add `focus-visible:opacity-100` to the class list at line 295 (the button is itself the focus target).
- **Why it fixes it:** On keyboard focus the button becomes fully opaque with a visible focus ring; hover behavior unchanged. The sibling error-state Retry/Remove buttons (lines 270-285) are always visible, so only this one needs the companion.
- **Risks / interactions:** None; purely additive class. Class 5 sibling.
- **Files touched:** src/components/inspections/inspection-photo-upload.tsx

## A11Y-12 — Vivid success/warning tokens on visible small text in landing previews
- **Finding:** src/components/landing/feature-backgrounds.tsx:171 (medium) — `text-success`/`text-warning` on `text-xs` status/percent/badge text (also lines 38, 241, 312-313) fail AA (~2.6:1 / ~2.2:1 light).
- **Root cause:** Class 4 (vivid token used as TEXT). Vivid `--color-{success,warning}` are tuned for fills; globals.css:173-180 provides `-text` companions for text.
- **Fix (class-wide with A11Y-22):** Swap the TEXT usages to `-text` companions — line 38 `text-success`→`text-success-text`; line 171 `text-warning`/`text-success`→`text-warning-text`/`text-success-text`; line 241 `text-success`→`text-success-text`; lines 312-313 badge text `text-success`/`text-warning`→`text-success-text`/`text-warning-text` (keep the `bg-*/10` tints). Leave `border-l-warning/info/success` (lines 192/203/220) and icon/dot fills untouched — those are fills, not text.
- **Why it fixes it:** `-text` companions clear AA in both themes; the verifier's cited ~2.6/2.2:1 ratios rise above 4.5:1 for small text.
- **Risks / interactions:** Pure token swap, near-identical hue at readable lightness. This is a marketing component — Phase 46 (MKTUI) runs before 47 and may touch this file; rebase and re-confirm the four line locations before editing. Class 4 sibling.
- **Files touched:** src/components/landing/feature-backgrounds.tsx

## A11Y-13 — Mobile nav submenu only expandable via raw SVG chevron
- **Finding:** src/components/layout/navbar/navbar-mobile-menu.tsx:72 (medium) — `onClick` on the `ChevronDown` SVG nested inside the `<Link>`; SVG is not focusable, no role/keyboard/aria-expanded. Keyboard/AT users cannot open the submenu (Enter navigates the Link instead).
- **Root cause:** Interaction attached to a non-interactive, non-focusable element that is also a child of a link (WCAG 2.1.1 Level A). Only "Resources" (types.ts:37-47) has a dropdown.
- **Fix:** Restructure the row: wrap the `<Link>` and a new sibling `<button type="button">` in a flex container (Link no longer contains the toggle). The button carries `aria-expanded={openDropdown === item.name}`, `aria-controls={submenuId}`, `aria-label={`Toggle ${item.name} submenu`}`, and the `onClick={() => handleDropdownToggle(item.name)}`; render the `ChevronDown` (aria-hidden) inside it. Give the submenu container an `id={submenuId}` (e.g. `mobile-submenu-${item.name}`).
- **Why it fixes it:** The toggle becomes a real, focusable, keyboard-operable button with announced expanded state; the Link keeps pure navigation. Non-dropdown items render just the Link (unchanged).
- **Risks / interactions:** Layout: the Link currently uses `justify-between` to push the chevron right; moving the chevron to a sibling button requires the flex container to own that spacing. This file already uses Radix `Sheet` so sheet-level focus is fine. Marketing/navbar surface — Phase 46 (MKTUI) may touch it; rebase.
- **Files touched:** src/components/layout/navbar/navbar-mobile-menu.tsx

## A11Y-14 — Leases status select has no name; search input placeholder-only
- **Finding:** src/components/leases/table/leases-table-toolbar.tsx:49 (medium) — native `<select>` (49-63) has no label/aria-label (options never name a select); search `<input>` (29-35) placeholder-only.
- **Root cause:** Class 3 (placeholder-only / unnamed controls). Sibling property-toolbar.tsx:44/52 establishes the `aria-label` pattern.
- **Fix:** Add `aria-label="Filter by status"` to the `<select>` (line 49) and `aria-label="Search leases"` to the search `<input>` (line 29), matching property-toolbar/tenant-toolbar.
- **Why it fixes it:** The select gains a name (clears the axe select-name failure); the input keeps a stable name after typing.
- **Risks / interactions:** None; additive. Class 3 sibling.
- **Files touched:** src/components/leases/table/leases-table-toolbar.tsx

## A11Y-15 — Icon-only pagination buttons have no aria-label
- **Finding:** src/components/leases/table/leases-table.tsx:229 (medium) — prev/next `<button>`s contain only `ChevronLeft`/`ChevronRight`, no accessible name.
- **Root cause:** Class 1 (icon-only buttons).
- **Fix:** Add `aria-label="Previous page"` to the button at line 229 and `aria-label="Next page"` to the button at line 239.
- **Why it fixes it:** Screen readers announce the pagination controls by purpose instead of "unnamed button".
- **Risks / interactions:** None; additive. Class 1 sibling.
- **Files touched:** src/components/leases/table/leases-table.tsx

## A11Y-16 — Hover-only "More options" button is invisible on focus and does nothing
- **Finding:** src/components/maintenance/cards/maintenance-card.tsx:113 (medium) — `opacity-0 group-hover:opacity-100` no focus reveal; `onClick` only stopPropagation/preventDefault (dead control); also nested inside the card's outer `<button>`/`<Link>`.
- **Root cause:** A focusable, invisible, no-op control that is additionally a nested interactive element (the whole card is a `<button>` at line 156 or `<Link>` at 163).
- **Fix:** Remove the dead "More options" `<button>` (lines 108-117) entirely — it has no menu, no handler beyond event-swallowing, and no design counterpart. The removal forces two consequential edits the prior plan omitted: (1) drop `MoreHorizontal` from the `lucide-react` import at line 3 → `import { Clock, MapPin, User } from "lucide-react";` so `noUnusedLocals` stays clean (it is the button's only consumer); (2) delete the now-obsolete `has more options button` unit test at `src/components/maintenance/__tests__/maintenance-card.test.tsx:177-184` — it asserts `getByRole("button", { name: /more options/i })`, a control that no longer exists (removing a test for removed behavior is correct, not a `.skip`). After removal the header `<div className="flex items-start justify-between ...">` holds only the `<h4>`; `justify-between` is harmless with one child, leave the title spacing unchanged.
- **Why it fixes it:** Deleting the dead control removes the invisible focus target (WCAG 2.4.7), the no-op activation, and the nested-interactive markup (the button was nested inside the card's outer `<button>` at line 156 / `<Link>` at 163) in one move — the only genuine root-cause fix for a control that does nothing. Pruning the orphaned import and the stale test keeps `typecheck` (`noUnusedLocals`) and the unit suite green, which the rejected plan did not account for.
- **Risks / interactions:** The `has more options button` test is the sole reference to the button (grep of maintenance-card.test.tsx confirms one match) and `MoreHorizontal` has no other use in the file. Consumers maintenance-sortable-card / maintenance-kanban.client render the card body unchanged. Coverage: removing one assertion for deleted behavior does not affect the 80% threshold on the retained tests.
- **Files touched:** src/components/maintenance/cards/maintenance-card.tsx, src/components/maintenance/__tests__/maintenance-card.test.tsx
- **Decision:** Remove chosen over wiring a real `DropdownMenu`. There is no defined menu action for a maintenance card here (view is handled by the card click / Link), so adding a menu would be net-new scope; crucially, a `DropdownMenu` trigger would still be nested inside the card's outer `<button>`/`<Link>`, so it would NOT clear the nested-interactive defect — only removal does. Alternative: restructure the card so a menu button is a sibling of the outer link and build real actions — deferred to a product decision, out of A11Y scope.

## A11Y-17 — Icon-only Download/export button has no aria-label
- **Finding:** src/components/maintenance/detail/maintenance-header-card.tsx:94 (medium) — `<Button ... onClick={onExport}>` contains only `<Download />`.
- **Root cause:** Class 1 (icon-only button).
- **Fix:** Add `aria-label="Export request"` to the Button at line 94.
- **Why it fixes it:** Gives the export control a non-empty accessible name next to the labeled Edit button.
- **Risks / interactions:** None; additive. Class 1 sibling.
- **Files touched:** src/components/maintenance/detail/maintenance-header-card.tsx

## A11Y-18 — Gallery images open the lightbox via a clickable div with no keyboard access
- **Finding:** src/components/properties/property-image-gallery.tsx:128 (medium) — each tile is `<div ... onClick={() => goToImage(idx)}>` with no role/tabIndex/key handler; the only focusable child is the editable-mode delete Button.
- **Root cause:** Interactive behavior on a non-interactive `<div>` (WCAG 2.1.1). `goToImage` (use-lightbox-state.ts) is the sole opener.
- **Fix:** Keep the tile `<div>` as a positioning container but **remove its `onClick` and `cursor-pointer`** (line 128-131), and add a real, absolutely-positioned trigger `<button>` layered **on top of** the image (not beneath it): `<button type="button" className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset" aria-label={`View property image ${idx + 1}`} onClick={() => goToImage(idx)} />`. Layer the decorative elements so clicks reach the right target: the `<Image>` stays below the trigger (it renders `position:absolute` with auto z-index under `z-10`; add `pointer-events-none` to be explicit), the Primary `Badge` and the "+N more" overlay get `pointer-events-none` (raise the badge's z-index if it must stay visually above) so mouse clicks over them still open the lightbox, and the editable-mode delete `<Button>` gets a **higher** z-index than the trigger (`z-20`) so its own click region wins. The delete `<Button>` stays a sibling of the trigger inside the tile `<div>` — never nested — so there is no button-in-button.
- **Why it fixes it:** Placing the native `<button>` at `z-10` **above** the image makes it the topmost hit target for BOTH mouse and keyboard: the existing mouse open-lightbox flow is preserved (the rejected `z-0` placement put the trigger *beneath* the pointer-events-enabled `<Image>`, so mouse clicks landed on the image and never reached the button — a regression of the current behavior) while gaining keyboard operability (Tab + Enter/Space) and a named control, resolving the confirmed WCAG 2.1.1 failure without nesting interactives.
- **Risks / interactions:** z-index ordering is the crux — image (bottom, `pointer-events-none`) < trigger (`z-10`) < delete button (`z-20`); the Primary badge and "+N more" overlay MUST be `pointer-events-none` or they intercept clicks meant for the trigger. The delete Button already `stopPropagation`s, but with the higher z-index its click region wins outright. Same file as A11Y-19 (delete-button focus reveal); do both in one edit.
- **Files touched:** src/components/properties/property-image-gallery.tsx

## A11Y-19 — Hover-only delete-image button invisible on keyboard focus
- **Finding:** src/components/properties/property-image-gallery.tsx:154 (medium) — `opacity-0 group-hover:opacity-100` on a tab-focusable destructive `<Button>` with no focus reveal.
- **Root cause:** Class 5 (hover-only reveal hides the focused control + ring).
- **Fix:** Add `focus-visible:opacity-100` to the delete Button's className at line 154.
- **Why it fixes it:** Keyboard focus makes the destructive control and its ring visible (WCAG 2.4.7); hover unchanged.
- **Risks / interactions:** None; additive. Same file as A11Y-18. Class 5 sibling.
- **Files touched:** src/components/properties/property-image-gallery.tsx

## A11Y-20 — Columns menu trigger lacks aria-expanded and the menu has no Escape
- **Finding:** src/components/properties/property-table-toolbar.tsx:36 (medium) — hand-rolled dropdown dismissed only by a click-only backdrop (line 54); trigger has no `aria-expanded`/`aria-haspopup`, no Escape handling.
- **Root cause:** Custom disclosure lacking ARIA state + keyboard dismissal (Class 7); violates the CLAUDE.md overlay rule (Escape handler required).
- **Fix:** On the trigger Button (line 36) add `aria-expanded={showColumnMenu}` and `aria-haspopup="true"`. Add Escape dismissal without touching the parent: put `onKeyDown={(e) => { if (e.key === "Escape") onCloseColumnMenu(); }}` on the menu container (line 55) with `tabIndex={-1}` + mount-focus, or add a `useEffect` in the toolbar that binds a `document` keydown listener while `showColumnMenu` is true and calls `onCloseColumnMenu()` on Escape. The parent already exposes `onCloseColumnMenu` (property-table.tsx:146).
- **Why it fixes it:** ARIA state is announced; Escape closes the overlay per the project pattern.
- **Risks / interactions:** Same file as A11Y-39. If a `document`-level listener is used, clean it up on unmount / when the menu closes. State lives in property-table.tsx but the fix stays within the toolbar via the existing `onCloseColumnMenu` prop — no parent edit required. DASH (42) / COMP (41) may touch property table; rebase.
- **Files touched:** src/components/properties/property-table-toolbar.tsx
- **Decision:** Add ARIA + Escape to the hand-rolled menu (minimal). Alternative: replace with the shadcn `DropdownMenu` primitive (gets ARIA + Escape + focus for free) — larger refactor touching the parent's `showColumnMenu` state model; deferred.

## A11Y-21 — Hover-only remove-image button invisible on keyboard focus
- **Finding:** src/components/properties/sections/property-images-create-section.tsx:98 (medium) — `opacity-0 group-hover:opacity-100` on a focusable `<button>`, no focus reveal.
- **Root cause:** Class 5 (identical to A11Y-11/19).
- **Fix:** Add `focus-visible:opacity-100` to the button className at line 98.
- **Why it fixes it:** Keyboard focus reveals the control over each pending preview (WCAG 2.4.7).
- **Risks / interactions:** None; additive. Class 5 sibling.
- **Files touched:** src/components/properties/sections/property-images-create-section.tsx

## A11Y-22 — Vivid success/warning/info/destructive tokens on visible small text (homepage mockup)
- **Finding:** src/components/sections/hero-dashboard-mockup.tsx:211 (medium) — trend text (`text-success`/`text-destructive`), revenue delta (line 93), and badge maps (lines 240-242, 288-290) use vivid tokens as `text-xs` text; below 4.5:1.
- **Root cause:** Class 4 (vivid token as TEXT), same as A11Y-12.
- **Fix:** Swap TEXT usages to `-text` companions: line 93 `text-success`→`text-success-text`; StatCard line 211 `text-success`/`text-destructive`→`text-success-text`/`text-destructive-text`; QuickAction `badgeColors` (240-242) `text-warning`/`text-info`/`text-success`→`-text` variants; ActivityItem `statusColors` (288-290) same. Leave the traffic-light dots (lines 23-25 `bg-*/60`) and chart bar fills untouched (fills, not text).
- **Why it fixes it:** `-text` companions clear AA in both themes for small text, resolving the verifier-confirmed sub-4.5:1 ratios.
- **Risks / interactions:** Homepage marketing surface — Phase 46 (MKTUI) runs before 47 and may edit this file; rebase and re-locate the lines. Class 4 sibling.
- **Files touched:** src/components/sections/hero-dashboard-mockup.tsx

## A11Y-23 — Settings dropdown trigger lacks aria-expanded/haspopup and menu has no Escape
- **Finding:** src/components/shell/main-nav.tsx:150 (medium) — SettingsMenu trigger `<button>` has no `aria-expanded`/`aria-haspopup`; upward dropdown closes only via click-only backdrop (line 116); the app-shell Escape handler is gated on `sidebarOpen` and can't reach local `isOpen`.
- **Root cause:** Custom disclosure lacking ARIA state + Escape dismissal (Class 7); violates overlay rule.
- **Fix:** On the Settings trigger (line 150) add `aria-expanded={isOpen}` and `aria-haspopup="true"`. Add Escape handling scoped to the SettingsMenu: a `useEffect` that binds a keydown listener while `isOpen` and calls `setIsOpen(false)` on Escape (mirrors tenant-detail-sheet's pattern), or `onKeyDown` on the menu container.
- **Why it fixes it:** ARIA state announced; Escape closes the local dropdown (WCAG 4.1.2 + project overlay rule).
- **Risks / interactions:** Same file as A11Y-24/40. Keep listener cleanup. DASH (42) touches shell; rebase.
- **Files touched:** src/components/shell/main-nav.tsx
- **Decision:** Add ARIA + Escape (minimal). Alternative: replace SettingsMenu with shadcn `DropdownMenu` — larger, deferred.

## A11Y-24 — Collapsed sidebar submenu links remain keyboard-focusable while hidden
- **Finding:** src/components/shell/main-nav.tsx:217 (medium) — collapsed sections hide children with `max-h-0 opacity-0 overflow-hidden`; the child `<Link>`s stay in the DOM and tab order (opacity/overflow don't remove focusability).
- **Root cause:** Visual-only hiding (`opacity:0` + clipping) leaves elements in the tab order and a11y tree; `expandedItems` defaults to empty so all 8 submenu links are focusable-but-invisible.
- **Fix:** Add the `inert` attribute to the collapsing wrapper when collapsed: `<div inert={!isExpanded ? true : undefined} className={...}>` (React 19 supports `inert`). This removes the children from tab order and the a11y tree while preserving the max-h collapse animation. Optionally also `aria-hidden={!isExpanded}` for older AT.
- **Why it fixes it:** `inert` is exactly the mechanism (like `display:none`/`visibility:hidden`) that removes descendants from focus + a11y, which `opacity`/`overflow` do not — resolving the verifier's "clipped-invisible yet remain in the DOM" evidence without breaking the transition.
- **Risks / interactions:** Same file/feature as A11Y-40 (the toggle button gets `aria-expanded`); pair them. `inert` toggling mid-animation is fine (it doesn't affect layout). React 19 typing for `inert` is boolean — pass `true`/`undefined`.
- **Files touched:** src/components/shell/main-nav.tsx

## A11Y-25 — Custom tenant profile dialog has no focus management
- **Finding:** src/components/tenants/tenant-detail-sheet.tsx:62 (medium) — portal `role="dialog"` handles Escape + scroll-lock but never moves focus in, has no focus trap, no `aria-modal`; Tab walks the obscured background.
- **Root cause:** Hand-rolled portal dialog that reimplements half the overlay contract and skips focus management, bypassing the project's Radix `ui/sheet.tsx` which provides focus trap + restore + `aria-modal` for free.
- **Fix:** Migrate to the Radix `Sheet`/`SheetContent side="right"` primitive (already used by navbar-mobile-menu.tsx). Wrap the existing header/body/footer JSX in `<Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent side="right" className="...preserve width/styles...">...`. Drop the manual `createPortal`, the manual overlay div, the manual Escape `useEffect`, and the manual `document.body.style.overflow` lock — Radix Dialog handles portal, overlay, Escape, scroll-lock, focus trap, focus restore, and `aria-modal`. Keep the accessible name via `SheetTitle` (the existing `<h2>`) or `aria-label`.
- **Why it fixes it:** Radix moves focus into the panel on open, traps Tab inside, restores focus to the trigger on close, and marks the background inert via `aria-modal` — resolving every gap the verifier listed with the project's mandated primitive.
- **Risks / interactions:** The custom styling (`inset-y-2 right-2 rounded-lg ring bg-overlay`, `maxWidth: 28rem`, custom enter/exit animations) must be reproduced via `SheetContent`'s `className`; verify panel width and animations after migration. Radix requires a title — provide `SheetTitle` or `aria-label`. FORM (38) / COMP (41) may touch tenant components; rebase.
- **Files touched:** src/components/tenants/tenant-detail-sheet.tsx
- **Decision:** Migrate to Radix `Sheet` (CLAUDE.md-preferred; verifier explicitly flags the bypass). Alternative: keep the hand-rolled portal and add manual focus-on-open + focus trap + `aria-modal="true"` + focus restore — more custom a11y code to maintain and easier to get subtly wrong; rejected.

## A11Y-26 — Bento card CTA link focusable while hidden in a hover-only reveal
- **Finding:** src/components/ui/bento-grid.tsx:79 (medium) — CTA wrapper is `translate-y-full opacity-0`, revealed only by `group-hover`; the `<Link>` stays in tab order while invisible/off-card.
- **Root cause:** Class 5 (hover-only reveal) applied to a container holding a focusable link, with no focus-within companion.
- **Fix:** Add focus-within reveal to the CTA wrapper (line 79): `group-focus-within:translate-y-0 group-focus-within:opacity-100` alongside the existing `group-hover:*`.
- **Why it fixes it:** When the inner `<Link>` receives keyboard focus, `:focus-within` on the card reveals the CTA into view, so the focused control is visible (WCAG 2.4.7). Hover behavior unchanged.
- **Risks / interactions:** Shared UI primitive used by bento-features-section (landing). MKTUI (46) may touch landing; rebase. Class 5 sibling (container-level variant).
- **Files touched:** src/components/ui/bento-grid.tsx

## A11Y-27 — Photo evidence file input has no label or aria-label
- **Finding:** src/app/(owner)/documents/templates/components/photo-evidence-card.tsx:28 (low) — `<Input type="file" ...>` with no id/label/aria-label; the CardTitle is a sibling, not linked.
- **Root cause:** Class 3 (unnamed control) — file input named only implicitly.
- **Fix:** Add `aria-label="Upload photo evidence"` to the file Input at line 28.
- **Why it fixes it:** Gives the file chooser an explicit accessible name (WCAG 4.1.2) instead of a generic unnamed control.
- **Risks / interactions:** None; additive. Class 3 sibling.
- **Files touched:** src/app/(owner)/documents/templates/components/photo-evidence-card.tsx

## A11Y-28 — Expense search input placeholder-only
- **Finding:** src/app/(owner)/financials/expenses/_components/expense-table.tsx:69 (low) — Input named only by placeholder "Search expenses...".
- **Root cause:** Class 3.
- **Fix:** Add `aria-label="Search expenses"` to the Input at line 69.
- **Why it fixes it:** Stable name after typing, matching tenant-toolbar/property-toolbar convention.
- **Risks / interactions:** None; additive. Class 3 sibling.
- **Files touched:** src/app/(owner)/financials/expenses/_components/expense-table.tsx

## A11Y-29 — Unit detail/edit dialog labels not associated with inputs
- **Finding:** src/app/(owner)/properties/units/components/unit-detail-dialogs.tsx:93 (low) — Labels (62/93/98/102/107/111/115) lack htmlFor; disabled Inputs/SelectTrigger have no id.
- **Root cause:** Class 2. Inputs are `disabled` display-only but remain in the a11y tree (disabled ≠ removed).
- **Fix:** These are read-only display dialogs ("View unit details"). Preferred: replace the disabled `<Input>`s with plain read-only text (e.g. `<p className="text-sm">{unit.rent_amount}</p>`) under each `<Label>` — removes the "unnamed field" problem entirely. If retaining the input styling, instead add `htmlFor`/`id` pairs (`unit-number`, `unit-bedrooms`, `unit-bathrooms`, `unit-sqft`, `unit-rent`, `unit-status`).
- **Why it fixes it:** Converting display inputs to text removes bogus form-fields from the a11y tree (cleanest); the htmlFor/id alternative gives each field a name if the input look is retained.
- **Risks / interactions:** The UnitEditDialog is mislabeled (title "Unit N" / desc "View unit details", all inputs disabled) — it is a view dialog. `unit.rent_amount` is INTEGER dollars in prod, rendered raw here with no scaling, so no money-model change. FORM (38) may touch unit dialogs; rebase.
- **Files touched:** src/app/(owner)/properties/units/components/unit-detail-dialogs.tsx
- **Decision:** Convert disabled display inputs to read-only text (removes phantom form fields). Alternative: keep inputs + add htmlFor/id pairs. Match whatever direction A11Y-36 takes for the two view dialogs.

## A11Y-30 — Duplicate FAQ accordion (app/faq) missing aria-expanded/aria-controls
- **Finding:** src/app/faq/faq-accordion.tsx:84 (low) — custom disclosure `<button>` with only onClick/className; content div has no id; no `aria-expanded`/`aria-controls`.
- **Root cause:** Class 7 (custom disclosure without ARIA state). This file is a near-identical copy of src/components/faq-accordion.tsx (A11Y-34).
- **Fix (class-wide with A11Y-34):** Add `aria-expanded={isOpen}` and `aria-controls={panelId}` to the toggle button (line 84); give the answer panel `id={panelId}` and `role="region"` (panelId via `useId()` inside `FaqItem`). Apply identically in both files.
- **Why it fixes it:** Screen readers now announce expanded/collapsed state and the controlled panel, satisfying the WAI-ARIA disclosure pattern the verifier cites.
- **Risks / interactions:** Two near-duplicate files — apply the same edit to both (A11Y-34). Live on /faq (page.tsx:4). MKTUI/CONTENT phases may touch FAQ; rebase.
- **Files touched:** src/app/faq/faq-accordion.tsx
- **Decision:** Add ARIA to the custom accordion (minimal, both copies). Alternative: replace both with the Radix `ui/accordion.tsx` primitive (aria for free) — larger, and the duplicate-file dedup is out of A11Y scope (a HYG concern). Deferred.

## A11Y-31 — Lead-magnet email input placeholder-only
- **Finding:** src/components/blog/lead-magnet-cta.tsx:82 (low) — email `<input>` named only by placeholder; the form's `aria-label="Download resource"` names the form, not the field.
- **Root cause:** Class 3 (placeholder-only). Same as newsletter-signup.
- **Fix:** Add `aria-label="Email address"` to the `<input>` at line 82.
- **Why it fixes it:** Field keeps a name after typing (WCAG 3.3.2/4.1.2).
- **Risks / interactions:** None; additive. Class 3 sibling.
- **Files touched:** src/components/blog/lead-magnet-cta.tsx

## A11Y-32 — Newsletter email input placeholder-only
- **Finding:** src/components/blog/newsletter-signup.tsx:73 (low) — email `<input>` placeholder-only; form `aria-label="Newsletter signup"` names the form.
- **Root cause:** Class 3.
- **Fix:** Add `aria-label="Email address"` to the `<input>` at line 73.
- **Why it fixes it:** Stable field name after typing.
- **Risks / interactions:** None; additive. Class 3 sibling.
- **Files touched:** src/components/blog/newsletter-signup.tsx

## A11Y-33 — Data-table text/number filter inputs placeholder-only
- **Finding:** src/components/data-table/data-table-toolbar.tsx:86 (low) — text (86) and number (97) filter Inputs get only `placeholder={columnMeta.placeholder ?? columnMeta.label}`; no aria-label.
- **Root cause:** Class 3. `columnMeta.label` (data-table.ts, `label?: string`) is available.
- **Fix:** Add `aria-label={columnMeta.label ?? columnMeta.placeholder ?? column.id}` to both filter Inputs (lines 86 and 97). Fallback chain guarantees a string since `label` is optional (`column.id` is always defined).
- **Why it fixes it:** Each filter keeps a name after a value is entered, resolving the placeholder-as-label failure across every column filter.
- **Risks / interactions:** None; additive. COMP (41) may touch data-table; rebase. Class 3 sibling.
- **Files touched:** src/components/data-table/data-table-toolbar.tsx

## A11Y-34 — Custom FAQ accordion (components) missing aria-expanded/aria-controls
- **Finding:** src/components/faq-accordion.tsx:84 (low) — same custom disclosure defect as A11Y-30; live on homepage FAQ (home-faq.tsx).
- **Root cause:** Class 7 (duplicate of A11Y-30).
- **Fix:** Identical to A11Y-30 — add `aria-expanded={isOpen}` + `aria-controls={panelId}` on the button (line 84), `id={panelId}` + `role="region"` on the panel, `panelId` from `useId()`.
- **Why it fixes it:** Announces expanded state + controlled panel (WAI-ARIA accordion pattern).
- **Risks / interactions:** Apply in lockstep with A11Y-30 (near-identical file). MKTUI (46) may touch homepage FAQ; rebase.
- **Files touched:** src/components/faq-accordion.tsx
- **Decision:** See A11Y-30 (add ARIA vs migrate to Radix Accordion vs dedup the two files). ARIA-only chosen; dedup deferred to HYG.

## A11Y-35 — Desktop nav dropdown triggers lack aria-expanded/aria-haspopup
- **Finding:** src/components/layout/navbar/navbar-desktop-nav.tsx:95 (low) — trigger `<Link>` has keyboard support (Escape/arrows) but no `aria-expanded`/`aria-haspopup`, so the submenu is non-visually undiscoverable.
- **Root cause:** Class 7 (missing ARIA state on an otherwise-keyboard-capable disclosure).
- **Fix:** On the trigger `<Link>` (line 95), when `item.hasDropdown`, add `aria-haspopup="menu"` and `aria-expanded={openDropdown === item.name}`, plus `aria-controls={submenuId}`; give the dropdown panel (line 119) `id={submenuId}` (e.g. `desktop-submenu-${item.name}`). Use conditional spread or ternary so non-dropdown items get no extra attributes.
- **Why it fixes it:** Announces that a submenu exists and its open state, resolving the WCAG 4.1.2 gap; keyboard behavior already present.
- **Risks / interactions:** Only "Resources" has a dropdown. Marketing navbar — MKTUI (46) may touch; rebase. Class 7 sibling.
- **Files touched:** src/components/layout/navbar/navbar-desktop-nav.tsx

## A11Y-36 — Lease view-dialog labels not associated with disabled inputs
- **Finding:** src/components/leases/lease-action-buttons.tsx:214 (low) — five `<Label>` (214/218/222/226/230) with no htmlFor next to disabled display `<Input>`s with no id (the "Lease Details" view dialog).
- **Root cause:** Class 2. Disabled inputs remain in the a11y tree; labels unassociated.
- **Fix:** Same as A11Y-29 — preferred: replace the disabled `<Input>`s with read-only text (`<p>`), since this is a display-only "View lease information" dialog. Alternative: add `htmlFor`/`id` pairs (`lease-start-date`, `lease-end-date`, `lease-rent`, `lease-deposit`).
- **Why it fixes it:** Removes phantom unnamed form fields (or names them via htmlFor/id).
- **Risks / interactions:** `lease.rent_amount`/`security_deposit` are INTEGER dollars in prod, rendered raw in the disabled inputs — no scaling, so no money-model change. The verifier notes this is the view dialog (`showViewDialog`), not the separate RenewLeaseDialog (line 239). FORM (38) may restructure lease dialogs; rebase.
- **Files touched:** src/components/leases/lease-action-buttons.tsx
- **Decision:** Convert disabled display inputs to read-only text. Alternative: htmlFor/id pairs. Keep consistent with A11Y-29's direction across the two view dialogs.

## A11Y-37 — Maintenance search input placeholder-only
- **Finding:** src/components/maintenance/maintenance-view-tabs.tsx:74 (low) — search `<input>` named only by placeholder "Search requests...".
- **Root cause:** Class 3.
- **Fix:** Add `aria-label="Search maintenance requests"` to the `<input>` at line 74.
- **Why it fixes it:** Stable field name after typing, matching sibling toolbars.
- **Risks / interactions:** None; additive. Class 3 sibling.
- **Files touched:** src/components/maintenance/maintenance-view-tabs.tsx

## A11Y-38 — Vendor search input placeholder-only
- **Finding:** src/components/maintenance/vendors-page.client.tsx:187 (low) — Input named only by placeholder "Search vendors...".
- **Root cause:** Class 3.
- **Fix:** Add `aria-label="Search vendors"` to the Input at line 187.
- **Why it fixes it:** Stable field name after typing.
- **Risks / interactions:** None; additive. Class 3 sibling.
- **Files touched:** src/components/maintenance/vendors-page.client.tsx

## A11Y-39 — Column visibility toggles convey checked state only visually
- **Finding:** src/components/properties/property-table-toolbar.tsx:60 (low) — each toggle is a plain `<button>` whose on/off state is only a styled div + Check icon; no `aria-pressed`/`aria-checked`.
- **Root cause:** Class 7 variant (toggle state not exposed to AT); also brushes the CLAUDE.md "no custom CSS toggle divs" rule.
- **Fix:** Add `aria-pressed={isColumnVisible(column.id)}` to each toggle `<button>` (line 60). Keep the visual check indicator as a redundant cue.
- **Why it fixes it:** Screen readers announce "pressed"/"not pressed" per column, so visibility state is perceivable, resolving the "announces just 'Address, button'" evidence.
- **Risks / interactions:** Same file as A11Y-20. `column.alwaysVisible` toggles are `disabled` — `aria-pressed` on a disabled button is still valid. DASH/COMP may touch; rebase.
- **Files touched:** src/components/properties/property-table-toolbar.tsx
- **Decision:** `aria-pressed` on the existing button (minimal). Alternative: migrate the menu to shadcn `DropdownMenuCheckboxItem` (built-in `role="menuitemcheckbox"` + `aria-checked`) — larger refactor tied to A11Y-20's menu, deferred.

## A11Y-40 — Collapsible sidebar section buttons expose no aria-expanded
- **Finding:** src/components/shell/main-nav.tsx:202 (low) — section toggle `<button>`s (Analytics/Reports/Financials) convey open state only via a rotating chevron; no `aria-expanded`/`aria-controls`.
- **Root cause:** Class 7 (missing ARIA state on custom disclosure).
- **Fix:** In `renderNavItem`'s `hasChildren` branch, add `aria-expanded={isExpanded}` and `aria-controls={sectionId}` to the toggle button (line 202); give the collapsing children wrapper `id={sectionId}` (derive per item, e.g. `nav-section-${item.label}`). Pair with the `inert` fix from A11Y-24 on that same wrapper.
- **Why it fixes it:** Announces open/closed state and the controlled region (WCAG 4.1.2); the codebase currently has aria-expanded only in blog-review-client.tsx, so this establishes it here too.
- **Risks / interactions:** Same file/feature as A11Y-24 — do them together (aria-expanded + inert on the wrapper). DASH (42) touches shell; rebase.
- **Files touched:** src/components/shell/main-nav.tsx

## A11Y-41 — Quick-actions dock tooltips appear on hover only, never on focus
- **Finding:** src/components/shell/quick-actions-dock.tsx:59 (low) — the visible-label tooltip span uses `opacity-0 group-hover:opacity-100` with no focus reveal; `title` only surfaces on mouse hover.
- **Root cause:** Class 5 variant (hover-only reveal of a label). `aria-label` covers screen readers but sighted keyboard users see no label on focus (WAI-ARIA tooltip pattern requires show-on-focus).
- **Fix:** Add `group-focus-visible:opacity-100` to the tooltip span (line 59); the parent `<Link>` is the `.group` and is focusable, so `:focus-visible` on it reveals the span. Optionally drop the now-redundant `title` (harmless if kept).
- **Why it fixes it:** Keyboard focus reveals the visible label, matching hover behavior (WCAG 2.4.7 + tooltip-on-focus).
- **Risks / interactions:** None; additive. Class 5 sibling. Alternative: use the Radix `Tooltip` primitive (handles focus + hover) — heavier for a dock of 4 icons; the class utility is sufficient. DASH (42) touches shell; rebase.
- **Files touched:** src/components/shell/quick-actions-dock.tsx

## Cross-cutting notes

**Class 1 — Icon-only buttons need aria-label (A11Y-02, 03, 04, 05, 15, 17):** one additive `aria-label` per button; no shared helper needed. Trivial, low-risk sweep. When executing, grep the phase's touched files for any other icon-only `<Button>`/`<button>` with no `aria-label` and fix in the same pass (exhaustive-sweep discipline) so siblings don't trickle out across review cycles.

**Class 2 — Label/input association (A11Y-02, 03, 04, 06, 29, 36):** pattern is htmlFor/id pairs; use `useId()` for singleton dialogs and stable `${base}-${index|key}` ids inside maps (never a single `useId()` reused across a `.map`). For the two read-only view dialogs (A11Y-29 unit, A11Y-36 lease) prefer converting disabled display `<Input>`s to read-only text over faking labels — pick one direction and apply to both for consistency.

**Class 3 — Placeholder-only inputs/selects (A11Y-14, 27, 28, 31, 32, 33, 37, 38):** one `aria-label` per control. Reference convention: property-toolbar.tsx:44/52, tenant-toolbar.tsx:31. For A11Y-33 the label comes from `columnMeta.label ?? columnMeta.placeholder ?? column.id`.

**Class 4 — Vivid tokens as text (A11Y-01/07 badge, 12, 22):** swap TEXT-role classes from vivid `text-{success,warning,info,destructive}` / `-foreground` to the theme-aware `-text` companions (globals.css:181-185/675-679); leave fills, borders, dots, and icon backgrounds on the vivid tokens. `-text` companions are theme-aware, so remove any `dark:text-*` overrides on the same element. No globals.css change needed unless the `--color-accent-text` alternative in A11Y-01's Decision is chosen.

**Class 5 — Hover-only reveal invisible on keyboard focus (A11Y-11, 19, 21, 26, 41):** add a focus companion to the same element/container: `focus-visible:opacity-100` when the focusable element is the revealed element itself (11/19/21); `group-focus-within:*` when a container is revealed and a focusable child sits inside (26); `group-focus-visible:*` when the `.group` is the focusable link and a child span is revealed (41). A11Y-16 is NOT a reveal fix — it's a dead/nested control that gets removed.

**Class 6 — Nested role="button" clear-filter div (A11Y-08, 09, 10):** class-wide `onKeyDown` (Enter/Space → reset, preventDefault + stopPropagation). Normalize each file's `onReset` to accept an optional/absent event so the keyboard path can call it. Chosen over full un-nesting (Decision on each) — keep it consistent across all three. This is a shared upstream (diceui/tablecn) pattern; fix all three in one commit so a reviewer doesn't see them trickle out.

**Class 7 — Custom disclosures missing ARIA state (A11Y-13, 20, 23, 30, 34, 35, 39, 40):** add `aria-expanded`/`aria-haspopup`/`aria-controls` (or `aria-pressed` for the toggle in A11Y-39), and Escape dismissal where an overlay stays open (A11Y-20, 23). A11Y-30 and A11Y-34 are near-duplicate FAQ files — apply identical edits to both. The recurring alternative (migrate to Radix `DropdownMenu`/`Accordion`) is deferred everywhere as larger-than-A11Y scope; the ARIA-attribute fixes are the minimal root-cause path.

**Sequencing / phase dependencies:** Phase 47 runs after 36-46 (strictly sequential). Files here overlap prior phases: FORM (38) → clauses/custom-fields/dynamic-form/form-builder/unit-detail-dialogs/lease-action-buttons (A11Y-02..06, 29, 36); COMP (41) → data-table components (A11Y-08/09/10/33); DASH (42) → shell main-nav/quick-actions/property-table (A11Y-20/23/24/39/40/41); MKTUI (46) → feature-backgrounds/hero-dashboard-mockup/bento-grid/navbar/faq (A11Y-12/22/26/13/30/34/35). All run BEFORE 47, so A11Y only needs to rebase on their edits and re-confirm the cited line numbers before applying — no blocking dependency. No money-column (integer vs numeric) decision arises in this phase; the only displays of `rent_amount`/`security_deposit` (A11Y-29/36) render raw with no scaling and stay unchanged.

**No new shared files or types required.** All fixes are additive attributes, className token swaps, one control removal (A11Y-16), one dialog migration to the existing Radix `Sheet` (A11Y-25), and `inert` on one wrapper (A11Y-24). `useId()` (React 19) covers id generation; no new libraries. If the A11Y-01 Decision alternative is taken, globals.css gains one `--color-accent-text` token pair — otherwise globals.css is untouched.
