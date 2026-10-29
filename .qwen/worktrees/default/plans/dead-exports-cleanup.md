# Plan: Clean up unused exports and types

## Problem

Knip reports 70 unused exports + 390 unused exported types. After tracing every single one:

- **~25 are false positives** — knip can't resolve `#lib/*`, `#hooks/*` path aliases, so it misses real imports (e.g. `PropertyType`, `LeaseCreate`, `TenantUpdateInput` are all imported via `#lib/validation/*`)
- **~365 are genuinely dead** — exported but never imported from outside their defining file

## Approach

Delete the unused exports/types. Each slice targets one or two files, is independently verifiable with `tsc --noEmit`, and can be committed separately.

## Slices

### SLICE 1: `src/config/pricing.ts` — 7 dead exports
Remove: `PRICING_PLANS`, `getPricingPlan`, `checkPlanLimits`, `getRecommendedUpgrade`, `getTrialConfig`, `hasTrial`, `getStripePriceId`
- All are only used internally within the file. Consumers use wrapper functions (`getAllPricingPlans()`) or inline their own logic.
- Verify: `tsc --noEmit` passes, knip no longer reports these.

### SLICE 2: `src/lib/formatters/date.ts` — 1 dead export
Remove: `formatDateRange`
- The usage in `data-table-date-filter.tsx` is a *local* function with the same name, not an import.
- Verify: `tsc --noEmit` passes.

### SLICE 3: `src/lib/constants/status-types.ts` — 1 dead export
Remove: `PROPERTY_TYPES` (the object constant)
- Consumers import `SINGLE_UNIT_PROPERTY_TYPES` instead. The onboarding component defines its own local `PROPERTY_TYPES`.
- Keep: all type exports (`PropertyType`, `LeaseType`, etc.) — they ARE imported by consumers via `#lib/constants/status-types`.
- Verify: `tsc --noEmit` passes.

### SLICE 4: `src/lib/forms/form-hook.tsx` — 1 dead export
Remove: `withFieldGroup` (from the destructured export)
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 5: `src/lib/rpc-shape.ts` — 1 dead export
Remove: `jsonObjectOrEmpty`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 6: `src/providers/query-error-handler.ts` — 2 dead exports
Remove: `shouldRetryQuery`, `getRetryDelay`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 7: `src/types/api-contracts.ts` — 1 dead export
Remove: `DEFAULT_RETRY_ATTEMPTS`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 8: `src/lib/mutation-error-handler.ts` — 1 dead export
Remove: `STORAGE_QUOTA_TOAST_ID`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 9: `src/lib/storage-plan-limit.ts` — 1 dead export
Remove: `STORAGE_PLAN_LIMIT_SQLSTATE`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 10: `src/hooks/use-client-data-table.helpers.ts` — 1 dead export
Remove: `ARRAY_SEPARATOR`
- Each consumer (`use-data-table.ts`, `portfolio-preset-menu.tsx`) defines its own local constant.
- Verify: `tsc --noEmit` passes.

