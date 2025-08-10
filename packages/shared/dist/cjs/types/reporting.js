"use strict";
/**
 * Reporting and Business Intelligence Domain Types
 *
 * Comprehensive type definitions for the advanced reporting system
 * implementing Domain-Driven Design patterns for business intelligence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KPI = exports.ChartConfiguration = exports.ReportFilter = exports.DateRange = exports.FilterOperator = exports.ExportFormat = exports.ScheduleFrequency = exports.ReportStatus = exports.TimeGranularity = exports.AggregationType = exports.ChartType = exports.ReportType = exports.reportingIds = void 0;
const domain_1 = require("./domain");
// Helper functions for ID creation
exports.reportingIds = {
    report: (id) => id,
    template: (id) => id,
    dashboard: (id) => id,
    widget: (id) => id,
    chartConfig: (id) => id,
    scheduledReport: (id) => id,
    execution: (id) => id,
};
// ========================
// Core Enums
// ========================
var ReportType;
(function (ReportType) {
    ReportType["PROPERTY_PERFORMANCE"] = "PROPERTY_PERFORMANCE";
    ReportType["FINANCIAL_ANALYTICS"] = "FINANCIAL_ANALYTICS";
    ReportType["TENANT_ANALYTICS"] = "TENANT_ANALYTICS";
    ReportType["MAINTENANCE_REPORTS"] = "MAINTENANCE_REPORTS";
    ReportType["PORTFOLIO_OVERVIEW"] = "PORTFOLIO_OVERVIEW";
    ReportType["CUSTOM"] = "CUSTOM";
})(ReportType || (exports.ReportType = ReportType = {}));
var ChartType;
(function (ChartType) {
    ChartType["LINE"] = "LINE";
    ChartType["BAR"] = "BAR";
    ChartType["PIE"] = "PIE";
    ChartType["DONUT"] = "DONUT";
    ChartType["AREA"] = "AREA";
    ChartType["SCATTER"] = "SCATTER";
    ChartType["HEATMAP"] = "HEATMAP";
    ChartType["TABLE"] = "TABLE";
    ChartType["METRIC_CARD"] = "METRIC_CARD";
    ChartType["GAUGE"] = "GAUGE";
})(ChartType || (exports.ChartType = ChartType = {}));
var AggregationType;
(function (AggregationType) {
    AggregationType["SUM"] = "SUM";
    AggregationType["COUNT"] = "COUNT";
    AggregationType["AVG"] = "AVG";
    AggregationType["MIN"] = "MIN";
    AggregationType["MAX"] = "MAX";
    AggregationType["MEDIAN"] = "MEDIAN";
    AggregationType["PERCENTILE"] = "PERCENTILE";
    AggregationType["DISTINCT_COUNT"] = "DISTINCT_COUNT";
})(AggregationType || (exports.AggregationType = AggregationType = {}));
var TimeGranularity;
(function (TimeGranularity) {
    TimeGranularity["DAILY"] = "DAILY";
    TimeGranularity["WEEKLY"] = "WEEKLY";
    TimeGranularity["MONTHLY"] = "MONTHLY";
    TimeGranularity["QUARTERLY"] = "QUARTERLY";
    TimeGranularity["YEARLY"] = "YEARLY";
})(TimeGranularity || (exports.TimeGranularity = TimeGranularity = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "DRAFT";
    ReportStatus["PUBLISHED"] = "PUBLISHED";
    ReportStatus["ARCHIVED"] = "ARCHIVED";
    ReportStatus["GENERATING"] = "GENERATING";
    ReportStatus["COMPLETED"] = "COMPLETED";
    ReportStatus["FAILED"] = "FAILED";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var ScheduleFrequency;
(function (ScheduleFrequency) {
    ScheduleFrequency["ONCE"] = "ONCE";
    ScheduleFrequency["DAILY"] = "DAILY";
    ScheduleFrequency["WEEKLY"] = "WEEKLY";
    ScheduleFrequency["MONTHLY"] = "MONTHLY";
    ScheduleFrequency["QUARTERLY"] = "QUARTERLY";
})(ScheduleFrequency || (exports.ScheduleFrequency = ScheduleFrequency = {}));
var ExportFormat;
(function (ExportFormat) {
    ExportFormat["PDF"] = "PDF";
    ExportFormat["EXCEL"] = "EXCEL";
    ExportFormat["CSV"] = "CSV";
    ExportFormat["JSON"] = "JSON";
})(ExportFormat || (exports.ExportFormat = ExportFormat = {}));
var FilterOperator;
(function (FilterOperator) {
    FilterOperator["EQUALS"] = "EQUALS";
    FilterOperator["NOT_EQUALS"] = "NOT_EQUALS";
    FilterOperator["GREATER_THAN"] = "GREATER_THAN";
    FilterOperator["LESS_THAN"] = "LESS_THAN";
    FilterOperator["GREATER_EQUAL"] = "GREATER_EQUAL";
    FilterOperator["LESS_EQUAL"] = "LESS_EQUAL";
    FilterOperator["CONTAINS"] = "CONTAINS";
    FilterOperator["NOT_CONTAINS"] = "NOT_CONTAINS";
    FilterOperator["IN"] = "IN";
    FilterOperator["NOT_IN"] = "NOT_IN";
    FilterOperator["BETWEEN"] = "BETWEEN";
    FilterOperator["IS_NULL"] = "IS_NULL";
    FilterOperator["IS_NOT_NULL"] = "IS_NOT_NULL";
})(FilterOperator || (exports.FilterOperator = FilterOperator = {}));
// ========================
// Value Objects
// ========================
/**
 * Date Range value object for report filtering
 */
