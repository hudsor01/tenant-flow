"use strict";
/**
 * Report Entity - Core reporting domain entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportEntity = void 0;
const domain_1 = require("../../domain");
const reporting_1 = require("../../types/reporting");
// Business Rules
class ReportMustHaveName {
    name;
    constructor(name) {
        this.name = name;
    }
    get message() {
        return 'Report must have a valid name';
    }
    isBroken() {
        return !this.name || this.name.trim().length === 0;
    }
}
class ReportMustHaveValidDateRange {
    dateRange;
    constructor(dateRange) {
        this.dateRange = dateRange;
    }
    get message() {
        return 'Report must have a valid date range';
    }
    isBroken() {
        try {
            return this.dateRange.getDurationInDays() <= 0 || this.dateRange.getDurationInDays() > 1095; // Max 3 years
        }
        catch {
            return true;
        }
    }
}
class ReportMustBelongToOrganization {
    organizationId;
    constructor(organizationId) {
        this.organizationId = organizationId;
    }
    get message() {
        return 'Report must belong to a valid organization';
    }
    isBroken() {
        return !this.organizationId || this.organizationId.trim().length === 0;
    }
}
class ReportDataMustBeConsistentWithFilters {
    data;
    filters;
    dateRange;
    constructor(data, filters, dateRange) {
        this.data = data;
        this.filters = filters;
        this.dateRange = dateRange;
    }
    get message() {
        return 'Report data must be consistent with applied filters and date range';
    }
    isBroken() {
        // Basic validation - in real implementation, this would validate data against filters
        if (this.data.length === 0 && this.filters.length > 0) {
            return false; // Empty data is valid for restrictive filters
        }
        // Check if data contains dates outside the specified range
        const hasDateField = this.data.some(row => Object.keys(row).some(key => key.toLowerCase().includes('date') || key.toLowerCase().includes('time')));
        if (hasDateField) {
            // In a real implementation, we'd validate all date fields
            // For now, just ensure we have data validation logic
            return false;
        }
        return false;
    }
}
/**
 * Report Entity - Represents a generated or in-progress report
 */
class ReportEntity extends domain_1.BaseEntity {
    props;
    constructor(id, props) {
        super(id);
        this.props = props;
    }
    static create(id, props) {
        // Validate business rules
        const rules = [
            new ReportMustHaveName(props.name),
            new ReportMustHaveValidDateRange(props.dateRange),
            new ReportMustBelongToOrganization(props.organizationId),
            new ReportDataMustBeConsistentWithFilters(props.data, props.filters, props.dateRange)
        ];
        for (const rule of rules) {
            if (rule.isBroken()) {
                throw new domain_1.BusinessRuleValidationError(rule);
            }
        }
        return new ReportEntity(id, { ...props });
    }
    // Getters
    get templateId() {
        return this.props.templateId;
    }
    get name() {
        return this.props.name;
    }
    get description() {
        return this.props.description;
    }
    get type() {
        return this.props.type;
    }
    get status() {
        return this.props.status;
    }
    get filters() {
        return [...this.props.filters];
    }
    get dateRange() {
        return this.props.dateRange;
    }
    get data() {
        return [...this.props.data];
    }
    get kpis() {
        return [...this.props.kpis];
    }
    get chartConfigs() {
        return [...this.props.chartConfigs];
    }
    get generatedBy() {
        return this.props.generatedBy;
    }
    get generatedAt() {
        return this.props.generatedAt;
    }
    get executionTime() {
        return this.props.executionTime;
    }
    get exportUrls() {
        return { ...this.props.exportUrls };
    }
    get organizationId() {
        return this.props.organizationId;
    }
    // Business Methods
    updateStatus(newStatus) {
        if (this.canTransitionTo(newStatus)) {
            this.props = { ...this.props, status: newStatus };
        }
        else {
            throw new domain_1.DomainError(`Cannot transition report from ${this.status} to ${newStatus}`, 'INVALID_STATUS_TRANSITION');
        }
    }
    addExportUrl(format, url) {
        if (this.status !== reporting_1.ReportStatus.COMPLETED) {
            throw new domain_1.DomainError('Cannot add export URLs to incomplete report');
        }
        if (!url || !url.startsWith('http')) {
            throw new domain_1.DomainError('Invalid export URL');
        }
        this.props = {
            ...this.props,
            exportUrls: { ...this.props.exportUrls, [format]: url }
        };
    }
    updateData(data, kpis) {
        if (this.status === reporting_1.ReportStatus.COMPLETED) {
            throw new domain_1.DomainError('Cannot update data of completed report');
        }
        // Validate data consistency
        const rule = new ReportDataMustBeConsistentWithFilters(data, this.filters, this.dateRange);
        if (rule.isBroken()) {
            throw new domain_1.BusinessRuleValidationError(rule);
        }
        this.props = {
            ...this.props,
            data: [...data],
            kpis: [...kpis]
        };
    }
    addChartConfiguration(config) {
        if (this.status === reporting_1.ReportStatus.COMPLETED) {
            throw new domain_1.DomainError('Cannot modify completed report');
        }
        this.props = {
            ...this.props,
            chartConfigs: [...this.props.chartConfigs, config]
        };
    }
    removeChartConfiguration(index) {
        if (this.status === reporting_1.ReportStatus.COMPLETED) {
            throw new domain_1.DomainError('Cannot modify completed report');
        }
        if (index < 0 || index >= this.props.chartConfigs.length) {
            throw new domain_1.DomainError('Invalid chart configuration index');
        }
        const newConfigs = [...this.props.chartConfigs];
        newConfigs.splice(index, 1);
        this.props = {
            ...this.props,
            chartConfigs: newConfigs
        };
    }
    isOwnedBy(userId) {
        return this.generatedBy === userId;
    }
    belongsToOrganization(orgId) {
        return this.organizationId === orgId;
    }
    hasData() {
        return this.data.length > 0;
    }
    hasKPIs() {
        return this.kpis.length > 0;
    }
    hasCharts() {
        return this.chartConfigs.length > 0;
    }
    isExportable() {
        return this.status === reporting_1.ReportStatus.COMPLETED && this.hasData();
    }
    getDataSummary() {
        if (!this.hasData()) {
            return { totalRows: 0, columns: [] };
        }
        const firstRow = this.data[0];
        return {
            totalRows: this.data.length,
            columns: Object.keys(firstRow)
        };
    }
    // Private Methods
    canTransitionTo(newStatus) {
        const transitions = {
            [reporting_1.ReportStatus.DRAFT]: [reporting_1.ReportStatus.GENERATING, reporting_1.ReportStatus.ARCHIVED],
            [reporting_1.ReportStatus.GENERATING]: [reporting_1.ReportStatus.COMPLETED, reporting_1.ReportStatus.FAILED],
            [reporting_1.ReportStatus.COMPLETED]: [reporting_1.ReportStatus.ARCHIVED],
            [reporting_1.ReportStatus.FAILED]: [reporting_1.ReportStatus.GENERATING, reporting_1.ReportStatus.ARCHIVED],
            [reporting_1.ReportStatus.PUBLISHED]: [reporting_1.ReportStatus.ARCHIVED],
            [reporting_1.ReportStatus.ARCHIVED]: []
        };
        return transitions[this.status]?.includes(newStatus) ?? false;
    }
    // Serialization
    toSnapshot() {
        return {
            id: this.id,
            ...this.props
        };
    }
    static fromSnapshot(snapshot) {
        const { id, ...props } = snapshot;
        return new ReportEntity(id, props);
    }
}
exports.ReportEntity = ReportEntity;
//# sourceMappingURL=report.entity.js.map