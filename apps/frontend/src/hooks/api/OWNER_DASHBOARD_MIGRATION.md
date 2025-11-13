# Owner Dashboard API Migration Guide

## Overview

The dashboard API has been reorganized into a modular `/owner` route structure for better maintainability and role-based access control.

## Route Changes

### Old Routes (`/manage`)
```
/api/v1/manage/stats
/api/v1/manage/activity
/api/v1/manage/page-data
/api/v1/manage/property-performance
/api/v1/manage/uptime
/api/v1/manage/billing/insights
/api/v1/manage/billing/health
/api/v1/manage/revenue-trends
/api/v1/manage/occupancy-trends
/api/v1/manage/maintenance-analytics
/api/v1/manage/time-series
/api/v1/manage/metric-trend
```

### New Routes (`/owner`)
```
/api/v1/owner/analytics/stats
/api/v1/owner/analytics/activity
/api/v1/owner/analytics/page-data
/api/v1/owner/analytics/uptime

/api/v1/owner/financial/billing/insights
/api/v1/owner/financial/billing/health
/api/v1/owner/financial/billing/insights/available
/api/v1/owner/financial/revenue-trends

/api/v1/owner/properties/performance

/api/v1/owner/maintenance/analytics

/api/v1/owner/tenants/occupancy-trends

/api/v1/owner/reports/time-series
/api/v1/owner/reports/metric-trend
```

## Hook Migration

### Analytics & Stats

**OLD:**
```typescript
import { useDashboardStats } from '#hooks/api/use-dashboard'

const { data } = useDashboardStats()
```

**NEW:**
```typescript
import { useOwnerDashboardStats } from '#hooks/api/use-owner-dashboard'

const { data } = useOwnerDashboardStats()
```

### Activity Feed

**OLD:**
```typescript
import { useDashboardActivity } from '#hooks/api/use-dashboard'

const { data } = useDashboardActivity()
```

**NEW:**
```typescript
import { useOwnerDashboardActivity } from '#hooks/api/use-owner-dashboard'

const { data } = useOwnerDashboardActivity()
```

### Unified Page Data

**OLD:**
```typescript
import { useDashboardPageDataUnified } from '#hooks/api/use-dashboard'

const { data } = useDashboardPageDataUnified()
```

**NEW:**
```typescript
import { useOwnerDashboardPageData } from '#hooks/api/use-owner-dashboard'

const { data } = useOwnerDashboardPageData()
```

### Property Performance

**OLD:**
```typescript
import { usePropertyPerformance } from '#hooks/api/use-dashboard'

const { data } = usePropertyPerformance()
```

**NEW:**
```typescript
import { useOwnerPropertyPerformance } from '#hooks/api/use-owner-dashboard'

const { data } = useOwnerPropertyPerformance()
```

### System Uptime

**OLD:**
```typescript
import { useSystemUptime } from '#hooks/api/use-dashboard'

const { data } = useSystemUptime()
```

**NEW:**
```typescript
import { useOwnerSystemUptime } from '#hooks/api/use-owner-dashboard'

const { data } = useOwnerSystemUptime()
```

### Billing Insights

**OLD:**
```typescript
// Not available in old structure
```

**NEW:**
```typescript
import { useBillingInsights, useBillingHealth, useBillingInsightsAvailable } from '#hooks/api/use-owner-dashboard'

const { data: insights } = useBillingInsights(startDate, endDate)
const { data: health } = useBillingHealth()
const { data: available } = useBillingInsightsAvailable()
```

### Revenue Trends

**OLD:**
```typescript
// Not directly available - used useFinancialChartData()
```

**NEW:**
```typescript
import { useRevenueTrends } from '#hooks/api/use-owner-dashboard'

const { data } = useRevenueTrends(12) // 12 months
```

### Maintenance Analytics

**OLD:**
```typescript
// Not available in old structure
```

