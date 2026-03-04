# Phase 05: Vitest Unification + File Consolidation - Research

**Researched:** 2026-03-03
**Domain:** Vitest 4.x projects configuration, Jest removal, test file organization
**Confidence:** HIGH

## Summary

This phase consolidates all test runners under a single Vitest 4.x config with three named projects (unit, component, integration), removes Jest entirely, and relocates orphaned test files to their correct co-located directories. The technical challenge is straightforward: Vitest 4.x's `projects` API (replacing the deprecated `workspace` from 3.2) supports inline project definitions with per-project environments, pool strategies, and include patterns. The existing RLS integration tests use only `describe`/`it`/`expect`/`beforeAll`/`afterAll` with no Jest-specific APIs, making the migration low-risk.

The current codebase already uses Vitest 4.0.18 for unit tests and Jest 30.2.0 solely for RLS integration tests. Jest exists only because the integration tests predated Vitest adoption. With `globals: true` in the integration project config, the 7 RLS test files require zero API changes -- just a different runner.

**Primary recommendation:** Restructure `vitest.config.ts` to use `defineConfig` with a `test.projects` array containing three inline project definitions. Use `extends: true` on unit and component projects to inherit root-level plugins and aliases. Use `pool: 'forks'` with `poolOptions.forks.singleFork: true` for the integration project. Remove Jest, ts-jest, and @types/jest after verifying all integration tests pass.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- RLS test migration uses Vitest's built-in env loading via `loadEnv` from Vite (no manual dotenv setup file needed)
- Set `globals: true` so describe/it/expect work without import changes -- all 7 RLS test files keep their current API
- Sequential execution: use `pool: 'forks'` with `poolOptions.forks.singleFork: true` for integration project
- 30-second test timeout carries over to Vitest integration project config
- supabase-client.ts setup file works as-is -- supabase-js is ESM-compatible
- No proof-of-concept branch needed -- proceed directly with full migration
- `tests/unit/pricing-premium.spec.ts`: Move to `tests/e2e/tests/` -- it is a Playwright test
- `tests/unit/` directory: Delete entirely including tsconfig.json, .DS_Store, playwright/.auth/ stale files
- `src/__tests__/` directory: Delete after all files relocated
- All relocations and deletions in the same commit
- Recharts alias hacks stay at root level -- both unit and component projects inherit via `extends: true`
- Pool strategy: `vmThreads` for unit and component projects, `forks` for integration project
- Component project created NOW with `include: ['src/**/*.component.test.tsx']` pattern -- empty until Phase 07
- Coverage thresholds (80% all dimensions) at root/global level -- integration tests excluded from coverage
- Custom `loadEnvFile` function from current config carries over to root level
- `@vitejs/plugin-react` and `vite-tsconfig-paths` plugins at root level, inherited by all projects
- New pnpm scripts: `test:unit`, `test:component`, `test:integration`, `test:rls` (alias)
- `test:rls` becomes alias for `test:integration` (backward compatibility)
- `test` runs all Vitest projects (`vitest --run`)
- CI `tests.yml` updated to run `pnpm test:unit && pnpm test:component`
- CI `rls-security-tests.yml` switches from Jest to Vitest immediately -- one clean cutover
- CLAUDE.md Key Commands section updated in this phase

