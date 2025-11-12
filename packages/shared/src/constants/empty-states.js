"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_MAINTENANCE_ANALYTICS = exports.EMPTY_SYSTEM_UPTIME = exports.EMPTY_DASHBOARD_STATS = exports.EMPTY_MAINTENANCE_STATS = exports.EMPTY_LEASE_STATS = exports.EMPTY_UNIT_STATS = exports.EMPTY_TENANT_STATS = exports.EMPTY_PROPERTY_STATS = void 0;
exports.EMPTY_PROPERTY_STATS = {
    total: 0,
    occupied: 0,
    vacant: 0,
    occupancyRate: 0,
    totalMonthlyRent: 0,
    averageRent: 0
};
exports.EMPTY_TENANT_STATS = {
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0
};
exports.EMPTY_UNIT_STATS = {
    total: 0,
    occupied: 0,
    vacant: 0,
    maintenance: 0,
    averageRent: 0,
    available: 0,
    occupancyRate: 0,
    occupancyChange: 0,
    totalPotentialRent: 0,
    totalActualRent: 0
};
exports.EMPTY_LEASE_STATS = {
    total: 0,
    active: 0,
    expired: 0,
    expiringSoon: 0
};
exports.EMPTY_MAINTENANCE_STATS = {
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    completedToday: 0,
    avgResolutionTime: 0,
    byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        emergency: 0
    }
};
exports.EMPTY_DASHBOARD_STATS = {
    properties: exports.EMPTY_PROPERTY_STATS,
    tenants: exports.EMPTY_TENANT_STATS,
    units: exports.EMPTY_UNIT_STATS,
    leases: exports.EMPTY_LEASE_STATS,
    maintenance: exports.EMPTY_MAINTENANCE_STATS,
    revenue: {
        monthly: 0,
        yearly: 0,
        growth: 0
    },
    totalProperties: 0,
    totalUnits: 0,
    totalTenants: 0,
    totalRevenue: 0,
    occupancyRate: 0,
    maintenanceRequests: 0
};
exports.EMPTY_SYSTEM_UPTIME = {
    uptime: '99.9%',
    uptimePercentage: 99.9,
    sla: '99.5%',
    slaStatus: 'excellent',
    status: 'operational',
    lastIncident: null,
    responseTime: 150,
    timestamp: new Date().toISOString()
};
exports.EMPTY_MAINTENANCE_ANALYTICS = {
    avgResolutionTime: 0,
    completionRate: 0,
    priorityBreakdown: {},
    trendsOverTime: []
};
//# sourceMappingURL=empty-states.js.map