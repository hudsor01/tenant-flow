# Owner sidebar → canonical shadcn/ui Sidebar: migration design (raw research)

> **Raw agent output, not yet verified.** A research subagent wrote this on 2026-10-25 against `main` @ `754c91802`. PLAN.md §1a/Phase 6 tracks which claims have been verified. Re-check facts against the code before acting on them. Scratch evidence (downloaded registry sources, probe scripts, compiled CSS) lived in the session scratchpad and is not preserved.

## Key decisions

| # | Decision | Why |
|---|---|---|
| D1 | Vendor `https://ui.shadcn.com/r/styles/new-york-v4/sidebar.json` (fetched 2026-10-25; `sidebar.tsx` content sha256 `2ba1a9b9422f4172373f4cd0587b675d2331a41f4fa68f65dab2b23ca98fd9d2`) as ONE file, `src/components/ui/sidebar.tsx`. Trim it to the 16 exports we use and record divergences V1–V12 in a header comment. | `components.json` style is `new-york`. The docs now point at `radix-nova` (RTL; registry-build-only `IconPlaceholder`), and `/docs/components/sidebar` redirects to the Base UI page. The repo trims unused shadcn exports (`d825f7b6a`). |
| D2 | Sheet breakpoint = `lg` (1024px) in both the hook and the CSS (`md:` → `lg:`). Hook: `matchMedia("(width < 64rem)")`, with state taken from `mql.matches`. | Keeps 768–1023px behaving as today. 768px would squeeze tablet layouts: 12 owner files use `md:grid-cols-3..6`, and `FORCE_GRID_QUERY (max-width:1023px)` and the dock are tuned for `lg`. `(width < 64rem)` is the exact complement of Tailwind `lg`. |
| D3 | `collapsible="offcanvas"`, `variant="sidebar"`, expanded by default. Add trigger + rail + Cmd/Ctrl+B, and make the collapsed nav `inert`. | Expanded looks like today. `icon` mode hides `SidebarMenuSub` and needs icon-only versions of the logo and search pill. Canonical offcanvas only moves the container off-screen, so its links stay tabbable. |
| D4 | No `SidebarInset`. The content column becomes `div.relative.flex.w-full.min-w-0.flex-1.flex-col.bg-background`. | `SidebarInset` renders `<main>`, which would make two mains and break the skip link and the E2E `main#main-content` scoping. `min-w-0` stops wide tables overflowing. |
| D5 | Use the `sidebar_state` cookie (canonical, 7 days) and read it in the async server `OwnerDashboardLayout`. Put the constants and parser in a non-client `src/lib/sidebar-state.ts`, parse with `value !== "false"`, and delete both remnants. | A constant imported from a `"use client"` file into a server component arrives as a client reference, not a string. The `context.tsx` fork has hydration bugs, and `ServerSidebarProvider` passes a function prop across the RSC boundary. |
| D6 | Map `--sidebar-*` to brand tokens: sidebar = card; foreground = card-foreground; primary (+fg) = primary; accent = muted; accent-foreground = foreground; border; ring. Widths go in `globals.css` (14rem desktop, 18rem mobile). Delete the zinc HSL block and the stale `@theme` sidebar block. | Brand consistency and zero-tolerance rule 5. The stale block maps accent to emerald `--color-accent`. |
| D7 | Neutralize the base `ul/ol`, `li` and `a` rules inside the primitive. Exclude `[data-sidebar]` from the unlayered ≤768px button rule. Fix the `SidebarSeparator` width. | The same CSS-invisible defect class as Phase 65/66. **Note:** PLAN.md Phase 1 B2 relayers and scopes that unlayered rule globally, which makes the `[data-sidebar]` exclusion unnecessary. |
| D8 | Cmd/Ctrl+B with a modal guard; ignore Shift, Alt and key repeat. The Cmd+K guard excludes the nav sheet, and selecting in the palette closes the sheet. | No conflicts; matches Session 11 P2 #17. |
| D9 | The footer becomes two links: Settings (`/settings`) and Help & Support (`/help`). Drop the dead "Keyboard Shortcuts" item. | The popover had one working item; "Settings" never linked to settings, and no `?` handler exists. |
| D10 | Tour step 5 targets the trigger when the sidebar is a sheet or collapsed (pure helper + `useSidebar()`). | The mobile sheet has no DOM when closed, and `<Sidebar>` props are dropped on mobile. A missing target makes `TourStep` return null. |
| D11 | Dock: `lg:left-[calc(50%+var(--sidebar-width)/2)]` plus `group-has-data-[collapsible=offcanvas]/sidebar-wrapper:lg:left-1/2`. | Removes the hard-coded 7rem and keeps the dock centered in both states. |

## Current hand-rolled behaviors (B1–B20)

