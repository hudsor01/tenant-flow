# TenantFlow Shared Types Lookup Table

> Last Updated: 2026-02-20
> **AGENTS AND DEVELOPERS: Check this file BEFORE defining any type. If a type exists here, you MUST use it.**

## How to Use

1. Search this file for your type name (Cmd+F / Ctrl+F)
2. If found → import from the listed file path
3. If not found → see Classification Rules at the bottom

---

## DB Row Types (`core.ts`)

Named aliases for raw Supabase table rows. Never redefine these locally.

| Type | DB Table | Import Path |
|------|----------|-------------|
| `User` | `users` | `@repo/shared/types/core` |
| `Property` | `properties` | `@repo/shared/types/core` |
| `Unit` | `units` | `@repo/shared/types/core` |
| `Tenant` | `tenants` | `@repo/shared/types/core` |
| `Lease` | `leases` | `@repo/shared/types/core` |
| `MaintenanceRequest` | `maintenance_requests` | `@repo/shared/types/core` |
| `RentPayment` | `rent_payments` | `@repo/shared/types/core` |
| `ExpenseRecord` | `expenses` | `@repo/shared/types/core` |
| `ConnectedAccount` | `stripe_connected_accounts` | `@repo/shared/types/core` |

### Insert / Update Helpers (`core.ts`)

| Type | Import Path |
|------|-------------|
| `TenantInput` | `@repo/shared/types/core` |
| `TenantUpdate` | `@repo/shared/types/core` |
| `UserInsert` | `@repo/shared/types/core` |
| `UserUpdate` | `@repo/shared/types/core` |

### Insert / Update Helpers (`api-contracts.ts`)

| Type | Import Path |
|------|-------------|
| `PropertyInsert` / `PropertyUpdate` | `@repo/shared/types/api-contracts` |
| `UnitInsert` / `UnitUpdate` | `@repo/shared/types/api-contracts` |
| `LeaseInsert` / `LeaseUpdate` | `@repo/shared/types/api-contracts` |
| `MaintenanceRequestInsert` / `MaintenanceRequestUpdate` | `@repo/shared/types/api-contracts` |
| `RentPaymentInsert` / `RentPaymentUpdate` | `@repo/shared/types/api-contracts` |

---

## DB Enum / String Literal Types (`core.ts`)

Mirror database `CHECK` constraints. Never redefine locally.

| Type | Values | Import Path |
|------|--------|-------------|
| `LeaseStatus` | `active \| pending \| expired \| terminated \| draft` | `@repo/shared/types/core` |
| `UnitStatus` | `available \| occupied \| maintenance \| reserved` | `@repo/shared/types/core` |
| `PaymentStatus` | `pending \| completed \| failed \| refunded \| processing` | `@repo/shared/types/core` |
| `MaintenanceStatus` | `open \| in_progress \| completed \| cancelled \| on_hold` | `@repo/shared/types/core` |
| `MaintenancePriority` | `low \| normal \| medium \| high \| urgent` | `@repo/shared/types/core` |
| `PropertyStatus` | `active \| inactive \| sold` | `@repo/shared/types/core` |
| `NotificationType` | `maintenance \| lease \| payment \| system` | `@repo/shared/types/core` |
| `InvitationType` | `platform_access \| lease_signing` | `@repo/shared/types/core` |
| `StripeSubscriptionStatus` | `none \| pending \| active \| failed` | `@repo/shared/types/core` |
| `SignatureMethod` | `in_app \| docuseal` | `@repo/shared/types/core` |
| `SecurityEventSeverity` | `low \| medium \| high \| critical` | `@repo/shared/types/core` |
| `SecurityEventType` | (see core.ts for full union) | `@repo/shared/types/core` |
| `SubscriptionStatus` | (Stripe subscription states) | `@repo/shared/types/core` |
| `PaymentMethodType` | `card \| us_bank_account` | `@repo/shared/types/core` |
| `SearchResultType` | `properties \| tenants \| units \| leases` | `@repo/shared/types/core` |
| `HttpMethod` | `GET \| POST \| PUT \| PATCH \| DELETE \| ...` | `@repo/shared/types/core` |
| `EntityType` | `properties \| units \| tenants \| leases \| maintenance` | `@repo/shared/types/core` |
| `ActionType` | `create \| update \| delete \| view` | `@repo/shared/types/core` |
| `Permission` | `` `${EntityType}:${ActionType}` `` | `@repo/shared/types/core` |
| `MaintenanceCategory` | (from constants) | `@repo/shared/types/core` |
| `PropertyType` | UPPERCASE constants e.g. `SINGLE_FAMILY` | `@repo/shared/types/core` |
| `ActivityEntityType` | (from constants) | `@repo/shared/types/core` |

