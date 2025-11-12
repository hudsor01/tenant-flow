"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPropertyPerformance = mapPropertyPerformance;
exports.computePropertySummary = computePropertySummary;
exports.mapPropertyUnits = mapPropertyUnits;
exports.mapUnitStatistics = mapUnitStatistics;
exports.mapVisitorAnalytics = mapVisitorAnalytics;
exports.buildPropertyPerformancePageResponse = buildPropertyPerformancePageResponse;
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
    if (typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
    }
    return fallback;
}
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function mapPropertyPerformance(data) {
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(item => {
        const record = isObject(item) ? item : {};
        const propertyName = toString(record.property_name ?? record.propertyName ?? record.property);
        const trendValue = record.trend ?? record.trend_direction;
        const trend = trendValue === 'up' || trendValue === 'down' || trendValue === 'stable'
            ? trendValue
            : 'stable';
        const trendPercentage = toNumber(record.trend_percentage ?? record.trendPercentage, 0);
        return {
            propertyId: toString(record.property_id ?? record.propertyId, propertyName),
            propertyName,
            occupancyRate: toNumber(record.occupancy_rate ?? record.occupancyRate),
            monthlyRevenue: toNumber(record.monthly_revenue ?? record.monthlyRevenue),
            annualRevenue: toNumber(record.annual_revenue ?? record.annualRevenue),
            totalUnits: toNumber(record.total_units ?? record.units ?? record.totalUnits),
            occupiedUnits: toNumber(record.occupied_units ?? record.occupiedUnits ?? record.occupied),
            vacantUnits: toNumber(record.vacant_units ?? record.vacantUnits),
            address: toString(record.address ?? record.formatted_address ?? ''),
            status: toString(record.status ?? record.state ?? ''),
            propertyType: toString(record.property_type ?? record.type ?? ''),
            trend,
            trendPercentage
        };
    });
}
function computePropertySummary(performance) {
    if (!performance.length) {
        return {
            totalProperties: 0,
            totalUnits: 0,
            occupiedUnits: 0,
            averageOccupancy: 0,
            totalRevenue: 0
        };
    }
    const totals = performance.reduce((acc, item) => {
        acc.totalUnits += item.totalUnits;
        acc.occupiedUnits += item.occupiedUnits;
        acc.totalRevenue += item.monthlyRevenue;
        return acc;
    }, { totalUnits: 0, occupiedUnits: 0, totalRevenue: 0 });
    const sortedByOccupancy = [...performance].sort((a, b) => b.occupancyRate - a.occupancyRate);
    const averageOccupancy = performance.reduce((acc, item) => acc + item.occupancyRate, 0) /
        performance.length;
    const summary = {
        totalProperties: performance.length,
        totalUnits: totals.totalUnits,
        occupiedUnits: totals.occupiedUnits,
        averageOccupancy: Number.isFinite(averageOccupancy)
            ? Number(averageOccupancy.toFixed(1))
            : 0,
        totalRevenue: totals.totalRevenue
    };
    const bestPerformer = sortedByOccupancy[0]?.propertyName;
    if (bestPerformer !== undefined)
        summary.bestPerformer = bestPerformer;
    const worstPerformer = sortedByOccupancy.at(-1)?.propertyName;
    if (worstPerformer !== undefined)
        summary.worstPerformer = worstPerformer;
    return summary;
}
function mapPropertyUnits(data) {
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(item => {
        const record = isObject(item) ? item : {};
        return {
            propertyId: toString(record.property_id ?? record.propertyId ?? ''),
            unitId: toString(record.unit_id ?? record.unitId ?? toString(record.id ?? '')),
            unitNumber: toString(record.unit_number ?? record.unitNumber ?? 'Unit'),
            status: toString(record.status ?? record.state ?? 'unknown').toUpperCase(),
            bedrooms: record.bedrooms === null ? null : toNumber(record.bedrooms),
            bathrooms: record.bathrooms === null ? null : toNumber(record.bathrooms),
            rent: record.rent_amount === null
                ? null
                : toNumber(record.rent_amount ?? record.rent),
            squareFeet: record.square_feet === null
                ? null
                : toNumber(record.square_feet ?? record.squareFeet)
        };
    });
}
function mapUnitStatistics(data) {
    if (Array.isArray(data)) {
        return data.map(item => {
            const record = isObject(item) ? item : {};
            return {
                label: toString(record.label ?? record.metric ?? 'Metric'),
                value: toNumber(record.value ?? record.count),
                trend: record.trend === null
                    ? null
                    : toNumber(record.trend ?? record.delta ?? 0)
            };
        });
    }
    if (isObject(data)) {
        return Object.entries(data).map(([key, value]) => ({
            label: toString(key),
            value: toNumber(value)
        }));
    }
    return [];
}
function mapVisitorAnalytics(data) {
    if (!data) {
        return {
            summary: {
                totalVisits: 0,
                totalInquiries: 0,
                totalConversions: 0,
                conversionRate: 0
            },
            timeline: []
        };
    }
    const record = isObject(data) ? data : {};
    const timelineSource = Array.isArray(record.timeline)
        ? record.timeline
        : Array.isArray(record.points)
            ? record.points
            : Array.isArray(data)
                ? data
                : [];
    const timeline = timelineSource.map(item => {
        const entry = isObject(item) ? item : {};
        return {
            period: toString(entry.period ?? entry.date ?? entry.month ?? ''),
            visits: toNumber(entry.visits ?? entry.views ?? entry.traffic),
            inquiries: toNumber(entry.inquiries ?? entry.leads),
            conversions: toNumber(entry.conversions ?? entry.signups ?? entry.applications)
        };
    });
    const summaryRecord = isObject(record.summary) ? record.summary : record;
    const totalVisits = toNumber(summaryRecord.total_visits ??
        summaryRecord.visits ??
        timeline.reduce((acc, point) => acc + point.visits, 0));
    const totalInquiries = toNumber(summaryRecord.total_inquiries ??
        summaryRecord.inquiries ??
        timeline.reduce((acc, point) => acc + point.inquiries, 0));
    const totalConversions = toNumber(summaryRecord.total_conversions ??
        summaryRecord.conversions ??
        timeline.reduce((acc, point) => acc + point.conversions, 0));
    const conversionRate = totalVisits > 0
        ? Number(((totalConversions / totalVisits) * 100).toFixed(1))
        : 0;
    return {
        summary: {
            totalVisits,
            totalInquiries,
            totalConversions,
            conversionRate
        },
        timeline
    };
}
function buildPropertyPerformancePageResponse(raw) {
    const performance = mapPropertyPerformance(raw.performance);
    return {
        metrics: computePropertySummary(performance),
        performance,
        units: mapPropertyUnits(raw.units),
        unitStats: mapUnitStatistics(raw.unitStats),
        visitorAnalytics: mapVisitorAnalytics(raw.visitorAnalytics)
    };
}
//# sourceMappingURL=property-analytics.js.map