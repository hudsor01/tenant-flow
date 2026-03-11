# Phase 16: Shared Cleanup & Dead Code - Research

**Researched:** 2026-03-08
**Domain:** Codebase restructuring, dead code elimination, design token consolidation
**Confidence:** HIGH

## Summary

Phase 16 eliminates the `src/shared/` directory by flattening its contents into existing top-level `src/` directories, removes dead code discovered via Knip (with independent verification), migrates 7 design-system.ts consumers to CSS/Tailwind equivalents, deletes TYPES.md, and updates CLAUDE.md. The codebase has 371 import statements across 280 files referencing `#shared/` -- all must be rewritten. The largest categories are types (240 occurrences/201 files), frontend-logger (72 files), validation (34 occurrences/32 files), and constants (19 occurrences/18 files, including 7 design-system.ts consumers).

The restructuring is mechanically straightforward but high-blast-radius: every file that imports from `#shared/` must be updated, 9 test files with `vi.mock('#shared/...')` paths must be rewritten, the `db:types` script in package.json must be retargeted, and both `tsconfig.json` and `package.json` path aliases must be updated. The design-system.ts migration is simple -- globals.css already has equivalent CSS custom properties for all consumed tokens (animation durations, typography). BRAND_COLORS_HEX is only used in opengraph-image.tsx (Satori context where CSS variables are unavailable) and gets inlined.

**Primary recommendation:** Execute in three waves: (1) move files and rewrite all imports, (2) run Knip, verify, and delete dead code, (3) migrate design-system.ts consumers and delete. Update CLAUDE.md last.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Flatten `src/shared/` entirely -- promote all subdirectories into existing top-level `src/` directories
- `src/shared/types/` merges into `src/types/` (types stay as top-level directory, not under lib/)
- `src/shared/constants/` merges into `src/lib/constants/`
- `src/shared/utils/` merges into `src/lib/` (or a new `src/utils/` if it makes more sense based on content)
- `src/shared/validation/` moves to `src/lib/validation/`
- `src/shared/lib/frontend-logger.ts` moves to `src/lib/frontend-logger.ts`
- `src/shared/config/` and `src/shared/templates/` -- Claude decides placement based on import analysis
- After flatten, `src/shared/` is deleted entirely
- Remove `#shared/` path alias from tsconfig
- Verify `#types/` alias exists in tsconfig; create it if missing
- No files should be overwritten during the move -- merge carefully, deduplicate collisions first
- After moving, consolidate files with overlapping concerns into relevant domains
- Knip is a discovery tool, NOT an authority -- every finding must be independently verified
- Verification = grep both `src/` and `supabase/` for imports, check dynamic imports, check test usage, check config file references
- Confirmed dead code gets deleted immediately after verification
- Unused dependencies in package.json also removed after verification
- Must verify deps are not peer dependencies, plugin requirements, or rolled up into another used package
- Check config files (postcss, tailwind, vitest, eslint, next.config) for implicit dependency usage
- Replace all 6 CSS-replaceable imports of design-system.ts with Tailwind utilities or globals.css equivalents
- Priority: check globals.css for existing equivalent declarations first
- If no globals.css equivalent exists, use official Tailwind CSS v4 utilities
- BRAND_COLORS_HEX (only non-CSS consumer, used by opengraph-image.tsx) gets inlined into the OG image file
- design-system.ts is deleted entirely after migration
- No brand-colors.ts pre-creation -- handle future non-CSS needs when they arise (YAGNI)
- Delete TYPES.md entirely
- CLAUDE.md type lookup rules updated to reference `src/types/` directly instead of TYPES.md
- Update CLAUDE.md at the end of Phase 16 to reflect all structural changes
- Two pre-existing stale imports already fixed: bento-pricing-section.tsx and kibo-style-pricing.tsx had #shared/config/pricing fixed to #config/pricing

