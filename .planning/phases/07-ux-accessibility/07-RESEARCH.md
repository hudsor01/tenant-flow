# Phase 7: UX & Accessibility - Research

**Researched:** 2026-03-06
**Domain:** Frontend UX hardening, WCAG accessibility, error handling, mobile responsiveness
**Confidence:** HIGH

## Summary

Phase 7 is a UI polish and accessibility hardening phase with no new features. It covers six workstreams: (1) CSS class fixes (`text-muted` to `text-muted-foreground`, `bg-white` to `bg-background`), (2) ARIA accessibility improvements (skip-to-content, aria-labels on icon buttons, breadcrumb semantics), (3) error boundary and 404 page additions for dynamic routes, (4) tenant soft-delete implementation with active-lease blocking, (5) mobile responsiveness fixes (kanban, breadcrumbs, sidebar focus trap), and (6) standardized empty state and loading patterns.

The codebase already has most building blocks: a shadcn `Switch` component, an `Empty` compound component from shadcn, a `Skeleton` component with variants, an `AlertDialog` pattern from property/unit deletion, and an existing `error.tsx` boundary in the owner layout. The work is primarily mechanical search-and-replace for CSS classes, adding new files for `not-found.tsx` and `error.tsx` in missing routes, and refactoring notification settings to use the proper Switch component.

**Primary recommendation:** Group work into waves by blast radius -- CSS class fixes first (highest file count, lowest risk), then accessibility attributes, then error/404 pages, then tenant delete + mobile fixes, then empty state standardization. Each wave is independently shippable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Generic 404 message for all dynamic routes -- same "Page not found" with link back to dashboard, not entity-specific messages
- Unify all not-found pages -- create one shared NotFound component, update existing ones (owner, tenant, global) to match
- Error boundaries include retry button + "Go to dashboard" link -- two escape actions
- Simple confirmation dialog using AlertDialog -- matches existing property delete pattern, one click to confirm
- Block deletion if tenant has active lease -- show explanation: "End or transfer the lease before removing them"
- Soft-delete pattern -- mark tenant as inactive, keep historical data for lease/payment records (consistent with property soft-delete)
- After deletion, stay on tenants list with success toast -- tenant disappears from list, user stays in context
- Breadcrumbs visible on mobile with truncation -- show first and last items, collapse middle with "..." on small screens
- Mobile sidebar overlay gets full focus trap + Escape key handler -- focus returns to trigger button on close
- Single shared EmptyState component in src/components/shared/ -- accepts icon, title, description, illustration, and action props
- Empty states use Lucide icon + illustration + message + CTA button
- Prefer prefetching and lazy loading to avoid loading states entirely where possible
- Where loading states are needed, use skeleton loaders for list views
- Login page Suspense fallback: branded spinner with TenantFlow logo (subtle fade/pulse animation)