- **B1:** at ≥1024px, a fixed `<aside>` (w-56, bg-card, border-r, z-50) with content offset by `lg:pl-56`.
- **B2:** below 1024px, a `-translate-x-full` drawer (200ms ease-out) with an overlay (`fixed inset-0 z-40 bg-foreground/20`).
- **B3:** logo row, h-14 px-4, linking to `/dashboard`.
- **B4:** close X (`lg:hidden`, 44px, "Close navigation menu").
- **B5:** palette trigger "Search pages and actions…" with a ⌘K kbd and an sr-only suffix. It has no aria-label, by design (WCAG 2.5.3), and tests pin that.
- **B6:** 7 core links (Dashboard…Documents).
  - Active matching is exact for `/dashboard` and `startsWith` for everything else, with `aria-current`.
  - Active: `bg-primary/10 text-primary-text`. Inactive: `text-foreground hover:bg-muted`.
  - 20px muted icons; rows about 40px.
- **B7:** Analytics (3 links) and Reports (7 links) toggles.
  - `aria-expanded`/`aria-controls`; content is `inert` when closed; 200ms.
  - Children match exactly with `aria-current`, sit at `ml-8`, rows about 36px.
  - Both sections always start collapsed. Documents is deliberately flat.
- **B8:** a footer "Settings" button opens a custom upward popover containing Help & Support and a dead "Keyboard Shortcuts ?" item.
- **B9:** clicking a nav link closes the drawer and returns focus to the trigger.
- **B10/B11:** Escape and overlay click close the drawer and return focus.
- **B12:** a partial Tab trap.
- **B13:** while open the drawer is `role=dialog aria-modal`; closed it's complementary.
- **B14:** `data-tour="sidebar-nav"` (tour step 5; the tour's isMobile is `innerWidth < 768`).
- **B15:** Cmd/Ctrl+K opens the palette, blocked by any `[role=dialog][data-state=open]`.
- **B16:** header menu button (`lg:hidden`, Menu icon, "Open navigation menu"), breadcrumbs, sync indicator, bell, user menu.
- **B17:** dock `hidden lg:block lg:left-[calc(50%+7rem)]`, hidden on `/new` and `/edit`, with `lg:pb-28` on the content when visible.
- **B18:** exactly one `main#main-content` (skip link and hub E2E scope).
- **B19:** the palette's twin route table (pinned by tests).
- **B20:** no persisted state.

**Guarantees to keep:**
- G1: one skip link targeting one main.
- G2: label-in-name.
- G3: aria-labels on icon-only controls.
- G4: aria-current.
- G5: aria-expanded toggles, with closed children not tabbable.
- G6: Escape plus focus return.
- G7: 44px mobile targets.
- G8: zero axe WCAG 2.1 A/AA findings on `/dashboard` at 1280 (CI owner-axe).
- G9: no horizontal scroll at 375px.
- G10: Cmd+K never stacks dialogs.

## Pre-existing defects in the hand-rolled sidebar (claimed; Phase 6 Step 0 must confirm)

1. Opening the drawer doesn't move focus into it. The aside comes before the header in the DOM, so Tab leaves the "modal", and `aria-modal` is set while focus is outside it.
2. The open drawer is an unnamed dialog.
3. No scroll lock behind the drawer.
4. Choosing a palette item or clicking the logo leaves the drawer open.
5. "Settings" never links to `/settings`. The "Keyboard Shortcuts" item is dead (no `?` handler in `src`). The popover has `aria-haspopup` but no menu semantics or focus handling.
6. The section holding the active page never auto-expands.
7. On mobile, tour step 5 targets an off-screen aside.
8. *(derived, not observed)* Sidebar links underline on hover. The base `a:not([role=button]):not(.button):not([class*=button])` rule applies, and no sidebar link class contains "button".
9. *(derived)* The unlayered `@media (max-width:768px)` `.btn, button, [role=button]` rule re-pads the section toggles but not the links. **PLAN.md B2 fixes this in Phase 1.**

## Remnants

- `src/components/ui/sidebar/context.tsx` is a 2025 fork of the canonical provider. Differences:
  - `useMediaQuery("(max-width: 767px)")` gives a hydration mismatch on phones.
  - The initial `open` is read from `document.cookie` in the `useState` initializer, so SSR mismatches.
  - The cookie gains `SameSite=Lax; Secure`.
  - No memo, and the effect has no deps array.
  - No `data-slot`.
  - No app imports it.
- `server-sidebar-provider.tsx` wraps the fork and forwards a function prop (`onOpenChange`) across the server/client boundary. Reuse only its parse rule (`value !== "false"`) and test matrix.

## Divergences from new-york-v4 (V1–V12, for the vendored file's header comment)

- **V1:** `#` imports, named React imports, Biome style, `Slot.Slot`.
- **V2:** drop `SIDEBAR_WIDTH*` and both inline styles. Set `--sidebar-width:14rem` and `--sidebar-width-icon:3rem` on `:root`; the mobile `SheetContent` gets `[--sidebar-width:18rem]`.
- **V3:** `md:block` → `lg:block`, `md:flex` → `lg:flex`.
- **V4:** base-rule neutralizers.
  - `SidebarMenu` gets `mt-0 mb-0 pl-0 [&>li]:mb-0`.
  - `SidebarMenuSub` gets `mt-0 mb-0 [&>li]:mb-0`.
  - `SidebarMenuButton` and `SidebarMenuSubButton` get `no-underline`.
- **V5:** `SidebarSeparator` `w-auto` → `data-[orientation=horizontal]:w-auto`. Canonical keeps Separator's `data-[orientation=horizontal]:w-full` (specificity 0,2,0), so `mx-2` overflows by 16px.
- **V6:** strings.
  - `SheetTitle`: "Navigation menu".
  - `SheetDescription`: "Main navigation for your TenantFlow account".
  - Trigger and rail label: "Toggle navigation menu".
- **V7:** `SidebarTrigger` gets `aria-expanded={isMobile ? openMobile : open}`, and the icon becomes `size-5`.
- **V8:** shortcut is `key.toLowerCase()==="b"` with meta/ctrl; ignore shift, alt and repeat. Return early if `document.querySelector('[role="dialog"][data-state="open"]:not([data-sidebar="sidebar"])')` matches.
- **V9:** the cookie comes from `#lib/sidebar-state`: `sidebar_state=<v>; path=/; max-age=604800; SameSite=Lax`, plus `; Secure` on https.
- **V10:** no manual memo (React Compiler); effect deps `[toggleSidebar]`.
- **V11:** mobile `SheetContent` uses 200ms durations.
- **V12:** trim `SidebarInset`, `SidebarInput`, `SidebarGroupLabel/Action/Content` and `SidebarMenuAction/Badge/Skeleton`.

## Cascade traps (verify with computed styles, never class presence)

| Trap | Effect | Fix |
|---|---|---|
| `@layer base ul,ol{margin:1rem 0;padding-left:1.5rem}` | `SidebarMenu` gets 16px margins and a 24px indent | V4 |
| `li{margin-bottom:.25rem}` | +4px per item | `[&>li]:mb-0` |
| base `a` underline + `transition: all` | hover underline | `no-underline` |
| unlayered ≤768px `button` rule | re-pads button rows only | Fixed globally by PLAN.md B2 |
| `SidebarSeparator` width | 16px overflow | V5 |
| new flex row wrapper | wide content overflow | `min-w-0` |

## Tests (planned)

- **Unit:**
  - Replace `ui/__tests__/sidebar.test.tsx` and delete `server-sidebar-provider.test.tsx`.
  - Add tests for `lib/sidebar-state`, `hooks/use-mobile` and `tours/sidebar-tour-target`.
  - Rewrite `main-nav.test.tsx` and `app-shell.test.tsx`, querying by role and name and asserting `querySelectorAll("main").length === 1`.
  - Render `label-in-name.test.tsx` inside the provider.
- **E2E:** new `tests/e2e/tests/owner/app-shell-sidebar.spec.ts`. Add it to the `owner-axe` testMatch, and ignore it in `owner`/`firefox`/`mobile-chrome`.
  - At 1280: collapse/expand, the cookie, SSR collapsed with no flash, Cmd+B and its guard, dock centering, computed-style checks.
  - At 375 and 900: the "Navigation menu" dialog with focus trap, Escape and focus return; links close the sheet; no horizontal scroll at 375/900/1024/1280; axe AA; no hydration warnings for cookie absent/true/false.
- **Coverage headroom (2026-10-24):** statements ~187, branches ~120, functions ~69 (tightest). Measure after the primitive and shell steps.

## Implementation order (single PR, ordered commits)

0. **Baseline:**
   - `bun install`, then `validate:quick`.
   - `next build && next start`, then before-screenshots at 375/900/1024/1280, light and dark.
   - Confirm defects 8/9 with computed styles.
1. Tokens.
2. `sidebar-state` + `use-mobile` + their tests.
3. Vendor the primitive (V1–V12), delete the remnants, add primitive tests, check coverage.
4. *(superseded by PLAN.md B2)*
5. Shell migration + unit tests, then build parity.
6. Layout cookie read; confirm SSR collapsed with no hydration warnings.
7. Tour.
8. E2E + config.
9. Final gates: visual diff, Aikido, coverage, fallow, perfect-PR.

**Adjacent / out of scope:**
- `properties/property-action-bar.tsx:41` overlaps the dock (same `--sidebar-width` fix).
- Dead `ui/mobile-nav.tsx`.
- Primitive drift in `button.tsx`, `sheet.tsx` and `tooltip.tsx`; see the component audit.