### Claude's Discretion
- Placement of `src/shared/config/pricing.ts` and `src/shared/templates/lease-template.ts` (based on import analysis)
- How to handle `src/shared/utils/` files vs `src/lib/` files that cover similar concerns (consolidate by domain after initial move)
- Knip configuration: entry points, plugins, dynamic import handling, exemptions (vendored files like tour.tsx)

### Deferred Ideas (OUT OF SCOPE)
- CLAUDE.md full rewrite to align with current state of codebase -- noted for end of v1.2 or as a dedicated task
- Knip CI integration to prevent future dead code regression -- deferred from v1.2 scope (future milestone)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLEAN-01 | Run Knip audit to identify and remove unused files, exports, and dependencies across the entire codebase | Knip v5 with Next.js plugin auto-detection; install as devDep, configure entry/project/ignore; verify every finding independently before deletion |
| CLEAN-03 | Update TYPES.md master lookup with accurate type locations after cleanup | User decision: delete TYPES.md entirely instead of updating; type files are self-documenting via directory structure in src/types/ |
| CLEAN-04 | Cross-directory audit of src/shared/, src/lib/, src/types/, src/shared/types/, and src/components/shared/ for redundancy, misplacement, and duplication | Flatten src/shared/ into top-level dirs; deduplicate overlapping files (e.g. shared/utils/currency.ts vs lib/formatters/currency.ts); consolidate by domain |
| CLEAN-05 | Reconcile or eliminate organizational overlap between src/shared/ and src/lib/ with clear ownership boundaries | src/shared/ deleted entirely; all contents merged into src/types/, src/lib/, src/config/; ownership boundaries defined by directory name |
| MOD-03 | Reconcile design tokens -- globals.css is the sole source of truth, reduce design-system.ts to non-CSS contexts only | User escalated: delete design-system.ts entirely; inline BRAND_COLORS_HEX into OG image file; replace 6 CSS consumers with Tailwind/globals.css equivalents |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| knip | ^5 (latest) | Dead code detection -- finds unused files, exports, dependencies | Industry standard for JS/TS projects; 100+ plugins including Next.js, Vitest, ESLint auto-detection |
| TypeScript | (existing) | Type checking after all moves | `pnpm typecheck` validates no broken imports |
| Vitest | 4.0 (existing) | Test validation after restructuring | `pnpm test:unit` confirms no runtime breakage |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `pnpm typecheck` | Validate all imports resolve after file moves | After every batch of moves |
| `pnpm lint` | Catch any eslint issues from restructuring | After moves complete |
| `pnpm test:unit` | Confirm no runtime test failures | After all moves and mock path updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| knip | ts-prune | ts-prune only finds unused exports, not files or deps; knip is strictly more capable |
| knip | depcheck | depcheck only covers dependencies, not exports/files; knip subsumes it |

**Installation:**
```bash
pnpm add -D knip
```

## Architecture Patterns

### File Move Mapping (Complete)

| Source | Target | Import Count | Notes |
|--------|--------|-------------|-------|
| `src/shared/types/*` (27 files + sections/) | `src/types/` | 240 across 201 files | Merge into existing dir (3 files already there); supabase.ts is 3,088 lines |
| `src/shared/lib/frontend-logger.ts` | `src/lib/frontend-logger.ts` | 72 files | Most-imported single file from shared |
| `src/shared/validation/*` (10 files + tests) | `src/lib/validation/` | 34 across 32 files | Create new `src/lib/validation/` dir |
| `src/shared/constants/billing.ts` | `src/lib/constants/billing.ts` | 8 (within shared validation files only) | Merge into existing dir (2 files already there) |
| `src/shared/constants/status-types.ts` | `src/lib/constants/status-types.ts` | 3 across 2 files | Small impact |
| `src/shared/constants/lease-signature-errors.ts` | `src/lib/constants/lease-signature-errors.ts` | 1 file | Minimal impact |
| `src/shared/constants/design-system.ts` | DELETED | 7 files | Migrated to CSS, then deleted |
| `src/shared/utils/currency.ts` | Consolidated into `src/lib/formatters/currency.ts` | 3 files (direct) | See dedup analysis below |
| `src/shared/utils/api-error.ts` | `src/lib/api-error.ts` | Imported internally by optimistic-locking.ts | Contains ApiError class + codes |
| `src/shared/utils/optimistic-locking.ts` | `src/lib/optimistic-locking.ts` | Imported internally by api-error.ts | Depends on api-error.ts |
| `src/shared/templates/lease-template.ts` | `src/config/lease-template.ts` | 3 files | Lease template builder components |