### Claude's Discretion
- Error boundary detail level per route group
- Kanban board mobile adaptation approach
- pb-24 bottom padding scope (mobile-only vs all viewports)
- Exact skeleton loader shapes and animation
- autoFocus placement decisions per form
- How to handle the custom toggle switches to shadcn Switch replacement

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | `text-muted` replaced with `text-muted-foreground` across all files | 36 files with exact `"text-muted"` class; ~72 files with `text-muted` not followed by `-foreground`. Mechanical regex replacement. |
| UX-02 | `text-muted/600` invalid class fixed in stripe-connect-status.tsx | Confirmed: `src/app/(tenant)/tenant/settings/stripe-connect-status.tsx` has 3 occurrences of `text-muted` including the `/600` variant. |
| UX-03 | Tenant delete functionality implemented (real mutation, not log-only) | Existing `useDeleteTenantMutation` in `use-tenant-mutations.ts` only deletes `lease_tenants` associations. Needs soft-delete on tenants table (set status inactive). Need to check for active leases before allowing deletion. |
| UX-04 | Confirmation dialog added for tenant deletion | Pattern exists in `property-units-delete-dialog.tsx` and `property-details.client.tsx` using AlertDialog. Replicate for tenants. |
| UX-05 | Skip-to-content link added to app shell and tenant shell | `app-shell.tsx` (392 lines) and `tenant-shell.tsx` (202 lines) need skip link. Main content already uses `<main>` tag. Add `id="main-content"` and skip link before sidebar. |
| UX-06 | `aria-label` on hamburger menu buttons (both shells) | Confirmed: app-shell has close sidebar `aria-label` but hamburger open button at line 240 lacks it. Same in tenant-shell line 104. |
| UX-07 | `aria-label` on notification bell link | Confirmed: both shells have Bell link without aria-label (app-shell line 276, tenant-shell line 139). |
| UX-08 | `aria-label` on reports scheduled list toggle button | Found in `src/components/reports/reports-scheduled-list.tsx`. |
| UX-09 | `aria-label` on dropzone remove-file button | `src/components/ui/dropzone.tsx` has no aria-labels for remove buttons. |
| UX-10 | `aria-label` on tenant grid action buttons | Confirmed: `tenant-grid.tsx` lines 183-203 use `title` attribute instead of `aria-label` on View/Edit/Delete buttons. |
| UX-11 | Breadcrumb `<nav>` gets `aria-label="Breadcrumb"` | Confirmed: both shells have `<nav className="hidden sm:flex ...">` without aria-label. |
| UX-12 | Hardcoded `bg-white` replaced with `bg-background` | 5 files: slider.tsx, notification-settings.tsx (owner), notification-settings.tsx (settings), preview-panel.tsx, two-factor-setup-dialog.tsx. All have `bg-white` in toggle/thumb CSS. |
| UX-13 | Custom toggle switches replaced with shadcn Switch | Two identical notification-settings files have 8 custom toggle divs each (16 total). `toggle-switch.tsx` already wraps shadcn Switch correctly -- but notification-settings doesn't use it. |
| UX-14 | `not-found.tsx` added for dynamic routes | Existing: `properties/[id]/not-found.tsx`. Missing: `leases/[id]`, `tenants/[id]`, `maintenance/[id]`, `inspections/[id]`, `units/[id]`. Also tenant-side routes. |
| UX-15 | `error.tsx` added for route groups | Existing: `(owner)/error.tsx`, `(tenant)/tenant/error.tsx`, `app/error.tsx`. Missing: `(auth)/`, `auth/`, `blog/`, `pricing/`. |
| UX-16 | Page metadata/titles exported from owner and tenant pages | Only 10 pages have metadata exports. ~106+ owner/tenant pages lack metadata. Server Component pages can export `metadata`. Client pages need `generateMetadata` or parent layout metadata. |
| UX-17 | Unsaved form data protection (beforeunload) | `dom-utils.ts` supports `beforeunload` in event whitelist. Need to add hook or integrate with TanStack Form dirty state. |
| UX-18 | Kanban board responsive columns | `maintenance-kanban.client.tsx` uses `min-w-[300px] w-[300px]` fixed width columns. Needs responsive breakpoints. Tenant kanban (`tenant-maintenance-kanban.tsx`) also affected. |
| UX-19 | Breadcrumbs visible on mobile | Both shells use `hidden sm:flex` on breadcrumb nav. Need to show on mobile with truncation. |
| UX-20 | Mobile sidebar overlay keyboard-accessible | Current overlay div only has `onClick` handler. Needs Escape key + focus trap. |
| UX-21 | `autoFocus` on primary form inputs | Login page, property form, tenant invite form, etc. Claude's discretion on which forms. |
| UX-22 | Login page Suspense fallback styled | Confirmed: `login/page.tsx` line 501 has `<Suspense fallback={<div>Loading...</div>}>`. Needs branded spinner. |
| UX-23 | `pb-24` bottom padding on owner shell conditional to mobile only | `app-shell.tsx` line 297: `<main className="flex-1 bg-muted/30 pb-24">` applies to all viewports. |
| UX-24 | Consistent empty state component usage across all list pages | Existing: `Empty` compound component in `src/components/ui/empty.tsx`, `DashboardEmptyState` uses it. Need shared wrapper in `src/components/shared/`. |
| UX-25 | Property detail loading state uses skeleton pattern | Need to check property detail page for loading state implementation. |
| UX-26 | Raw color classes in property-details.client.tsx replaced with semantic design tokens | Confirmed file exists at `src/app/(owner)/properties/property-details.client.tsx`. |
| DOC-01 | CLAUDE.md rewritten to reflect current codebase state | Recurring requirement -- update after phase completes. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | App Router with `not-found.tsx` and `error.tsx` conventions | Built-in file-based error handling |
| React | 19 | UI rendering | Latest stable |
| TailwindCSS | 4 | Utility classes, design tokens (`text-muted-foreground`, `bg-background`) | Project convention |
| shadcn/ui | latest | Switch, AlertDialog, Skeleton, Empty components | Already installed |
| Lucide React | latest | Icon library (sole icon source per CLAUDE.md) | Project convention |
| sonner | latest | Toast notifications | Already used for mutation feedback |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-switch | latest | Underlying Switch primitive | Via shadcn Switch wrapper |
| @radix-ui/react-alert-dialog | latest | Underlying AlertDialog primitive | Via shadcn AlertDialog wrapper |
| @dnd-kit/core | latest | Kanban drag-and-drop | Existing in kanban, mobile responsiveness |
| class-variance-authority | latest | Component variant styling | Skeleton, Empty component variants |