---

## Relations / Joined Types (`relations.ts`)

For querying data with joins. Use these instead of creating local joined types.

| Type | Extends | Import Path |
|------|---------|-------------|
| `PropertyWithDetails` | `Property` + units + imageUrl | `@repo/shared/types/relations` |
| `UnitWithDetails` | `Unit` + property + tenant + lease | `@repo/shared/types/relations` |
| `TenantWithDetails` | `Tenant` + user profile + units + leases | `@repo/shared/types/relations` |
| `LeaseWithDetails` | `Lease` + property + unit + tenant | `@repo/shared/types/relations` |
| `MaintenanceWithDetails` | `MaintenanceRequest` + unit + property | `@repo/shared/types/relations` |
| `MaintenanceRequestWithDetails` | `MaintenanceRequest` + unit + assignee + tenant | `@repo/shared/types/relations` |
| `PropertyWithUnits` | `Property` + units array with tenant names | `@repo/shared/types/relations` |
| `PropertyWithUnitsAndLeases` | `Property` + units + active leases | `@repo/shared/types/relations` |
| `TenantWithLeases` | `Tenant` + leases array | `@repo/shared/types/relations` |
| `UnitWithProperty` | `Unit` + property name | `@repo/shared/types/relations` |
| `LeaseWithRelations` | `Lease` + tenant + unit + property | `@repo/shared/types/relations` |
| `MaintenanceRequestWithRelations` | `MaintenanceRequest` + deeply nested unit/property/leases/files | `@repo/shared/types/relations` |
| `UserWithProperties` | `User` + properties array | `@repo/shared/types/relations` |
| `PropertyWithFullDetails` | `PropertyWithUnits` + financial metrics | `@repo/shared/types/relations` |
| `PropertySummary` | Minimal property data (id/name/address/type) | `@repo/shared/types/relations` |
| `PropertyStatsExtended` | Per-property extended stats | `@repo/shared/types/relations` |
| `PropertySearchResult` | `PropertyWithUnits` + score + highlights | `@repo/shared/types/relations` |
| `PropertyFilters` | Filter params for property queries | `@repo/shared/types/relations` |

Also in `core.ts`:
| `LeaseWithExtras` | `Lease` + tenant + unit + property | `@repo/shared/types/core` |
| `MaintenanceRequestWithExtras` | `MaintenanceRequest` + unit + property + tenant | `@repo/shared/types/core` |
| `TenantWithExtras` | `Tenant` + leases + unit + property | `@repo/shared/types/core` |
| `UnitRowWithRelations` | `Unit` + property + leases | `@repo/shared/types/core` |
| `TenantWithLeaseInfo` | `Tenant` + lease details | `@repo/shared/types/core` |

---

## API Contract Types (`api-contracts.ts`)

For API request/response shapes. Check here before defining any API shape.

### User / Profile
| Type | Import Path |
|------|-------------|
| `UserProfile` | `@repo/shared/types/api-contracts` |
| `UserProfileTenantData` | `@repo/shared/types/api-contracts` |
| `UserProfileOwnerData` | `@repo/shared/types/api-contracts` |
| `UpdateProfileInput` | `@repo/shared/types/api-contracts` |
| `UpdatePhoneInput` | `@repo/shared/types/api-contracts` |
| `SetEmergencyContactInput` | `@repo/shared/types/api-contracts` |
| `AvatarUploadResponse` | `@repo/shared/types/api-contracts` |