### Discretion: Config and Templates Placement

**`src/shared/config/pricing.ts`**: Already moved to `src/config/pricing.ts` in v1.1. The path alias `#config/*` already exists and maps to `src/config/*`. Two stale imports were already fixed (CONTEXT.md notes this). No action needed -- pricing.ts is already in its correct location.

**`src/shared/templates/lease-template.ts`**: Move to `src/config/lease-template.ts`. Rationale: imported by 3 lease template builder components (`clause-selector.tsx`, `state-rule-summary.tsx`, `lease-template-builder.client.tsx`). This is static configuration data (clause definitions, state rules), not a rendering template. The `src/config/` directory already exists and contains `data-table.ts` and `pricing.ts` -- similar static configuration files. Import path becomes `#config/lease-template`.

### Discretion: Shared Utils Consolidation

**`src/shared/utils/currency.ts`**: This file is the "base" currency module. `src/lib/formatters/currency.ts` wraps it by re-exporting most functions and overriding `formatCurrency` to default to 2 decimal places. After the move, merge them: absorb the shared version into `src/lib/formatters/currency.ts`, keeping the wrapper's 2-decimal default. The 3 direct consumers of `#shared/utils/currency` (`src/lib/formatters/currency.ts`, `src/hooks/api/use-tenant-mutations.ts`, `src/components/units/unit-form.client.tsx`) get repointed to `#lib/formatters/currency`.

**`src/shared/utils/api-error.ts` + `optimistic-locking.ts`**: Move both to `src/lib/`. api-error.ts imports from `../lib/frontend-logger` (relative path within shared/) -- update to `./frontend-logger` after both are in `src/lib/`. optimistic-locking.ts imports from `./api-error` -- still works as both will be siblings in `src/lib/`.

**`src/shared/utils/__tests__/`**: Move test files alongside their modules in `src/lib/`. The 3 test files (`api-error.test.ts`, `currency.test.ts`, `optimistic-locking.test.ts`) have `vi.mock('#shared/lib/frontend-logger')` -- update mock paths.

### Path Alias Changes

**tsconfig.json paths to update:**
```json
{
  "paths": {
    // REMOVE:
    "#shared/*": ["./src/shared/*"],
    "#design-system/*": ["./src/design-system/*"],  // Points to nonexistent dir

    // KEEP (already exists):
    "#types/*": ["./src/types/*"],
    "#lib/*": ["./src/lib/*"],
    "#config/*": ["./src/config/*"]
  }
}
```

**package.json imports to update (same removals):**
```json
{
  "imports": {
    // REMOVE:
    "#shared/*": "./src/shared/*",
    "#design-system/*": "./src/design-system/*"
  }
}
```

Note: `#design-system/*` alias maps to `src/design-system/` which does not exist. It is dead configuration and should be removed alongside `#shared/*`.

### Script Updates

**package.json `db:types` script:**
```
// FROM:
"db:types": "supabase gen types typescript --project-id bshjmbshupiibfiewpxb > src/shared/types/supabase.ts"

// TO:
"db:types": "supabase gen types typescript --project-id bshjmbshupiibfiewpxb > src/types/supabase.ts"
```

### Import Rewrite Categories (by volume)

