/**
 * Dashboard Entity - Real-time business intelligence dashboard
 */
import { BaseEntity } from '../../domain';
import { DashboardId, WidgetId, DashboardWidget, ChartType, ChartConfiguration, ReportFilter } from '../../types/reporting';
export interface DashboardProps {
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
/**
 * Dashboard Widget Value Object
 */
export declare class Widget {
    readonly id: WidgetId;
    readonly title: string;
    readonly type: ChartType;
    readonly chartConfig: ChartConfiguration;
    readonly query: string;
    readonly refreshInterval: number;
    readonly position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    readonly filters: ReportFilter[];
    constructor(id: WidgetId, title: string, type: ChartType, chartConfig: ChartConfiguration, query: string, refreshInterval: number, position: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, filters?: ReportFilter[]);
    private validateWidget;
    updatePosition(x: number, y: number, width?: number, height?: number): Widget;
    updateRefreshInterval(intervalSeconds: number): Widget;
    addFilter(filter: ReportFilter): Widget;
    removeFilter(index: number): Widget;
    toDashboardWidget(): DashboardWidget;
}
/**
 * Dashboard Entity - Business intelligence dashboard aggregate
 */
export declare class DashboardEntity extends BaseEntity<DashboardId> {
    private props;
    private constructor();
    static create(id: DashboardId, props: DashboardProps): DashboardEntity;
    get name(): string;
    get description(): string;
    get widgets(): DashboardWidget[];
    get layout(): Record<string, unknown>;
    get isPublic(): boolean;
    get createdBy(): string;
    get createdAt(): Date;
    get updatedAt(): Date;
    get organizationId(): string;
    updateName(newName: string): void;
    updateDescription(newDescription: string): void;
    addWidget(widget: Widget): void;
    removeWidget(widgetId: WidgetId): void;
    updateWidget(widgetId: WidgetId, updatedWidget: Widget): void;
    updateLayout(newLayout: Record<string, unknown>): void;
    makePublic(): void;
    makePrivate(): void;
    getWidget(widgetId: WidgetId): DashboardWidget | null;
    getWidgetsByType(type: ChartType): DashboardWidget[];
    hasWidget(widgetId: WidgetId): boolean;
    getWidgetCount(): number;
    isOwnedBy(userId: string): boolean;
    belongsToOrganization(orgId: string): boolean;
    canBeAccessedBy(userId: string, orgId: string): boolean;
    getDashboardMetrics(): {
        widgetCount: number;
        chartTypes: Record<ChartType, number>;
        avgRefreshInterval: number;
        hasRealTimeData: boolean;
    };
    toSnapshot(): DashboardProps & {
        id: DashboardId;
    };
    static fromSnapshot(snapshot: DashboardProps & {
        id: DashboardId;
    }): DashboardEntity;
}
//# sourceMappingURL=dashboard.entity.d.ts.map