# TenantFlow Shared Types Lookup Table

> Last Updated: 2026-02-20
> **AGENTS: Check this file BEFORE defining any local type.**

## How to Use

1. Search this file for your type name (Cmd+F / Ctrl+F)
2. If found → import from the listed file path
3. If not found → check classification rules at the bottom

---

## DB Row Types (`core.ts`)

Use the type aliases below — never redefine from `Tables<>` locally.

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

### Insert/Update Helpers

| Type | Import Path |
|------|-------------|
| `TenantInput` | `@repo/shared/types/core` |
| `TenantUpdate` | `@repo/shared/types/core` |
| `UserInsert` | `@repo/shared/types/core` |
| `UserUpdate` | `@repo/shared/types/core` |

---

## DB Enum Types (`core.ts`)

These mirror database `CHECK` constraints. Never redefine locally.

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
| `PropertyType` | (UPPERCASE values from constants) | `@repo/shared/types/core` |
| `ActivityEntityType` | (from constants) | `@repo/shared/types/core` |

---

## Extended Row Types with Relations (`core.ts`, `relations.ts`)

| Type | Extends | Import Path |
|------|---------|-------------|
| `LeaseWithExtras` | `Lease` + tenant + unit + property | `@repo/shared/types/core` |
| `MaintenanceRequestWithExtras` | `MaintenanceRequest` + unit + property + tenant | `@repo/shared/types/core` |
| `TenantWithExtras` | `Tenant` + leases + unit + property | `@repo/shared/types/core` |
| `UnitRowWithRelations` | `Unit` + property + leases | `@repo/shared/types/core` |
| `TenantWithLeaseInfo` | `Tenant` + lease details | `@repo/shared/types/core` |
| `MaintenanceRequestWithRelations` | `MaintenanceRequest` + deeply nested unit/property/leases/files | `@repo/shared/types/relations` |
| `PropertyWithUnits` | `Property` + units array | `@repo/shared/types/relations` |
| `LeaseWithRelations` | `Lease` + unit + property + tenant | `@repo/shared/types/relations` |

---

## API Response Types (`core.ts`)

| Type | Import Path |
|------|-------------|
| `FinancialOverviewResponse` | `@repo/shared/types/core` |
| `LeaseStatsResponse` | `@repo/shared/types/core` |
| `PropertyPerformance` | `@repo/shared/types/core` |
| `PropertyPerformanceResponse` | `@repo/shared/types/core` |
| `DashboardMetricsResponse` | `@repo/shared/types/core` |
| `DashboardSummaryResponse` | `@repo/shared/types/core` |
| `DashboardSummary` | `@repo/shared/types/core` |
| `FinancialMetrics` | `@repo/shared/types/core` |
| `PropertyFinancialMetrics` | `@repo/shared/types/core` |
| `MaintenanceMetrics` | `@repo/shared/types/core` |
| `MaintenanceCostSummary` | `@repo/shared/types/core` |
| `MaintenancePerformance` | `@repo/shared/types/core` |
| `Pagination` | `@repo/shared/types/core` |
| `SearchResult` | `@repo/shared/types/core` |
| `PaymentMethodResponse` | `@repo/shared/types/core` |
| `StripeSessionStatusResponse` | `@repo/shared/types/core` |
| `CreateCheckoutSessionRequest` | `@repo/shared/types/core` |
| `CreateConnectedPaymentRequest` | `@repo/shared/types/core` |
| `SystemUptime` | `@repo/shared/types/core` |
| `TenantNotificationPreferences` | `@repo/shared/types/core` |
| `FormProgressData` | `@repo/shared/types/core` |

---

## Financial Statement Types (`financial-statements.ts`)