| Old Import Prefix | New Import Prefix | Occurrences | Files |
|-------------------|-------------------|-------------|-------|
| `#shared/types/` | `#types/` | 240 | 201 |
| `#shared/lib/frontend-logger` | `#lib/frontend-logger` | 72 | 72 |
| `#shared/validation/` | `#lib/validation/` | 34 | 32 |
| `#shared/constants/design-system` | (deleted -- CSS migration) | 7 | 7 |
| `#shared/constants/billing` | `#lib/constants/billing` | 8 | 8 |
| `#shared/utils/currency` | `#lib/formatters/currency` | 3 | 3 |
| `#shared/constants/status-types` | `#lib/constants/status-types` | 3 | 2 |
| `#shared/templates/lease-template` | `#config/lease-template` | 3 | 3 |
| `#shared/constants/lease-signature-errors` | `#lib/constants/lease-signature-errors` | 1 | 1 |

### Test Mock Path Updates

9 test files use `vi.mock('#shared/lib/frontend-logger')` and must be updated to `vi.mock('#lib/frontend-logger')`:
1. `src/test/api-test-utils.tsx` (2 references)
2. `src/hooks/api/__tests__/use-lease.test.tsx`
3. `src/shared/utils/__tests__/api-error.test.ts` (also relocates to `src/lib/__tests__/`)
4. `src/shared/utils/__tests__/optimistic-locking.test.ts` (also relocates)
5. `src/hooks/api/__tests__/use-properties.test.tsx`
6. `src/hooks/api/__tests__/property-mutations.test.tsx`
7. `src/hooks/api/__tests__/use-tenant.test.tsx`
8. `src/components/properties/__tests__/bulk-import-upload-step.test.tsx`

### Validation Within Shared

8 validation files inside `src/shared/validation/` import from `#shared/constants/billing` (the `VALIDATION_LIMITS` constant). After move, these become `#lib/constants/billing` -- must be updated as part of the validation file moves.

### Anti-Patterns to Avoid
- **Batch all file moves before import rewrites**: Moving files one-by-one with import updates creates cascading merge conflicts. Move all files first (TypeScript will be broken), then rewrite all imports in a single pass, then typecheck.
- **Never overwrite existing files at merge target**: `src/types/` already has `data-table.ts`, `jest-dom.d.ts`, `stripe.ts`. `src/shared/types/` also has `stripe.ts`. Check for naming collisions before moving. The two `stripe.ts` files need content comparison -- likely both are needed (one is Supabase-generated types, one is custom Stripe types).
- **Do not delete before confirming zero references**: After Knip identifies dead code, `grep -r` both `src/` and `supabase/` to confirm zero imports before deleting. Check for dynamic `import()` patterns, re-exports, and config file references.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dead code detection | Manual grep across 280+ files | Knip v5 | Knip traverses the full dependency graph including dynamic imports, re-exports, and plugin-specific entry points |
| Import path rewriting | Manual find-and-replace | TypeScript compiler errors + targeted sed | `pnpm typecheck` gives exact list of broken imports; systematic fix is more reliable than manual hunting |
| Design token CSS equivalents | New CSS custom properties | Existing globals.css `@theme` values | globals.css already defines `--transition-duration-fast: 200ms`, `--transition-duration-instant: 150ms`, `--duration-*`, and `typography-*` utilities |

**Key insight:** The globals.css already has extensive CSS custom properties and `@utility` definitions that map directly to design-system.ts constants. No new CSS needs to be created -- just reference what exists.

## Common Pitfalls

### Pitfall 1: Supabase Types File Name Collision
**What goes wrong:** `src/shared/types/stripe.ts` and `src/types/stripe.ts` both exist at the merge target
**Why it happens:** Two different type files with the same name -- one in shared/types, one in types/
**How to avoid:** Compare contents before moving. If both have unique types, one must be renamed (e.g., `stripe-custom.ts`) or contents merged into a single file.
**Warning signs:** TypeScript errors about duplicate declarations after merge

