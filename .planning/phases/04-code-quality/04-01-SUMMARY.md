---
phase: 04-code-quality
plan: 01
subsystem: backend
tags: [dead-code, refactoring, service-naming, cleanup]

# Dependency graph
requires:
  - phase: 03-03
    provides: Test coverage established
provides:
  - Removed dead services (property-stats, notification-formatter, dashboard tenant-stats)
  - Resolved duplicate service class names (MetricsService collision)
  - Clear, unambiguous service naming across codebase
affects: [backend-services, module-organization]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/backend/src/health/health-metrics.service.ts (renamed from metrics.service.ts)
    - apps/backend/src/health/health.module.ts
    - apps/backend/src/health/health.controller.ts
    - apps/backend/src/health/health.controller.spec.ts
  deleted:
    - apps/backend/src/modules/dashboard/services/property-stats.service.ts
    - apps/backend/src/modules/dashboard/services/tenant-stats.service.ts
    - apps/backend/src/modules/notifications/services/notification-formatter.service.ts
    - apps/backend/src/modules/dashboard/services/ (empty directory)

key-decisions:
  - "Delete unused services rather than keep 'for later'"
  - "Rename health MetricsService to HealthMetricsService to avoid collision with Prometheus MetricsService"
  - "Dashboard tenant-stats was dead code - dashboard uses DashboardAnalyticsService instead"

patterns-established:
  - "Service naming: prefix with domain (HealthMetricsService, SecurityMetricsService)"

issues-created: []

# Metrics
duration: 15min
completed: 2026-01-15
---

# Phase 4 Plan 1: Dead Code Deletion and Service Name Consolidation

**Deleted 3 dead service files and resolved duplicate service class names**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-15T15:40:00Z
- **Completed:** 2026-01-15T15:55:00Z
- **Tasks:** 3
- **Files deleted:** 3 (+ 1 empty directory)
- **Files renamed:** 1

## Key Findings

### Dead Services Identified and Deleted

| Service | Location | Reason Dead |
|---------|----------|-------------|
| PropertyStatsService | dashboard/services/ | Not imported anywhere, not in module providers |
| NotificationFormatterService | notifications/services/ | Empty file (0 bytes), not imported |
| TenantStatsService | dashboard/services/ | Not imported anywhere, DashboardAnalyticsService handles this |

### Duplicate Class Names Resolved

| Original Name | Location | New Name | Reason |
|---------------|----------|----------|--------|
| MetricsService | health/ | HealthMetricsService | Collided with Prometheus MetricsService |

## Changes Made

### Task 1: Delete Dead Services

Deleted 2 files that were never used:

1. `apps/backend/src/modules/dashboard/services/property-stats.service.ts`
   - 2,075 bytes of dead code
   - Only reference was in the file itself

2. `apps/backend/src/modules/notifications/services/notification-formatter.service.ts`
   - Empty file (0 bytes)
   - Never implemented

### Task 2: Consolidate Duplicate tenant-stats Services

Investigation revealed:
- `tenants/tenant-stats.service.ts` - **Active**, used by TenantQueryService
- `dashboard/services/tenant-stats.service.ts` - **Dead**, not imported anywhere

Action: Deleted the dashboard version (dead code)

### Task 3: Consolidate Duplicate metrics Services

Three metrics services existed:
1. `modules/metrics/metrics.service.ts` - Prometheus business metrics
2. `health/metrics.service.ts` - Health check performance metrics
3. `security/security-metrics.service.ts` - Security metrics

Problem: #1 and #2 both had class name `MetricsService`

Solution: Renamed `health/metrics.service.ts` to `health/health-metrics.service.ts` with class `HealthMetricsService`

Updated imports in:
- health.module.ts
- health.controller.ts
- health.controller.spec.ts

## Before/After

| Metric | Before | After |
|--------|--------|-------|
| Dead service files | 3 | 0 |
| Duplicate class names | 2 (MetricsService, TenantStatsService) | 0 |
| Empty directories | 1 | 0 |

## Verification

- **Typecheck:** Passed
- **Unit tests:** 1,593 passed, 53 skipped
- **No duplicate class names:** Verified with grep

## Service Naming Convention Established

Services that provide similar functionality in different domains now follow a naming pattern:

| Domain | Service Name | Purpose |
|--------|--------------|---------|
| Prometheus | MetricsService | Business metrics (webhooks, auth, database) |
| Health | HealthMetricsService | System metrics (CPU, memory, cache) |
| Security | SecurityMetricsService | Security metrics (rate limiting, threats) |

---
*Phase: 04-code-quality*
*Completed: 2026-01-15*