| Type | Purpose | Import Path |
|------|---------|-------------|
| `FinancialLineItem` | Generic line item (name + amount) | `@repo/shared/types/financial-statements` |
| `PropertyPL` | Property-level P&L summary | `@repo/shared/types/financial-statements` |
| `MonthlyData` | Monthly revenue/expense/income for charts | `@repo/shared/types/financial-statements` |
| `IncomeStatementRevenueBreakdown` | Revenue by category | `@repo/shared/types/financial-statements` |
| `IncomeStatementExpenseBreakdown` | Expenses by category | `@repo/shared/types/financial-statements` |
| `CashFlowCategory` | Cash flow inflow/outflow item | `@repo/shared/types/financial-statements` |
| `MonthlyCashFlow` | Monthly cash flow for charts | `@repo/shared/types/financial-statements` |
| `IncomeStatementData` | Full income statement response | `@repo/shared/types/financial-statements` |
| `BalanceSheetData` | Full balance sheet response | `@repo/shared/types/financial-statements` |
| `CashFlowData` | Full cash flow statement response | `@repo/shared/types/financial-statements` |
| `TaxDocumentsData` | Tax document data structure | `@repo/shared/types/financial-statements` |
| `TaxExpenseCategory` | Tax expense line item | `@repo/shared/types/financial-statements` |
| `TaxPropertyDepreciation` | Property depreciation record | `@repo/shared/types/financial-statements` |
| `FinancialPropertyPerformance` | Per-property financial performance | `@repo/shared/types/financial-statements` |
| `PropertyOccupancyData` | Occupancy rates per property | `@repo/shared/types/financial-statements` |
| `PropertyFinancialData` | Financial metrics per property | `@repo/shared/types/financial-statements` |
| `PropertyMaintenanceData` | Maintenance metrics per property | `@repo/shared/types/financial-statements` |

---

## Section/UI Types by Domain

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
| `PaymentSectionData` | `@repo/shared/types/sections/payments` |
| `PaymentListItem` | `@repo/shared/types/sections/payments` |
| `PaymentStats` | `@repo/shared/types/sections/payments` |
| (see file for full list) | `@repo/shared/types/sections/payments` |

### Tenants (`sections/tenants.ts`)

| Type | Import Path |
|------|-------------|
| `TenantSectionData` | `@repo/shared/types/sections/tenants` |
| `TenantListItem` | `@repo/shared/types/sections/tenants` |
| (see file for full list) | `@repo/shared/types/sections/tenants` |

### Leases (`sections/leases.ts`)

| Type | Import Path |
|------|-------------|
| `LeaseSectionData` | `@repo/shared/types/sections/leases` |
| `LeaseSectionDetail` | `@repo/shared/types/sections/leases` |
| (see file for full list) | `@repo/shared/types/sections/leases` |

### Dashboard (`sections/dashboard.ts`)

| Type | Import Path |
|------|-------------|
| `DashboardSectionData` | `@repo/shared/types/sections/dashboard` |
| (see file for full list) | `@repo/shared/types/sections/dashboard` |

### Tenant Portal (`sections/tenant-portal.ts`)

| Type | Import Path |
|------|-------------|
| `TenantPortalData` | `@repo/shared/types/sections/tenant-portal` |
| (see file for full list) | `@repo/shared/types/sections/tenant-portal` |

---

## Auth Types (`auth.ts`)

| Type | Import Path |
|------|-------------|
| `AuthUser` | `@repo/shared/types/auth` |
| `AuthSession` | `@repo/shared/types/auth` |
| (see file for full list) | `@repo/shared/types/auth` |

---

## Analytics Query Types (`financial-statements.ts`)

For processing analytics data from Supabase queries:

| Type | Import Path |
|------|-------------|
| `AnalyticsProperty` | `@repo/shared/types/financial-statements` |
| `AnalyticsUnit` | `@repo/shared/types/financial-statements` |
| `AnalyticsLease` | `@repo/shared/types/financial-statements` |
| `AnalyticsMaintenanceRequest` | `@repo/shared/types/financial-statements` |
| `QueryProperty`, `QueryUnit`, `QueryLease` | `@repo/shared/types/financial-statements` |
| `DetailedQueryProperty`, `DetailedQueryUnit` | `@repo/shared/types/financial-statements` |
| `MaintenanceQueryProperty` | `@repo/shared/types/financial-statements` |

---

## Classification Rules

**When should a type live in `shared/`?**

- Used in 2+ files across different components/modules → move to shared
- Represents a DB row or DB-derived aggregate → always shared (`core.ts`)
- Is a financial statement response → `financial-statements.ts`
- Is a display/UI type for a specific domain component set → `sections/<domain>.ts`

**When can a type stay local?**

- Used in exactly 1 component and its sub-components only
- Is a props interface for a specific React component
- Is internal state type not consumed by any sibling or parent

**Never do this:**

```typescript
// ❌ Local redefinition of a DB row type
interface Tenant { id: string; name: string; ... }

// ❌ Duplicate of shared type with slightly different name
type MaintenanceItem = MaintenanceRequest & { propertyName: string }
// → Use MaintenanceDisplayRequest from @repo/shared/types/sections/maintenance

// ❌ Local type that duplicates shared aggregate
type PropertySummaryStats = { totalProperties: number; totalUnits: number }
// → Check core.ts first
```