### Pitfall 2: Relative Imports Within Moved Files
**What goes wrong:** Files in `src/shared/` use relative imports to other files in `src/shared/` (not path aliases). After moving, these relative paths break.
**Why it happens:** Some files use `../lib/frontend-logger` or `./api-error` relative paths rather than `#shared/` aliases
**How to avoid:** After moving, check for any remaining relative imports that reference old locations. Example: `api-error.ts` imports `from '../lib/frontend-logger'` -- after moving both to `src/lib/`, this becomes `./frontend-logger`.
**Warning signs:** TypeScript errors about modules not found with relative paths

### Pitfall 3: Knip False Positives on Next.js Convention Files
**What goes wrong:** Knip reports Next.js App Router convention files (page.tsx, layout.tsx, loading.tsx, error.tsx, opengraph-image.tsx) as unused because they have no explicit importers
**Why it happens:** Next.js uses file-system routing -- these files are entry points by convention, not by import
**How to avoid:** Knip's Next.js plugin should handle this automatically. If not, add them to ignore patterns. Always verify Knip findings independently.
**Warning signs:** Knip reporting App Router convention files as unused

### Pitfall 4: Knip False Positives on Vendored Components
**What goes wrong:** Knip may report unused exports inside `src/components/ui/tour.tsx` (1,732 lines, vendored from Dice UI)
**Why it happens:** Vendored files often have many exports only used internally
**How to avoid:** Add explicit ignore pattern for vendored files: `"ignore": ["src/components/ui/tour.tsx"]`
**Warning signs:** Large number of "unused exports" from a single UI component file

### Pitfall 5: `ANIMATION_DURATIONS` in Template Literals
**What goes wrong:** `google-button.tsx` uses `duration-[${ANIMATION_DURATIONS.default}]` inside a Tailwind class string. The interpolation means the value is computed at build time, but Tailwind cannot detect dynamic class names.
**Why it happens:** Design-system.ts values are interpolated into Tailwind utility class names
**How to avoid:** Replace with static Tailwind classes: `duration-200` (since `ANIMATION_DURATIONS.default` = `'200ms'` and `ANIMATION_DURATIONS.fast` = `'150ms'`). Static classes are what Tailwind expects.
**Warning signs:** Missing styles in production builds where Tailwind purges dynamic class names

### Pitfall 6: TYPES.md Reference in CLAUDE.md Zero-Tolerance Rules
**What goes wrong:** CLAUDE.md rule #3 says "search `src/shared/types/` before creating any type" and the Type Lookup Order references `src/shared/types/TYPES.md`
**Why it happens:** These instructions were written before the restructuring
**How to avoid:** Update CLAUDE.md at phase end: rule #3 becomes "search `src/types/` before creating any type", type lookup order references `src/types/` directly
**Warning signs:** Future AI agents following stale CLAUDE.md instructions

## Code Examples

### Design-System.ts Migration Patterns

**Consumer 1-2: ANIMATION_DURATIONS (grid-pattern.tsx, google-button.tsx)**

grid-pattern.tsx uses `ANIMATION_DURATIONS.slow` (500ms) and `ANIMATION_DURATIONS.default` (200ms) in `style` props:
```typescript
// OLD (style prop interpolation):
style={{ animationDuration: `${ANIMATION_DURATIONS.slow}ms` }}

// NEW: Use globals.css custom properties directly
// globals.css already defines: --transition-duration-slow: 500ms; --duration-500: 500ms
style={{ animationDuration: 'var(--duration-500)' }}
```

