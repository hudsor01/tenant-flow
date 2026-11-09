/**
 * Every export has a reader of the kind it needs (66.2-39 fix round 4, class
 * B): a production module's export a production file, a test helper's any
 * file. A production export read only by tests is dead code its tests keep
 * alive; a type needs no reader of its own while a live export's signature in
 * its module names it. The scan is `scanExportReaders`
 * (`src/test/utils/export-readers.ts`), which reads imports, not words: a
 * comment or a local of the same name in another file is no reader.
 *
 * Cycles 2 and 3 found exports the PR orphaned or added unread by a word
 * search (safeDom, the `_shared` report values, AnimatedTrendIndicator, …);
 * this holds the class shut:
 *   - `TEST_SEAMS`: production exports a test reads on purpose (a header row
 *     a CSV test pins, a selector a shell test resolves), each with the test
 *     file that reads it, which the guard checks. An entry whose export gains
 *     a production reader, or whose test stops reading it, fails.
 *   - `RATCHET`: the older exports, unread at d9c7329f0 too, file by file, as
 *     they stood when the guard landed; the list can only shrink.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type ExportReaders,
	scanExportReaders,
	unreadExports,
} from "#test/utils/export-readers";

interface Seam {
	file: string;
	name: string;
	/** A test file (or a tracked tool) that reads the export. */
	reader: string;
	why: string;
}

const CSV_HEADER = "the CSV's header row, which the test pins";
const REPLAY = "the replay check's expected figures, which the test derives";
const BANLIST =
	"the blog gate's banlist, which the parity test compares with the trigger's and the generator's";
const TAX_EXPORT =
	"the tax-year export's header or formats, pinned by the test";