### Claude's Discretion
- Exact co-location targets for each of the 5 orphaned test files (based on import analysis)
- Whether to keep or simplify the custom `loadEnvFile` function (Vitest may handle it natively)
- How to structure the `projects` array in vitest.config.ts (inline vs separate config files)
- Any additional cleanup of stale test config files discovered during implementation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Vitest config uses `projects` with three named projects: unit (jsdom), component (jsdom), integration (node) | Vitest 4.x `projects` API documented; inline project definitions with `extends: true` for inheritance; per-project `environment`, `pool`, `include` patterns |
| INFRA-02 | All 7 RLS integration tests run under Vitest node project instead of Jest | RLS tests use only describe/it/expect/beforeAll/afterAll (no Jest-specific APIs); `globals: true` eliminates import changes; `pool: 'forks'` with `singleFork: true` matches `--runInBand` |
| INFRA-03 | Jest, ts-jest, and @types/jest are removed from dependencies | Currently in devDependencies: jest@30.2.0, ts-jest@29.4.6, @types/jest@30.0.0; also jest.config.ts in tests/integration/; jest-axe@10.0.0 can stay (works with Vitest) |
| INFRA-04 | Orphaned `tests/unit/` directory deleted; `pricing-premium.spec.ts` relocated to `tests/e2e/tests/` | File confirmed as Playwright test (imports @playwright/test); target directory exists at tests/e2e/tests/ |
| INFRA-05 | Orphaned `src/__tests__/` files relocated to co-located `__tests__/` directories | 5 files analyzed: 4 foundation tests + 1 profile test; co-location targets identified based on import analysis |
| INFRA-06 | Package.json test scripts updated for Vitest projects | 6 existing test scripts to update; lefthook.yml references test:rls; CI workflows reference test:unit and test:rls |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.0.18 | Test runner (unit, component, integration) | Already installed; projects API replaces workspace since 3.2 |
| @vitest/coverage-v8 | 4.0.18 | Code coverage | Already installed; root-level configuration |
| @vitejs/plugin-react | 5.1.4 | JSX transform for jsdom tests | Already installed; inherited by unit/component projects |
| vite-tsconfig-paths | 6.1.1 | Path alias resolution (#lib/*, etc.) | Already installed; resolves package.json imports |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/jest-dom | ^6.9.1 | DOM matchers (toBeInTheDocument, etc.) | Already installed; works with Vitest via custom jest-dom.d.ts shim |
| @testing-library/react | ^16.3.2 | React component rendering | Already installed; shared by unit and component projects |
| jsdom | 28.1.0 | Browser environment simulation | Already installed; environment for unit and component projects |
| dotenv | 17.3.1 | Environment variable loading | Already installed; used by integration test setup |

### To Remove
| Library | Version | Reason |
|---------|---------|--------|
| jest | 30.2.0 | Replaced by Vitest integration project |
| ts-jest | 29.4.6 | Vitest handles TypeScript natively via Vite |
| @types/jest | 30.0.0 | Vitest provides its own types |

**Uninstall command:**
```bash
pnpm remove jest ts-jest @types/jest
```

**Note:** `jest-axe@10.0.0` should be kept -- it provides accessibility assertion helpers that work independently of Jest's runner. It will be useful for component tests in Phase 07.

## Architecture Patterns

### Recommended vitest.config.ts Structure

```typescript
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // Root-level resolve aliases (recharts mocks) -- inherited by extends: true
  resolve: {
    alias: {
      recharts: resolve(__dirname, 'src/test/mocks/recharts.tsx'),
      'recharts/types/component/DefaultTooltipContent': resolve(
        __dirname,
        'src/test/mocks/recharts-tooltip.ts'
      )
    }
  },
  // Root-level plugins -- inherited by extends: true
  plugins: [tsconfigPaths({ ignoreConfigErrors: true }), react()],
  test: {
    // Root-level coverage (global, not per-project)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/generated/**',
        '**/__mocks__/**',
        'src/types/**',
        'tests/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    // Three named projects
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/unit-setup.ts'],
          pool: 'vmThreads',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: [
            'src/**/*.component.test.tsx',
            'node_modules',
            'dist',
            '.next'
          ],
          testTimeout: 10000,
          hookTimeout: 10000
        }
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/unit-setup.ts'],
          pool: 'vmThreads',
          include: ['src/**/*.component.test.tsx'],
          testTimeout: 10000,
          hookTimeout: 10000
        }
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          globals: true,
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true
            }
          },
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['./tests/integration/setup/supabase-client.ts'],
          env: loadEnv('', process.cwd(), ''),
          testTimeout: 30000,
          hookTimeout: 30000
        }
      }
    ]
  }
})
```

### Key Design Decisions Explained

**1. `extends: true` on unit/component but NOT integration:**
- Unit and component projects need the root-level `resolve.alias` (recharts mocks) and `plugins` (react, tsconfigPaths)
- Integration project runs in Node environment against real Supabase -- no JSX transform or browser mocks needed
- Integration project does NOT extend to avoid inheriting jsdom-related plugins

**2. Integration project env loading:**
- The CONTEXT.md says to use Vitest's built-in `envFile` option, but Vitest 4.x does not have a dedicated `envFile` config property
- Instead, use `loadEnv` from Vite (the standard approach): `env: loadEnv('', process.cwd(), '')`
- This loads `.env` and `.env.local` from project root, making `NEXT_PUBLIC_SUPABASE_URL`, credentials etc. available
- The existing `tests/integration/setup/env.ts` (dotenv loader) becomes unnecessary and can be removed
- The `supabase-client.ts` setup file still works -- it reads from `process.env` which `loadEnv` populates

**3. Coverage at root level only:**
- Vitest does not support per-project coverage configuration
- Coverage excludes `tests/**` so integration tests don't skew source coverage
- Unit and component tests both contribute to the 80% thresholds

### Orphaned File Co-location Targets

Based on import analysis of each file:

| File | Current Location | Target Location | Rationale |
|------|------------------|-----------------|-----------|
| `auth-redirect.test.ts` | `src/__tests__/foundation/` | `src/lib/__tests__/auth-redirect.test.ts` | Tests route protection patterns; no specific source module import but `src/lib/` houses auth/middleware utilities; existing `src/lib/__tests__/` directory has similar tests |
| `data-density.test.ts` | `src/__tests__/foundation/` | `src/stores/__tests__/data-density.test.ts` | Imports from `#stores/preferences-store`; existing `src/stores/__tests__/` directory already has 3 store tests |
| `design-tokens.test.ts` | `src/__tests__/foundation/` | `src/app/__tests__/design-tokens.test.ts` | Tests CSS custom properties on document root; pure DOM assertions; `src/app/__tests__/` already exists with `globals.test.tsx` |
| `responsive-breakpoints.test.ts` | `src/__tests__/foundation/` | `src/app/__tests__/responsive-breakpoints.test.ts` | Tests Tailwind breakpoint values via matchMedia mocks; same category as design-tokens (global CSS foundation) |
| `profile-page.test.tsx` | `src/__tests__/profile/` | `src/app/(owner)/profile/__tests__/profile-page.test.tsx` | Imports `OwnerProfilePage` from `#app/(owner)/profile/page`; should live next to its source module |
| `pricing-premium.spec.ts` | `tests/unit/` | `tests/e2e/tests/pricing-premium.spec.ts` | Imports `@playwright/test`; is a Playwright E2E test, not a unit test |

### Anti-Patterns to Avoid
- **Separate vitest config files per project:** Unnecessary complexity for 3 inline projects. Inline definitions in a single file are simpler and easier to maintain.
- **Using `workspace` instead of `projects`:** Deprecated since Vitest 3.2. Always use `test.projects`.
- **Extending root config in integration project:** Would inherit jsdom plugins and recharts aliases that are irrelevant to Node-environment tests hitting real Supabase.
- **Running integration tests in `vmThreads`:** Integration tests do real network I/O; `forks` pool with child_process is more appropriate and avoids `vmThreads` sandboxing issues.
- **Keeping the dotenv setup file:** Vitest's `loadEnv` from Vite replaces `tests/integration/setup/env.ts` entirely. Keeping both creates confusion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env file loading for integration tests | Custom dotenv loader in `tests/integration/setup/env.ts` | `loadEnv('', process.cwd(), '')` from `vite` | Standard Vite utility; loads `.env` and `.env.local` automatically |
| Sequential test execution | Custom test ordering scripts | `pool: 'forks'` + `poolOptions.forks.singleFork: true` | Built-in Vitest pool option; equivalent to Jest's `--runInBand` |
| Project-scoped test filtering | Custom include/exclude logic | `vitest --project unit` CLI flag | Built-in Vitest project filtering |
| TypeScript compilation for tests | ts-jest transform configuration | Vitest's native Vite-based TS support | Vite handles TS natively; no separate transform config needed |

**Key insight:** The entire Jest configuration (jest.config.ts with ts-jest transform, CommonJS module settings, env.ts setup) is replaced by a few lines of Vitest inline project config. Vitest handles TypeScript natively via Vite.

## Common Pitfalls

### Pitfall 1: Integration project inheriting jsdom environment
**What goes wrong:** If `extends: true` is set on the integration project, it may inherit the jsdom environment or React plugins from root config, causing unexpected behavior in Node-environment tests.
**Why it happens:** `extends: true` merges ALL root options, not just the ones you want.
**How to avoid:** Do NOT use `extends: true` on the integration project. Define its config independently.
**Warning signs:** Import errors for React or DOM APIs in integration tests; unexpected `window` global being defined.

### Pitfall 2: loadEnv not loading .env.local
**What goes wrong:** Environment variables not available to integration tests; Supabase client creation fails.
**Why it happens:** `loadEnv` mode parameter affects which files get loaded. Using the wrong mode string skips `.env.local`.
**How to avoid:** Use `loadEnv('', process.cwd(), '')` with empty string for mode and prefix. The empty prefix ensures ALL env vars are loaded (not just `VITE_` prefixed ones).
**Warning signs:** `Missing required env vars: NEXT_PUBLIC_SUPABASE_URL` error when running integration tests.

### Pitfall 3: Unit test include pattern catching component tests
**What goes wrong:** Component tests (`.component.test.tsx`) run in both unit and component projects.
**Why it happens:** The pattern `src/**/*.{test,spec}.{ts,tsx}` matches `.component.test.tsx` files.
**How to avoid:** Explicitly exclude `src/**/*.component.test.tsx` from the unit project's include or add it to the unit project's exclude array.
**Warning signs:** Component tests appearing in both `vitest --project unit` and `vitest --project component` output.

### Pitfall 4: Forgetting to update lefthook.yml
**What goes wrong:** Pre-commit hooks still try to run `pnpm test:rls` which calls the old Jest command.
**Why it happens:** lefthook.yml is easy to overlook when updating package.json scripts.
**How to avoid:** Update lefthook.yml `rls-tests` command to `pnpm test:integration` at the same time as package.json changes.
**Warning signs:** Pre-commit hook failures after Jest removal.

### Pitfall 5: @types/jest lingering in tsconfig types
**What goes wrong:** TypeScript finds conflicting type definitions between `@types/jest` and `vitest/globals`.
**Why it happens:** `tsconfig.json` may reference `@types/jest` types, or the `tests/integration/tsconfig.json` has stale config.
**How to avoid:** Remove `@types/jest` from devDependencies AND verify no tsconfig references it. Delete `tests/integration/tsconfig.json` (Vitest doesn't need a separate tsconfig for the integration project; it uses the root one).
**Warning signs:** TypeScript errors about conflicting `describe` or `expect` types.

### Pitfall 6: Vitest 4.x + chai 6.x .rejects.toThrow() bug
**What goes wrong:** `.rejects.toThrow('string')` and `.rejects.toThrow(/regex/)` crash in chai's `compatibleMessage`.
**Why it happens:** Known Vitest 4.x + chai 6.x bug (documented in project STATE.md).
**How to avoid:** RLS tests don't appear to use `.rejects.toThrow()` with string arguments, so this should not be an issue. But if any new assertions are added, use `.rejects.toMatchObject({ message: expect.stringContaining('...') })` instead.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'indexOf')` in test output.

## Code Examples

### Running specific projects from CLI
```bash
# Run only unit tests
pnpm vitest --run --project unit

# Run only integration tests
pnpm vitest --run --project integration

# Run all projects
pnpm vitest --run
```

### Package.json scripts (new)
```json
{
  "test": "vitest --run",
  "test:unit": "vitest --run --project unit",
  "test:component": "vitest --run --project component",
  "test:integration": "vitest --run --project integration",
  "test:rls": "vitest --run --project integration",
  "test:ci": "CI=true vitest --run"
}
```

### Updated lefthook.yml rls-tests command
```yaml
rls-tests:
  run: pnpm test:integration
```

### Updated CI rls-security-tests.yml
```yaml
- name: Run RLS security tests
  if: steps.check-secrets.outputs.has_secrets == 'true'
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
    E2E_OWNER_EMAIL: ${{ secrets.E2E_OWNER_EMAIL }}
    E2E_OWNER_PASSWORD: ${{ secrets.E2E_OWNER_PASSWORD }}
    E2E_OWNER_B_EMAIL: ${{ secrets.E2E_OWNER_B_EMAIL }}
    E2E_OWNER_B_PASSWORD: ${{ secrets.E2E_OWNER_B_PASSWORD }}
  run: pnpm test:integration
```

### Updated CLAUDE.md Key Commands
```bash
pnpm dev                          # Next.js dev server on port 3050
pnpm typecheck && pnpm lint       # quality checks
pnpm test:unit                    # Vitest unit tests
pnpm test:component               # Vitest component tests (empty until Phase 07)
pnpm test:integration             # Vitest integration tests (RLS, requires Supabase credentials)
pnpm test:rls                     # alias for test:integration
pnpm test:e2e                     # Playwright E2E tests
pnpm db:types                     # regenerate types from live DB
pnpm validate:quick               # types + lint + unit tests
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `vitest.workspace.ts` file | `test.projects` in `vitest.config.ts` | Vitest 3.2 (mid-2025) | Workspace deprecated; projects is the replacement |
| ts-jest for TypeScript tests | Vitest native TS via Vite | Vitest 1.0+ | No transform config needed; Vite handles ESM/TS natively |
| Jest `--runInBand` | `pool: 'forks'` + `singleFork: true` | Vitest 1.0+ | Equivalent behavior, Vitest syntax |
| `jest.fn()` / `jest.mock()` | `vi.fn()` / `vi.mock()` | Vitest 1.0+ | Not relevant here -- RLS tests don't use mocks |

**Deprecated/outdated:**
- `vitest.workspace.ts` / `vitest.workspace.json`: Deprecated since Vitest 3.2; use `test.projects` instead
- `defineWorkspace()`: Replaced by inline project definitions in `defineConfig`
- `poolOptions.vmThreads.memoryLimit`: Renamed to `vmMemoryLimit` in Vitest 4.x

## Open Questions

1. **loadEnvFile custom function: keep or remove?**
   - What we know: The current `vitest.config.ts` has a custom `loadEnvFile` function that reads `.env.test`. There is no `.env.test` file in the project. The function loads env vars before Vitest processes the config.
   - What's unclear: Whether the `loadEnv` from Vite (used for the integration project's `env` option) and the custom `loadEnvFile` serve different purposes.
   - Recommendation: The custom `loadEnvFile` currently loads `.env.test` which doesn't exist, so it's effectively a no-op. Replace with Vite's `loadEnv` if any env loading is needed at config time. For the integration project, use `env: loadEnv('', process.cwd(), '')`. For unit tests, the `unit-setup.ts` already sets all necessary env vars via `process.env` assignments. **Safe to remove the custom `loadEnvFile` function.**

2. **tests/integration/tsconfig.json: keep or remove?**
   - What we know: It configures CommonJS module resolution for ts-jest. Vitest doesn't use it.
   - Recommendation: Remove it. Vitest resolves TypeScript using Vite's built-in support. The CommonJS settings were only needed for ts-jest.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (to be restructured) |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Three named Vitest projects (unit, component, integration) all runnable | smoke | `pnpm vitest --run --project unit && pnpm vitest --run --project component && pnpm vitest --run --project integration` | N/A -- verified by running |
| INFRA-02 | All 7 RLS tests pass under Vitest | integration | `pnpm test:integration` | Yes -- 7 files in tests/integration/rls/ |
| INFRA-03 | Jest removed from dependencies | manual-only | `grep -E 'jest\|ts-jest\|@types/jest' package.json` (should return empty) | N/A -- package.json check |
| INFRA-04 | pricing-premium.spec.ts in tests/e2e/tests/ | smoke | `test -f tests/e2e/tests/pricing-premium.spec.ts && ! test -d tests/unit/` | N/A -- file existence check |
| INFRA-05 | Orphaned src/__tests__/ files relocated | smoke | `! test -d src/__tests__ && test -f src/stores/__tests__/data-density.test.ts` | N/A -- file existence check |
| INFRA-06 | Updated scripts work correctly | smoke | `pnpm test:unit && pnpm test:component && pnpm test:integration` | N/A -- script execution |

### Sampling Rate
- **Per task commit:** `pnpm test:unit` (quick, ~10s)
- **Per wave merge:** `pnpm test` (all Vitest projects)
- **Phase gate:** Full suite green (`pnpm test` + `pnpm typecheck` + `pnpm lint`) before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. This phase restructures existing config, does not require new test files.

## Sources

### Primary (HIGH confidence)
- [Vitest Projects Guide](https://vitest.dev/guide/projects) - Inline project definitions, extends option, --project CLI flag
- [Vitest Configuration Reference](https://vitest.dev/config/) - pool, env, globals, setupFiles, coverage options
- [Vitest Pool Configuration](https://vitest.dev/config/pool) - forks, vmThreads, singleFork options
- [Vitest Migration Guide](https://vitest.dev/guide/migration.html) - Jest to Vitest API compatibility
- Codebase analysis: `vitest.config.ts`, `tests/integration/jest.config.ts`, all 7 RLS test files, 5 orphaned test files

### Secondary (MEDIUM confidence)
- [Vitest env configuration](https://vitest.dev/config/env) - env option for process.env population
- [Vite Environment Variables](https://vite.dev/guide/env-and-mode) - loadEnv utility documentation
- [GitHub Discussion: poolOptions.forks.singleFork](https://github.com/vitest-dev/vitest/discussions/6438) - singleFork configuration

### Tertiary (LOW confidence)
- None -- all findings verified against official docs and codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed; version numbers confirmed from package.json
- Architecture: HIGH - Vitest projects API well-documented; RLS tests verified to have no Jest-specific APIs
- Pitfalls: HIGH - based on direct analysis of existing config and known Vitest behavior
- Co-location targets: HIGH - based on direct import analysis of each orphaned test file

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- Vitest 4.x API settled, no breaking changes expected)
