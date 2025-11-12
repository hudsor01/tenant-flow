"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLeaseSummary = mapLeaseSummary;
exports.mapLeaseProfitability = mapLeaseProfitability;
exports.mapLeaseLifecycle = mapLeaseLifecycle;
exports.mapLeaseStatusBreakdown = mapLeaseStatusBreakdown;
exports.buildLeaseAnalyticsPageResponse = buildLeaseAnalyticsPageResponse;
function toNumber(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
}
function toString(value, fallback = '') {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    return fallback;
}
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function mapLeaseSummary(data) {
    if (!isObject(data)) {
        return {
            totalLeases: 0,
            activeLeases: 0,
            expiringSoon: 0,
            totalMonthlyRent: 0,
            averageLeaseValue: 0
        };
    }
    return {
        totalLeases: toNumber(data.total_leases ?? data.totalLeases),
        activeLeases: toNumber(data.active_leases ?? data.activeLeases),
        expiringSoon: toNumber(data.expiring_soon ?? data.expiringSoon),
        totalMonthlyRent: toNumber(data.total_monthly_rent ?? data.totalMonthlyRent),
        averageLeaseValue: toNumber(data.average_lease_value ?? data.averageLeaseValue)
    };
}
function mapLeaseProfitability(data) {
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(item => {
        const record = isObject(item) ? item : {};
        return {
            leaseId: toString(record.lease_id ?? record.leaseId ?? toString(record.id ?? 'lease')),
            propertyName: toString(record.property_name ?? record.propertyName ?? 'Unknown Property'),
            tenantName: toString(record.tenant_name ?? record.tenantName ?? 'Unknown Tenant'),
            monthlyRent: toNumber(record.monthly_rent ?? record.rent ?? record.amount),
            outstandingBalance: toNumber(record.outstanding_balance ?? record.balance),
            profitabilityScore: record.profitability_score === null
                ? null
                : toNumber(record.profitability_score ?? record.score)
        };
    });
}
function mapLeaseLifecycle(data) {
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(item => {
        const record = isObject(item) ? item : {};
        return {
            period: toString(record.period ?? record.month ?? record.date ?? ''),
            renewals: toNumber(record.renewals ?? record.renewed),
            expirations: toNumber(record.expirations ?? record.expired),
            noticesGiven: toNumber(record.notices ?? record.notices_given)
        };
    });
}
function mapLeaseStatusBreakdown(data) {
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(item => {
        const record = isObject(item) ? item : {};
        return {
            status: toString(record.status ?? record.label ?? 'unknown'),
            count: toNumber(record.count ?? record.total),
            percentage: toNumber(record.percentage ?? record.percent)
        };
    });
}
function buildLeaseAnalyticsPageResponse(raw) {
    return {
        metrics: mapLeaseSummary(raw.summary),
        profitability: mapLeaseProfitability(raw.profitability),
        lifecycle: mapLeaseLifecycle(raw.lifecycle),
        statusBreakdown: mapLeaseStatusBreakdown(raw.statusBreakdown)
    };
}
//# sourceMappingURL=lease-analytics.js.map