const TEST_SEAMS: readonly Seam[] = [
	{
		file: "scripts/migration-replay-assertions.ts",
		name: "EXPECTED_BILLING_INSIGHTS",
		reader: "scripts/migration-replay-assertions.test.ts",
		why: REPLAY,
	},
	{
		file: "scripts/migration-replay-assertions.ts",
		name: "expectedPropertyPerformance",
		reader: "scripts/migration-replay-assertions.test.ts",
		why: REPLAY,
	},
	{
		file: "scripts/migration-replay-assertions.ts",
		name: "occupancySeriesMonth",
		reader: "scripts/migration-replay-assertions.test.ts",
		why: REPLAY,
	},
	{
		file: "scripts/migration-replay-assertions.ts",
		name: "expectedOwnerFigures",
		reader: "scripts/migration-replay-assertions.test.ts",
		why: REPLAY,
	},
	{
		file: "scripts/migration-replay-assertions.ts",
		name: "EXPECTED_BLOG_BANLIST",
		reader: "scripts/migration-replay-assertions.test.ts",
		why: REPLAY,
	},
	{
		file: "src/app/(owner)/reports/balance-sheet/balance-sheet-csv.ts",
		name: "BALANCE_SHEET_CSV_HEADER",
		reader: "src/app/(owner)/reports/__tests__/balance-sheet-csv.test.ts",
		why: CSV_HEADER,
	},
	{
		file: "src/app/(owner)/reports/cash-flow/cash-flow-csv.ts",
		name: "CASH_FLOW_CSV_HEADER",
		reader: "src/app/(owner)/reports/__tests__/cash-flow-csv.test.ts",
		why: CSV_HEADER,
	},
	{
		file: "src/app/(owner)/reports/income-statement/income-statement-csv.ts",
		name: "INCOME_STATEMENT_CSV_HEADER",
		reader: "src/app/(owner)/reports/__tests__/income-statement-csv.test.ts",
		why: CSV_HEADER,
	},
	{
		file: "src/app/(owner)/reports/year-end/year-end-csv.ts",
		name: "YEAR_END_CSV_HEADER",
		reader: "src/app/(owner)/reports/year-end/__tests__/year-end-csv.test.ts",
		why: CSV_HEADER,
	},
	{
		file: "src/components/leases/table/leases-csv.ts",
		name: "LEASES_CSV_HEADER",
		reader: "src/components/leases/table/__tests__/leases-export.test.tsx",
		why: CSV_HEADER,
	},
	{
		file: "src/components/tenants/tenants-csv.ts",
		name: "TENANTS_CSV_HEADER",
		reader: "src/components/tenants/__tests__/tenant-exports.test.tsx",
		why: CSV_HEADER,
	},
	{
		file: "src/components/analytics/maintenance-insights-section.tsx",
		name: "costSummaryLine",
		reader:
			"src/components/analytics/__tests__/maintenance-insights-costs.test.tsx",
		why: "the section's cost sentence, which the test checks for each cost shape",
	},
	{
		file: "src/components/bulk-import/bulk-import-result-error-list.tsx",
		name: "buildFailedRowsCsv",
		reader:
			"src/components/bulk-import/__tests__/bulk-import-result-error-list.test.ts",
		why: "the failed-rows CSV the error list downloads",
	},
	{
		file: "src/components/dashboard/components/kpi-bento-row.tsx",
		name: "buildKpiTileConfigs",
		reader:
			"src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx",
		why: "the KPI tiles' configs, checked without a render",
	},
	{
		file: "src/components/dashboard/components/kpi-helpers.ts",
		name: "formatTrendPercent",
		reader: "src/components/dashboard/components/__tests__/kpi-helpers.test.ts",
		why: "the trend chip's percent text (its minus sign, its rounding, a non-finite input)",
	},
	{
		file: "src/components/settings/download-account-data.ts",
		name: "accountDataExportFilename",
		reader:
			"src/components/settings/__tests__/account-data-export-download.test.tsx",
		why: "the account data export's file name",
	},
	{
		file: "src/components/tours/sidebar-tour-target.ts",
		name: "SIDEBAR_TOUR_RAIL_SELECTOR",
		reader: "src/components/tours/__tests__/sidebar-tour-target.test.ts",
		why: "the element the tour points at, which the shell tests resolve",
	},
	{
		file: "src/components/tours/sidebar-tour-target.ts",
		name: "SIDEBAR_TOUR_TRIGGER_SELECTOR",
		reader: "src/components/tours/__tests__/sidebar-tour-target.test.ts",
		why: "the element the tour points at, which the shell tests resolve",
	},
	{
		file: "src/components/ui/blur-fade.tsx",
		name: "BLUR_FADE_PRESET_CLASSES",
		reader: "src/components/ui/__tests__/blur-fade-classes.test.ts",
		why: "the class strings the test compiles with Tailwind",
	},
	{
		file: "src/components/ui/blur-fade.tsx",
		name: "BLUR_FADE_DURATION_CLASSES",
		reader: "src/components/ui/__tests__/blur-fade-classes.test.ts",
		why: "the class strings the test compiles with Tailwind",
	},
	{
		file: "src/components/ui/blur-fade.tsx",
		name: "BLUR_FADE_MAX_DELAY_MS",
		reader: "src/components/ui/__tests__/blur-fade.test.tsx",
		why: "the delay cap the test checks",
	},
	{
		file: "src/components/ui/sheet.tsx",
		name: "SheetTrigger",
		reader: "src/components/ui/__tests__/sheet.test.tsx",
		why: "shadcn's Sheet API, kept whole in the vendored file: the app opens its sheets from state since mobile-nav.tsx, its one caller, went (66.2-26)",
	},
	{
		file: "src/hooks/api/query-keys/expense-keys.ts",
		name: "expenseKeys",
		reader: "src/hooks/api/__tests__/use-expenses.test.ts",
		why: "the expense query keys the tests assert",
	},
	{
		file: "src/hooks/use-mobile.ts",
		name: "MOBILE_MEDIA_QUERY",
		reader: "src/components/shell/__tests__/app-shell-sections.test.tsx",
		why: "the media query the shell tests answer",
	},
	{
		file: "src/hooks/use-nav-section-state.ts",
		name: "resolveSectionOpen",
		reader: "src/hooks/__tests__/use-nav-section-state.test.ts",
		why: "the nav's section rules, checked without a render",
	},
	{
		file: "src/hooks/use-nav-section-state.ts",
		name: "clearEnteredSectionOverrides",
		reader: "src/hooks/__tests__/use-nav-section-state.test.ts",
		why: "the nav's section rules, checked without a render",
	},
	{
		file: "src/lib/constants/status-types.ts",
		name: "PROPERTY_TYPE_LABELS",
		reader: "src/lib/constants/__tests__/property-type-labels.test.ts",
		why: "the one property-type label map, which the label guards read",
	},
	{
		file: "src/lib/reports/csv.ts",
		name: "neutralizeCsvFormula",
		reader: "src/lib/reports/__tests__/csv.test.ts",
		why: "the CSV formula-injection guard, tested on its own",
	},
	{
		file: "src/lib/reports/generate-excel.ts",
		name: "buildSectionSheetData",
		reader: "src/lib/reports/__tests__/generate-excel.test.ts",
		why: "the rows the Excel export writes",
	},
	{
		file: "src/lib/reports/generate-pdf.ts",
		name: "renderWrappedText",
		reader: "src/lib/reports/__tests__/report-basis-note.test.ts",
		why: "the PDF's wrapped text, which the basis-note test measures",
	},
	{
		file: "src/lib/sidebar-state.ts",
		name: "SIDEBAR_COOKIE_MAX_AGE",
		reader: "src/lib/__tests__/sidebar-state.test.ts",
		why: "the cookie's max age the test pins",
	},
	{
		file: "src/lib/utils.ts",
		name: "TAILWIND_MERGE_EXTENSION",
		reader: "src/app/__tests__/tailwind-theme-integrity.test.ts",
		why: "the tailwind-merge extension the theme guard derives its keys from",
	},
	{
		file: "src/test/utils/tailwind-engine.ts",
		name: "loadTailwindEngine",
		reader: ".planning/tailwind-shadcn/audit/guard-redproof.ts",
		why: "the git-baseline red-proof runner compiles a baseline stylesheet with it (a dynamic import of the file URL)",
	},
	{
		file: "supabase/functions/_shared/blog-banlist.ts",
		name: "BLOG_BANLIST",
		reader: "src/lib/seo/__tests__/banlist-parity.test.ts",
		why: BANLIST,
	},
	{
		file: "supabase/functions/_shared/blog-banlist.ts",
		name: "BLOG_PERSONA_BANLIST",
		reader: "src/lib/seo/__tests__/banlist-parity.test.ts",
		why: BANLIST,
	},
	{
		file: "supabase/functions/_shared/blog-banlist.ts",
		name: "BLOG_BANLIST_FIELDS",
		reader: "src/lib/seo/__tests__/banlist-parity.test.ts",
		why: BANLIST,
	},
	{
		file: "supabase/functions/_shared/blog-banlist.ts",
		name: "personaWordPattern",
		reader: "src/lib/seo/__tests__/banlist-parity.test.ts",
		why: BANLIST,
	},
	{
		file: "supabase/functions/_shared/financial-analytics-report.ts",
		name: "FINANCIAL_ANALYTICS_HEADER",
		reader: "supabase/functions/__tests__/financial-analytics-report.test.ts",
		why: "the financial analytics export's header row, pinned by the test",
	},
	{
		file: "supabase/functions/_shared/report-csv.ts",
		name: "neutralizeCsvFormula",
		reader: "supabase/functions/__tests__/report-csv.test.ts",
		why: "the Edge exports' CSV cell guard, tested on its own",
	},
	{
		file: "supabase/functions/_shared/report-csv.ts",
		name: "csvCell",
		reader: "supabase/functions/__tests__/report-csv.test.ts",
		why: "the Edge exports' CSV cell writer, tested on its own",
	},
	{
		file: "supabase/functions/_shared/tax-year-reports.ts",
		name: "NO_VENDOR_LABEL",
		reader: "src/lib/__tests__/one-label-per-value.test.ts",
		why: "the no-vendor label the one-label guard reads",
	},
	{
		file: "supabase/functions/_shared/tax-year-reports.ts",
		name: "YEAR_END_HEADER",
		reader: "supabase/functions/__tests__/tax-year-reports.test.ts",
		why: TAX_EXPORT,
	},
	{
		file: "supabase/functions/_shared/tax-year-reports.ts",
		name: "TAX_DOCUMENTS_HEADER",
		reader: "supabase/functions/__tests__/tax-year-reports.test.ts",
		why: TAX_EXPORT,
	},
	{
		file: "supabase/functions/_shared/tax-year-reports.ts",
		name: "YEAR_END_FORMATS",
		reader: "supabase/functions/__tests__/tax-year-reports.test.ts",
		why: TAX_EXPORT,
	},
	{
		file: "supabase/functions/_shared/tax-year-reports.ts",
		name: "TAX_DOCUMENTS_FORMATS",
		reader: "supabase/functions/__tests__/tax-year-reports.test.ts",
		why: TAX_EXPORT,
	},
	{
		file: "supabase/functions/_shared/tax-year-reports.ts",
		name: "taxYearReportCalls",
		reader: "supabase/functions/__tests__/tax-year-reports.test.ts",
		why: "the RPC calls each tax-year report makes, which the Vitest and Deno export tests answer (built from the module-private call table)",
	},
];

