# Phase 18: Components Consolidation - Research

**Researched:** 2026-03-08
**Domain:** React component splitting, React Compiler enablement, memoization removal
**Confidence:** HIGH

## Summary

Phase 18 has two distinct work streams that must execute in sequence: (1) split all oversized component/page files to comply with the 300-line rule, then (2) enable React Compiler via `babel-plugin-react-compiler` and remove manual `useMemo`/`useCallback`/`React.memo` calls. The component splitting is a mechanical refactoring task affecting 44 component/page files (excluding types/lib/config files and static content Server Component pages that may be exempt). The React Compiler enablement is a straightforward configuration change in `next.config.ts` -- the `reactCompiler` option is stable (not experimental) in Next.js 16. Memoization removal affects 89 files containing 360 total `useMemo`/`useCallback` calls plus 5 `React.memo` wrappers.

The critical risk area is the ordering: smaller components compile more cleanly with React Compiler, and the compiler's automatic optimization replaces manual memoization. The user has locked the sequence as split-first, compiler-second. The vendored `tour.tsx` (1,732 lines) is explicitly exempt from both splitting and memo removal -- it gets a `'use no memo'` directive to prevent compiler interference.

**Primary recommendation:** Split components in domain-grouped batches (UI primitives first, then feature components, then pages), enable React Compiler globally in a single atomic change, and aggressively remove all manual memoization in the same plan as compiler enablement.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Static content pages (terms, privacy, about, resources, help) -- Claude decides per page whether splitting adds value or creates noise. Pages long due to static JSX may be exempt if splitting does not improve maintainability.
- Login page (530 lines) MUST be split -- it has real auth logic, form state, and OAuth handling.
- Test files are exempt from the 300-line rule -- only source components/hooks must be under 300.
- Borderline files (301-330 lines) -- try minor refactoring first (remove blank lines, consolidate imports, tighten JSX) to get under 300. Only split if still over 300 after cleanup.
- All project-owned UI primitives must be split -- no exemptions like tour.tsx (which is vendored upstream code).
- chart.tsx (430), stepper-item.tsx (607), stepper.tsx (416), stepper-context.tsx (319), file-upload.tsx (363), dialog.tsx (308) all must be brought under 300.
- Stepper files (stepper.tsx, stepper-item.tsx, stepper-context.tsx) should be refactored as a group -- reorganize all 3 together for cleaner architecture.
- file-upload.tsx (363) should be pushed further despite existing 5-file split -- extract remaining state/validation logic.
- React Compiler enablement: globally all-at-once via `reactCompiler: true` in next.config.ts (stable, not experimental in Next.js 16).
- Enablement happens AFTER component splitting is complete.
- Add `'use no memo'` to vendored tour.tsx -- do not let the compiler touch upstream code.
- For components that cannot compile: Claude decides per case whether to refactor or use `'use no memo'` directive.
- Aggressively remove ALL manual useMemo, useCallback, AND React.memo wrappers after React Compiler is enabled.
- Trust the compiler for expensive computations too (filtering, sorting, aggregation) -- no "safety net" memos.
- Memoization removal happens in the same plan as React Compiler enablement (one atomic change, single verification pass).
- Vendored tour.tsx keeps its manual memoization (already opted out via `'use no memo'`).
- Split first, compiler second -- this ordering is locked.

### Claude's Discretion
- Exact split points for each oversized component.
- Whether specific static content pages benefit from splitting or should stay whole.
- Per-component decision on `'use no memo'` vs refactor when compiler cannot handle a pattern.
- Dead component detection and removal approach.
- Plan count and grouping (which components to batch together per plan).

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLEAN-02 | Split all files exceeding 300-line rule (20+ components, 2+ hooks) into focused sub-files | Inventory of 44 component/page files over 300 lines identified; borderline (301-330) files mapped; splitting patterns documented |
| MOD-01 | Enable React Compiler via `babel-plugin-react-compiler` to auto-memoize components and eliminate manual `useMemo`/`useCallback` | Installation steps verified against Next.js 16 official docs; `reactCompiler: true` is stable top-level config; 89 files / 360 memo calls catalogued for removal |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| babel-plugin-react-compiler | 1.0.0 | Babel plugin enabling React Compiler auto-memoization | Only way to enable React Compiler; stable 1.0 release (Oct 2025) |
| next | 16.1.6 | Framework with stable `reactCompiler` config | Already installed; `reactCompiler` promoted from experimental to stable in v16 |
| react | 19.2.4 | Core library | Already installed; React Compiler targets React 19 natively, no extra runtime needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint-plugin-react-hooks | ^7.0.1 | Linting for Rules of React (includes compiler rules) | Already installed; compiler-specific lint rules merged into this package, no separate eslint-plugin-react-compiler needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Global compiler enablement | `compilationMode: 'annotation'` (opt-in per component) | User explicitly chose global enablement; annotation mode is for cautious rollouts |
| panicThreshold: default (fail) | `panicThreshold: 'none'` (skip problematic components) | Default is fine -- compiler silently skips code it cannot optimize rather than failing builds |

