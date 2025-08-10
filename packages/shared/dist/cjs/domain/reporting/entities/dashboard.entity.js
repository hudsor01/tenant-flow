"use strict";
/**
 * Dashboard Entity - Real-time business intelligence dashboard
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardEntity = exports.Widget = void 0;
const domain_1 = require("../../domain");
// Business Rules
class DashboardMustHaveName {
    name;
    constructor(name) {
        this.name = name;
    }
    get message() {
        return 'Dashboard must have a valid name';
    }
    isBroken() {
        return !this.name || this.name.trim().length === 0;
    }
}
class DashboardMustBelongToOrganization {
    organizationId;
    constructor(organizationId) {
        this.organizationId = organizationId;
    }
    get message() {
        return 'Dashboard must belong to a valid organization';
    }
    isBroken() {
        return !this.organizationId || this.organizationId.trim().length === 0;
    }
}
class DashboardCannotHaveTooManyWidgets {
    widgets;
    constructor(widgets) {
        this.widgets = widgets;
    }
    get message() {
        return 'Dashboard cannot have more than 20 widgets for performance reasons';
    }
    isBroken() {
        return this.widgets.length > 20;
    }
}
class WidgetPositionsMustNotOverlap {
    widgets;
    constructor(widgets) {
        this.widgets = widgets;
    }
    get message() {
        return 'Widget positions cannot overlap on the dashboard';
    }
    isBroken() {
        for (let i = 0; i < this.widgets.length; i++) {
            for (let j = i + 1; j < this.widgets.length; j++) {
                if (this.widgetsOverlap(this.widgets[i], this.widgets[j])) {
                    return true;
                }
            }
        }
        return false;
    }
    widgetsOverlap(a, b) {
        return !(a.position.x + a.position.width <= b.position.x ||
            b.position.x + b.position.width <= a.position.x ||
            a.position.y + a.position.height <= b.position.y ||
            b.position.y + b.position.height <= a.position.y);
    }
}
/**
 * Dashboard Widget Value Object
 */
class Widget {
    id;
    title;
    type;
    chartConfig;
    query;
    refreshInterval;
    position;
    filters;
    constructor(id, title, type, chartConfig, query, refreshInterval, position, filters = []) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.chartConfig = chartConfig;
        this.query = query;
        this.refreshInterval = refreshInterval;
        this.position = position;
        this.filters = filters;
        this.validateWidget();
    }
    validateWidget() {
        if (!this.title?.trim()) {
            throw new domain_1.DomainError('Widget must have a title');
        }
        if (!this.query?.trim()) {
            throw new domain_1.DomainError('Widget must have a valid query');
        }
        if (this.refreshInterval < 30) { // Minimum 30 seconds
            throw new domain_1.DomainError('Widget refresh interval must be at least 30 seconds');
        }
        if (this.refreshInterval > 3600) { // Maximum 1 hour
            throw new domain_1.DomainError('Widget refresh interval cannot exceed 1 hour');
        }
        if (this.position.width <= 0 || this.position.height <= 0) {
            throw new domain_1.DomainError('Widget dimensions must be positive');
        }
        if (this.position.x < 0 || this.position.y < 0) {
            throw new domain_1.DomainError('Widget position cannot be negative');
        }
    }
    updatePosition(x, y, width, height) {
        return new Widget(this.id, this.title, this.type, this.chartConfig, this.query, this.refreshInterval, {
            x,
            y,
            width: width ?? this.position.width,
            height: height ?? this.position.height
        }, this.filters);
    }
    updateRefreshInterval(intervalSeconds) {
        if (intervalSeconds < 30 || intervalSeconds > 3600) {
            throw new domain_1.DomainError('Invalid refresh interval');
        }
        return new Widget(this.id, this.title, this.type, this.chartConfig, this.query, intervalSeconds, this.position, this.filters);
    }
    addFilter(filter) {
        return new Widget(this.id, this.title, this.type, this.chartConfig, this.query, this.refreshInterval, this.position, [...this.filters, filter]);
    }
    removeFilter(index) {
        if (index < 0 || index >= this.filters.length) {
            throw new domain_1.DomainError('Invalid filter index');
        }
        const newFilters = [...this.filters];
        newFilters.splice(index, 1);
        return new Widget(this.id, this.title, this.type, this.chartConfig, this.query, this.refreshInterval, this.position, newFilters);
    }
    toDashboardWidget() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            chartConfig: this.chartConfig,
            query: this.query,
            refreshInterval: this.refreshInterval,
            position: this.position,
            filters: this.filters
        };
    }
}
exports.Widget = Widget;
/**
 * Dashboard Entity - Business intelligence dashboard aggregate
 */