### No New Dependencies Needed
This phase requires zero new package installations. All components exist in the project already.

## Architecture Patterns

### Pattern 1: Shared NotFound Component
**What:** Single reusable 404 component used by all dynamic route `not-found.tsx` files.
**When to use:** All `[id]` routes that can fail to find an entity.
**Example:**
```typescript
// src/components/shared/not-found-page.tsx
import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import { Home } from 'lucide-react'
import Link from 'next/link'

interface NotFoundPageProps {
  dashboardHref?: string
}

export function NotFoundPage({ dashboardHref = '/dashboard' }: NotFoundPageProps) {
  return (
    <section className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Page not found</AlertTitle>
          <AlertDescription>
            The page you are looking for does not exist or has been removed.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link href={dashboardHref}>
            <Home className="size-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </section>
  )
}
```

Then each route's `not-found.tsx`:
```typescript
// src/app/(owner)/leases/[id]/not-found.tsx
import { NotFoundPage } from '#components/shared/not-found-page'
export default function LeaseNotFound() {
  return <NotFoundPage />
}
```

### Pattern 2: Error Boundary with Two Escape Actions
**What:** `error.tsx` file with retry + dashboard link per CONTEXT.md decision.
**When to use:** Route groups missing error boundaries.
**Example:**
```typescript
'use client'
import { Button } from '#components/ui/button'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { createLogger } from '#shared/lib/frontend-logger'

const logger = createLogger({ component: 'ErrorBoundary' })

export default function ErrorPage({
  error,
  resetAction
}: {
  error: Error & { digest?: string }
  resetAction: () => void
}) {
  useEffect(() => {
    logger.error('Error boundary triggered', {
      action: 'error_boundary',
      metadata: { message: error.message, digest: error.digest }
    })
  }, [error])

  return (
    <div className="flex h-125 w-full items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <div className="space-y-2">
          <h2 className="typography-h4">Something went wrong</h2>
          <p className="text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetAction} variant="outline" size="sm">
            <RefreshCw className="size-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <Home className="size-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Pattern 3: Tenant Soft-Delete with Active Lease Guard
**What:** Check for active leases before allowing tenant deletion. Soft-delete marks tenant status as inactive.
**When to use:** Tenant delete mutation.
**Implementation approach:**
```typescript
// In useDeleteTenantMutation - updated flow:
// 1. Query lease_tenants JOIN leases to check for active leases
// 2. If active lease exists, throw error with user-friendly message
// 3. If no active lease, update tenants table status to 'inactive'
// 4. Filter .neq('status', 'inactive') in tenant list queries
```

The existing `useDeleteTenantMutation` currently only removes `lease_tenants` associations. It needs to be rewritten to:
1. Check for active leases via `lease_tenants` JOIN `leases` WHERE `lease_status = 'active'`
2. If active lease found, reject with descriptive error
3. If no active lease, soft-delete by setting tenant inactive (or a status column -- need to verify tenant table schema)
4. The deletion dialog blocks with explanation when active lease exists

### Pattern 4: Switch Component Replacement
**What:** Replace hand-rolled CSS toggle divs with shadcn Switch.
**When to use:** Both notification-settings.tsx files (owner and settings).
**Example of current vs replacement:**
```typescript
// BEFORE: Custom toggle div (repeated 8 times per file)
<label className="relative inline-flex items-center cursor-pointer">
  <input type="checkbox" checked={...} onChange={...} className="sr-only peer" />
  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
</label>