### List / Detail Shapes
| Type | Import Path |
|------|-------------|
| `PropertyListItem` | `@repo/shared/types/api-contracts` |
| `PropertyDetail` | `@repo/shared/types/api-contracts` |
| `UnitListItem` | `@repo/shared/types/api-contracts` |
| `UnitDetail` | `@repo/shared/types/api-contracts` |
| `TenantListItem` | `@repo/shared/types/api-contracts` |
| `TenantDetail` | `@repo/shared/types/api-contracts` |
| `LeaseListItem` | `@repo/shared/types/api-contracts` |
| `LeaseDetail` | `@repo/shared/types/api-contracts` |
| `MaintenanceRequestListItem` | `@repo/shared/types/api-contracts` |
| `MaintenanceRequestDetail` | `@repo/shared/types/api-contracts` |
| `RentPaymentListItem` | `@repo/shared/types/api-contracts` |
| `RentPaymentDetail` | `@repo/shared/types/api-contracts` |

### Filters
| Type | Import Path |
|------|-------------|
| `PropertyApiFilters` | `@repo/shared/types/api-contracts` |
| `TenantFilters` | `@repo/shared/types/api-contracts` |
| `LeaseFilters` | `@repo/shared/types/api-contracts` |
| `MaintenanceFilters` | `@repo/shared/types/api-contracts` |
| `UnitFilters` | `@repo/shared/types/api-contracts` |
| `InvitationFilters` | `@repo/shared/types/api-contracts` |

### Create / Update Inputs
| Type | Import Path |
|------|-------------|
| `CreatePropertyInput` / `UpdatePropertyInput` | `@repo/shared/types/api-contracts` |
| `CreateUnitInput` / `UpdateUnitInput` | `@repo/shared/types/api-contracts` |
| `CreateLeaseInput` / `UpdateLeaseInput` | `@repo/shared/types/api-contracts` |
| `CreateMaintenanceRequestInput` | `@repo/shared/types/api-contracts` |
| `UpdateMaintenanceRequestInput` | `@repo/shared/types/api-contracts` |

### Invitations / Signatures
| Type | Import Path |
|------|-------------|
| `TenantInvitation` | `@repo/shared/types/api-contracts` |
| `SignatureStatus` | `@repo/shared/types/api-contracts` |
| `SignatureStatusResponse` | `@repo/shared/types/api-contracts` |

### Payments / Billing
| Type | Import Path |
|------|-------------|
| `PaymentHistoryItem` | `@repo/shared/types/api-contracts` |
| `StripeInvoice` | `@repo/shared/types/api-contracts` |
| `BillingHistoryItem` | `@repo/shared/types/api-contracts` |
| `SubscriptionStatusResponse` | `@repo/shared/types/api-contracts` |
| `FailedPaymentAttempt` | `@repo/shared/types/api-contracts` |
| `TenantPayment` | `@repo/shared/types/api-contracts` |
| `TenantPaymentRecord` | `@repo/shared/types/api-contracts` |
| `TenantPaymentHistoryResponse` | `@repo/shared/types/api-contracts` |
| `CreateRentSubscriptionRequest` | `@repo/shared/types/api-contracts` |
| `RentSubscriptionResponse` | `@repo/shared/types/api-contracts` |
| `UpdateSubscriptionRequest` | `@repo/shared/types/api-contracts` |
| `SubscriptionActionResponse` | `@repo/shared/types/api-contracts` |
| `SendPaymentReminderRequest` | `@repo/shared/types/api-contracts` |

### Generic API Wrappers
| Type | Import Path |
|------|-------------|
| `PaginatedResponse<T>` | `@repo/shared/types/api-contracts` |
| `ApiResponse<T>` | `@repo/shared/types/api-contracts` |

### Bulk Import
| Type | Import Path |
|------|-------------|
| `BulkImportResult` | `@repo/shared/types/api-contracts` |
| `ParsedRow` | `@repo/shared/types/api-contracts` |
| `ImportStep` | `@repo/shared/types/api-contracts` |

### Status
| Type | Import Path |
|------|-------------|
| `TenantStatus` (api-contracts version) | `@repo/shared/types/api-contracts` |

---

