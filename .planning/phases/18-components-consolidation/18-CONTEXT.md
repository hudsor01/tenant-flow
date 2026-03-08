# Phase 18: Components Consolidation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Split all oversized component files under the 300-line limit, remove dead components, enable React Compiler via babel-plugin-react-compiler to auto-memoize, and remove manual useMemo/useCallback/React.memo where the compiler handles memoization. Order: split components first, then enable React Compiler + remove manual memos.

</domain>

<decisions>
## Implementation Decisions

### Static content pages
- Claude decides per page whether splitting adds value or creates noise
- Pages that are long due to static JSX (terms, privacy, about, resources, help) may be exempt if splitting doesn't improve maintainability
- Login page (530 lines) MUST be split — it has real auth logic, form state, and OAuth handling
- Test files are exempt from the 300-line rule — only source components/hooks must be under 300

### Borderline files (301-330 lines)
- Try minor refactoring first (remove blank lines, consolidate imports, tighten JSX) to get under 300
- Only split if still over 300 after cleanup

### UI primitive splitting
- All project-owned UI primitives must be split — no exemptions like tour.tsx (which is vendored upstream code)
- chart.tsx (430), stepper-item.tsx (607), stepper.tsx (416), file-upload.tsx (363), dialog.tsx (308) all must be brought under 300
- Stepper files (stepper.tsx, stepper-item.tsx, stepper-context.tsx) should be refactored as a group — reorganize all 3 together for cleaner architecture
- file-upload.tsx (363) should be pushed further despite existing 5-file split — extract remaining state/validation logic

### React Compiler enablement
- Enable globally all-at-once: install babel-plugin-react-compiler, configure in next.config.ts for entire app
- Enablement happens AFTER component splitting is complete (smaller components compile more cleanly)
- Add 'use no memo' to vendored tour.tsx — don't let the compiler touch upstream code
- For components that can't compile: Claude decides per case whether to refactor or use 'use no memo' directive

### Memoization removal
- Aggressively remove all manual useMemo, useCallback, AND React.memo wrappers after React Compiler is enabled
- Trust the compiler for expensive computations too (filtering, sorting, aggregation) — no "safety net" memos
- Memoization removal happens in the same plan as React Compiler enablement (one atomic change, single verification pass)
- Vendored tour.tsx keeps its manual memoization (already opted out via 'use no memo')

### Claude's Discretion
- Exact split points for each oversized component
- Whether specific static content pages benefit from splitting or should stay whole
- Per-component decision on 'use no memo' vs refactor when compiler can't handle a pattern
- Dead component detection and removal approach
- Plan count and grouping (which components to batch together per plan)

</decisions>

<specifics>
## Specific Ideas

- User wants aggressive memoization removal — "pretty aggressively" — the compiler's whole point is to replace manual memo
- 56 component/page files exceed 300 lines (excluding vendored tour.tsx)
- 302 useMemo/useCallback calls across 77 files to be addressed
- Split first, compiler second — this ordering is locked

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/` — shadcn-based UI primitives, some already well-split (file-upload has 5 sub-files)
- `src/components/shared/` — shared components (NotFoundPage, ErrorPage, Empty, chart-loading-skeleton, blog-loading-skeleton)
- Phase 17 established mutationOptions/queryOptions patterns that components consume

### Established Patterns
- Components use `'use client'` directive only when needed (hooks, events, browser APIs)
- Dynamic imports via `next/dynamic` with `ssr: false` for heavy libraries (recharts, react-markdown)
- Data fetching via useSuspenseQuery (Phase 17) or useQuery with query-key factories
- Max 50 lines per function, max 300 lines per component (CLAUDE.md rules)

### Integration Points
- 77 files with useMemo/useCallback — all need review after compiler enablement
- next.config.ts needs React Compiler configuration added
- package.json needs babel-plugin-react-compiler dependency
- Stepper used by: lease creation wizard, bulk import stepper, onboarding flows
- File upload used by: property images, inspection photos, document uploads

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-components-consolidation*
*Context gathered: 2026-03-08*
