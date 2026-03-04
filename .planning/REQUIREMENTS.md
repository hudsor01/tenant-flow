# Requirements: TenantFlow

**Defined:** 2026-03-03
**Core Value:** A landlord can add a property, invite a tenant, collect rent, and see their financials — without touching a spreadsheet or calling anyone.

## v9.0 Requirements

Requirements for Testing Strategy Consolidation milestone. Each maps to roadmap phases.

### Infrastructure Consolidation (INFRA)

- [ ] **INFRA-01**: Vitest config uses `projects` with three named projects: unit (jsdom), component (jsdom), integration (node)
- [ ] **INFRA-02**: All 7 RLS integration tests run under Vitest node project instead of Jest
- [ ] **INFRA-03**: Jest, ts-jest, and @types/jest are removed from dependencies
- [ ] **INFRA-04**: Orphaned `tests/unit/` directory is deleted; `pricing-premium.spec.ts` relocated to `src/`
- [ ] **INFRA-05**: Orphaned `src/__tests__/` files relocated to co-located `__tests__/` directories
- [ ] **INFRA-06**: Package.json test scripts updated for Vitest projects (`test:unit`, `test:integration`, `test:component`)

### Test Data (DATA)

- [ ] **DATA-01**: Factory functions exist for all 6 core entities (property, tenant, lease, unit, maintenance, user) using `@faker-js/faker`
- [ ] **DATA-02**: Factory functions live in `src/test/factories/` with one file per entity
- [ ] **DATA-03**: Existing tests that use DEFAULT_* objects are migrated to factory functions

### API Mocking (MOCK)

- [ ] **MOCK-01**: MSW 2.x is installed and configured with Vitest setup lifecycle (listen/reset/close)
- [ ] **MOCK-02**: Default Supabase PostgREST mock handlers exist for properties, tenants, leases, dashboard RPC
- [ ] **MOCK-03**: MSW handlers organized in `src/test/mocks/handlers/` with one file per domain

### Component Tests (COMP)

- [ ] **COMP-01**: Component tests use `.component.test.tsx` naming convention and run as separate Vitest project
- [ ] **COMP-02**: At least 3 example component tests demonstrate the pattern (render + MSW + TanStack Query)
- [ ] **COMP-03**: RTL best practices enforced (getByRole priority, userEvent.setup(), screen.*, findBy for async)

### E2E Optimization (E2E)

- [ ] **E2E-01**: Playwright config fixed (no stale monorepo references)
- [ ] **E2E-02**: Critical path tests identified and tagged (auth, property CRUD, rent payment, tenant portal)
- [ ] **E2E-03**: Non-critical E2E tests documented as candidates for migration to component tests

### CI Pipeline (CI)

- [ ] **CI-01**: GitHub Actions workflows updated: single Vitest run replaces separate unit + Jest RLS workflows
- [ ] **CI-02**: Vitest uses `--reporter=github-actions` for inline PR annotations
- [ ] **CI-03**: E2E runs only on merge to main (not on every PR); Sentry covers runtime monitoring

## Future Requirements

### Test Coverage Expansion (v10.0+)

- **COV-01**: Component test coverage reaches 100+ tests across all major pages
- **COV-02**: Visual regression testing with Playwright `toHaveScreenshot()`
- **COV-03**: Property-based testing with fast-check for financial calculations
- **COV-04**: Accessibility testing integrated into component test layer
- **COV-05**: Contract tests validating Supabase schema against TypeScript types

## Out of Scope

| Feature | Reason |
|---------|--------|
| Storybook | Over-engineering for current stage; component tests provide sufficient UI coverage |
| fishery library | Factory functions with faker are sufficient; no complex association wiring needed |
| Playwright component tests | Experimental API; Vitest + RTL + MSW is more mature and documented |
| Supabase local (Docker) for tests | RLS tests work against live Supabase; Docker adds complexity without clear benefit |
| Test coverage enforcement in CI | 80% thresholds already in Vitest config; no additional enforcement needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 05 | Pending |
| INFRA-02 | Phase 05 | Pending |
| INFRA-03 | Phase 05 | Pending |
| INFRA-04 | Phase 05 | Pending |
| INFRA-05 | Phase 05 | Pending |
| INFRA-06 | Phase 05 | Pending |
| DATA-01 | Phase 06 | Pending |
| DATA-02 | Phase 06 | Pending |
| DATA-03 | Phase 06 | Pending |
| MOCK-01 | Phase 07 | Pending |
| MOCK-02 | Phase 07 | Pending |
| MOCK-03 | Phase 07 | Pending |
| COMP-01 | Phase 07 | Pending |
| COMP-02 | Phase 07 | Pending |
| COMP-03 | Phase 07 | Pending |
| E2E-01 | Phase 08 | Pending |
| E2E-02 | Phase 08 | Pending |
| E2E-03 | Phase 08 | Pending |
| CI-01 | Phase 08 | Pending |
| CI-02 | Phase 08 | Pending |
| CI-03 | Phase 08 | Pending |

**Coverage:**
- v9.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after roadmap creation*