## Financial Statement Types (`financial-statements.ts`)

For financial page data shapes and chart data.

| Type | Purpose | Import Path |
|------|---------|-------------|
| `FinancialLineItem` | Generic line item (name + amount) | `@repo/shared/types/financial-statements` |
| `PropertyPL` | Property-level P&L summary | `@repo/shared/types/financial-statements` |
| `MonthlyData` | Monthly revenue/expense/income for charts | `@repo/shared/types/financial-statements` |
| `IncomeStatementRevenueBreakdown` | Revenue by category | `@repo/shared/types/financial-statements` |
| `IncomeStatementExpenseBreakdown` | Expenses by category | `@repo/shared/types/financial-statements` |
| `CashFlowCategory` | Cash flow inflow/outflow item with % | `@repo/shared/types/financial-statements` |
| `MonthlyCashFlow` | Monthly cash flow for trend charts | `@repo/shared/types/financial-statements` |
| `IncomeStatementData` | Full income statement API response | `@repo/shared/types/financial-statements` |
| `BalanceSheetData` | Full balance sheet API response | `@repo/shared/types/financial-statements` |
| `CashFlowData` | Full cash flow statement API response | `@repo/shared/types/financial-statements` |
| `TaxDocumentsData` | Tax document data structure | `@repo/shared/types/financial-statements` |
| `TaxExpenseCategory` | Tax expense line item | `@repo/shared/types/financial-statements` |
| `TaxPropertyDepreciation` | Property depreciation record | `@repo/shared/types/financial-statements` |
| `FinancialPropertyPerformance` | Per-property financial performance | `@repo/shared/types/financial-statements` |
| `PropertyOccupancyData` | Occupancy rates per property | `@repo/shared/types/financial-statements` |
| `PropertyFinancialData` | Financial metrics per property | `@repo/shared/types/financial-statements` |
| `PropertyMaintenanceData` | Maintenance metrics per property | `@repo/shared/types/financial-statements` |
| `AnalyticsProperty` | Property with units for analytics processing | `@repo/shared/types/financial-statements` |
| `AnalyticsUnit` | Unit with leases + maintenance for analytics | `@repo/shared/types/financial-statements` |
| `AnalyticsLease` | Lease with rent_payments for analytics | `@repo/shared/types/financial-statements` |
| `AnalyticsMaintenanceRequest` | Maintenance with expenses for analytics | `@repo/shared/types/financial-statements` |
| `QueryProperty`, `QueryUnit`, `QueryLease` | Simplified Supabase query result types | `@repo/shared/types/financial-statements` |
| `DetailedQueryProperty`, `DetailedQueryUnit` | Query types with financial detail | `@repo/shared/types/financial-statements` |
| `MaintenanceQueryProperty` | Property with maintenance for analytics | `@repo/shared/types/financial-statements` |

---

## Analytics Types (`analytics.ts`)

For dashboard KPI and analytics API shapes.

