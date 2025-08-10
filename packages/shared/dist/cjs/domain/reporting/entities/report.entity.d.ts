/**
 * Report Entity - Core reporting domain entity
 */
import { BaseEntity } from '../../domain';
import { ReportId, ReportTemplateId, ReportType, ReportStatus, ExportFormat, ReportFilter, DateRange, ChartConfiguration, KPI } from '../../types/reporting';
export interface ReportProps {
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
/**
 * Report Entity - Represents a generated or in-progress report
 */
export declare class ReportEntity extends BaseEntity<ReportId> {
    private props;
    private constructor();
    static create(id: ReportId, props: ReportProps): ReportEntity;
    get templateId(): ReportTemplateId | undefined;
    get name(): string;
    get description(): string;
    get type(): ReportType;
    get status(): ReportStatus;
    get filters(): ReportFilter[];
    get dateRange(): DateRange;
    get data(): Record<string, unknown>[];
    get kpis(): KPI[];
    get chartConfigs(): ChartConfiguration[];
    get generatedBy(): string;
    get generatedAt(): Date;
    get executionTime(): number;
    get exportUrls(): Record<ExportFormat, string>;
    get organizationId(): string;
    updateStatus(newStatus: ReportStatus): void;
    addExportUrl(format: ExportFormat, url: string): void;
    updateData(data: Record<string, unknown>[], kpis: KPI[]): void;
    addChartConfiguration(config: ChartConfiguration): void;
    removeChartConfiguration(index: number): void;
    isOwnedBy(userId: string): boolean;
    belongsToOrganization(orgId: string): boolean;
    hasData(): boolean;
    hasKPIs(): boolean;
    hasCharts(): boolean;
    isExportable(): boolean;
    getDataSummary(): {
        totalRows: number;
        columns: string[];
    };
    private canTransitionTo;
    toSnapshot(): ReportProps & {
        id: ReportId;
    };
    static fromSnapshot(snapshot: ReportProps & {
        id: ReportId;
    }): ReportEntity;
}
//# sourceMappingURL=report.entity.d.ts.map