**Installation:**
```bash
pnpm add -D babel-plugin-react-compiler@latest
```

## Architecture Patterns

### Component Splitting Pattern
**What:** Extract sub-components, helper functions, constants, and types from oversized files into sibling files.
**When to use:** Any component/page file exceeding 300 lines.

**Split strategy (in order of preference):**
1. Extract sub-components that have their own rendering logic into sibling files (e.g., `lease-creation-wizard-header.tsx`)
2. Extract helper/utility functions into a `<name>.utils.ts` file
3. Extract constants/config data into a `<name>.constants.ts` file
4. Extract types into a `<name>.types.ts` file (only if not already in `src/types/`)

**Naming convention:**
```
src/components/shell/
  app-shell.tsx              # Main component (under 300 lines)
  app-shell-sidebar.tsx      # Extracted sub-component
  app-shell-header.tsx       # Extracted sub-component
  app-shell-search.tsx       # Extracted sub-component
```

**Import pattern (no barrel files):**
```typescript
// Correct: import directly from defining file
import { AppShellSidebar } from './app-shell-sidebar'

// Wrong: never create index.ts re-exports
import { AppShellSidebar } from './index'
```

### Borderline File Cleanup Pattern
**What:** For files 301-330 lines, attempt cleanup before splitting.
**When to use:** 20 files in the 301-330 range.

**Cleanup tactics:**
1. Remove unnecessary blank lines between adjacent JSX elements
2. Consolidate multi-line imports onto fewer lines
3. Remove redundant type annotations where TypeScript infers correctly
4. Tighten JSX (combine short adjacent elements)
5. If still over 300 after cleanup, then split

### React Compiler Configuration Pattern
**What:** Enable React Compiler globally via `next.config.ts`.
**When to use:** After all component splitting is complete.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  reactCompiler: true, // Stable in Next.js 16 -- NOT under experimental
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', '@tanstack/react-form', '@tanstack/react-virtual'],
  },
  // ... rest of config
}
```

### Vendored Code Opt-Out Pattern
**What:** Add `'use no memo'` directive to vendored components.
**When to use:** tour.tsx (vendored Dice UI upstream code).

```typescript
// Source: https://react.dev/reference/react-compiler/directives/use-no-memo
'use client'
'use no memo' // Must be at top of function body or file-level

