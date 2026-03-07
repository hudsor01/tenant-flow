# Phase 7: UX & Accessibility - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Make all text readable, all interactive elements accessible, and error states handled gracefully. Fix visibility issues (text-muted), add missing aria-labels, implement error boundaries and 404 pages for dynamic routes, implement real tenant deletion, fix mobile responsiveness, and standardize empty/loading states. No new features — only fixes to existing UI.

</domain>

<decisions>
## Implementation Decisions

### Error Boundaries & 404 Pages
- Generic 404 message for all dynamic routes — same "Page not found" with link back to dashboard, not entity-specific messages
- Unify all not-found pages — create one shared NotFound component, update existing ones (owner, tenant, global) to match
- Error boundaries include retry button + "Go to dashboard" link — two escape actions
- Error detail level is Claude's discretion (friendly-only vs collapsible details, depending on route context)

### Tenant Delete Flow
- Simple confirmation dialog using AlertDialog — matches existing property delete pattern, one click to confirm
- Block deletion if tenant has active lease — show explanation: "End or transfer the lease before removing them"
- Soft-delete pattern — mark tenant as inactive, keep historical data for lease/payment records (consistent with property soft-delete)
- After deletion, stay on tenants list with success toast — tenant disappears from list, user stays in context

### Mobile Responsiveness
- Breadcrumbs visible on mobile with truncation — show first and last items, collapse middle with "..." on small screens
- Mobile sidebar overlay gets full focus trap + Escape key handler — focus returns to trigger button on close
- Kanban board mobile layout is Claude's discretion (horizontal scroll with snap, collapsible sections, or list view)
- Bottom padding (pb-24) mobile-only vs all viewports is Claude's discretion

### Empty States & Loading Patterns
- Single shared EmptyState component in src/components/shared/ — accepts icon, title, description, illustration, and action props
- Empty states use Lucide icon + illustration + message + CTA button (e.g., "No tenants yet" with "Add your first tenant" button)
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/switch.tsx`: shadcn Switch component available — replace custom toggle divs in notification-settings.tsx
- `src/components/ui/slider.tsx`: Has hardcoded `bg-white` that needs `bg-background` replacement
- `src/app/(owner)/properties/[id]/not-found.tsx`: Existing 404 pattern to unify from
- `src/app/(owner)/error.tsx`: Existing error boundary pattern to extend
- `AlertDialog` from shadcn: Used for property delete confirmation — reuse pattern for tenant delete
- Quick actions dock already has aria-labels (good pattern to follow for other icon buttons)

### Established Patterns
- Soft-delete: properties use `status: 'inactive'` with `.neq('status', 'inactive')` filter — tenant delete should follow same pattern
- Toast notifications via toast store for mutation feedback
- Shell components (app-shell, tenant-shell) are the layout wrappers — skip-to-content link goes here
- Breadcrumb component in shell with `hidden sm:flex` — needs responsive update

### Integration Points
- `src/components/shell/app-shell.tsx`: Skip-to-content link, aria-labels on hamburger, breadcrumb visibility
- `src/components/shell/tenant-shell.tsx`: Same shell-level a11y fixes
- `notification-settings.tsx` (both owner and settings versions): 8+ custom toggle divs to replace with Switch
- 71 files with `text-muted` class needing `text-muted-foreground` replacement
- 4 kanban-related files for mobile responsiveness fixes

</code_context>

<specifics>
## Specific Ideas

- Empty states should feel inviting, not empty — illustration + icon + actionable CTA
- Login loading should set the brand tone from first interaction (logo animation)
- Tenant delete should feel safe — blocking on active lease prevents data loss mistakes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-ux-accessibility*
*Context gathered: 2026-03-06*