/**
 * The older unread exports: `path name name …`, one line per file. Remove a
 * name when its export gains a reader, goes private or goes.
 */
const RATCHET = `
scripts/fb-append-post.ts CalendarEntry DAILY_SLOTS dayAfter lintFbCopy mapCalendarEntry nextFreeSlot renderCalendarDoc slotSortKey
scripts/fb-fetch-blog.ts FbBlogFacts mapFbBlogRow
scripts/generate-blog-draft.ts ADVISORY_GATES Critique Draft GateContext applySlugOverride blogSlugExists capDocusealMentions capH2Count clampToLength critique deriveTags ensureInternalLinks extractComparisonBrands extractExternalUrls findDuplicateComparison gateOnCritique headCheckCitations isAllowlistedCitation isCritiquePass normalizeComparisonPair parseCritique parsePositionals parseSlugOverride pickLoadedModel runGates sanitizeBanlist stripNonAllowlistedExternalLinks validateInternalLinks
scripts/migration-replay-assertions.ts EXPECTED_SEEDED_CAST
scripts/platform-config-assertions.ts DOCUMENTED_ADMIN_ENFORCEMENT REQUIRED_CHECK_CONTEXTS SUPABASE_AUTHORITY_REVOKED_AT
scripts/reclaim-finalize.ts FinalizeInput FinalizeResult REDIRECTS_PATH REDIRECTS_TEST_PATH addLivePublishedSlug finalizeReclaim hasRedirectSource isLivePublishedSlug removeRedirectEntry
scripts/run-continuous-blog.ts main nextUnwrittenTopic
scripts/run-scheduled-blog.ts buildFbTriggerArgv mapTopicEntry triggerFbPostSession
scripts/workflow-contract.ts TriggerPaths WorkflowSummary assertDocOnlyCompanionMirrors assertNoPathFilterOnPullRequest assertRequiredCheckIsAlwaysReported collectWorkflows
src/app/apply/[token]/apply-context.ts FORWARD_SECRET_HEADER TRUSTED_CLIENT_IP_HEADER trustedClientIpHeaders
src/app/sign/[token]/sign-context.ts REASON_MESSAGE
src/components/bulk-import/parse-csv-with-schema.ts CSV_MAX_ROWS
src/components/dashboard/dashboard-data.ts DashboardViewModel transformDashboardData
src/components/layout/navbar.tsx default
src/components/layout/page-layout.tsx default
src/components/leases/lease-form-options.ts validationSchema
src/components/notifications/notification-item.tsx resolveHref
src/components/pricing/owner-subscribe-dialog.tsx default
src/components/properties/property-card-skeleton.tsx PropertyCardSkeleton PropertyGridSkeleton
src/components/properties/types.ts AddUnitPanelProps UnitFormData
src/components/sections/comparison-table.tsx default
src/components/sections/home-faq.tsx default homeFaqs
src/components/sections/how-it-works.tsx default
src/components/sections/logo-cloud.tsx default
src/components/shared/blog-loading-skeleton.tsx default
src/components/shared/chart-loading-skeleton.tsx default
src/components/shared/loading-timeout-wrapper.tsx LoadingTimeoutWrapper
src/components/shell/main-nav.tsx NavigationItem
src/components/ui/blur-fade.tsx default
src/components/ui/card.tsx CardAction
src/components/ui/file-upload/types.ts FileUploadClearProps FileUploadItemContextValue FileUploadItemDeleteProps FileUploadItemMetadataProps FileUploadItemPreviewProps FileUploadItemProgressProps FileUploadItemProps FileUploadListProps
src/components/ui/loading-spinner.tsx LoadingDots PageLoader
src/components/ui/number-ticker.tsx default
src/components/ui/stepper-types.ts GetDataStateFn GetFocusIntentFn
src/components/ui/stepper.tsx StepperProps
src/components/ui/table.tsx TableCaption TableFooter
src/config/pricing.ts PRICING_PLANS UsageMetrics checkPlanLimits getPricingPlan getRecommendedUpgrade getStripePriceId getTrialConfig hasTrial
src/env.ts Env
src/hooks/api/query-keys/application-keys.ts ApplicationConversionResult RecordApplicationConversionInput SetApplicationStatusInput applicationKeys mapRentalApplicationRow mapRentalApplicationSummaryRow
src/hooks/api/query-keys/application-link-keys.ts CreatedApplicationLink DEFAULT_LINK_EXPIRY_DAYS applicationLinkKeys mapApplicationLinkRow
src/hooks/api/query-keys/billing-keys.ts mapInvoiceStatus
src/hooks/api/query-keys/document-category-keys.ts mapDocumentCategoryRow
src/hooks/api/query-keys/document-search-keys.ts DocumentSearchResult
src/hooks/api/query-keys/notification-keys.ts mapNotificationRow
src/hooks/api/query-keys/rent-ledger-keys.ts mapLedgerEntryRow mapLedgerSummaryRow
src/hooks/api/query-keys/rent-ledger-mutation-options.ts toSignedLineAmount
src/hooks/api/query-keys/session-keys.ts parseUserAgent
src/hooks/api/query-keys/subscription-keys.ts mapSubscriptionStatus
src/hooks/api/query-keys/usage-keys.ts usageKeys
src/hooks/api/use-auth.ts UserWithStripe
src/hooks/api/use-billing-mutations.ts CancelSubscriptionResponse
src/hooks/api/use-mfa.ts EnrollmentResult
src/hooks/api/use-owner-dashboard-financial.ts CollectionRateSummary FinancialChartDatum mapCollectionRateRow
src/hooks/api/use-owner-dashboard.ts DashboardActivityData mapDashboardActivityRow
src/hooks/api/use-owner-emergency-contact.ts OwnerEmergencyContact OwnerEmergencyContactInput
src/hooks/api/use-owner-notification-settings.ts OwnerNotificationSettingsUpdate
src/hooks/api/use-sessions.ts RevokeSessionInput
src/lib/constants/lease-signature-errors.ts LeaseSignatureErrorCategory LeaseSignatureErrorCode
src/lib/constants/status-types.ts CacheInvalidationReason CacheableEntityType CustomerInvoiceStatus DocumentType ErrorSeverity LateFeeType LeaseType PermissionType ProcessStatus ReminderStatus ReminderType RequestStatus Result SecurityMonitoringEventType SortDirection Status TimePeriod UploadStatus UserRole
src/lib/forms/form-hook.tsx withFieldGroup
src/lib/frontend-logger.ts LogEntry LogLevel
src/lib/generate-metadata.ts getJsonLd
src/lib/ledger/ledger-math.ts GRACE_PERIOD_DAYS isLate
src/lib/reports/generate-excel.ts computeColumnWidths sanitizeSheetName
src/lib/reports/report-data.ts isMissingRelationError safeFetch
src/lib/seo/blog-categories.ts CATEGORY_LABELS
src/lib/seo/evergreen-topics.ts EVERGREEN_TOPICS EvergreenTopic
src/lib/seo/reclaim-queue.ts RECLAIM_QUEUE ReclaimQueueItem
src/lib/storage-plan-limit.ts STORAGE_PLAN_LIMIT_PREFIX
src/lib/templates/lease-template.ts LeaseTemplatePreviewRequest
src/lib/utils/api-error.ts logErrorInDev
src/lib/utils/currency.ts PriceFormatOptions PriceInterval formatCurrencyChange formatPercentageChange formatPrice getDashboardCurrency getDashboardPercentage getIntervalSuffix
src/lib/utils/optimistic-locking.ts withVersion
src/lib/validation/auth.ts registerZodSchema
src/lib/validation/common.ts isValidEmail isValidUUID isValidUrl requiredDescription requiredTitle safeIntegerSchema stringBoolSchema urlSchema
src/lib/validation/documents.ts makeCategorySchema
src/lib/validation/inspections.ts CreateInspectionPhotoInput
src/lib/validation/lease-wizard.schemas.ts CreateLeaseWizardRequest WizardFormState
src/lib/validation/leases.ts LeaseCreateFormData LeaseFormValues LeasePaymentSchedule LeaseQuery LeaseRenewal LeaseTermination LeaseWithSignature RejectLease SendForSignature SignLease TransformedLeaseData
src/lib/validation/maintenance.ts MaintenanceAssignment MaintenanceAssignmentFormData MaintenanceCompletion MaintenanceCostUpdate MaintenanceInspection MaintenanceRequestFormData MaintenanceRequestInput MaintenanceRequestQuery TransformedMaintenanceRequestData maintenanceAssignmentSchema maintenanceCompletionSchema maintenanceCostUpdateSchema maintenanceInspectionSchema maintenanceRequestFormSchema maintenanceRequestInputSchema maintenanceRequestQuerySchema maintenanceRequestSchema maintenanceRequestUpdateSchema transformMaintenanceRequestFormData
src/lib/validation/properties.ts PropertyAddress PropertyFormData PropertyInput PropertyQuery PropertySold PropertyUpdateFormData TransformedPropertyData propertyAddressSchema propertyInputSchema propertyQuerySchema propertySoldSchema propertyStatsSchema propertyStatusSchema propertyTypeSchema
src/lib/validation/rental-applications.ts RENTAL_APPLICATION_OPTIONAL_KEYS RENTAL_APPLICATION_REQUIRED_KEYS RentalApplicationInput
src/lib/validation/tenants.ts AddTenant AddTenantRequest BulkDeleteTenants BulkUpdateTenants TenantActiveStatus TenantFormData TenantQuery TenantVerification TransformedTenantData addTenantRequestSchema bulkDeleteTenantsSchema emergencyContactSchema tenantFormSchema tenantInputSchema tenantQuerySchema tenantUpdateSchema tenantVerificationSchema
src/lib/validation/units.ts TransformedUnitData UnitFormData UnitQuery
src/stores/dashboard-presets-store.ts DASHBOARD_PRESETS_STORAGE_KEY DashboardPreset
src/stores/dashboard-store.ts DashboardViewMode
src/stores/preferences-store.ts DATA_DENSITY_STORAGE_KEY DEFAULT_DATA_DENSITY VIEW_PREFERENCES_STORAGE_KEY persistDataDensity persistViewPreferences
src/test/mocks/msw/handlers/supabase-auth.ts DEFAULT_USER_EMAIL DEFAULT_USER_ID
src/test/mocks/msw/utils.ts postgrestEmpty postgrestError
src/test/mocks/supabase-query-mock.ts createSupabaseClientMock
src/test/unit-setup.ts createMockResponse
src/test/utils/test-data.ts DEFAULT_USER
src/test/utils/test-render.tsx createTestQueryClient createTestWrapper
src/types/activity.ts Activity ActivityMetadata ActivityStatus
src/types/analytics.ts AggregationOptions AnalyticsBreakdown AnalyticsBreakdownRow AnalyticsDataPoint AnalyticsEvent AnalyticsFilterOptions AnalyticsPageResponse AnalyticsPaginatedResponse AnalyticsSummary ChartDataPoint ComparisonMetric MetricSummary TimeSeriesResponse
src/types/auth.ts AuthUser LoginCredentials SignupFormData SupabaseAuthUser
src/types/core.ts ActionType ActivityEntityType DashboardMetricsResponse DashboardSummary EntityType FinancialMetrics FinancialOverviewResponse HttpMethod LeaseWithVersion MaintenanceCategory MaintenanceMetrics MaintenancePerformance MaintenanceRequestWithVersion NotificationType Pagination PaymentMethodResponse PaymentMethodResponseWithVersion PaymentMethodType PaymentStatus Permission PropertyFinancialMetrics PropertyPerformanceResponse PropertyWithVersion SearchResult SearchResultType SecurityEventSeverity SecurityEventType SignatureMethod StripeSubscriptionStatus SubscriptionStatus SystemUptime TenantInput TenantUpdate TenantWithExtras UnitWithVersion UserInsert UserUpdate
src/types/data-table.ts DataTableRowAction ExtendedColumnFilter FilterItemSchema FilterOperator FilterVariant JoinOperator
src/types/database-rpc.ts OccupancyTrendResponse
src/types/domain.ts CSPReportBody CSPViolationReport ColorRationale ContactFormResponse SemanticColorToken StorageEntityType StorageFileType StorageUploadResult StripeWebhookEventTypeValue StripeWebhookEventTypes WebVitalLabelValue WebVitalMetricNameValue WebVitalNavigationTypeValue WebVitalRatingValue
src/types/file-upload.ts FileUploadContext FileUploadOptions FileUploadResult FileValidationConfig FileValidationResult
src/types/financial-statements.ts AnalyticsLease AnalyticsMaintenanceRequest AnalyticsProperty AnalyticsUnit FinancialPropertyPerformance IncomeStatementExpenseBreakdown IncomeStatementRevenueBreakdown MonthlyCashFlow MonthlyData PropertyFinancialData PropertyMaintenanceData PropertyOccupancyData PropertyPL QueryLease QueryProperty QueryUnit TaxDocumentsMutation TaxDocumentsQuery TaxReportGenerationRequest TaxReportGenerationResponse
src/types/frontend.ts MetricsCardProps ModernExplodedPieChartProps PaginationLinkProps TailwindColorName TailwindRadiusValue
src/types/lease-generator.types.ts LeaseFormData LeaseTermType
src/types/notifications.ts CreateNotificationDto CreateNotificationRequest DatabaseNotificationEventType GetNotificationOptions MaintenanceNotificationData MaintenanceNotificationRequest Message NotificationChannelPreferencesWithVersion NotificationMessage NotificationPriorityValue NotificationRequest NotificationResponse NotificationTypeValue PushNotification UpdateNotificationDto UseOptions
src/types/relations.ts LeaseWithDetails MaintenanceRequestWithDetails MaintenanceRequestWithRelations MaintenanceWithDetails NotificationWithDetails NotificationWithRelations PropertySearchResult PropertyStatsExtended PropertySummary PropertyWithDetails PropertyWithUnits PropertyWithUnitsAndLeases TenantWithLeases UnitWithDetails UnitWithProperty UserWithProperties
src/types/sections/inspections.ts isInspectionStatus isInspectionType
src/types/stats.ts CacheEntry CacheStats DashboardFinancialStats DashboardTimeSeriesOptions DashboardTrendData LeaseStatistics MaintenanceAnalyticsData UnitStatistics UserStats
src/types/stripe.ts AttachPaymentMethodParams BillingInterval BillingPeriod CreateTenantCustomerParams PlanType StripePrice StripeProductWithPricing StripeWebhookEvent StripeWebhookEventType StripeWebhookProcessor WebhookNotification WebhookProcessorFunction
supabase/functions/_shared/application-guards.ts FORBIDDEN_SUBMISSION_KEYS MAX_FIELD_LENGTHS MIN_ELAPSED_MS SUBMISSION_OPTIONAL_KEYS SUBMISSION_REQUIRED_KEYS
supabase/functions/_shared/email-layout.ts TAGLINE
supabase/functions/_shared/lease-signing.ts SIGNED_LEASE_BUCKET formatMoney signedLeasePath
supabase/functions/_shared/rate-limit-decision.ts ERROR_RETRY_AFTER_CAP_SEC FORWARD_REJECT_REASONS MAX_FORWARDED_IP_LENGTH RATE_LIMIT_ERROR_CLASSES RateLimitVerdictRow normalizeForwardedIp readVerdictRow
supabase/functions/_shared/rate-limit.ts getClientIp
`;

