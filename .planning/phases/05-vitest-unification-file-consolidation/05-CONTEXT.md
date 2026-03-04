# Phase 05: Vitest Unification + File Consolidation - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Consolidate all test runners under a single Vitest 4.x config with named projects (unit, component, integration), remove Jest entirely, and relocate all orphaned test files to their correct co-located directories. No new test patterns are added — this is pure infrastructure consolidation.

</domain>

<decisions>
## Implementation Decisions

### RLS test migration (Jest → Vitest)
- Use Vitest's built-in `envFile` option in the integration project config to load .env.local/.env — no manual dotenv setup file needed
- Set `globals: true` so describe/it/expect work without import changes — all 7 RLS test files keep their current API
- Sequential execution: use `pool: 'forks'` with single thread (`poolOptions.forks.singleFork: true`) — matches Jest's `--runInBand` behavior since RLS tests mutate data and clean up in afterAll
- 30-second test timeout carries over to Vitest integration project config
- supabase-client.ts setup file (createTestClient, getTestCredentials) works as-is — supabase-js is ESM-compatible
- No proof-of-concept branch needed — proceed directly with full migration

### Orphaned file relocation
- `src/__tests__/foundation/` (4 files) and `src/__tests__/profile/` (1 file): Claude decides per-file placement based on what each file actually imports/renders — co-locate next to the source module being tested
- `tests/unit/pricing-premium.spec.ts`: Move to `tests/e2e/tests/` — it's a Playwright test (imports `@playwright/test`), not a Vitest test
- `tests/unit/` directory: Delete entirely including tsconfig.json, .DS_Store, playwright/.auth/ stale files
- `src/__tests__/` directory: Delete after all files relocated
- All relocations and deletions in the same commit

### Vitest projects config
- Recharts alias hacks stay at root level — both unit and component projects inherit via `extends: true`
- Pool strategy: `vmThreads` for unit and component projects (faster for jsdom), `forks` for integration project (real network I/O to Supabase)
- Component project created NOW with `include: ['src/**/*.component.test.tsx']` pattern — empty until Phase 07 populates it, but scripts work from day 1
- Coverage thresholds (80% all dimensions) at root/global level — integration tests excluded from coverage (they hit real DB, not source code coverage)
- Custom env loader function (`loadEnvFile`) from current config carries over to root level
- `@vitejs/plugin-react` and `vite-tsconfig-paths` plugins at root level, inherited by all projects

### Script naming & CI
- New pnpm scripts: `test:unit` (vitest --project unit), `test:component` (vitest --project component), `test:integration` (vitest --project integration), `test:e2e` (playwright, unchanged)
- `test:rls` becomes alias for `test:integration` (backward compatibility)
- `test` runs all Vitest projects (`vitest --run`)
- CI `tests.yml` updated to run `pnpm test:unit && pnpm test:component` (component is empty but ready)
- CI `rls-security-tests.yml` switches from `pnpm test:rls` (Jest) to `pnpm test:integration` (Vitest) immediately — one clean cutover
- CLAUDE.md Key Commands section updated in this phase to reflect new script names

### Claude's Discretion
- Exact co-location targets for each of the 5 orphaned test files (based on import analysis)
- Whether to keep or simplify the custom `loadEnvFile` function (Vitest may handle it natively)
- How to structure the `projects` array in vitest.config.ts (inline vs separate config files)
- Any additional cleanup of stale test config files discovered during implementation

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vitest.config.ts`: Current flat config with jsdom, vmThreads, recharts aliases, custom env loader — base for the new projects config
- `tests/integration/setup/supabase-client.ts`: createTestClient + getTestCredentials — works as-is for Vitest node project
- `tests/integration/setup/env.ts`: dotenv loader — will be replaced by Vitest envFile config
- `src/test/unit-setup.ts`: Global setup for jsdom tests (mocks navigation, media queries, ResizeObserver, etc.) — shared by unit and component projects

### Established Patterns
- RLS tests: 7 files × describe/beforeAll/afterAll with dual Supabase clients (ownerA, ownerB) — no framework-specific APIs beyond describe/it/expect
- Unit tests: Co-located in `__tests__/` directories adjacent to source (25 directories across src/)
- Test data: `src/test/utils/test-data.ts` with DEFAULT_* objects (migrated to factories in Phase 06)

### Integration Points
- `package.json` scripts: 6 test-related scripts need updating
- `.github/workflows/tests.yml`: References `pnpm test:unit`
- `.github/workflows/rls-security-tests.yml`: References `pnpm test:rls` with Jest
- `CLAUDE.md`: Key Commands section references current script names
- `lefthook.yml` or pre-commit hooks: May reference test:rls

</code_context>

<specifics>
## Specific Ideas

- User wants one clean cutover — no parallel Jest+Vitest period
- E2E stays in pre-commit (from Phase 03 decision), not affected by this phase
- The `test:rls` alias must exist for backward compatibility (docs, CI, muscle memory)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-vitest-unification-file-consolidation*
*Context gathered: 2026-03-03*
