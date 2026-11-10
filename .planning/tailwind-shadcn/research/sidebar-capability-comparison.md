# Hand-rolled owner sidebar vs canonical shadcn/ui Sidebar: capability comparison and history

> **Workflow output, 2026-10-25.** Produced by 30 agents: 3 history, 1 inventory of 100 behaviors, 8 assessors, 16 adversarial verifiers and 1 synthesis, then checked by a critic.
>
> **Where this file and `sidebar-capability-comparison-critique.md` disagree, the critique wins.** Its corrections were checked against git objects and the canonical sources.
>
> Repo paths are relative to the repo root. Canonical `sidebar.tsx` / `sheet.tsx` / `use-mobile.ts` line numbers refer to the new-york-v4 registry copies fetched 2026-10-25, which were byte-identical to the live registry on re-fetch.

---

## Answers

(1) **No.** Everything your hand-rolled shell does is either built into shadcn's Sidebar or can be built from its shipped parts with props, `className`, app CSS and small effects. The only vendored file you would ever edit is `hooks/use-mobile.ts` (its 768px, px-based breakpoint), and only if you keep `<Sidebar>`'s built-in Sheet but want it to cover 768–1023px too. What the hand-roll does *differently* (a CSS-only 1024px split, one always-mounted 14rem `<aside>`, no collapse/shortcut/cookie, focus returning to the hamburger) came from a design export, and it has accessibility gaps that the Radix Sheet closes.

(2) **No.** No code comment, commit, PR body, review, issue, planning doc or memory entry justifies the hand-roll or names a shadcn limitation. The only note is about where it came from: `src/app/(owner)/owner-dashboard-layout.tsx:8` says "Uses the design-os AppShell pattern". The swap went in without mention in PR #474 "Fix/remove pink chart color" (branch commit `debfbf6b9`, "fix: resolve pre-commit hook failures and align React versions"), along with a design export whose own README recommends "**UI Components**: shadcn/ui".

Repo paths below are relative to `/Users/richard/Developer/tenant-flow`. `sidebar.tsx` / `sheet.tsx` / `use-mobile.ts` mean the canonical new-york-v4 files in `/private/tmp/claude-501/-Users-richard-Developer-tenant-flow/992b9ba7-e5fa-43c5-b8cf-059bace7ca90/scratchpad/sidebar-research/shadcn/`. I re-fetched them on 2026-10-25 and they are byte-identical to the live registry.

## Things only the hand-rolled sidebar does (or does differently)

There is nothing it can do that shadcn's Sidebar cannot. The items below differ out of the box; each says what parity takes. Two ways to get there:
- **Route A:** keep `<Sidebar>`'s built-in mobile Sheet.
- **Route B:** use `<Sidebar collapsible="none" className="hidden lg:flex …">` plus your own `<Sheet>`/`<SheetTrigger>` below lg. The `none` branch returns before the `isMobile` check (`sidebar.tsx:168-181`), so this needs no vendored edits. You wire the open state, close-on-navigate and close-on-widen yourself.

1. **Drawer below 1024px, docked at ≥1024px, switched in CSS only.**
   - Hand-roll: `app-shell-sidebar.tsx:28-29`, `app-shell-header.tsx:40`, `app-shell.tsx:286,299` (all `lg:`).
   - shadcn: JavaScript picks the layout at 768px. `useIsMobile` (`use-mobile.ts:3,11,14`, called at `sidebar.tsx:69`) chooses either the Sheet tree (`:183`) or a desktop tree that CSS shows only from `md:` up (`:210,232`). No prop overrides `isMobile`, and `SidebarContext` isn't exported (`:45`). So 768–1023px gets a docked 16rem rail.
   - Parity, Route A: set `MOBILE_BREAKPOINT = 1024` (`use-mobile.ts:3`) and put `className="max-lg:[&>[data-slot=sidebar]]:hidden"` on `SidebarProvider`. Without the class, the server-rendered rail shows at 768–1023px until hydration (measured).
   - Parity, Route B: add an effect that closes the Sheet when `(width >= 64rem)` matches. Without it, widening the window leaves the overlay covering the page (measured).

