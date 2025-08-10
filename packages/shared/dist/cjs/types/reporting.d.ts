/**
 * Reporting and Business Intelligence Domain Types
 *
 * Comprehensive type definitions for the advanced reporting system
 * implementing Domain-Driven Design patterns for business intelligence.
 */
import { BaseValueObject, Money } from './domain';
export type ReportId = Brand<string, 'ReportId'>;
export type ReportTemplateId = Brand<string, 'ReportTemplateId'>;
export type DashboardId = Brand<string, 'DashboardId'>;
export type WidgetId = Brand<string, 'WidgetId'>;
export type ChartConfigId = Brand<string, 'ChartConfigId'>;
export type ScheduledReportId = Brand<string, 'ScheduledReportId'>;
export type ReportExecutionId = Brand<string, 'ReportExecutionId'>;
export declare const reportingIds: {
    report: (id: string) => ReportId;
    template: (id: string) => ReportTemplateId;
    dashboard: (id: string) => DashboardId;
    widget: (id: string) => WidgetId;
    chartConfig: (id: string) => ChartConfigId;
    scheduledReport: (id: string) => ScheduledReportId;
    execution: (id: string) => ReportExecutionId;
};
export declare enum ReportType {
    PROPERTY_PERFORMANCE = "PROPERTY_PERFORMANCE",
    FINANCIAL_ANALYTICS = "FINANCIAL_ANALYTICS",
    TENANT_ANALYTICS = "TENANT_ANALYTICS",
    MAINTENANCE_REPORTS = "MAINTENANCE_REPORTS",
    PORTFOLIO_OVERVIEW = "PORTFOLIO_OVERVIEW",
    CUSTOM = "CUSTOM"
}
export declare enum ChartType {
    LINE = "LINE",
    BAR = "BAR",
    PIE = "PIE",
    DONUT = "DONUT",
    AREA = "AREA",
    SCATTER = "SCATTER",
    HEATMAP = "HEATMAP",
    TABLE = "TABLE",
    METRIC_CARD = "METRIC_CARD",
    GAUGE = "GAUGE"
}
export declare enum AggregationType {
    SUM = "SUM",
    COUNT = "COUNT",
    AVG = "AVG",
    MIN = "MIN",
    MAX = "MAX",
    MEDIAN = "MEDIAN",
    PERCENTILE = "PERCENTILE",
    DISTINCT_COUNT = "DISTINCT_COUNT"
}
export declare enum TimeGranularity {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    YEARLY = "YEARLY"
}
export declare enum ReportStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    ARCHIVED = "ARCHIVED",
    GENERATING = "GENERATING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export declare enum ScheduleFrequency {
    ONCE = "ONCE",
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY"
}
export declare enum ExportFormat {
    PDF = "PDF",
    EXCEL = "EXCEL",
    CSV = "CSV",
    JSON = "JSON"
}
export declare enum FilterOperator {
    EQUALS = "EQUALS",
    NOT_EQUALS = "NOT_EQUALS",
    GREATER_THAN = "GREATER_THAN",
    LESS_THAN = "LESS_THAN",
    GREATER_EQUAL = "GREATER_EQUAL",
    LESS_EQUAL = "LESS_EQUAL",
    CONTAINS = "CONTAINS",
    NOT_CONTAINS = "NOT_CONTAINS",
    IN = "IN",
    NOT_IN = "NOT_IN",
    BETWEEN = "BETWEEN",
    IS_NULL = "IS_NULL",
    IS_NOT_NULL = "IS_NOT_NULL"
}
/**
 * Date Range value object for report filtering
 */
export declare class DateRange extends BaseValueObject<DateRange> {
    readonly startDate: Date;
    readonly endDate: Date;
    constructor(startDate: Date, endDate: Date);
    equals(other: DateRange): boolean;
    toString(): string;
    getDurationInDays(): number;
    includes(date: Date): boolean;
    static fromDaysAgo(days: number): DateRange;
    static thisMonth(): DateRange;
    static lastMonth(): DateRange;
}
/**
 * Report Filter value object
 */
export declare class ReportFilter extends BaseValueObject<ReportFilter> {
    readonly field: string;
    readonly operator: FilterOperator;
    readonly value: unknown;
    readonly label?: string | undefined;
    constructor(field: string, operator: FilterOperator, value: unknown, label?: string | undefined);
    private validateValueForOperator;
    equals(other: ReportFilter): boolean;
    toString(): string;
    getDisplayName(): string;
}
/**
 * Chart Configuration value object
 */