import { /* ... */ } from 'react'
// ... rest of vendored code unchanged
```

### Memoization Removal Pattern
**What:** Remove `useMemo`, `useCallback`, and `React.memo` wrappers.
**When to use:** All files after React Compiler is enabled (except vendored tour.tsx).

**Before:**
```typescript
const filteredItems = useMemo(
  () => items.filter(item => item.status === 'active'),
  [items]
)
const handleClick = useCallback((id: string) => {
  doSomething(id)
}, [doSomething])
const MemoizedRow = memo(function TableRow({ data }: Props) {
  return <tr>...</tr>
})
```

**After:**
```typescript
const filteredItems = items.filter(item => item.status === 'active')
const handleClick = (id: string) => {
  doSomething(id)
}
function TableRow({ data }: Props) {
  return <tr>...</tr>
}
```

**Import cleanup:** After removing `useMemo`/`useCallback`/`memo`, remove them from the `import { ... } from 'react'` statement. TypeScript's `noUnusedLocals` will catch any missed removals.

### Anti-Patterns to Avoid
- **Creating barrel files during splits:** Never create `index.ts` files to re-export split components. Import directly from the defining file.
- **Splitting Server Components unnecessarily:** Static content pages (terms, privacy, about, resources, help) are pure JSX Server Components with no hooks or state. Splitting these into smaller files may add noise without improving maintainability.
- **Keeping "safety net" memos:** Do not keep manual `useMemo` for "expensive" computations after enabling the compiler. The compiler handles this automatically.
- **Removing memos from vendored code:** tour.tsx keeps its manual memoization and gets `'use no memo'` to prevent compiler interference.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Component memoization | Manual `useMemo`/`useCallback`/`React.memo` | React Compiler auto-memoization | Compiler analyzes data flow and memoizes optimally; manual memos are often wrong or excessive |
| Dead code detection | Manual grep/search for unused components | `pnpm typecheck` after splits | TypeScript `noUnusedLocals` catches unused imports; existing tests catch broken references |
| Build verification | Manual browser testing | `pnpm typecheck && pnpm lint && pnpm test:unit` | Automated pipeline catches regressions faster than manual checks |

**Key insight:** The React Compiler replaces an entire category of manual optimization work. After enablement, the codebase should have zero manual memoization in project-owned code (except the vendored tour.tsx with `'use no memo'`).

## Common Pitfalls

### Pitfall 1: Breaking Import Paths During Splits
**What goes wrong:** When extracting sub-components, existing imports from other files break because the export moves.
**Why it happens:** Other files import directly from the original file path, and the export is no longer there after splitting.
**How to avoid:** Keep the main component's public export in the original file. Only extract internal sub-components that are not imported elsewhere. Use `pnpm typecheck` after each split to verify.
**Warning signs:** TypeScript errors mentioning missing exports.

### Pitfall 2: React Compiler Silently Skipping Components
**What goes wrong:** The compiler encounters code that violates Rules of React and silently skips optimization rather than failing.
**Why it happens:** Patterns like mutating props, reading refs during render, or side effects in render cause the compiler to bail out.
**How to avoid:** The project already uses `eslint-plugin-react-hooks@^7.0.1` which includes compiler-compatible linting rules. Run `pnpm lint` after enablement to catch violations. Use React DevTools to check for the compiler badge on components.
**Warning signs:** Components missing the compiler badge in DevTools, no performance improvement on known-heavy components.

### Pitfall 3: Removing Memos That Guard Effect Dependencies
**What goes wrong:** Some `useMemo` calls exist not for performance but to stabilize references used as effect dependencies. Removing them causes effects to re-fire on every render.
**Why it happens:** The `useMemo` was ensuring referential equality for objects/arrays passed to `useEffect` dependency arrays.
**How to avoid:** The React Compiler handles this case automatically -- it memoizes values used as effect dependencies. However, verify with tests that effects do not fire excessively after removal. The existing 1,415 unit tests provide a safety net.
**Warning signs:** Tests failing with "too many renders" or effect-related assertion failures.

### Pitfall 4: Splitting Stepper Files Independently
**What goes wrong:** stepper.tsx, stepper-item.tsx, and stepper-context.tsx are tightly coupled. Splitting one without considering the others creates inconsistent architecture.
**Why it happens:** These three files share types, contexts, and utilities extensively.
**How to avoid:** Refactor all three stepper files as a group in a single plan. Reorganize shared types/constants/utilities into stepper-context.tsx (or a new stepper-types.ts), then split rendering logic from each.
**Warning signs:** Circular imports between stepper files.

### Pitfall 5: Build Time Increase from React Compiler
**What goes wrong:** Development and production build times increase because the React Compiler uses Babel (not SWC) for compilation.
**Why it happens:** Next.js 16 uses a custom SWC optimization to only apply the compiler to relevant files (those with JSX or React hooks), but there is still overhead.
**How to avoid:** This is expected and acceptable. Next.js 16's optimization minimizes the impact by skipping irrelevant files. Monitor build times but do not disable the compiler for this reason.
**Warning signs:** Significant (2x+) build time increase could indicate configuration issues.

### Pitfall 6: Tour.tsx Directive Placement
**What goes wrong:** The `'use no memo'` directive must be placed correctly or the compiler ignores it.
**Why it happens:** The directive must be at the very beginning of the function body (after 'use client', which is file-level). For module-level opt-out, it should be at the top of the file.
**How to avoid:** Place `'use no memo'` right after `'use client'` at the file level. Verify by checking that tour.tsx does NOT show the compiler badge in React DevTools.
**Warning signs:** Compiler errors or unexpected behavior in the tour component.

## Inventory of Files

### Tier 1: UI Primitives (Must Split -- Locked Decision)
| File | Lines | Memo Calls | Notes |
|------|-------|------------|-------|
| stepper-item.tsx | 607 | 2/5 | Refactor as group with stepper.tsx + stepper-context.tsx |
| chart.tsx | 430 | 2/0 | shadcn chart wrapper with recharts |
| stepper.tsx | 416 | 4/11 | Refactor as group |
| file-upload.tsx | 363 | 4/4 | Already has 5 sub-files; extract remaining state/validation |
| stepper-context.tsx | 319 | 0/2 | Refactor as group |
| dialog.tsx | 308 | 0/0 | Combined Dialog + AlertDialog primitives |

### Tier 2: Feature Components (Must Split)
| File | Lines | Memo Calls | Notes |
|------|-------|------------|-------|
| app-shell.tsx | 491 | 5/2 | Sidebar, header, search, mobile nav |
| contact-form.tsx | 452 | 0/0 | Large form with validation |
| selection-step.tsx | 435 | 0/0 | Lease wizard step |
| maintenance-view.client.tsx | 394 | 3/2 | Detail view with tabs |
| inspection-detail.client.tsx | 387 | 0/0 | Detail view |
| subscriptions-tab.tsx | 379 | 2/0 | Payment subscriptions |
| lease-creation-wizard.tsx | 374 | 2/3 | Multi-step form |
| maintenance-form.client.tsx | 374 | 2/0 | Form with file uploads |
| two-factor-setup-dialog.tsx | 369 | 0/0 | MFA setup |
| property-form.client.tsx | 368 | 0/0 | Property creation/edit form |
| tenant-detail-sheet.tsx | 359 | 0/2 | Drawer with tabs |
| balance-sheet.tsx | 350 | 0/0 | Financial report |
| connect-account-status.tsx | 346 | 0/0 | Stripe Connect status |
| renew-lease-dialog.tsx | 342 | 0/0 | Lease renewal form |
| properties.tsx | 341 | 2/6 | Property list with filtering |
| owner-subscribe-dialog.tsx | 341 | 2/0 | Subscription dialog |
| leases-table.tsx | 337 | 0/0 | Table with actions |
| cash-flow.tsx | 329 | 0/0 | Financial report |
| testimonials-section.tsx | 325 | 0/4 | Marketing section |
| hero-dashboard-mockup.tsx | 325 | 0/0 | Marketing hero |
| bulk-import-stepper.tsx | 319 | 0/3 | Multi-step import |
| kibo-style-pricing.tsx | 319 | 2/0 | Pricing cards |
| edit-unit-panel.tsx | 316 | 0/0 | Unit edit form |
| details-step.tsx | 314 | 0/0 | Lease wizard step |
| payment-methods-list.tsx | 314 | 0/0 | Billing payment list |
| tax-documents.tsx | 305 | 0/0 | Tax report |
| chart-area-interactive.tsx | 301 | 0/0 | Dashboard chart |

### Tier 3: Pages (Must Split)
| File | Lines | Memo Calls | Notes |
|------|-------|------------|-------|
| login/page.tsx | 530 | 0/0 | MUST split (locked decision) -- auth logic + OAuth + MFA |
| confirm-email/page.tsx | 402 | 0/2 | Email confirmation flow |
| pricing/page.tsx | 387 | 0/0 | Pricing page with toggle |
| security-settings.tsx | 385 | 0/0 | Settings sub-page |
| analytics/overview/page.tsx | 379 | 0/0 | Analytics dashboard |
| financial-charts.tsx | 375 | 5/0 | Analytics charts |
| leases/page.tsx | 363 | 5/0 | Lease list page |
| billing-settings.tsx | 336 | 0/0 | Settings sub-page |
| tenant-payment-methods.client.tsx | 349 | 3/0 | Tenant payment methods |
| tenant/documents/page.tsx | 344 | 0/0 | Tenant document list |
| tenant-details.client.tsx | 331 | 0/0 | Tenant profile details |
| tenant/maintenance/new/page.tsx | 329 | 0/0 | New maintenance request |
| property-inspection-template.client.tsx | 329 | 2/2 | Document template |
| select-role/page.tsx | 325 | 0/0 | Role selection |
| property-performance/page.tsx | 324 | 0/0 | Analytics page |
| unit-actions.tsx | 321 | 0/0 | Unit actions menu |
| tenant/profile/page.tsx | 308 | 0/0 | Tenant profile |
| tenant/payments/autopay/page.tsx | 301 | 0/0 | Autopay settings |

### Tier 4: Static Content Pages (Claude's Discretion -- Likely Exempt)
| File | Lines | Has Hooks | Notes |
|------|-------|-----------|-------|
| terms/page.tsx | 526 | No | Server Component, pure static JSX |
| privacy/page.tsx | 475 | No | Server Component, pure static JSX |
| about/page.tsx | 348 | No | Server Component, pure static JSX |
| resources/page.tsx | 333 | No | Server Component, pure static JSX |
| help/page.tsx | 329 | No | Server Component, pure static JSX |

### Tier 5: Hooks (Must Address)
| File | Lines | Memo Calls | Notes |
|------|-------|------------|-------|
| use-tenant-payments.ts | 301 | 0/0 | Borderline -- cleanup may suffice |

### Not In Scope (Types/Lib/Config files)
These files exceed 300 lines but are NOT components/hooks and are NOT subject to the 300-line component rule:
- `src/types/api-contracts.ts` (1012), `src/types/core.ts` (538), `src/types/analytics.ts` (492), `src/types/financial-statements.ts` (363), `src/types/lease-generator.types.ts` (347), `src/types/analytics-page-data.ts` (308), `src/types/relations.ts` (306)
- `src/lib/templates/lease-template.ts` (745), `src/lib/dom-utils.ts` (450), `src/lib/validation/lease-wizard.schemas.ts` (438), `src/lib/constants/status-types.ts` (427)
- `src/config/pricing.ts` (356)

### Memoization Removal Summary
| Category | useMemo | useCallback | React.memo | Total |
|----------|---------|-------------|------------|-------|
| Project-owned code (89 files) | 166 | 194 | 5 | 365 |
| Vendored tour.tsx (exempt) | 6 | 9 | 0 | 15 |

**React.memo locations (5 wrappers in 3 files):**
- `mobile-nav.tsx`: NavItem, MobileNav
- `tenant-table-row.tsx`: TenantTableRow
- `property-table-row.tsx`: PropertyTableRow
- `property-units-table-row.tsx`: UnitTableRow

## Code Examples

### Enabling React Compiler in next.config.ts
```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler
const nextConfig: NextConfig = {
  reactCompiler: true, // Top-level, NOT under experimental (Next.js 16)
  experimental: {
    optimizePackageImports: [/* existing */],
  },
  images: { /* existing */ },
}
```

### Adding 'use no memo' to tour.tsx
```typescript
// At the top of the file, after 'use client'
'use client'