2. **Its breakpoint can't disagree with itself.**
   - Hand-roll: one unit throughout, `lg:` = 64rem.
   - shadcn: the JS check is in px (`innerWidth < 768`), but the CSS check is `md:` = 48rem (`globals.css` doesn't override breakpoints). With a 20px browser default font, at 800px and 940px there is neither a rail nor a Sheet, and the trigger only collapses the hidden desktop rail (measured).
   - Parity: make `use-mobile.ts` use the same rem query (`matchMedia("(width < 64rem)")` for both the value and the listener), or use Route B.

3. **One element that is always mounted.**
   - Hand-roll: a single `<aside>` serves both modes and is mounted once (`app-shell.tsx:291-296`). So `MainNav` state (`main-nav.tsx:172` sections, `:95` Settings) survives close/reopen and resizes, and `[data-tour='sidebar-nav']` (`owner-onboarding-tour.tsx:250`) always resolves.
   - shadcn: there are two trees, and the closed Sheet's content is unmounted. On mobile, `<Sidebar>`'s props land on `<Sheet>`, which is `Dialog.Root` and renders no DOM (`sidebar.tsx:185`). So `data-tour` disappears on phones.
   - Parity: lift the section state up and use controlled `Collapsible open/onOpenChange`.
   - Parity: point tour step 5 at the hamburger below the breakpoint. Otherwise `TourStep` returns `null` (`tour.tsx:1249`), the spotlight keeps step 4's cutout, and only Escape can close the tour, because outside-press needs the step's element (`:1100`).
   - Step 5 is already broken below lg today: it spotlights the off-screen aside, which shows as an empty 232px strip (`tour.tsx:439-441`).

4. **No desktop collapse, no Cmd/Ctrl+B, no cookie.**
   - Hand-roll: only Cmd/Ctrl+K, Escape and Tab are handled (`app-shell.tsx:200-265`).
   - shadcn: the default is `collapsible="offcanvas"` (`:157`). The provider always listens for Cmd/Ctrl+B on window and calls `preventDefault()`, even in text fields; no prop turns this off (`:96-110`). Every desktop `setOpen` writes the `sidebar_state` cookie (`:79-86`), even in controlled mode.
   - Parity: render no `SidebarRail` and no desktop trigger. Add a `document` keydown listener that calls `stopPropagation()` on Cmd/Ctrl+B, so the provider's window listener never runs (measured: no collapse, no cookie, typing unaffected). Or delete `:96-110` in your copy.
   - A controlled `open` on its own is not enough: the shortcut still calls `preventDefault` and still writes the cookie. If you do pin `open`, do it from a client component; the async server layout can't pass `onOpenChange` across the server/client boundary.

5. **Focus goes back to the hamburger on every close.**
   - Hand-roll: `app-shell.tsx:233-236, 242-245`.
   - shadcn: Radix only refocuses `context.triggerRef`, which only `Dialog.Trigger` sets (`@radix-ui/react-dialog` 1.3.1 dist `:78, :174-177`). `SidebarTrigger` is a plain `Button` (`sidebar.tsx:256-280`), so focus lands on `<body>` after Escape or a scrim click (measured).
   - Parity: render a child inside `<Sidebar>` whose effect cleanup calls `setTimeout(() => triggerRef.current?.focus(), 0)`. The cleanup runs after the Sheet unmounts, so focus never lands inside the aria-hidden page (measured for Escape, X, link and scrim; guard it with an `openMobile` ref under StrictMode). Route B gets this for free from `<SheetTrigger asChild>`.

6. **Closes on any nav-link click.**
   - Hand-roll: `onNavigate={closeSidebar}` (`app-shell-sidebar.tsx:80`; `main-nav.tsx:237,263`).
   - shadcn: the Sidebar never reacts to navigation.
   - Parity: add `onClick={() => setOpenMobile(false)}` to each link.

7. **Cmd+K still opens the palette while the drawer is open.**
   - Hand-roll: the Cmd+K guard at `app-shell.tsx:219` looks for `[role="dialog"][data-state="open"]`. The aside has the role but no `data-state`, so it doesn't match.
   - shadcn: the open SheetContent has both (dialog dist `:259,263`), so Cmd+K is swallowed (measured).
   - Parity: change the selector to `…:not([data-slot="sidebar"])` (`sidebar.tsx:188`).

8. **Same 14rem width for rail and drawer, light scrim, 200ms ease-out slide, z-50 full-height rail.**
   - Hand-roll: `app-shell-sidebar.tsx:25,27`; `app-shell.tsx:286`.
   - shadcn widths: 16rem desktop and 18rem mobile; the mobile width is set as an inline style on SheetContent (`sidebar.tsx:30-31,191-195`). The `--sidebar-width-mobile` variable the docs mention is never read.
   - shadcn rail: the container is `z-10 … h-svh` (`:232`).
   - shadcn Sheet: the overlay is `bg-black/50` and takes no props (`sheet.tsx:38,58`); it slides in over 500ms and out over 300ms, ease-in-out (`sheet.tsx:62`).
   - Parity (no edits and no `style={}`, per repo rule #5; all measured):
     - `className="[--sidebar-width:14rem]!"` on the provider.
     - `<Sidebar className="z-50 h-auto">`.
     - An unlayered rule: `[data-slot="sidebar"][data-mobile="true"] { --sidebar-width: 14rem !important; --tw-animation-duration: 200ms; --tw-ease: cubic-bezier(0,0,0.2,1) }`.
     - Restyle the overlay with `[data-state]:has(+ [data-slot="sidebar"][data-mobile="true"])`; the repo's `sheet.tsx` overlay has no `data-slot` to key on.
     - Dock: replace the hard-coded `7rem` at `quick-actions-dock.tsx:44` with `lg:left-[calc(50%+var(--sidebar-width)/2)]`.
     - Content column: a plain div with `min-w-0`. A bare `flex-1` column or `SidebarInset` let a 900px table widen the page (measured). Skip `SidebarInset` anyway: it renders a `<main>` (`:307-319`).
   - The `bg-foreground/20` scrim becomes a near-white wash in dark mode, so it may not be worth keeping.

9. **Landmark and ARIA markup.**
   - Hand-roll: a complementary `<aside>` while closed; `role=dialog` plus `aria-modal` while open (`app-shell-sidebar.tsx:19-22`); `aria-current` on links (`main-nav.tsx:238,264`).
   - shadcn: renders only divs (`sidebar.tsx:170,209,218,229,244`). Radix never sets `aria-modal`; it hides the rest of the page with `hideOthers()` instead (dialog dist `:165`), which is stronger. `isActive` only sets `data-active` (`:519,687`).
   - Parity: pass `role="complementary"` and an `aria-label` to `<Sidebar>` (they reach the desktop container, `:242`), and pass `aria-current` through the `asChild` links.
   - Tests: they pin the old markup (`app-shell.test.tsx:208,229,249,268,561`). jsdom's window is 1024 wide, so shadcn renders its desktop branch there; drawer tests have to narrow the window first.

10. **Sections stay mounted and animate their height.**
    - Hand-roll: `inert` plus a `max-h-0`/`max-h-96` transition (`main-nav.tsx:223-229`).
    - Radix `Collapsible`: a closed section renders an empty hidden div. Its measure step sets `transitionDuration` to 0, so the hand-roll's classes don't animate on it (measured).
    - Parity: `forceMount` plus `inert`, animating an inner div keyed on `group-data-[state=open]/collapsible`. Or accept that closed sections unmount and use `animate-collapsible-down/up`.
    - Tests: the `/documents` sweep (`main-nav.test.tsx:253-263`) and the label-in-name sweep would silently stop covering the children of collapsed sections.

11. **Unaffected by the repo's global CSS.**
    - shadcn's `SidebarMenu` and `SidebarMenuItem` are `ul`/`li` without margin or padding utilities (`sidebar.tsx:454-474`), so the base `ul,ol{margin:1rem 0;padding-left:1.5rem}` and `li{margin-bottom:.25rem}` rules apply to them (`globals.css:517-525`).
    - The menu parts' `outline-hidden focus-visible:ring-2` (`:477,689`) replaces the global focus outline and halo (`globals.css:581-586`).
    - `bg-sidebar`, `sidebar-accent` and `sidebar-ring` currently render stock zinc grey and blue. The leftover `--sidebar*` blocks plus the later `@theme inline` (`globals.css:1755-1786`) override the brand mapping at `:193-200`.
    - Parity: add `m-0 p-0` / `mb-0` on those parts, add one focus rule for `[data-sidebar=menu-button]` and `[data-sidebar=menu-sub-button]` under `:focus-visible`, and rewrite **both** the `:root` and `.dark` `--sidebar*` blocks as brand aliases. Fixing `:root` alone leaves dark mode zinc. The registry item ships those zinc `cssVars`, so running `shadcn add sidebar` again can write them back.

12. **Print (doesn't matter in practice).** The hand-roll prints the rail only when the printed page is at least 64rem wide. shadcn prints whichever tree `useIsMobile` picked on screen. No owner page prints: `window.print()` exists only in `src/components/shared/print-button.tsx`, which only `/resources` uses.

Everything outside the rail (header, breadcrumbs, palette, dock, footer, banner) is app code and carries over unchanged.

## What shadcn's Sidebar gives you that the hand-rolled one lacks

From `sidebar.tsx`:
- **Three collapse modes** (`:157,164`):
  - `offcanvas` slides the rail out and shrinks the gap beside it (`:222,234`).
  - `icon` collapses to a 3rem icon strip (`:32,226,239`), and the parts hide or clip themselves in that mode (`:409,432,477 size-8!,570,594,647,693`).
  - `none` is a static rail (`:168-181`).
- **Collapse controls**: `SidebarTrigger` (`:256-280`); `SidebarRail`, an edge handle with resize cursors that is hidden below `sm` and kept out of the tab order (`:282-305`); and Cmd/Ctrl+B (`:33,96-110`).
- **State API**:
  - Controlled or uncontrolled via `defaultOpen` / `open` / `onOpenChange` (`:56-89`).
  - `useSidebar()` exposes `state`, `open`, `setOpen`, `openMobile`, `setOpenMobile`, `isMobile` and `toggleSidebar` (`:35-54`).
  - `data-state`, `data-collapsible`, `data-variant` and `data-side` attributes on the outer wrapper, for styling with `peer-data-*` / `group-data-*` (`:209-216`).
- **Persistence, write-only**: a `sidebar_state` cookie kept for 7 days (`:28-29,86`). Restoring it on reload is app code: read `cookies()` and pass `defaultOpen`.
- **Tooltips when collapsed**: the `SidebarMenuButton` `tooltip` prop shows only when the rail is collapsed and not on mobile (`:503,525-545`; `TooltipProvider delayDuration={0}` at `:131`).
- **Variants and sides**: `variant="sidebar" | "floating" | "inset"` (`:142,163,247,313`) and `side="left" | "right"`, which mirrors the geometry and the Sheet (`:162,196,223,233-235,239`).
- **One width variable**: `--sidebar-width` drives the rail, the content gap and the offcanvas offset (`:136,221,232,234`). The hand-roll repeats 14rem as `w-56`, `lg:pl-56` and the dock's `7rem`.
- **Mobile drawer as a Radix Dialog Sheet** (`:183-205`): portaled overlay; slide animation; unmounted while closed; focus moved in on open, trapped and looped; rest of the page `aria-hidden`; scroll lock; outside clicks blocked; Escape closes only the top layer; the dialog is named "Sidebar" and has a description (`:198-201`).
- **Menu parts**:
  - `SidebarMenuButton`: `asChild`, `isActive` (sets `data-active`), outline variant, sm/default/lg sizes (`:476-546`).
  - `SidebarMenuAction`: a separate action or chevron on a row, with `showOnHover` and an automatic `pr-8` on the row button (`:477,548-578`). This is what lets a parent row be both a link and a toggle. `main-nav.tsx:207-222` can't do that today, which is why `/reports` is unreachable from the rail (`.planning/phases/65-documents-landing/65-CONTEXT.md:285-289`).
  - `SidebarMenuBadge` (`:580-600`), `SidebarMenuSkeleton` (`:602-638`), and `SidebarMenuSub` with sub-items and sub-buttons in sm/md sizes (`:640-699`).
- **Layout parts**: `SidebarHeader` and `SidebarFooter`; a `SidebarContent` scroll region; `SidebarGroup` with Label, Action and Content; `SidebarSeparator`; `SidebarInput`; `SidebarInset` (`:307-452`). Plus a dedicated `--sidebar-*` token family.

Hand-roll defects the Sheet removes without extra code (verified in Chromium):
- **No focus on open:** opening doesn't move focus into the drawer (`app-shell.tsx:302`). The trap only wraps at the aside's first and last elements (`:247-261`), so Tab from the hamburger walks the page behind the scrim.
- **Background stays live:** nothing behind it is `aria-hidden` and nothing locks scroll, so the page scrolls behind a drawer marked `aria-modal`.
- **Hidden tab stops:** below lg the closed drawer is only moved off-screen (`app-shell-sidebar.tsx:24-30`), leaving 13 invisible tab stops.
- **Escape closes too much:** one Escape closes the palette or the Settings menu **and** the drawer, because the window listener ignores `defaultPrevented` (`app-shell.tsx:241-246`, `main-nav.tsx:102-111`).
- **Stale modal state on widen:** if you open the drawer and widen past lg, the docked rail keeps `role=dialog aria-modal` and the Tab trap stays live.
- **Unnamed dialog:** the open dialog has no accessible name.
- **Settings menu:** it declares `aria-haspopup="true"` (a menu) but has no menu roles or arrow-key handling (`main-nav.tsx:153-157`). Its `fixed inset-0` backdrop only covers the 224px rail, because the aside's `translate` makes it the containing block (`:119-122`). A Radix `DropdownMenu` in `SidebarFooter` fixes both; pass `modal={false}` so the outside click still reaches the page.

Not in the source, so don't assume it: no `aria-current`; nothing closes the Sheet on navigation; no focus return to `SidebarTrigger`; nothing reads the cookie; nothing reads `--sidebar-width-mobile`; no `<aside>` or `<nav>` landmarks; no RTL `dir` support in new-york-v4.

## Why it was hand-rolled — the record

**Timeline**
- **2025-06-20 `713fab089`** (first commit): a hand-rolled `src/components/layout/Sidebar.tsx`. shadcn's `ui/sidebar.tsx` is vendored but nothing imports it.
- **2025-08-08 `3b7eea36f`**: shadcn is in use: `<SidebarProvider defaultOpen><Sidebar collapsible="icon">` in `components/dashboard/dashboard-sidebar.tsx`.
- **2025-09-26 `5116750f3` … `61c6e7766`**: Dashboard-01 rebuild. The provider went into the page first, then moved to the layout because "users were trapped on dashboard sub-pages".
- **2025-10-11/12 `bc53917cc`, `fb314f387`, #264**: the /dashboard → /manage rename left pages without the sidebar layout.
- **2025-10-24, overnight**:
  - `fdf1357f4`: fixed "Overlapping Sidebars" caused by a nested `<Sidebar>`.
  - `bf89522aa`: the **first hand-roll**, `<aside className="w-64 shrink-0 border-r">` replacing `SidebarProvider`.
  - `4536168ab` ("sidebar fixes"), about 3 hours later: **reverted to `SidebarProvider` + `SidebarInset`**.
  - `042289d83`: removed a `loading.tsx` that rendered a duplicate `AppSidebar`.
- **2025-11-29 `980b37710`**: `ServerSidebarProvider` added "to prevent SSR hydration mismatches".
- **2025-12-04 #443 `2dcc1024a`**: `AppSidebar` goes back to the canonical `<Sidebar collapsible="offcanvas">`.
- **2025-12-09 #450 (`07dd955b0`)**: merge note reads "Resolved tenant layout conflict (kept ServerSidebarProvider approach)".
- **2025-12-27 #471 `3ede630bb`**: the first "design-os" comments appear, and `ui/sidebar.tsx` is flagged "TODO: [VIOLATION] … ~709 lines … Maximum 300 lines per file". The app is still on shadcn.
- **2025-12-28 `debfbf6b9`** (#474 branch; not in the local clone, read via GitHub):
  - Adds the 63-file `product-plan/` export and `components/shell/{AppShell,MainNav,QuickActionsDock,TenantNav,TenantShell}.tsx`.
  - Deletes `dashboard/{app-sidebar,nav-main,site-header,tenant-sidebar}.tsx`.
  - The owner layout swaps `ServerSidebarProvider` + `AppSidebar` (18rem: `calc(var(--spacing) * 72)`) for `<AppShell>` plus the design-os comment.
  - At this point the shell's search button was `// TODO: Implement command palette`.
  - The export's `shell/spec.md` and `prompts/finalized/02-shell-prompt.md` were never committed, so whatever shell spec existed is gone.
- **2025-12-30 `448ab8eec`**: deletes `product-plan/`, renames the shell files to kebab-case, wires up `CommandDialog`, and splits the 719-line `ui/sidebar.tsx` into five files.
- **2025-12-31T04:56Z squash `775c72f1c`** (#474): the PR body never mentions sidebar, shell, layout or navigation. It has 0 reviews, and the only comment is from `railway-app`.
- **2026-03-06 `31672ab9c`, `a1baf39cf`**: aria-labels added; then Escape, the Tab wrap, `role=dialog`/`aria-modal` and focus return are retrofitted, under the commit title "replace custom toggles with shadcn Switch…".
- **2026-05-15/16 `f0e15dd6c`, `375f6fd81`**: the Cmd+K stacking guard.
- **2026-06-14 `1ecfeffac`**: deletes 4 of the 5 split shadcn files. `src/components/ui/sidebar/context.tsx` and `src/components/ui/server-sidebar-provider.tsx` survive, imported only by their own tests.
- **2026-07-17 `141f88ee4`**: the sidebar submenu gets `inert` (A11Y-24), while the hand-rolled tenant profile dialog "migrates to the Radix Sheet primitive for real focus trap/restore + aria-modal" (A11Y-25).

**Everything written down, verbatim (none of it gives a reason)**
- `src/app/(owner)/owner-dashboard-layout.tsx:8-11`: "Uses the design-os AppShell pattern: - Sidebar navigation with command palette trigger - Header with breadcrumbs and user menu - Floating quick actions dock".
- #474 squash message: "Fix PropertyCard to match product-plan pattern (remove unused onEdit/onDelete)" and "Move product-plan components to proper locations (analytics, financials, etc.)".
- Export `product-plan/README.md:64,72,74`: "**UI Components**: shadcn/ui"; "**Build Shell**: Implement the application shell before sections"; "The provided components are production-ready, props-based React components".
- Export `ShellWrapper.tsx`: "ShellWrapper - Provides TenantFlow navigation for screen design previews … Synced with: apps/frontend/src/components/dashboard/app-sidebar.tsx".
- Export `orchestration.yml`, `phase-2-shell` (`agent_type: react-ui-specialist`), outputs: "AppShell component / sidebar navigation / user menu / responsive layout".
- Phase 07 (2026-03-06; `.planning`, untracked since `607ed3271`): `07-RESEARCH.md:354` says "Consider using Sheet for mobile sidebar"; `07-02-PLAN.md:190` says "NOTE: The sidebar overlay is a div, not a Radix Dialog. … Keep it pragmatic".
- `.planning/milestones/v9.0-phases/47-accessibility/RESEARCH.md:195`: "Decision: Add ARIA + Escape (minimal). Alternative: replace SettingsMenu with shadcn `DropdownMenu` — larger, deferred."
- Gitignored `.claude/agents/design-system-integrator.md:39` (created 2026-01-20, after #474): "**DO NOT** redesign components — integrate them as-is".

I searched every PR body, comment, review and inline comment, every issue, commit comment and PR commit message on GitHub; plus `.planning/`, `docs/`, `memory/`, `CLAUDE.md`, `.claude/`, the assistant memory files, and the full history of every planning/doc file that touches the sidebar or shell. None of it gives a reason for the swap.

**Inference (my reading, not recorded anywhere)**
- **The export drove the swap.** It came from integrating a Design OS export. I identify the tool from the `product-plan/` layout, the "Export Package" title and the in-code "design-os" name; the README never names it. Design OS's `design-shell` command requires "Use props for all data and callbacks (portable)" and "Use Tailwind CSS for styling" and never mentions shadcn, so its shells always come out hand-rolled. That is how the tool works, not a verdict on shadcn.
- **The differences in section 1 are the export's design choices.** The shipped classes are the export's, verbatim: export `AppShell.tsx:79,85-91,116-135,151,153` against `app-shell.tsx:286,299` and `app-shell-sidebar.tsx:24-30,65-77`. The lg split, the 14rem width (down from the shadcn rail's 18rem) and the lack of collapse are those choices carried over, not a need shadcn couldn't meet. The export's nav was traced from the shadcn `AppSidebar` it replaced.
- **Friction likely made the swap attractive.** 54 main commits touched the sidebar stack between 2025-09-26 and #474, and the 300-line rule had flagged the vendored file. But every recorded shadcn-era failure was a wiring mistake, not a component limit. Later specs even assumed shadcn's 16rem-to-3rem collapse (`01-UI-SPEC.md:326`), which the hand-roll never had.
- **The cost since:** 46 shell commits after #474, several of them partly rebuilding what the Sheet already does.

## Contested verdicts and how I resolved them

Almost every disagreement was about whether these count as "composable": Route B, unlayered CSS keyed on `data-slot`/`data-mobile`, an app-level Cmd/Ctrl+B interceptor, or the one-constant `use-mobile.ts` edit. My rule: composable means no edit to `sidebar.tsx`/`sheet.tsx` and no hand-written modal behaviour; a `use-mobile.ts` edit is always called out.

| Items | Split | Resolved |
|---|---|---|
| L1 rail, L3 width, V1 tokens | native vs composable | Composable: `className` overrides plus token aliases. The drawer width is a second constant. |
| L2, L5, S5, T3, V9 (breakpoint and geometry) | needs-code vs composable | Composable via Route B. Route A needs only `use-mobile.ts:3`. |
| L4 CSS-only switch | not-possible vs composable/needs-code | **Not** impossible: `collapsible="none"` skips `isMobile`. The drawer wiring becomes app code; the provider's listeners still install but don't affect layout. |
| L7 scrim, I4 focus return | native/needs-code vs composable | Composable: a CSS overlay rule and the unmount-cleanup refocus. |
| L10 no scroll lock | needs-code vs composable | Composable, but it's a hand-roll defect; don't reproduce it. |
| A1 role toggle | composable vs needs-code | Route A: needs the `use-mobile.ts` edit, and a literal `aria-modal` only via a DOM patch. Route B: composable. `aria-modal` is redundant with `hideOthers` anyway. |
| A8 hidden tab stops | native vs composable | Composable: the closed Sheet unmounts, but desktop offcanvas collapse brings the defect back unless the rail is pinned or `inert`. |
| A10 Escape layering | native vs composable | Composable, and only if Settings becomes a Radix `DropdownMenu`. |
| I1/I2 tour | composable vs needs-code | Needs code, but in the tour (point step 5 elsewhere below the breakpoint). The hand-roll needs the same fix today. |
| I3 always-mounted, S4 no collapse | needs-code vs composable | Composable via Route B plus the Cmd/Ctrl+B guard. |
| S1 cookie, T8 orphan provider | needs-code/native vs composable | Composable: the guard stops the cookie write, and canonical shadcn never reads the cookie. |
| V8 print | native vs needs-code | Needs code, but no owner page prints. |
| T2 vacuous assert | native vs out-of-scope | Out of scope: it's a test bug (`lg:translate-x-0` always contains `translate-x-0`). |

Corrections to the brief:
- shadcn was in use from at least 2025-08-08, not 2025-09-26.
- `240199804` is "complete"; "official" is `7a6a187b8`.
- `4536168ab` moved the app *to* shadcn.
- `1ecfeffac` left two shadcn files in place.
- The swap commit is `debfbf6b9`; main only has the squash.

Files are in `/private/tmp/claude-501/-Users-richard-Developer-tenant-flow/992b9ba7-e5fa-43c5-b8cf-059bace7ca90/scratchpad/sidebar-why/`:
- `final-refetch-74608/`: today's registry re-fetch, identical to the canonical copies
- `product-plan-debfbf6b9/`: the export files from `debfbf6b9`
- `pr474-commits/`: file lists for #474's commits
- `sk-tour-int/out/nav-run1.json`: the font-size probe (item 2)
- `skeptic-a11y/run-skeptic.unmount.out.txt`: the focus-return probe (item 5)
- `skeptic-state/out/run2-none-sheet-fixed.txt`: Route B measurements