---
phase: 21-module-architecture
plan: 01
subsystem: backend
tags: [nestjs, modules, architecture, adr, documentation]

# Dependency graph
requires:
  - phase: 20
    provides: API response standards, ADR-0006
provides:
  - Module inventory with size metrics for all 26 modules
  - ADR-0007 documenting architecture recommendations
  - IMPROVEMENTS.md with 7 prioritized refactoring opportunities
affects: [23-documentation, future-billing-refactor, future-tenant-refactor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module size thresholds: <5k good, 5-8k warning, >8k action
    - forwardRef indicates circular deps needing resolution
    - Role-based vs domain-based service organization

key-files:
  created:
    - .planning/adr/0007-module-architecture.md
    - .planning/phases/21-module-architecture/IMPROVEMENTS.md
  modified: []

key-decisions:
  - "Billing is god module (14k lines) - needs shared service extraction"
  - "forwardRef usage indicates circular deps to fix"
  - "Role-based services should move to domain sub-modules"
  - "Tenant module (16 services) needs consolidation analysis"

patterns-established:
  - "Module size guidelines: <5k good, 5-8k watch, >8k action"
  - "Extract shared services to eliminate forwardRef"
  - "Organize by domain, not role"

issues-created: []

# Metrics
duration: 5 min
completed: 2026-01-18
---

# Phase 21 Plan 01: Module Architecture Audit Summary

**Audited 26 NestJS modules; identified billing (14k lines) and tenants (12k) as oversized; created ADR-0007 with decomposition recommendations**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-18T07:31:19Z
- **Completed:** 2026-01-18T07:35:47Z
- **Tasks:** 5
- **Files created:** 2

## Accomplishments

- Audited all 26 backend modules with line counts, service counts, and controller counts
- Deep-dived into billing module structure (already has connect/, subscriptions/, webhooks/ sub-modules)
- Identified 3 circular dependencies via `forwardRef()` usage in billing
- Created ADR-0007 documenting architecture state and recommendations
- Logged 7 improvement opportunities (2 high, 3 medium, 2 low priority)

## Task Commits

1. **Task 1: Audit Module Sizes** - No commit (research only)
2. **Task 2: Analyze Billing Module** - No commit (research only)
3. **Task 3: Assess Dependencies** - No commit (research only)
4. **Task 4: Create ADR-0007** - `7f738a877` (docs)
5. **Task 5: Log Improvements** - `d058194fd` (docs)

**Plan metadata:** (this commit)

## Files Created

- `.planning/adr/0007-module-architecture.md` - Module architecture recommendations
- `.planning/phases/21-module-architecture/IMPROVEMENTS.md` - Prioritized refactoring list

## Key Findings

### Module Size Audit

| Category | Modules | Notes |
|----------|---------|-------|
| Oversized (>8k) | 3 | billing (14k), tenants (12k), leases (10k) |
| Watch (5-8k) | 2 | pdf (8.6k), financial (5.3k) |
| Good (<5k) | 21 | All others |

### Billing Module Analysis

| Component | Services | Controllers | Lines | Status |
|-----------|----------|-------------|-------|--------|
| Root | 7 | 5 | ~3,500 | Too many root services |
| connect/ | 4 | 2 | ~3,000 | Extracted ✓ |
| subscriptions/ | 2 | 2 | ~1,500 | Extracted ✓ |
| webhooks/ | 2 + handlers | 1 | ~2,000 | Extracted ✓ |

**Key Issue:** 3 `forwardRef()` usages indicate circular dependencies between sub-modules

### Circular Dependencies

```
StripeModule ←→ WebhooksModule (forwardRef both directions)
SubscriptionsModule → StripeModule (forwardRef)
```

**Root cause:** Shared services (StripeService, StripeCustomerService) needed by all sub-modules

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Document, don't refactor | Phase is research-only per plan scope |
| Prioritize forwardRef elimination | Circular deps make testing/reasoning harder |
| Role-based → domain-based | Better alignment with NestJS patterns |
| Module size thresholds | Industry standards + maintainability |

## Deviations from Plan

None - plan executed exactly as written. All tasks were documentation/audit as expected.

## Issues Encountered

None.

## Next Phase Readiness

- Phase 21 complete (single plan)
- ADR-0007 provides architecture guidance
- IMPROVEMENTS.md lists actionable refactoring opportunities
- Ready for Phase 22 (Cold Start & Performance Optimization)

---
*Phase: 21-module-architecture*
*Completed: 2026-01-18*