google-button.tsx uses `ANIMATION_DURATIONS.default` (200ms) and `ANIMATION_DURATIONS.fast` (150ms) in Tailwind className strings:
```typescript
// OLD (dynamic class -- Tailwind cannot detect):
className={`transition-all duration-[${ANIMATION_DURATIONS.default}] ease-out`}

// NEW: Use static Tailwind duration classes
className="transition-all duration-200 ease-out"
// ANIMATION_DURATIONS.fast (150ms) -> duration-150
```

**Consumer 3-6: TYPOGRAPHY_SCALE (portal-usage-stats.tsx, customer-portal.tsx, portal-billing-info.tsx, password-update-section.tsx)**

All 4 files use `TYPOGRAPHY_SCALE['heading-md']` or `TYPOGRAPHY_SCALE['ui-caption']` as inline `style` objects:
```typescript
// OLD (inline style object from design-system.ts):
<h4 style={TYPOGRAPHY_SCALE['heading-md']}>

// TYPOGRAPHY_SCALE['heading-md'] = { fontSize: '1.0625rem', lineHeight: '1.29', fontWeight: '700', ... }
// globals.css already has @utility typography-h3 and @utility typography-h4 with matching values

// NEW: Use existing globals.css @utility class
<h4 className="text-title-3 font-bold">
// Or use the existing typography utility:
<h4 className="typography-h4">

// For ui-caption:
// OLD: style={TYPOGRAPHY_SCALE['ui-caption']}
// TYPOGRAPHY_SCALE['ui-caption'] = { fontSize: '0.75rem', lineHeight: '1.25', fontWeight: '400' }
// globals.css has @utility typography-caption

// NEW:
<p className="typography-caption">
```

**Consumer 7: BRAND_COLORS_HEX (opengraph-image.tsx)**
```typescript
// OLD:
import { BRAND_COLORS_HEX } from '#shared/constants/design-system'
// Uses: BRAND_COLORS_HEX.primary, .white

// NEW: Inline directly (Satori cannot use CSS variables or oklch)
const BRAND_COLORS = {
  primary: '#0D6FFF',
  white: '#FFFFFF',
} as const
```

### Knip Configuration

```json
// knip.json (recommended configuration)
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": [
    "src/app/**/page.tsx",
    "src/app/**/layout.tsx",
    "src/app/**/loading.tsx",
    "src/app/**/error.tsx",
    "src/app/**/not-found.tsx",
    "src/app/**/opengraph-image.tsx",
    "src/app/**/route.ts",
    "src/app/actions/*.ts",
    "proxy.ts",
    "next.config.ts",
    "vitest.config.ts"
  ],
  "project": [
    "src/**/*.{ts,tsx}",
    "proxy.ts"
  ],
  "ignore": [
    "src/components/ui/tour.tsx",
    "src/test/**",
    "src/types/jest-dom.d.ts",
    "src/types/supabase.ts"
  ],
  "ignoreDependencies": [
    "@types/*"
  ]
}
```

Note: Knip has auto-detection for Next.js, Vitest, ESLint, and Tailwind plugins -- they add their own entry points automatically. The explicit entry list above is a safety net, not the sole source. Run `npx knip --debug` first to see what the plugins detect.

### Import Rewrite Pattern

After all files are moved, use the TypeScript compiler to identify broken imports:
```bash
pnpm typecheck 2>&1 | grep "Cannot find module" | sort -u
```

Then apply systematic rewrites:
```
#shared/types/     ->  #types/
#shared/lib/       ->  #lib/
#shared/validation/ ->  #lib/validation/
#shared/constants/ ->  #lib/constants/
#shared/utils/     ->  (consolidated into #lib/ or #lib/formatters/)
#shared/templates/ ->  #config/
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `src/shared/` catch-all directory | Flat top-level dirs (`src/types/`, `src/lib/`, `src/config/`) | This phase | Eliminates ambiguity about where shared code lives |
| TYPES.md manual lookup table | Self-documenting `src/types/` directory | This phase | No stale documentation to maintain |
| design-system.ts JS constants | globals.css CSS custom properties + Tailwind utilities | This phase | CSS-native tokens, tree-shakeable, no JS bundle cost |
| `#shared/*` path alias | Direct aliases (`#types/*`, `#lib/*`, `#config/*`) | This phase | Fewer indirection layers, clearer import paths |