| Type | Import Path |
|------|-------------|
| `AnalyticsDataPoint` | `@repo/shared/types/analytics` |
| `TimeSeriesDataPoint` | `@repo/shared/types/analytics` |
| `MetricTrend` | `@repo/shared/types/analytics` |
| `MetricSummary` | `@repo/shared/types/analytics` |
| `AnalyticsBreakdownRow` | `@repo/shared/types/analytics` |
| `AnalyticsBreakdown` | `@repo/shared/types/analytics` |
| `TimeSeriesResponse` | `@repo/shared/types/analytics` |
| `AnalyticsPaginatedResponse<T>` | `@repo/shared/types/analytics` |
| `ChartDataPoint` | `@repo/shared/types/analytics` |
| `AnalyticsEvent` | `@repo/shared/types/analytics` |
| `AnalyticsFilterOptions` | `@repo/shared/types/analytics` |
| `AggregationOptions` | `@repo/shared/types/analytics` |
| `AnalyticsPageResponse<T>` | `@repo/shared/types/analytics` |
| `ComparisonMetric` | `@repo/shared/types/analytics` |
| `AnalyticsSummary` | `@repo/shared/types/analytics` |
| `FinancialMetricSummary` | `@repo/shared/types/analytics` |
| `FinancialBreakdownRow` | `@repo/shared/types/analytics` |
| `RevenueExpenseBreakdown` | `@repo/shared/types/analytics` |
| `NetOperatingIncomeByProperty` | `@repo/shared/types/analytics` |
| `FinancialOverviewSnapshot` | `@repo/shared/types/analytics` |
| `BillingInsightsTimelinePoint` | `@repo/shared/types/analytics` |
| `BillingInsightsTimeline` | `@repo/shared/types/analytics` |
| `ExpenseCategorySummary` | `@repo/shared/types/analytics` |
| `ExpenseSummaryResponse` | `@repo/shared/types/analytics` |
| `InvoiceStatusSummary` | `@repo/shared/types/analytics` |
| `MonthlyFinancialMetric` | `@repo/shared/types/analytics` |
| `LeaseFinancialSummary` | `@repo/shared/types/analytics` |
| `LeaseFinancialInsight` | `@repo/shared/types/analytics` |
| `FinancialAnalyticsPageResponse` | `@repo/shared/types/analytics` |
| `LeaseLifecyclePoint` | `@repo/shared/types/analytics` |
| `LeaseStatusBreakdown` | `@repo/shared/types/analytics` |
| `LeaseAnalyticsPageResponse` | `@repo/shared/types/analytics` |
| `MaintenanceMetricSummary` | `@repo/shared/types/analytics` |
| `MaintenanceCostBreakdownEntry` | `@repo/shared/types/analytics` |
| `MaintenanceTrendPoint` | `@repo/shared/types/analytics` |
| `MaintenanceCategoryBreakdown` | `@repo/shared/types/analytics` |
| `MaintenanceAnalyticsPageResponse` | `@repo/shared/types/analytics` |
| `OccupancyMetricSummary` | `@repo/shared/types/analytics` |
| `OccupancyTrendPoint` | `@repo/shared/types/analytics` |
| `VacancyAnalysisEntry` | `@repo/shared/types/analytics` |
| `OccupancyAnalyticsPageResponse` | `@repo/shared/types/analytics` |
| `PropertyPerformanceEntry` | `@repo/shared/types/analytics` |
| `PropertyPerformanceData` | `@repo/shared/types/analytics` |
| `PropertyPerformanceSummary` | `@repo/shared/types/analytics` |
| `PropertyUnitDetail` | `@repo/shared/types/analytics` |
| `UnitStatisticEntry` | `@repo/shared/types/analytics` |
| `VisitorAnalyticsPoint` | `@repo/shared/types/analytics` |
| `VisitorAnalyticsSummary` | `@repo/shared/types/analytics` |
| `VisitorAnalyticsResponse` | `@repo/shared/types/analytics` |
| `PropertyPerformancePageResponse` | `@repo/shared/types/analytics` |

Also in `core.ts` (dashboard response shapes):
| `FinancialOverviewResponse` | `@repo/shared/types/core` |
| `DashboardMetricsResponse` | `@repo/shared/types/core` |
| `DashboardSummaryResponse` | `@repo/shared/types/core` |
| `DashboardSummary` | `@repo/shared/types/core` |
| `FinancialMetrics` | `@repo/shared/types/core` |
| `PropertyFinancialMetrics` | `@repo/shared/types/core` |
| `MaintenanceMetrics` | `@repo/shared/types/core` |
| `MaintenanceCostSummary` | `@repo/shared/types/core` |
| `MaintenancePerformance` | `@repo/shared/types/core` |
| `PropertyPerformance` | `@repo/shared/types/core` |
| `PropertyPerformanceResponse` | `@repo/shared/types/core` |

---

## RPC Return Types (`database-rpc.ts`)

For Supabase RPC function response shapes.

| Type | Import Path |
|------|-------------|
| `PropertyPerformanceRpcResponse` | `@repo/shared/types/database-rpc` |
| `OccupancyTrendResponse` | `@repo/shared/types/database-rpc` |
| `RevenueTrendResponse` | `@repo/shared/types/database-rpc` |

---

## Stripe Types (`stripe.ts`)