// AFTER: shadcn Switch
<Switch
  checked={settings?.email ?? true}
  onCheckedChange={value => handleChannelToggle('email', value)}
  disabled={updateSettings.isPending}
/>
```

Note: The project already has `toggle-switch.tsx` which wraps Switch with Label and icon. Could be used for the notification settings rows that have icon + label + description layout.

### Pattern 5: Skip-to-Content Link
**What:** Hidden link that becomes visible on focus, jumping to main content.
**When to use:** Both `app-shell.tsx` and `tenant-shell.tsx`.
**Example:**
```typescript
// First child inside the root div
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
>
  Skip to content
</a>

// Add id to main element
<main id="main-content" className="flex-1 bg-muted/30 pb-24">
```

### Pattern 6: Mobile Breadcrumb Truncation
**What:** Show breadcrumbs on mobile with first/last visible, middle collapsed.
**When to use:** Both shells' breadcrumb nav.
**Example:**
```typescript
// Change: hidden sm:flex -> flex
// When breadcrumbs.length > 2, show first, "...", and last on mobile
<nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
  {breadcrumbs.length <= 2
    ? breadcrumbs.map(/* render all */)
    : <>
        {/* First crumb */}
        {renderCrumb(breadcrumbs[0], 0)}
        {/* Collapsed middle (mobile only) */}
        <span className="sm:hidden text-muted-foreground">...</span>
        {/* Middle crumbs (desktop only) */}
        <span className="hidden sm:contents">
          {breadcrumbs.slice(1, -1).map(renderCrumb)}
        </span>
        {/* Last crumb */}
        {renderCrumb(breadcrumbs[breadcrumbs.length - 1], breadcrumbs.length - 1)}
      </>
  }