class DashboardEntity extends domain_1.BaseEntity {
    props;
    constructor(id, props) {
        super(id);
        this.props = props;
    }
    static create(id, props) {
        // Validate business rules
        const rules = [
            new DashboardMustHaveName(props.name),
            new DashboardMustBelongToOrganization(props.organizationId),
            new DashboardCannotHaveTooManyWidgets(props.widgets),
            new WidgetPositionsMustNotOverlap(props.widgets)
        ];
        for (const rule of rules) {
            if (rule.isBroken()) {
                throw new domain_1.BusinessRuleValidationError(rule);
            }
        }
        return new DashboardEntity(id, { ...props });
    }
    // Getters
    get name() {
        return this.props.name;
    }
    get description() {
        return this.props.description;
    }
    get widgets() {
        return [...this.props.widgets];
    }
    get layout() {
        return { ...this.props.layout };
    }
    get isPublic() {
        return this.props.isPublic;
    }
    get createdBy() {
        return this.props.createdBy;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get updatedAt() {
        return this.props.updatedAt;
    }
    get organizationId() {
        return this.props.organizationId;
    }
    // Business Methods
    updateName(newName) {
        const rule = new DashboardMustHaveName(newName);
        if (rule.isBroken()) {
            throw new domain_1.BusinessRuleValidationError(rule);
        }
        this.props = {
            ...this.props,
            name: newName,
            updatedAt: new Date()
        };
    }
    updateDescription(newDescription) {
        this.props = {
            ...this.props,
            description: newDescription,
            updatedAt: new Date()
        };
    }
    addWidget(widget) {
        const newWidgets = [...this.props.widgets, widget.toDashboardWidget()];
        // Validate business rules with new widget
        const rules = [
            new DashboardCannotHaveTooManyWidgets(newWidgets),
            new WidgetPositionsMustNotOverlap(newWidgets)
        ];
        for (const rule of rules) {
            if (rule.isBroken()) {
                throw new domain_1.BusinessRuleValidationError(rule);
            }
        }
        this.props = {
            ...this.props,
            widgets: newWidgets,
            updatedAt: new Date()
        };
    }
    removeWidget(widgetId) {
        const widgetExists = this.props.widgets.some(w => w.id === widgetId);
        if (!widgetExists) {
            throw new domain_1.DomainError(`Widget ${widgetId} not found in dashboard`);
        }
        this.props = {
            ...this.props,
            widgets: this.props.widgets.filter(w => w.id !== widgetId),
            updatedAt: new Date()
        };
    }
    updateWidget(widgetId, updatedWidget) {
        const widgetIndex = this.props.widgets.findIndex(w => w.id === widgetId);
        if (widgetIndex === -1) {
            throw new domain_1.DomainError(`Widget ${widgetId} not found in dashboard`);
        }
        if (updatedWidget.id !== widgetId) {
            throw new domain_1.DomainError('Widget ID cannot be changed');
        }
        const newWidgets = [...this.props.widgets];
        newWidgets[widgetIndex] = updatedWidget.toDashboardWidget();
        // Validate business rules with updated widgets
        const rule = new WidgetPositionsMustNotOverlap(newWidgets);
        if (rule.isBroken()) {
            throw new domain_1.BusinessRuleValidationError(rule);
        }
        this.props = {
            ...this.props,
            widgets: newWidgets,
            updatedAt: new Date()
        };
    }
    updateLayout(newLayout) {
        this.props = {
            ...this.props,
            layout: { ...newLayout },
            updatedAt: new Date()
        };
    }
    makePublic() {
        this.props = {
            ...this.props,
            isPublic: true,
            updatedAt: new Date()
        };
    }
    makePrivate() {
        this.props = {
            ...this.props,
            isPublic: false,
            updatedAt: new Date()
        };
    }
    // Query Methods
    getWidget(widgetId) {
        return this.props.widgets.find(w => w.id === widgetId) || null;
    }
    getWidgetsByType(type) {
        return this.props.widgets.filter(w => w.type === type);
    }
    hasWidget(widgetId) {
        return this.props.widgets.some(w => w.id === widgetId);
    }
    getWidgetCount() {
        return this.props.widgets.length;
    }
    isOwnedBy(userId) {
        return this.createdBy === userId;
    }
    belongsToOrganization(orgId) {
        return this.organizationId === orgId;
    }
    canBeAccessedBy(userId, orgId) {
        if (!this.belongsToOrganization(orgId)) {
            return false;
        }
        return this.isPublic || this.isOwnedBy(userId);
    }
    getDashboardMetrics() {
        const chartTypeCounts = {};
        let totalRefreshInterval = 0;
        for (const widget of this.props.widgets) {
            chartTypeCounts[widget.type] = (chartTypeCounts[widget.type] || 0) + 1;
            totalRefreshInterval += widget.refreshInterval;
        }
        return {
            widgetCount: this.props.widgets.length,
            chartTypes: chartTypeCounts,
            avgRefreshInterval: this.props.widgets.length > 0
                ? Math.round(totalRefreshInterval / this.props.widgets.length)
                : 0,
            hasRealTimeData: this.props.widgets.some(w => w.refreshInterval <= 60) // <= 1 minute
        };
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
        return new DashboardEntity(id, props);
    }
}
exports.DashboardEntity = DashboardEntity;
//# sourceMappingURL=dashboard.entity.js.map