For Stripe-specific types shared between backend and frontend.

| Type | Import Path |
|------|-------------|
| `PlanType` | `@repo/shared/types/stripe` |
| `ConnectedAccountWithIdentity` | `@repo/shared/types/stripe` |
| `BillingPeriod` | `@repo/shared/types/stripe` |
| `BillingInterval` | `@repo/shared/types/stripe` |
| `StripeWebhookEventType` | `@repo/shared/types/stripe` |
| `StripeWebhookEvent` | `@repo/shared/types/stripe` |
| `WebhookNotification` | `@repo/shared/types/stripe` |
| `WebhookProcessorFunction` | `@repo/shared/types/stripe` |
| `StripeWebhookProcessor` | `@repo/shared/types/stripe` |
| `StripePrice` | `@repo/shared/types/stripe` |
| `StripeProductWithPricing` | `@repo/shared/types/stripe` |
| `CreateTenantCustomerParams` | `@repo/shared/types/stripe` |
| `AttachPaymentMethodParams` | `@repo/shared/types/stripe` |
| `SetupTenantAutopayParams` | `@repo/shared/types/stripe` |
| `CancelTenantAutopayParams` | `@repo/shared/types/stripe` |
| `GetAutopayStatusParams` | `@repo/shared/types/stripe` |
| `TenantAutopayStatusResponse` | `@repo/shared/types/stripe` |
| `SetupTenantAutopayResponse` | `@repo/shared/types/stripe` |
| `CancelTenantAutopayResponse` | `@repo/shared/types/stripe` |
| `IdentityVerificationStatus` | `@repo/shared/types/stripe` |
| `IdentityVerificationRecord` | `@repo/shared/types/stripe` |
| `IdentityVerificationSessionPayload` | `@repo/shared/types/stripe` |

---

## Domain / Infrastructure Types (`domain.ts`)

For cross-cutting concerns not tied to a specific entity.

| Type | Import Path |
|------|-------------|
| `CSPViolationReport` | `@repo/shared/types/domain` |
| `CSPReportBody` | `@repo/shared/types/domain` |
| `ContactFormType` | `@repo/shared/types/domain` |
| `ContactFormRequest` | `@repo/shared/types/domain` |
| `ContactFormResponse` | `@repo/shared/types/domain` |
| `WebVitalMetricName` | `@repo/shared/types/domain` |
| `WebVitalRating` | `@repo/shared/types/domain` |
| `WebVitalLabel` | `@repo/shared/types/domain` |
| `WebVitalNavigationType` | `@repo/shared/types/domain` |
| `WebVitalMetricNameValue` | `@repo/shared/types/domain` |
| `WebVitalRatingValue` | `@repo/shared/types/domain` |
| `WebVitalLabelValue` | `@repo/shared/types/domain` |
| `WebVitalNavigationTypeValue` | `@repo/shared/types/domain` |
| `StorageUploadResult` | `@repo/shared/types/domain` |
| `StorageEntityType` | `@repo/shared/types/domain` |
| `StorageFileType` | `@repo/shared/types/domain` |
| `ThemeMode` | `@repo/shared/types/domain` |
| `DataDensity` | `@repo/shared/types/domain` |
| `SemanticColorToken` | `@repo/shared/types/domain` |
| `ColorRationale` | `@repo/shared/types/domain` |
| `StripeWebhookEventTypes` | `@repo/shared/types/domain` |

---

## Section / UI Types by Domain

### Maintenance (`sections/maintenance.ts`)