### SLICE 11: `src/config/data-table.ts` — 1 dead export
Remove: `dataTableConfig` (the const; keep the type alias if it's used)
- Verify: check if `DataTableConfig` type is imported anywhere. If not, remove both.
- Verify: `tsc --noEmit` passes.

### SLICE 12: `src/components/leases/table/leases-table-columns.tsx` — 1 dead export
Remove: `StatusBadge`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 13: `src/components/ledger/ledger-date-field.tsx` — 1 dead export
Remove: `fromLedgerDateString`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 14: `src/components/ui/card.tsx` — 1 dead export
Remove: `CardAction`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 15: `src/components/ui/file-upload/types.ts` — 3 dead exports
Remove: `ITEM_NAME`, `CLEAR_NAME`, `Direction`
- `ITEM_NAME` and `CLEAR_NAME` are only used internally in the same file.
- `Direction` is a duplicate — `stepper-types.ts` and `tour.tsx` each define their own.
- Verify: `tsc --noEmit` passes.

### SLICE 16: `src/components/ui/loading-spinner.tsx` — 2 dead exports
Remove: `LoadingDots`, `PageLoader` (from the re-export block)
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 17: `src/components/ui/stepper-context.tsx` — 6 dead exports
Remove: `ROOT_NAME`, `focusFirst`, `getDataState`, `getFocusIntent`, `getId`, `wrapArray`
- These are re-exported from sibling stepper files but never imported by external consumers.
- Verify: `tsc --noEmit` passes.

### SLICE 18: `src/components/ui/stepper.tsx` — 6 dead re-exports
Remove from the export block: `StepperContent`, `Next`, `Prev`, `useStepper` (and their aliased forms)
- Consumers import named components (`Stepper`, `StepperItem`, etc.) directly, not these re-exports.
- Verify: `tsc --noEmit` passes.

### SLICE 19: `src/types/domain.ts` — 7 dead exports
Remove: `ContactFormType`, `WebVitalMetricName`, `WebVitalRating`, `WebVitalLabel`, `WebVitalNavigationType`, `StripeWebhookEventType`
- All only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 20: `src/types/notifications.ts` — 3 dead exports
Remove: `NotificationType`, `NOTIFICATION_PRIORITY`, `NOTIFICATION_PRIORITY_OPTIONS`
- All only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 21: `src/types/supabase.ts` — 1 dead export
Remove: `Constants`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 22–30: Validation files — ~60 dead type exports
Remove unused types from each file (keep only what consumers actually import):

| File | Remove | Keep (actually imported) |
|---|---|---|
| `lib/validation/leases.ts` | `LeaseQuery`, `SignLease`, `LeaseWithSignature`, `LeaseTermination`, `LeaseRenewal`, `LeasePaymentSchedule`, `LeaseFormValues`, `LeaseCreateFormData`, `TransformedLeaseData`, `RejectLease` | `LeaseCreate`, `LeaseUpdateInput`, `LeaseInput`, `leaseInputSchema` |
| `lib/validation/maintenance.ts` | `MaintenanceRequestInput`, `MaintenanceRequestQuery`, `MaintenanceCostUpdate`, `MaintenanceAssignment`, `MaintenanceCompletion`, `MaintenanceInspection`, `MaintenanceAssignmentFormData`, `TransformedMaintenanceRequestData` | `maintenancePrioritySchema`, `maintenanceRequestCreateSchema` |
| `lib/validation/properties.ts` | `PropertyInput`, `PropertyQuery`, `PropertyAddress`, `PropertySold`, `PropertyFormData`, `PropertyUpdateFormData`, `TransformedPropertyData` | `PropertyCreate`, `propertyCreateSchema`, `propertyFormSchema` |
| `lib/validation/tenants.ts` | `TenantActiveStatus`, `TenantQuery`, `TenantVerification`, `TenantFormData`, `TransformedTenantData`, `AddTenant`, `BulkDeleteTenants`, `BulkUpdateTenants` | `TenantCreate`, `TenantUpdateInput`, `addTenantSchema`, `tenantEmergencyContactEditSchema` |
| `lib/validation/units.ts` | `UnitQuery`, `UnitFormData`, `TransformedUnitData` | `UnitInput`, `UnitUpdateInput`, `unitInputSchema`, `unitStatusSchema` |
| `lib/validation/dynamic-field.ts` | `dynamicFieldSchema` | (none — only used internally) |
| `lib/validation/maintenance.ts` | `maintenanceRequestSchema` (the one in this file, not the template-schemas copy) | (none — only used internally) |
| `lib/validation/tenants.ts` | `tenantCreateSchema` | (none — only used internally) |
| `lib/validation/lease-wizard.schemas.ts` | `CreateLeaseWizardRequest`, `WizardFormState` | `WizardStep`, `SelectionStepData`, `LeaseDetailsStepData`, `LeaseWizardData`, `TermsStepData` |

- Verify: `tsc --noEmit` passes, knip no longer reports these.

### SLICE 31: `src/hooks/api/query-keys/analytics-keys.ts` — 1 dead export
Remove: `fetchRevenueTrends`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 32: `src/hooks/api/query-keys/user-preferences-keys.ts` — 2 dead exports
Remove: `DEFAULT_USER_PREFERENCES`, `mapUserPreferencesRow`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 33: `src/hooks/api/use-blogs.ts` — 1 dead export
Remove: `useBlogCategories`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 34: `src/hooks/api/use-owner-dashboard-financial.ts` — 1 dead export
Remove: `dashboardFinancialQueries`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 35: `src/hooks/api/use-reports.ts` — 1 dead export
Remove: `reportsQueries` (re-export)
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 36: `src/hooks/api/use-tour-progress.ts` — 1 dead export
Remove: `resetTourProgress`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 37: `src/hooks/api/use-unit.ts` — 1 dead export
Remove: `useUnitsByProperty`
- Only used internally in the same file.
- Verify: `tsc --noEmit` passes.

### SLICE 38–45: Component type files — ~100 dead exported types
Remove unused interfaces/types from each file (keep only what's imported by consumers):

| File | Remove | Keep |
|---|---|---|
| `components/auth/password-strength.tsx` | `PasswordStrengthProps` | (none — only used internally) |
| `components/leases/table/lease-utils.ts` | `UserWithExtras` | (none — only used internally) |
| `components/properties/types.ts` | `FileUploadStatus`, `PropertyImage`, `UnitTenant`, `DesignUnit`, `DesignProperty`, `PropertiesListProps`, `PropertyDetailProps`, `AddPropertyModalProps`, `AddUnitPanelProps`, `PropertyFormData` (component version), `UnitFormData` (component version) | `DesignPropertyType` (imported by 5+ files) |
| `components/shared/multi-select-chips.tsx` | `MultiSelectOption` | (none — only used internally) |
| `components/ui/file-upload/types.ts` | `FileUploadItemContextValue`, `FileUploadListProps`, `FileUploadItemProps`, `FileUploadItemPreviewProps`, `FileUploadItemMetadataProps`, `FileUploadItemProgressProps`, `FileUploadItemDeleteProps`, `FileUploadClearProps` | (none — only used internally) |
| `components/ui/stepper-types.ts` | `ActivationMode`, `Direction`, `Orientation`, `GetDataStateFn`, `GetFocusIntentFn` | (none — only used internally by sibling stepper files) |
| `components/ui/tour.tsx` | `TourProps` | (none — only used internally) |
| `components/properties/use-property-image-dropzone.ts` | (interface is local, not exported — skip) | |

- Verify: `tsc --noEmit` passes.

### SLICE 46–50: Config/pricing types — 3 dead exported types
Remove from `src/config/pricing.ts`:
- `StripePriceId`, `TrialConfig`, `UsageMetrics`

Verify: `tsc --noEmit` passes.

### SLICE 51–60: Status-types types — ~20 dead exported types
Remove from `src/lib/constants/status-types.ts`:
- `UserRole`, `DocumentType`, `RequestStatus`, `LeaseType`, `LateFeeType`, `ReminderType`, `ReminderStatus`, `CustomerInvoiceStatus`, `PlanType`, `PermissionType`, `Status`, `UploadStatus`, `ProcessStatus`, `TimePeriod`, `SortDirection` (the one in this file — consumers define their own), `CacheInvalidationReason`, `CacheableEntityType`, `SecurityMonitoringEventType`, `Result`

Keep: `PROPERTY_TYPES` (the object), `SINGLE_UNIT_PROPERTY_TYPES`, and the type aliases that ARE imported (`PropertyType` via `#lib/constants/status-types`).

Verify: `tsc --noEmit` passes.

### SLICE 61–70: Other type files — ~50 dead exported types
Remove from each file:

| File | Remove |
|---|---|
| `lib/frontend-logger.ts` | `LogLevel` |
| `lib/reports/report-data.ts` | `ReportRow`, `ReportTable` |
| `lib/templates/lease-template.ts` | `LeaseTemplateClause`, `LeaseTemplateStateRule`, `LeaseTemplatePreviewRequest` |
| `lib/validation/documents.ts` | `DocumentCategorySlug` |
| `hooks/api/use-financials.ts` | `ExpenseSummaryData`, `FinancialOverviewData`, `MonthlyMetric` |
| `hooks/api/use-owner-dashboard.ts` | `DashboardActivityData` |
| `hooks/api/use-tour-progress.ts` | `TourStatus` |
| `hooks/use-maintenance-form.ts` | `MaintenanceFormData` |
| `hooks/use-supabase-upload.ts` | (type is imported from elsewhere, not exported — skip) |
| `lib/constants/lease-signature-errors.ts` | `LeaseSignatureErrorCode`, `LeaseSignatureErrorCategory` |
| `data/faqs.ts` | `FAQQuestion` |

Verify: `tsc --noEmit` passes.

## Verification per slice
1. `git diff` — review changes are surgical (only remove dead exports)
2. `bun run typecheck` — `tsc --noEmit && tsc --noEmit -p tests/integration/tsconfig.json && tsc --noEmit -p tests/e2e/tsconfig.json`
3. `bun run lint:fix` — biome auto-fix any formatting
4. `npx knip` — verify the specific file no longer reports unused exports

## Risk assessment
- **Low risk**: All changes are removals of dead code. No behavior change.
- **No consumers to update**: Every removed export was confirmed unused by tracing imports with `rg`.
- **Tests won't break**: Test files import from the same paths as production code. If a test imported a dead export, it would already be failing at import time (TypeScript would catch it).

## Branch name
`cleanup/dead-exports`