## Open Questions

1. **`src/types/stripe.ts` collision**
   - What we know: Both `src/shared/types/stripe.ts` and `src/types/stripe.ts` exist
   - What's unclear: Whether they have overlapping or complementary content
   - Recommendation: Compare contents during execution; likely rename one or merge. The existing `src/types/stripe.ts` is 170 bytes (minimal); the shared one has `import type { Database } from './supabase'` and is likely more substantial.

2. **Knip findings volume**
   - What we know: Knip may report dozens to hundreds of findings
   - What's unclear: How many will be true dead code vs false positives from dynamic imports, re-exports, or convention files
   - Recommendation: Run Knip first to see volume, then batch verification. If findings exceed 50, prioritize by category (unused files > unused exports > unused deps).

3. **Internal relative imports within `src/shared/`**
   - What we know: Files like `api-error.ts` use `../lib/frontend-logger` (relative path)
   - What's unclear: Full list of all relative imports between shared/ files
   - Recommendation: After moving files, `pnpm typecheck` will surface all broken relative imports. Fix them as path alias imports where possible.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm typecheck && pnpm lint` |
| Full suite command | `pnpm validate:quick` (typecheck + lint + unit tests) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-01 | Zero Knip findings after dead code removal | smoke | `npx knip` (zero exit code) | Wave 0 (knip.json config) |
| CLEAN-03 | TYPES.md deleted; src/types/ self-documenting | manual | Verify file deleted + CLAUDE.md updated | N/A (file deletion) |
| CLEAN-04 | No files remain in src/shared/ | smoke | `test ! -d src/shared` | N/A (directory deletion) |
| CLEAN-05 | All imports resolve; no #shared/ references remain | unit | `pnpm typecheck && pnpm test:unit` | Existing test suite |
| MOD-03 | design-system.ts deleted; consumers use CSS | unit | `pnpm typecheck` (no import errors) | Existing test suite |

### Sampling Rate
- **Per task commit:** `pnpm typecheck` (catches broken imports immediately)
- **Per wave merge:** `pnpm validate:quick` (typecheck + lint + unit tests)
- **Phase gate:** `pnpm validate:quick && npx knip` (full suite + zero Knip findings)

### Wave 0 Gaps
- [ ] `knip.json` -- Knip configuration file (does not exist yet; install knip + create config)
- [ ] Verify `src/types/stripe.ts` vs `src/shared/types/stripe.ts` content collision before moving

## Sources

### Primary (HIGH confidence)
- Codebase analysis via grep/glob/read of 280 files importing from `#shared/`
- `tsconfig.json` path alias configuration (lines 48-64)
- `package.json` imports field and scripts (lines 12-46)
- `globals.css` CSS custom properties and `@utility` definitions (1,702 lines)
- `design-system.ts` full content (548 lines, 7 consumers identified)
- Vitest config at `vitest.config.ts` (existing test infrastructure)

### Secondary (MEDIUM confidence)
- [Knip official site](https://knip.dev/) -- configuration docs, plugin auto-detection
- [Knip npm](https://www.npmjs.com/package/knip) -- latest version v5.86.0
- [Knip configuration page](https://knip.dev/overview/configuration) -- entry/project/ignore patterns

### Tertiary (LOW confidence)
- None -- all findings verified directly against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Knip is the only viable tool; codebase structure fully analyzed
- Architecture: HIGH - All file paths, import counts, and merge targets verified via grep
- Pitfalls: HIGH - Collision risks and relative imports identified by direct codebase inspection
- Design-system migration: HIGH - All 7 consumers examined; globals.css equivalents confirmed

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external API/library dependencies beyond Knip)
