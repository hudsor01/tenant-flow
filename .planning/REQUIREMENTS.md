# Requirements: TenantFlow v1.2

**Defined:** 2026-03-08
**Core Value:** A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.

## v1.2 Requirements

Requirements for Production Polish & Code Consolidation. Each maps to roadmap phases.

### Cleanup & Dead Code

- [ ] **CLEAN-01**: Run Knip audit to identify and remove unused files, exports, and dependencies across the entire codebase
- [ ] **CLEAN-02**: Split all files exceeding 300-line rule (20+ components, 2+ hooks) into focused sub-files
- [ ] **CLEAN-03**: Update TYPES.md master lookup with accurate type locations after cleanup
- [ ] **CLEAN-04**: Cross-directory audit of `src/shared/`, `src/lib/`, `src/types/`, `src/shared/types/`, and `src/components/shared/` for redundancy, misplacement, and duplication
- [ ] **CLEAN-05**: Reconcile or eliminate organizational overlap between `src/shared/` and `src/lib/` with clear ownership boundaries

### Modernization

- [ ] **MOD-01**: Enable React Compiler via `babel-plugin-react-compiler` to auto-memoize components and eliminate manual `useMemo`/`useCallback`
- [ ] **MOD-02**: Expand `useSuspenseQuery` usage to components inside Suspense boundaries beyond current 5 dashboard calls
- [ ] **MOD-03**: Reconcile design tokens — `globals.css` is the sole source of truth, reduce `design-system.ts` to non-CSS contexts only (OG images, emails)

### UI Polish

- [ ] **UI-01**: Redesign marketing navbar (visual design, navigation links, auth state handling)
- [ ] **UI-02**: Audit and fix button/CTA consistency (variants, radius, spacing) across all page groups
- [ ] **UI-03**: Audit and fix card and layout consistency (spacing, typography, shadows) across all page groups
- [ ] **UI-04**: Fix mobile/responsive layout issues across all page groups

### Verification

- [ ] **VER-01**: Systematic browser automation audit of all pages (marketing, blog, auth, tenant portal, owner dashboard) verifying interactions and visual consistency
- [ ] **VER-02**: Mobile viewport testing at 375px, 768px, and 1440px breakpoints verifying responsive layouts

## Future Requirements

### Code Quality

- **QUAL-F01**: Knip CI integration to prevent dead code regression
- **QUAL-F02**: Full typography normalization across all 350+ files
- **QUAL-F03**: MSW component test layer
- **QUAL-F04**: Test data factories (@faker-js/faker)

### UI Enhancements

- **UI-F01**: Dark mode implementation
- **UI-F02**: Storybook / visual regression CI
- **UI-F03**: Accessibility regression test suite

## Out of Scope

| Feature | Reason |
|---------|--------|
| RSC prefetching migration | Architecture change too large for consolidation milestone |
| Storybook setup | Setup cost unjustified for one-time audit |
| `use cache` directive | Experimental, not relevant to dynamic data app |
| TanStack Router migration | Already on Next.js App Router |
| Full mobile responsiveness milestone | Spot-check and fix, not comprehensive redesign |
| mutationOptions() factories | Deferred — queryOptions() pattern is working well, mutations don't need factory parity yet |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEAN-01 | Phase 16 | Pending |
| CLEAN-02 | Phase 16 | Pending |
| CLEAN-03 | Phase 16 | Pending |
| CLEAN-04 | Phase 16 | Pending |
| CLEAN-05 | Phase 16 | Pending |
| MOD-01 | Phase 18 | Pending |
| MOD-02 | Phase 17 | Pending |
| MOD-03 | Phase 16 | Pending |
| UI-01 | Phase 19 | Pending |
| UI-02 | Phase 19 | Pending |
| UI-03 | Phase 19 | Pending |
| UI-04 | Phase 19 | Pending |
| VER-01 | Phase 20 | Pending |
| VER-02 | Phase 20 | Pending |

**Coverage:**
- v1.2 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after initial definition*