| Type | Purpose | Import Path |
|------|---------|-------------|
| `MaintenanceDisplayRequest` | Flat display type with optional property/unit/assignedTo/tenant names | `@repo/shared/types/sections/maintenance` |
| `MaintenanceProps` | Full maintenance section props | `@repo/shared/types/sections/maintenance` |
| `MaintenanceRequestItem` | List item shape for maintenance | `@repo/shared/types/sections/maintenance` |
| `MaintenanceSectionRequestDetail` | Detailed request with expenses/photos/notes/timeline | `@repo/shared/types/sections/maintenance` |
| `MaintenanceAnalytics` | Analytics breakdown type | `@repo/shared/types/sections/maintenance` |
| `KanbanColumnProps` | Kanban board column props | `@repo/shared/types/sections/maintenance` |
| `MaintenanceListProps` | Maintenance list component props | `@repo/shared/types/sections/maintenance` |
| `MaintenanceTimelineEventType` | Timeline event type union | `@repo/shared/types/sections/maintenance` |
| `ExpenseItem`, `PhotoItem`, `NoteItem` | Detail section sub-items | `@repo/shared/types/sections/maintenance` |
| `TimelineEvent` | Timeline entry | `@repo/shared/types/sections/maintenance` |
| `CreateRequestData`, `ExpenseData` | Form submission data | `@repo/shared/types/sections/maintenance` |

### Payments (`sections/payments.ts`)

| Type | Import Path |
|------|-------------|
| (see file for full list) | `@repo/shared/types/sections/payments` |

### Tenants (`sections/tenants.ts`)

| Type | Import Path |
|------|-------------|
| (see file for full list) | `@repo/shared/types/sections/tenants` |

### Leases (`sections/leases.ts`)

| Type | Import Path |
|------|-------------|
| (see file for full list) | `@repo/shared/types/sections/leases` |

### Dashboard (`sections/dashboard.ts`)

| Type | Import Path |
|------|-------------|
| (see file for full list) | `@repo/shared/types/sections/dashboard` |

### Tenant Portal (`sections/tenant-portal.ts`)

| Type | Import Path |
|------|-------------|
| (see file for full list) | `@repo/shared/types/sections/tenant-portal` |

---

## Other Core Types (`core.ts`)

| Type | Import Path |
|------|-------------|
| `Pagination` | `@repo/shared/types/core` |
| `SearchResult` | `@repo/shared/types/core` |
| `PaymentMethodResponse` | `@repo/shared/types/core` |
| `StripeSessionStatusResponse` | `@repo/shared/types/core` |
| `CreateCheckoutSessionRequest` | `@repo/shared/types/core` |
| `CreateConnectedPaymentRequest` | `@repo/shared/types/core` |
| `SystemUptime` | `@repo/shared/types/core` |
| `TenantNotificationPreferences` | `@repo/shared/types/core` |
| `FormProgressData` | `@repo/shared/types/core` |
| `LeaseStatsResponse` | `@repo/shared/types/core` |

---

## Classification Rules

### When should a type live in `shared/`?

| Condition | Target File |
|-----------|-------------|
| Exact DB row | Use `Tables<'tablename'>` alias from `core.ts` |
| DB row + computed/joined fields, used in 2+ files | `relations.ts` or `api-contracts.ts` |
| API request/response shape | `api-contracts.ts` |
| Financial statement page data | `financial-statements.ts` |
| Dashboard KPI / analytics | `analytics.ts` |
| Supabase RPC return type | `database-rpc.ts` |
| Stripe-specific shared type | `stripe.ts` |
| Domain display type used by 3+ components | `sections/<domain>.ts` |
| Infrastructure / cross-cutting (CSP, Web Vitals, Storage) | `domain.ts` |

### When can a type stay local?

- Used in exactly 1 component and its direct children only
- Props interface for a specific React component
- Internal state type (modal open, tab selection, etc.)
- Backend-only internal service parameter

### Zero Tolerance Violations

```typescript
// ❌ Redefining a DB row type locally
interface Tenant { id: string; name: string }
// → Use: import type { Tenant } from '@repo/shared/types/core'

// ❌ Redefining a status enum locally
type LeaseStatus = 'active' | 'expired'
// → Use: import type { LeaseStatus } from '@repo/shared/types/core'

// ❌ Creating a local joined type when shared exists
type MaintenanceWithProperty = MaintenanceRequest & { property: Property }
// → Use: MaintenanceRequestWithDetails from '@repo/shared/types/relations'

// ❌ Creating display type that already exists in sections/
type MaintenanceRequestWithRelations = MaintenanceRequest & { property?: { name } }
// → Use: MaintenanceDisplayRequest from '@repo/shared/types/sections/maintenance'
```