</nav>
```

### Pattern 7: Shared EmptyState Component
**What:** Standardized empty state wrapping the existing `Empty` compound component.
**When to use:** All list pages (properties, tenants, leases, maintenance, etc.).
**Design decision:** The project already has `src/components/ui/empty.tsx` (shadcn compound component) and `DashboardEmptyState` uses it. Create a convenience wrapper in `src/components/shared/empty-state.tsx` that accepts standard props.
```typescript
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '#components/ui/empty'
import { Button } from '#components/ui/button'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyMedia variant="icon">
        <Icon className="w-8 h-8" />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
      {actionLabel && (
        <EmptyContent>
          {actionHref ? (
            <Button asChild>
              <Link href={actionHref}>
                <Icon className="w-4 h-4 mr-2" />
                {actionLabel}
              </Link>
            </Button>
          ) : onAction ? (
            <Button onClick={onAction}>
              <Icon className="w-4 h-4 mr-2" />
              {actionLabel}
            </Button>
          ) : null}
        </EmptyContent>
      )}
    </Empty>
  )
}
```

### Anti-Patterns to Avoid
- **Hand-rolled toggle switches:** Use shadcn Switch -- never custom CSS toggle divs
- **`text-muted` without `-foreground`:** The class `text-muted` maps to a muted background color token, not a text color. Always use `text-muted-foreground` for text.
- **`bg-white` hardcoded:** Breaks dark mode. Use `bg-background` instead.
- **`title` attribute for accessibility:** Screen readers may not reliably announce `title`. Use `aria-label` for interactive elements.
- **`hidden sm:flex` for progressive disclosure:** This hides content from mobile entirely. Use responsive truncation instead.
- **Page-specific 404 messages:** Per locked decision, use generic "Page not found" for all routes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle switches | Custom CSS toggle divs | shadcn `Switch` component | Already in project, accessible, dark-mode safe |
| Empty states | Custom per-page empty divs | `Empty` compound component from shadcn | Consistent styling, already exists |
| Confirmation dialogs | Custom modal implementations | shadcn `AlertDialog` | Accessible, focus-trapped, keyboard-navigable |
| Skeleton loaders | Custom animate-pulse divs | shadcn `Skeleton` with variants | Already has size/variant system |
| Focus traps | Manual DOM focus management | `@radix-ui/react-dialog` (via shadcn Sheet) or manual trap | Consider using Sheet for mobile sidebar |
| Skip-to-content links | Complex skip nav | Simple `<a href="#main-content">` with `sr-only` + `focus:not-sr-only` | Standard WCAG pattern, no library needed |

**Key insight:** Every UI component needed for this phase already exists in the project's shadcn installation. This is purely a wiring and consistency phase.

## Common Pitfalls

### Pitfall 1: text-muted vs text-muted-foreground confusion
**What goes wrong:** `text-muted` in Tailwind v4 maps to the muted color (typically a light gray background color), not a text-specific color. Text becomes nearly invisible on light backgrounds.
**Why it happens:** Tailwind v3 naming convention carried over. In v4 with CSS variables, `text-muted` reads the `--muted` variable which is designed for backgrounds.
**How to avoid:** Always use `text-muted-foreground` for text. Run a regex search for `text-muted(?!-)` to find all occurrences.
**Warning signs:** Text appears as very light gray, nearly invisible on light mode.

### Pitfall 2: Client Component metadata exports
**What goes wrong:** Trying to export `metadata` from a `'use client'` page -- Next.js ignores metadata exports from client components.
**Why it happens:** Many owner/tenant pages are client components (use hooks, event handlers).
**How to avoid:** For client component pages, add metadata in the parent `layout.tsx` or create a thin Server Component page wrapper that exports metadata and renders the client component. For dynamic routes, use `generateMetadata`.
**Warning signs:** Page titles show as "TenantFlow" (from root layout) instead of page-specific titles.

### Pitfall 3: Soft-delete filter omission
**What goes wrong:** After adding tenant soft-delete, existing queries continue showing inactive tenants.
**Why it happens:** Unlike properties which already have `.neq('status', 'inactive')`, tenants table may not have a status column.
**How to avoid:** Verify tenant table schema. If no status column exists, need a migration. Add filter to all tenant list queries.
**Warning signs:** Deleted tenants still appear in lists.

### Pitfall 4: Focus trap without escape route
**What goes wrong:** Mobile sidebar overlay traps focus but user cannot escape, or focus is lost when sidebar closes.
**Why it happens:** Incomplete focus trap implementation.
**How to avoid:** Store reference to trigger button, restore focus on close. Add Escape key handler. Ensure tab cycling stays within sidebar.
**Warning signs:** After closing sidebar, focus jumps to top of page instead of hamburger button.

### Pitfall 5: Kanban mobile scroll-snap behavior
**What goes wrong:** Horizontal scroll on mobile kanban is jerky or columns don't snap to edges.
**Why it happens:** Missing `scroll-snap-type` and `scroll-snap-align` CSS properties.
**How to avoid:** Add `scroll-snap-type: x mandatory` on container and `scroll-snap-align: start` on each column.
**Warning signs:** Columns stop between positions during scroll.

### Pitfall 6: Not-found.tsx placement in App Router
**What goes wrong:** `not-found.tsx` in wrong directory doesn't catch the right errors.
**Why it happens:** Next.js `notFound()` function triggers the nearest `not-found.tsx` in the file hierarchy.
**How to avoid:** Place `not-found.tsx` inside the `[id]` directory, or in the route segment that calls `notFound()`. The page component must call `notFound()` when data is null.
**Warning signs:** Global not-found page shows instead of route-specific one, or 404 page has wrong layout.

### Pitfall 7: Duplicate notification settings files
**What goes wrong:** Fixing one notification-settings.tsx but missing the identical copy.
**Why it happens:** Two files exist: `src/components/settings/notification-settings.tsx` and `src/app/(owner)/settings/components/notification-settings.tsx` -- they are identical.
**How to avoid:** Fix both files, or better yet, consolidate them into one shared component.
**Warning signs:** Toggle switches fixed in settings page but not in owner settings.

## Code Examples

### CSS Class Fix Pattern (text-muted)
```typescript
// BEFORE
<p className="text-muted">Some description text</p>

// AFTER
<p className="text-muted-foreground">Some description text</p>
```

Search pattern: `text-muted(?!-foreground)` -- but be careful of `text-muted/600` (also invalid), `bg-muted` (correct, leave alone), and `hover:bg-muted` (correct).

### bg-white Fix Pattern
```typescript
// BEFORE (slider.tsx thumb)
className="... bg-white shadow-sm ..."

// AFTER
className="... bg-background shadow-sm ..."
```

### aria-label on Icon Buttons
```typescript
// BEFORE
<button className="p-2 rounded-md hover:bg-muted lg:hidden"
  onClick={() => setSidebarOpen(true)}>
  <Menu className="w-5 h-5 text-muted-foreground" />