export declare class ChartConfiguration extends BaseValueObject<ChartConfiguration> {
    readonly chartType: ChartType;
    readonly title: string;
    readonly xAxis: string;
    readonly yAxis: string;
    readonly aggregation: AggregationType;
    readonly colors: string[];
    readonly options: Record<string, unknown>;
    constructor(chartType: ChartType, title: string, xAxis: string, yAxis: string, aggregation: AggregationType, colors?: string[], options?: Record<string, unknown>);
    equals(other: ChartConfiguration): boolean;
    toString(): string;
    withCustomOptions(options: Record<string, unknown>): ChartConfiguration;
}
/**
 * Key Performance Indicator value object
 */
export declare class KPI extends BaseValueObject<KPI> {
    readonly name: string;
    readonly value: number;
    readonly target?: number | undefined;
    readonly previousValue?: number | undefined;
    readonly unit: string;
    readonly format: string;
    constructor(name: string, value: number, target?: number | undefined, previousValue?: number | undefined, unit?: string, format?: string);
    equals(other: KPI): boolean;
    toString(): string;
    getFormattedValue(): string;
    getChangeFromPrevious(): number | null;
    getProgressToTarget(): number | null;
    isOnTarget(): boolean | null;
}
export interface ReportTemplate {
    readonly id: ReportTemplateId;
    readonly name: string;
    readonly description: string;
    readonly type: ReportType;
    readonly query: string;
    readonly filters: ReportFilter[];
    readonly chartConfigs: ChartConfiguration[];
    readonly defaultDateRange: DateRange;
    readonly isSystemTemplate: boolean;
    readonly createdBy: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly tags: string[];
}
export interface Report {
    readonly id: ReportId;
    readonly templateId?: ReportTemplateId;
    readonly name: string;
    readonly description: string;
    readonly type: ReportType;
    readonly status: ReportStatus;
    readonly filters: ReportFilter[];
    readonly dateRange: DateRange;
    readonly data: Record<string, unknown>[];
    readonly kpis: KPI[];
    readonly chartConfigs: ChartConfiguration[];
    readonly generatedBy: string;
    readonly generatedAt: Date;
    readonly executionTime: number;
    readonly exportUrls: Record<ExportFormat, string>;
    readonly organizationId: string;
}
export interface DashboardWidget {
    readonly id: WidgetId;
    readonly title: string;
    readonly type: ChartType;
    readonly chartConfig: ChartConfiguration;
    readonly reportId?: ReportId;
    readonly query: string;
    readonly refreshInterval: number;
    readonly position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    readonly filters: ReportFilter[];
}
export interface Dashboard {
    readonly id: DashboardId;
    readonly name: string;
    readonly description: string;
    readonly widgets: DashboardWidget[];
    readonly layout: Record<string, unknown>;
    readonly isPublic: boolean;
    readonly createdBy: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly organizationId: string;
}
export interface ScheduledReport {
    readonly id: ScheduledReportId;
    readonly reportId: ReportId;
    readonly name: string;
    readonly frequency: ScheduleFrequency;
    readonly schedule: string;
    readonly recipients: string[];
    readonly formats: ExportFormat[];
    readonly isActive: boolean;
    readonly lastExecuted?: Date;
    readonly nextExecution: Date;
    readonly createdBy: string;
    readonly organizationId: string;
}
export interface ReportExecution {
    readonly id: ReportExecutionId;
    readonly reportId: ReportId;
    readonly scheduledReportId?: ScheduledReportId;
    readonly status: ReportStatus;
    readonly startTime: Date;
    readonly endTime?: Date;
    readonly executionTime?: number;
    readonly recordCount: number;
    readonly errorMessage?: string;
    readonly exportUrls: Partial<Record<ExportFormat, string>>;
    readonly organizationId: string;
}
export interface PropertyPerformanceMetrics {
    readonly propertyId: string;
    readonly propertyName: string;
    readonly occupancyRate: number;
    readonly avgRent: Money;
    readonly totalRevenue: Money;
    readonly maintenanceCosts: Money;
    readonly netIncome: Money;
    readonly roi: number;
    readonly vacantDays: number;
    readonly tenantTurnover: number;
    readonly period: DateRange;
}
export interface FinancialAnalytics {
    readonly totalRevenue: Money;
    readonly totalExpenses: Money;
    readonly netIncome: Money;
    readonly profitMargin: number;
    readonly revenueGrowth: number;
    readonly expenseRatio: number;
    readonly cashFlow: Money;
    readonly period: DateRange;
    readonly breakdown: {
        rent: Money;
        lateFees: Money;
        otherIncome: Money;
        maintenance: Money;
        utilities: Money;
        insurance: Money;
        management: Money;
        otherExpenses: Money;
    };
}
export interface TenantAnalytics {
    readonly totalTenants: number;
    readonly activeTenants: number;
    readonly newTenants: number;
    readonly leavingTenants: number;
    readonly avgTenureMonths: number;
    readonly onTimePaymentRate: number;
    readonly latePaymentRate: number;
    readonly maintenanceRequestsPerTenant: number;
    readonly tenantSatisfactionScore?: number;
    readonly period: DateRange;
}
export interface MaintenanceAnalytics {
    readonly totalRequests: number;
    readonly completedRequests: number;
    readonly avgResponseTime: number;
    readonly avgCompletionTime: number;
    readonly totalCosts: Money;
    readonly avgCostPerRequest: Money;
    readonly requestsByCategory: Record<string, number>;
    readonly requestsByPriority: Record<string, number>;
    readonly vendorPerformance: Array<{
        vendorName: string;
        requestCount: number;
        avgCost: Money;
        avgCompletionTime: number;
        rating?: number;
    }>;
    readonly period: DateRange;
}
export interface PortfolioOverview {
    readonly totalProperties: number;
    readonly totalUnits: number;
    readonly occupiedUnits: number;
    readonly vacantUnits: number;
    readonly totalRevenue: Money;
    readonly totalExpenses: Money;
    readonly netIncome: Money;
    readonly avgOccupancyRate: number;
    readonly avgRentPerUnit: Money;
    readonly portfolioValue: Money;
    readonly totalTenants: number;
    readonly properties: PropertyPerformanceMetrics[];
    readonly period: DateRange;
}
export interface GenerateReportCommand {
    readonly templateId?: ReportTemplateId;
    readonly name: string;
    readonly type: ReportType;
    readonly filters: ReportFilter[];
    readonly dateRange: DateRange;
    readonly organizationId: string;
    readonly userId: string;
}
export interface CreateDashboardCommand {
    readonly name: string;
    readonly description: string;
    readonly widgets: Omit<DashboardWidget, 'id'>[];
    readonly organizationId: string;
    readonly userId: string;
}
export interface ScheduleReportCommand {
    readonly reportId: ReportId;
    readonly name: string;
    readonly frequency: ScheduleFrequency;
    readonly schedule: string;
    readonly recipients: string[];
    readonly formats: ExportFormat[];
    readonly organizationId: string;
    readonly userId: string;
}
export interface GetReportQuery {
    readonly reportId: ReportId;
    readonly organizationId: string;
    readonly includeData?: boolean;
}
export interface ListReportsQuery {
    readonly organizationId: string;
    readonly type?: ReportType;
    readonly createdBy?: string;
    readonly dateFrom?: Date;
    readonly dateTo?: Date;
    readonly limit?: number;
    readonly offset?: number;
}
export interface GetDashboardQuery {
    readonly dashboardId: DashboardId;
    readonly organizationId: string;
    readonly refreshData?: boolean;
}
export interface ReportData {
    readonly query: string;
    readonly parameters: Record<string, unknown>;
    readonly rows: Record<string, unknown>[];
    readonly totalRows: number;
    readonly executionTime: number;
    readonly generatedAt: Date;
}
export interface ChartData {
    readonly labels: string[];
    readonly datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string[];
        borderColor?: string[];
        borderWidth?: number;
    }>;
}
export interface ExportOptions {
    readonly format: ExportFormat;
    readonly includeCharts: boolean;
    readonly includeRawData: boolean;
    readonly customTemplate?: string;
    readonly watermark?: string;
}
export interface ReportShareSettings {
    readonly isPublic: boolean;
    readonly shareUrl?: string;
    readonly allowedUsers: string[];
    readonly expiresAt?: Date;
    readonly requiresLogin: boolean;
}
type Brand<T, TBrand> = T & {
    readonly __brand: TBrand;
};
export {};
//# sourceMappingURL=reporting.d.ts.map