class DateRange extends domain_1.BaseValueObject {
    startDate;
    endDate;
    constructor(startDate, endDate) {
        super();
        this.startDate = startDate;
        this.endDate = endDate;
        if (startDate >= endDate) {
            throw new Error('Start date must be before end date');
        }
        if (startDate > new Date() || endDate > new Date()) {
            throw new Error('Date range cannot include future dates');
        }
    }
    equals(other) {
        return (this.startDate.getTime() === other.startDate.getTime() &&
            this.endDate.getTime() === other.endDate.getTime());
    }
    toString() {
        return `${this.startDate.toISOString()} to ${this.endDate.toISOString()}`;
    }
    getDurationInDays() {
        return Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    includes(date) {
        return date >= this.startDate && date <= this.endDate;
    }
    static fromDaysAgo(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return new DateRange(startDate, endDate);
    }
    static thisMonth() {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return new DateRange(startDate, endDate);
    }
    static lastMonth() {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        return new DateRange(startDate, endDate);
    }
}
exports.DateRange = DateRange;
/**
 * Report Filter value object
 */
class ReportFilter extends domain_1.BaseValueObject {
    field;
    operator;
    value;
    label;
    constructor(field, operator, value, label) {
        super();
        this.field = field;
        this.operator = operator;
        this.value = value;
        this.label = label;
        if (!field?.trim()) {
            throw new Error('Filter field is required');
        }
        this.validateValueForOperator(operator, value);
    }
    validateValueForOperator(operator, value) {
        switch (operator) {
            case FilterOperator.IN:
            case FilterOperator.NOT_IN:
                if (!Array.isArray(value)) {
                    throw new Error(`${operator} operator requires array value`);
                }
                break;
            case FilterOperator.BETWEEN:
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('BETWEEN operator requires array with exactly 2 values');
                }
                break;
            case FilterOperator.IS_NULL:
            case FilterOperator.IS_NOT_NULL:
                // No value required for null checks
                break;
            default:
                if (value === undefined || value === null) {
                    throw new Error(`${operator} operator requires a value`);
                }
        }
    }
    equals(other) {
        return (this.field === other.field &&
            this.operator === other.operator &&
            JSON.stringify(this.value) === JSON.stringify(other.value));
    }
    toString() {
        return `${this.field} ${this.operator} ${JSON.stringify(this.value)}`;
    }
    getDisplayName() {
        return this.label || this.field;
    }
}
exports.ReportFilter = ReportFilter;
/**
 * Chart Configuration value object
 */
class ChartConfiguration extends domain_1.BaseValueObject {
    chartType;
    title;
    xAxis;
    yAxis;
    aggregation;
    colors;
    options;
    constructor(chartType, title, xAxis, yAxis, aggregation, colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'], options = {}) {
        super();
        this.chartType = chartType;
        this.title = title;
        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.aggregation = aggregation;
        this.colors = colors;
        this.options = options;
        if (!title?.trim()) {
            throw new Error('Chart title is required');
        }
        if (!xAxis?.trim()) {
            throw new Error('X-axis field is required');
        }
        if (!yAxis?.trim()) {
            throw new Error('Y-axis field is required');
        }
        if (colors.length === 0) {
            throw new Error('At least one color is required');
        }
    }
    equals(other) {
        return (this.chartType === other.chartType &&
            this.title === other.title &&
            this.xAxis === other.xAxis &&
            this.yAxis === other.yAxis &&
            this.aggregation === other.aggregation &&
            JSON.stringify(this.colors) === JSON.stringify(other.colors) &&
            JSON.stringify(this.options) === JSON.stringify(other.options));
    }
    toString() {
        return `${this.chartType}: ${this.title} (${this.xAxis} vs ${this.yAxis})`;
    }
    withCustomOptions(options) {
        return new ChartConfiguration(this.chartType, this.title, this.xAxis, this.yAxis, this.aggregation, this.colors, { ...this.options, ...options });
    }
}
exports.ChartConfiguration = ChartConfiguration;
/**
 * Key Performance Indicator value object
 */
class KPI extends domain_1.BaseValueObject {
    name;
    value;
    target;
    previousValue;
    unit;
    format;
    constructor(name, value, target, previousValue, unit = '', format = 'number') {
        super();
        this.name = name;
        this.value = value;
        this.target = target;
        this.previousValue = previousValue;
        this.unit = unit;
        this.format = format;
        if (!name?.trim()) {
            throw new Error('KPI name is required');
        }
        if (typeof value !== 'number' || !isFinite(value)) {
            throw new Error('KPI value must be a finite number');
        }
    }
    equals(other) {
        return (this.name === other.name &&
            this.value === other.value &&
            this.target === other.target &&
            this.previousValue === other.previousValue &&
            this.unit === other.unit &&
            this.format === other.format);
    }
    toString() {
        return `${this.name}: ${this.getFormattedValue()}`;
    }
    getFormattedValue() {
        switch (this.format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(this.value);
            case 'percentage':
                return `${(this.value * 100).toFixed(1)}%`;
            default:
                return `${this.value.toLocaleString()}${this.unit ? ' ' + this.unit : ''}`;
        }
    }
    getChangeFromPrevious() {
        if (this.previousValue === undefined)
            return null;
        if (this.previousValue === 0)
            return this.value > 0 ? 100 : 0;
        return ((this.value - this.previousValue) / this.previousValue) * 100;
    }
    getProgressToTarget() {
        if (this.target === undefined)
            return null;
        if (this.target === 0)
            return this.value >= 0 ? 100 : 0;
        return Math.min((this.value / this.target) * 100, 100);
    }
    isOnTarget() {
        if (this.target === undefined)
            return null;
        return this.value >= this.target;
    }
}
exports.KPI = KPI;
//# sourceMappingURL=reporting.js.map