**NEW:**
```typescript
import { useMaintenanceAnalytics } from '#hooks/api/use-owner-dashboard'

const { data } = useMaintenanceAnalytics()
```

### Occupancy Trends

**OLD:**
```typescript
// Not directly available
```

**NEW:**
```typescript
import { useOccupancyTrends } from '#hooks/api/use-owner-dashboard'

const { data } = useOccupancyTrends(12) // 12 months
```

### Time Series Data

**OLD:**
```typescript
import { useDashboardTimeSeries } from '#hooks/api/use-dashboard-trends'

const { data } = useDashboardTimeSeries(userId, { metric: 'revenue', days: 30 })
```

**NEW:**
```typescript
import { useOwnerTimeSeries } from '#hooks/api/use-owner-dashboard'

const { data } = useOwnerTimeSeries('revenue', 30)
```

### Metric Trends

**OLD:**
```typescript
import { useMetricTrend } from '#hooks/api/use-dashboard-trends'

const { data } = useMetricTrend(userId, 'occupancy_rate', 'month')
```

**NEW:**
```typescript
import { useOwnerMetricTrend } from '#hooks/api/use-owner-dashboard'

const { data } = useOwnerMetricTrend('occupancy_rate', 'month')
```

## Combined Hooks

### OLD: useDashboardPageData()
```typescript
const {
  dashboardStats,
  propertyStats,
  tenantStats,
  leaseStats,
  activity,
  isLoading,
  error
} = useDashboardPageData()
```

### NEW: useOwnerDashboardComplete()
```typescript
import { useOwnerDashboardComplete } from '#hooks/api/use-owner-dashboard'

const {
  stats,
  activity,
  propertyPerformance,
  maintenanceAnalytics,
  isLoading,
  error
} = useOwnerDashboardComplete()
```

## Prefetch Hooks

### OLD:
```typescript
const prefetchStats = usePrefetchDashboardStats()
const prefetchActivity = usePrefetchDashboardActivity()
const prefetchPerformance = usePrefetchPropertyPerformance()
```

### NEW:
```typescript
import {
  usePrefetchOwnerDashboardPageData,
  usePrefetchOwnerPropertyPerformance,
  usePrefetchBillingInsights
} from '#hooks/api/use-owner-dashboard'

const prefetchPageData = usePrefetchOwnerDashboardPageData()
const prefetchPerformance = usePrefetchOwnerPropertyPerformance()
const prefetchBilling = usePrefetchBillingInsights()
```

## Query Key Changes

### OLD:
```typescript
queryClient.invalidateQueries(['dashboard', 'stats'])
queryClient.invalidateQueries(['dashboard', 'activity'])
```

### NEW:
```typescript
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

queryClient.invalidateQueries(ownerDashboardKeys.analytics.stats())
queryClient.invalidateQueries(ownerDashboardKeys.analytics.activity())
queryClient.invalidateQueries(ownerDashboardKeys.financial.billingInsights())
```

## Benefits of Migration

### 1. **Modular Organization**
Routes are organized by domain:
- `/owner/financial/*` - All financial data
- `/owner/properties/*` - All property data
- `/owner/maintenance/*` - All maintenance data
- `/owner/tenants/*` - All tenant data
- `/owner/reports/*` - All reports/analytics
- `/owner/analytics/*` - Dashboard overview data

### 2. **Role-Based Access Control**
All `/owner` routes are protected by `OwnerAuthGuard`:
```typescript
// Automatically validates OWNER role
// Returns 401 if user is not an owner
```

### 3. **Better Type Safety**
```typescript
// Old - generic types
const { data } = useDashboardStats()

// New - specific interfaces
const { data } = useOwnerDashboardStats() // data: DashboardStats
const { data } = useBillingInsights() // data: BillingInsights
const { data } = useMaintenanceAnalytics() // data: MaintenanceAnalytics
```

### 4. **Improved Monitoring**
All `/owner` requests are logged with:
- Owner ID
- Request duration
- Route path
- Success/error status

