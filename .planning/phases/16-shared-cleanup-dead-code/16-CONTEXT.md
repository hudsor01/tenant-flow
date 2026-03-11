# Phase 16: Shared Cleanup & Dead Code - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate `src/shared/` by flattening its contents into existing top-level `src/` directories. Run Knip to discover dead code, verify each finding independently, and remove confirmed dead exports/files/dependencies. Delete TYPES.md. Eliminate design-system.ts by migrating its 6 CSS-replaceable consumers to Tailwind/globals.css equivalents. Update CLAUDE.md to reflect structural changes.

</domain>

<decisions>
## Implementation Decisions

### Directory Restructuring
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

### Dead Code Removal
- Knip is a discovery tool, NOT an authority -- every finding must be independently verified
- Verification = grep both `src/` and `supabase/` for imports, check dynamic imports, check test usage, check config file references
- Confirmed dead code gets deleted immediately after verification (no separate report/review pass)
- Unused dependencies in package.json also removed after verification
- Must verify deps are not peer dependencies, plugin requirements, or rolled up into another used package
- Check config files (postcss, tailwind, vitest, eslint, next.config) for implicit dependency usage

### Design System Migration
- Replace all 6 CSS-replaceable imports of design-system.ts with Tailwind utilities or globals.css equivalents
- Priority: check globals.css for existing equivalent declarations first
- If no globals.css equivalent exists, use official Tailwind CSS v4 utilities (fetch docs for guidance)
- BRAND_COLORS_HEX (only non-CSS consumer, used by opengraph-image.tsx) gets inlined into the OG image file
- design-system.ts is deleted entirely after migration
- No brand-colors.ts pre-creation -- handle future non-CSS needs when they arise (YAGNI)

### TYPES.md
- Delete TYPES.md entirely -- it's a markdown file with no runtime value
- The type files themselves should be self-documenting via file names and directory structure
- CLAUDE.md type lookup rules updated to reference `src/types/` directly instead of TYPES.md

### CLAUDE.md Maintenance
- Update CLAUDE.md at the end of Phase 16 to reflect all structural changes
- This becomes a pattern for all v1.2 phases -- CLAUDE.md updated after every phase completion to avoid knowledge drift
- Update: type lookup order, path aliases, directory references, any rules referencing src/shared/

### Claude's Discretion
- Placement of `src/shared/config/pricing.ts` and `src/shared/templates/lease-template.ts` (based on import analysis)
- How to handle `src/shared/utils/` files vs `src/lib/` files that cover similar concerns (consolidate by domain after initial move)
- Knip configuration: entry points, plugins, dynamic import handling, exemptions (vendored files like tour.tsx)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/` already exists with 3 files (data-table.ts, jest-dom.d.ts, stripe.ts) -- merge target for shared/types/
- `src/lib/constants/` already exists with 2 files (error-messages.ts, query-config.ts) -- merge target for shared/constants/
- `src/lib/formatters/` exists with currency.ts, date.ts, text.ts -- potential overlap with shared/utils/currency.ts
- globals.css (1,702 lines) has extensive CSS custom properties and @utility definitions that may already cover design-system.ts token values

### Established Patterns
- Path aliases use `#` prefix (e.g. `#shared/`, `#lib/`, `#types/`, `#components/`) mapped in tsconfig
- 5 files currently import from `#types/` (data-table module augmentation, stripe types)
- 7 files import from `#shared/constants/design-system` (migration targets)
- Import paths throughout codebase use `#shared/types/`, `#shared/validation/`, `#shared/utils/`, `#shared/constants/` -- all need updating

### Integration Points
- `supabase/functions/` may import shared types -- must grep before removing any type export
- 27 test files use `vi.mock()` with hardcoded module paths -- any file moves require updating mock paths
- CLAUDE.md references `src/shared/types/TYPES.md` in zero-tolerance rules -- must update

</code_context>

<specifics>
## Specific Ideas

- "globals.css is the sole design system source of truth" -- already declared during v1.2 scoping
- "read and learn the globals.css, if there is something already declared that is equivalent use that but if not then fetch the official TailwindCSS v4 documentation and align with its guidance explicitly and perfectly"
- "TYPES.md is pointless -- everything should be read from the src/types/ directory"
- "CLAUDE.md should be updated after every phase completion to avoid knowledge drift"
- "Knip is not reliable enough to put any amount of blind trust into" -- verify every finding

</specifics>

<deferred>
## Deferred Ideas

- CLAUDE.md full rewrite to align with current state of codebase -- noted for end of v1.2 or as a dedicated task
- Knip CI integration to prevent future dead code regression -- deferred from v1.2 scope (future milestone)

</deferred>

---

*Phase: 16-shared-cleanup-dead-code*
*Context gathered: 2026-03-08*