'use no memo'

// ... rest of vendored tour.tsx code unchanged
```

### Component Split Example (app-shell.tsx)
```typescript
// app-shell.tsx (main file, under 300 lines)
'use client'
import { AppShellSidebar } from './app-shell-sidebar'
import { AppShellHeader } from './app-shell-header'
import { AppShellSearchDialog } from './app-shell-search'

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // ... minimal orchestration logic
  return (
    <div>
      <AppShellSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppShellHeader onMenuClick={() => setSidebarOpen(true)} />
      <main>{children}</main>
    </div>
  )
}
```

### Memoization Removal Example
```typescript
// BEFORE
import { useCallback, useMemo } from 'react'

function PropertiesPage() {
  const filteredProperties = useMemo(
    () => properties?.filter(p => p.status !== 'inactive') ?? [],
    [properties]
  )
  const handleSort = useCallback((column: string) => {
    setSortBy(column)
  }, [])
  // ...
}

// AFTER (React Compiler handles memoization automatically)
function PropertiesPage() {
  const filteredProperties = properties?.filter(p => p.status !== 'inactive') ?? []
  const handleSort = (column: string) => {
    setSortBy(column)
  }
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `experimental: { reactCompiler: true }` | `reactCompiler: true` (top-level) | Next.js 16 (Oct 2025) | Config key moved out of experimental |
| `eslint-plugin-react-compiler` (separate pkg) | `eslint-plugin-react-hooks@latest` (merged) | 2025 | Compiler lint rules now built into hooks plugin; separate package deprecated |
| Manual `useMemo`/`useCallback` everywhere | React Compiler auto-memoization | React Compiler 1.0 (Oct 2025) | Manual memoization becomes unnecessary for Rules-of-React-compliant code |
| `React.memo` wrapper for table rows | React Compiler handles component memoization | React Compiler 1.0 | Compiler decides optimal memoization boundaries automatically |

**Deprecated/outdated:**
- `eslint-plugin-react-compiler`: Deprecated; compiler lint rules merged into `eslint-plugin-react-hooks@latest`
- `experimental.reactCompiler`: Moved to top-level `reactCompiler` in Next.js 16

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` (workspace with unit/component/integration projects) |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm typecheck && pnpm lint && pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-02 | All component files under 300 lines | lint/script | `find src -name '*.tsx' \| xargs wc -l \| awk '$1 > 300'` + manual review | N/A (script check) |
| CLEAN-02 | Split files maintain correct imports | unit | `pnpm typecheck` | Existing (tsconfig strict) |
| CLEAN-02 | Split components render correctly | unit | `pnpm test:unit` | Existing (1,415 tests) |
| MOD-01 | React Compiler enabled and building | build | `pnpm typecheck && pnpm lint` | Existing |
| MOD-01 | Manual memos removed without regression | unit | `pnpm test:unit` | Existing (1,415 tests) |
| MOD-01 | tour.tsx opted out with 'use no memo' | manual | Visual check in React DevTools | Manual-only |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure (1,415 unit tests, TypeScript strict mode, ESLint) covers all phase requirements. No new test files needed. The primary validation is that `pnpm typecheck`, `pnpm lint`, and `pnpm test:unit` all pass clean after each batch of changes.

## Open Questions

1. **Static content page exemption scope**
   - What we know: terms (526), privacy (475), about (348), resources (333), help (329) are all Server Components with zero hooks, state, or client-side logic. They are purely static JSX.
   - What is unclear: Whether the user considers these in the "20+ files" count that must be split.
   - Recommendation: Exempt all 5 from splitting. They are static content that gains nothing from decomposition. The 300-line rule targets maintainability of stateful/interactive components. Focus splitting effort on the 44 component/page files with actual logic.

2. **Build time impact monitoring**
   - What we know: React Compiler uses Babel, which is slower than SWC. Next.js 16 mitigates this by only applying the compiler to relevant files.
   - What is unclear: Exact build time increase for this specific project.
   - Recommendation: Note baseline build time before enablement and compare after. A modest increase (10-30%) is expected and acceptable.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 reactCompiler docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler) - Stable config syntax, installation steps
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) - Confirms `reactCompiler` promoted from experimental to stable
- [React Compiler installation](https://react.dev/learn/react-compiler/installation) - Package name, version, build tool setup
- [React Compiler introduction](https://react.dev/learn/react-compiler/introduction) - What it optimizes, interaction with existing useMemo/useCallback
- ['use no memo' directive docs](https://react.dev/reference/react-compiler/directives/use-no-memo) - Opt-out syntax and placement
- [React Compiler configuration](https://react.dev/reference/react-compiler/configuration) - panicThreshold, compilationMode, target options
- [React Compiler debugging](https://react.dev/learn/react-compiler/debugging) - Troubleshooting workflow, DevTools badge verification

### Secondary (MEDIUM confidence)
- [babel-plugin-react-compiler npm](https://www.npmjs.com/package/babel-plugin-react-compiler) - Latest version 1.0.0
- [eslint-plugin-react-hooks consolidation](https://github.com/reactwg/react-compiler/discussions/18) - Compiler lint rules merged into hooks plugin
- Direct codebase analysis - File line counts, memoization call counts, import patterns

### Tertiary (LOW confidence)
- None required; all findings verified against official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified against official Next.js 16 and React Compiler 1.0 docs
- Architecture: HIGH - Splitting patterns are mechanical refactoring; compiler config is well-documented
- Pitfalls: HIGH - Documented by React team; verified against project's specific code patterns
- Inventory: HIGH - Direct codebase analysis with exact file counts and line numbers

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable libraries, 30-day validity)