/** `vitest.config.ts` aliases `recharts` to this mock, so every test reads it whole. */
const RECHARTS_MOCK = "src/test/mocks/recharts.tsx";

function pairs(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.flatMap((line) => {
			const [path, ...names] = line.split(/\s+/);
			return names.map((name) => `${path}\t${name}`);
		});
}

function key(r: { file: string; name: string }): string {
	return `${r.file}\t${r.name}`;
}

function scanRepo(): ExportReaders[] {
	const paths = execFileSync("git", ["ls-files", "-z"], {
		cwd: process.cwd(),
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter(Boolean);
	const pkg: unknown = JSON.parse(readFileSync("package.json", "utf8"));
	const imports =
		typeof pkg === "object" && pkg !== null && "imports" in pkg
			? (pkg.imports as Record<string, string>)
			: {};
	return scanExportReaders({
		paths,
		read: (path) => {
			// Never an env file (they are not code, and hold credentials).
			if (/(^|\/)\.env/.test(path)) return null;
			try {
				return readFileSync(path, "utf8");
			} catch {
				// Tracked but deleted in the working tree: nothing to read.
				return null;
			}
		},
		aliases: imports,
		wholeModuleReaders: { [RECHARTS_MOCK]: "vitest.config.ts" },
	});
}

/** A small repository: path to source. */
function scanFixture(files: Record<string, string>): string[] {
	const records = scanExportReaders({
		paths: Object.keys(files),
		read: (path) => files[path] ?? null,
		aliases: { "#lib/*": "./src/lib/*", "#test/*": "./src/test/*" },
	});
	return unreadExports(records).map(key).sort();
}

describe("exports have readers", () => {
	it("reads imports, not words, and holds each kind of module to its reader", () => {
		const unread = scanFixture({
			"src/lib/a.ts": [
				"export const named = 1;",
				"export const viaNamespace = 2;",
				"export const viaDynamic = 3;",
				"export const viaThen = 4;",
				"export const testOnly = 5;",
				"export const mentionedOnly = 6;",
				"export interface Row { id: string }",
				"export function rows(): Row[] { return []; }",
				"export interface Orphan { id: string }",
				"export function deadFn(): Orphan { return { id: '' }; }",
			].join("\n"),
			"src/lib/b.ts": [
				'import { named, rows } from "#lib/a";',
				'import * as ns from "./a.ts";',
				"// testOnly and mentionedOnly are named here only in a comment",
				"export async function use() {",
				'\tconst { viaDynamic } = await import("#lib/a");',
				'\tconst t = await import("./a").then((m) => m.viaThen);',
				"\treturn [named, ns.viaNamespace, viaDynamic, t, rows()];",
				"}",
			].join("\n"),
			"src/lib/__tests__/a.test.ts":
				'import { testOnly, deadFn } from "../a";\nimport { helper } from "#test/h";',
			"src/test/h.ts":
				"export const helper = 1;\nexport const unusedHelper = 2;",
			"src/app/x/page.tsx":
				"export default function Page() { return null; }\nexport const dynamic = 'force-dynamic';",
		});
		expect(unread).toEqual([
			"src/lib/a.ts\tOrphan",
			"src/lib/a.ts\tdeadFn",
			"src/lib/a.ts\tmentionedOnly",
			"src/lib/a.ts\ttestOnly",
			"src/lib/b.ts\tuse",
			"src/test/h.ts\tunusedHelper",
		]);
	});

	it("finds no unread export outside the seams and the ratchet", () => {
		const records = scanRepo();
		expect(records.length).toBeGreaterThan(2000);
		const byKey = new Map(records.map((r) => [key(r), r]));
		const seams = new Set(TEST_SEAMS.map(key));
		const ratchet = new Set(pairs(RATCHET));
		const unread = unreadExports(records, seams);
		const unexpected = unread
			.filter((r) => !ratchet.has(key(r)))
			.map(
				(r) =>
					`${r.file}:${r.line} ${r.name} (${r.testReaders.length > 0 ? `read only by tests: ${r.testReaders.join(", ")}` : r.usedInOwnModule ? "used only in its module: make it private" : "read by nothing: delete it"})`,
			);
		expect(
			unexpected,
			`exports with no reader of the kind they need:\n${unexpected.join("\n")}`,
		).toEqual([]);
		const found = new Set(unread.map(key));
		const stale = [...ratchet].filter((k) => !found.has(k));
		expect(
			stale,
			`read, private or gone since the list was written; remove from RATCHET:\n${stale.join("\n")}`,
		).toEqual([]);
		const staleSeams = TEST_SEAMS.filter((seam) => {
			const record = byKey.get(key(seam));
			return !record || record.productionReaders.length > 0;
		}).map(key);
		expect(
			staleSeams,
			`seams gone or now read in production; remove them from TEST_SEAMS:\n${staleSeams.join("\n")}`,
		).toEqual([]);
	});

	it("names, for each seam, a test that reads it", () => {
		const records = new Map(scanRepo().map((r) => [key(r), r]));
		const unread = TEST_SEAMS.filter((seam) => {
			if (seam.reader.startsWith(".planning/")) {
				// A tracked audit tool outside the scan: its text names the export.
				return !new RegExp(`\\b${seam.name}\\b`).test(
					readFileSync(seam.reader, "utf8"),
				);
			}
			return !records.get(key(seam))?.testReaders.includes(seam.reader);
		}).map((seam) => `${key(seam)} <- ${seam.reader}`);
		expect(
			unread,
			`seams whose named reader does not read them:\n${unread.join("\n")}`,
		).toEqual([]);
		expect(readFileSync("vitest.config.ts", "utf8")).toContain(RECHARTS_MOCK);
	});
});