</button>

// AFTER
<button className="p-2 rounded-md hover:bg-muted lg:hidden"
  onClick={() => setSidebarOpen(true)}
  aria-label="Open navigation menu">
  <Menu className="w-5 h-5 text-muted-foreground" />
</button>
```

### Mobile Sidebar Focus Trap
```typescript
// Add useEffect for Escape key and focus management
useEffect(() => {
  if (!sidebarOpen) return

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSidebarOpen(false)
      // Return focus to hamburger button
      triggerRef.current?.focus()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [sidebarOpen])
```

### beforeunload Form Protection
```typescript
// Hook for unsaved form data protection
export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers show generic message regardless of returnValue
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
```

### Login Branded Spinner
```typescript
// Branded loading fallback for login Suspense
function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary animate-pulse">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-sm text-muted-foreground animate-pulse">
          Loading...
        </span>
      </div>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `text-muted` class | `text-muted-foreground` | TailwindCSS v4 | `text-muted` reads `--muted` (background color), `text-muted-foreground` reads `--muted-foreground` (text color) |
| `title` attribute on buttons | `aria-label` attribute | WCAG 2.1 | Screen readers reliably announce aria-label; title is tooltip-only |
| Custom CSS toggles | shadcn Switch (Radix) | shadcn/ui adoption | Accessible, keyboard-navigable, dark-mode safe |
| `hidden sm:flex` breadcrumbs | Responsive truncation | Mobile-first design | Content should be available on mobile, just adapted |
| Per-page empty state divs | Compound Empty component | shadcn/ui convention | Consistent design language |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | text-muted class replacement | unit (regex scan) | `pnpm test:unit -- --run src/app/__tests__/globals.test.tsx` | Existing (adapt) |
| UX-03 | Tenant delete blocks on active lease | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-tenant.test.tsx` | Existing (extend) |
| UX-04 | Tenant delete confirmation dialog | component | `pnpm test:component` | Wave 0 |
| UX-05 | Skip-to-content link renders | component | `pnpm test:unit -- --run src/components/shell/__tests__/app-shell.test.tsx` | Existing (extend) |
| UX-06 | Hamburger has aria-label | component | `pnpm test:unit -- --run src/components/shell/__tests__/app-shell.test.tsx` | Existing (extend) |
| UX-13 | Switch component replaces custom toggles | manual-only | Visual verification | N/A -- CSS swap |
| UX-14 | not-found.tsx renders for missing entities | manual-only | Navigate to invalid ID URL | N/A -- page files |
| UX-15 | error.tsx catches thrown errors | manual-only | Trigger error in route | N/A -- page files |
| UX-18 | Kanban responsive on mobile | manual-only | Resize viewport below 768px | N/A -- CSS change |
| UX-22 | Login Suspense fallback styled | manual-only | Throttle network, observe | N/A -- Suspense |

### Sampling Rate
- **Per task commit:** `pnpm validate:quick` (types + lint + unit tests)
- **Per wave merge:** `pnpm test:unit && pnpm test:component`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Most UX requirements are CSS/markup changes testable only via visual review or snapshot tests
- [ ] Existing shell tests (`app-shell.test.tsx`, `tenant-shell.test.tsx`) can be extended for aria-label assertions
- [ ] Tenant delete mutation test file exists but needs active-lease-block test case
- None of these gaps require new test framework installation -- existing Vitest + Testing Library covers all

## Codebase Inventory

### Files Requiring text-muted Fix (UX-01)
36 files contain exact `"text-muted"` class string. ~72 files contain `text-muted` not followed by `-foreground`. Key concentrations:
- `src/components/settings/notification-settings.tsx` (15 occurrences of `text-muted`)
- `src/app/(tenant)/tenant/documents/page.tsx` (10 occurrences)
- `src/components/settings/billing-settings.tsx` (11 occurrences)
- `src/components/settings/general-settings.tsx` (7 occurrences)
- Error boundary file: `src/components/error-boundary/error-boundary.tsx` (1 occurrence at line 101)
- Owner error page: `src/app/(owner)/error.tsx` (1 occurrence at line 35)

### Dynamic Routes Needing not-found.tsx (UX-14)
Owner routes (need `not-found.tsx`):
- `src/app/(owner)/leases/[id]/` -- missing
- `src/app/(owner)/tenants/[id]/` -- missing
- `src/app/(owner)/maintenance/[id]/` -- missing
- `src/app/(owner)/inspections/[id]/` -- missing
- `src/app/(owner)/units/[id]/` -- missing

Tenant routes (need `not-found.tsx`):
- `src/app/(tenant)/tenant/inspections/[id]/` -- missing
- `src/app/(tenant)/tenant/maintenance/request/[id]/` -- missing

Existing (to unify):
- `src/app/(owner)/properties/[id]/not-found.tsx` -- has entity-specific message, needs generic
- `src/app/(tenant)/tenant/not-found.tsx` -- exists
- `src/app/not-found.tsx` -- global fallback, exists

### Route Groups Needing error.tsx (UX-15)
Missing:
- `src/app/(auth)/error.tsx`
- `src/app/auth/error.tsx`
- `src/app/blog/error.tsx`
- `src/app/pricing/error.tsx`

Existing (update to add dashboard link):
- `src/app/(owner)/error.tsx` -- has retry but no dashboard link
- `src/app/(tenant)/tenant/error.tsx` -- check
- `src/app/error.tsx` -- root level

### Notification Settings Files (UX-13 -- toggle replacement)
Two identical files, each with 8 custom toggle divs:
- `src/components/settings/notification-settings.tsx` (250 lines)
- `src/app/(owner)/settings/components/notification-settings.tsx` (250 lines)

Also: `src/components/profiles/tenant/notification-preferences-section.tsx` -- may have similar toggles.

Existing helper: `src/components/ui/toggle-switch.tsx` -- already wraps shadcn Switch.

### bg-white Files (UX-12)
- `src/components/ui/slider.tsx` -- thumb element
- `src/components/settings/notification-settings.tsx` -- toggle thumb (both copies)
- `src/components/leases/template/preview-panel.tsx` -- content area
- `src/components/auth/two-factor-setup-dialog.tsx` -- unknown context

### Pages Needing Metadata (UX-16)
~106 owner/tenant pages lack `export const metadata` or `export function generateMetadata`. Most are client components, so metadata must be set in parent `layout.tsx` files or through a wrapper pattern.

Strategy: Focus on leaf pages that users directly navigate to. Modal pages (`@modal`) can inherit parent metadata.

## Open Questions

1. **Tenant table schema for soft-delete**
   - What we know: Properties use `status: 'inactive'` for soft-delete. Tenants table may not have a `status` column.
   - What's unclear: Does the `tenants` table have a `status` column? If not, a migration is needed.
   - Recommendation: Check live schema. If no status column, add one in a migration within this phase. Alternative: the `users` table has `status` which `useMarkTenantAsMovedOutMutation` already sets to `'inactive'`.

2. **Notification settings file duplication**
   - What we know: Two identical notification-settings.tsx files exist in different locations.
   - What's unclear: Are both actively imported? Can one be removed?
   - Recommendation: Trace imports to determine if both are used. If so, consolidate to one and import from shared location.

3. **Metadata on client component pages**
   - What we know: Most owner/tenant pages are `'use client'` and cannot export metadata.
   - What's unclear: Which pages are critical for SEO/browser-tab context?
   - Recommendation: Prioritize dashboard, properties, tenants, leases, and settings pages. Use `generateMetadata` in parent layout or create thin server component wrappers.

## Sources

### Primary (HIGH confidence)
- Codebase analysis -- direct file reads and grep searches
- Next.js App Router conventions (`not-found.tsx`, `error.tsx`, `metadata`) -- verified in project structure
- shadcn/ui component API -- verified from `src/components/ui/` files

### Secondary (MEDIUM confidence)
- TailwindCSS v4 color token behavior (`text-muted` vs `text-muted-foreground`) -- based on project's CSS variable naming pattern in globals.css
- WCAG 2.1 aria-label vs title attribute guidance -- established web standard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all components exist in project
- Architecture: HIGH -- patterns derived from existing codebase conventions (property delete, existing error boundaries)
- Pitfalls: HIGH -- identified from actual codebase state (duplicate files, missing aria-labels confirmed)
- CSS class fixes: HIGH -- exact file counts from grep searches
- Tenant soft-delete: MEDIUM -- need to verify tenant table schema for status column

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- no external dependency changes expected)