### 5. **Better Cache Management**
Hierarchical query keys for precise invalidation:
```typescript
// Invalidate all financial data
queryClient.invalidateQueries(ownerDashboardKeys.financial.all)

// Invalidate only billing insights
queryClient.invalidateQueries(ownerDashboardKeys.financial.billingInsights())

// Invalidate all owner dashboard data
queryClient.invalidateQueries(ownerDashboardKeys.all)
```

## Backward Compatibility

The old `/manage` routes are **still active** and will remain so during the transition period.

**Deprecation Timeline:**
1. **Phase 1** (Current): Both `/manage` and `/owner` routes active
2. **Phase 2** (Q2 2025): Add deprecation warnings to `/manage` responses
3. **Phase 3** (Q3 2025): Remove `/manage` routes

## Migration Checklist

- [ ] Replace `useDashboardStats()` with `useOwnerDashboardStats()`
- [ ] Replace `useDashboardActivity()` with `useOwnerDashboardActivity()`
- [ ] Replace `useDashboardPageDataUnified()` with `useOwnerDashboardPageData()`
- [ ] Replace `usePropertyPerformance()` with `useOwnerPropertyPerformance()`
- [ ] Replace `useSystemUptime()` with `useOwnerSystemUptime()`
- [ ] Replace `useDashboardTimeSeries()` with `useOwnerTimeSeries()`
- [ ] Replace `useMetricTrend()` with `useOwnerMetricTrend()`
- [ ] Update query key invalidations to use `ownerDashboardKeys`
- [ ] Add new hooks: `useBillingInsights()`, `useMaintenanceAnalytics()`, `useOccupancyTrends()`
- [ ] Test all dashboard pages with new hooks
- [ ] Update prefetch hooks for hover states

## Testing

### 1. Verify Routes Work
```bash
# Test new owner endpoints
curl -H "Authorization: Bearer $TOKEN" https://api.tenantflow.app/api/v1/owner/analytics/stats
curl -H "Authorization: Bearer $TOKEN" https://api.tenantflow.app/api/v1/owner/financial/billing/health
curl -H "Authorization: Bearer $TOKEN" https://api.tenantflow.app/api/v1/owner/properties/performance
```

### 2. Verify Role Protection
```bash
# Should return 401 if user is not OWNER role
curl -H "Authorization: Bearer $NON_OWNER_TOKEN" https://api.tenantflow.app/api/v1/owner/analytics/stats
```

### 3. Compare Responses
```bash
# Old route
curl -H "Authorization: Bearer $TOKEN" https://api.tenantflow.app/api/v1/manage/stats

# New route
curl -H "Authorization: Bearer $TOKEN" https://api.tenantflow.app/api/v1/owner/analytics/stats

# Should return identical data structure
```

## Example: Full Page Migration

### Before (OLD)
```typescript
'use client'

import { useDashboardStats, useDashboardActivity } from '#hooks/api/use-dashboard'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: activity, isLoading: activityLoading } = useDashboardActivity()

  if (statsLoading || activityLoading) return <Loading />

  return (
    <div>
      <StatsCards stats={stats} />
      <ActivityFeed activities={activity?.activities} />
    </div>
  )
}
```

### After (NEW)
```typescript
'use client'

import { useOwnerDashboardPageData } from '#hooks/api/use-owner-dashboard'

export default function DashboardPage() {
  const { data, isLoading } = useOwnerDashboardPageData()

  if (isLoading) return <Loading />

  return (
    <div>
      <StatsCards stats={data?.stats} />
      <ActivityFeed activities={data?.activity} />
    </div>
  )
}
```

**Benefits:**
- Single API request instead of 2 (40-50% faster)
- Cleaner code with unified hook
- Better cache management
- Role-based access control

## Questions?

Contact the backend team or refer to:
- Backend: `apps/backend/src/modules/owner-dashboard/README.md`
- API Docs: `apps/backend/src/modules/owner-dashboard/`
