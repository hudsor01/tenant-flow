"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapOccupancyMetrics = mapOccupancyMetrics;
exports.mapOccupancyTrends = mapOccupancyTrends;
exports.mapVacancyAnalysis = mapVacancyAnalysis;
exports.buildOccupancyAnalyticsPageResponse = buildOccupancyAnalyticsPageResponse;
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
function mapOccupancyMetrics(data) {
    if (!isObject(data)) {
        return {
            currentOccupancy: 0,
            averageVacancyDays: 0,
            seasonalPeakOccupancy: 0,
            trend: 0
        };
    }
    return {
        currentOccupancy: toNumber(data.current_occupancy ?? data.currentOccupancy ?? data.occupancy_rate),
        averageVacancyDays: toNumber(data.average_vacancy_days ?? data.avgVacancyDays),
        seasonalPeakOccupancy: toNumber(data.seasonal_peak_occupancy ?? data.seasonalPeak ?? data.peak_occupancy),
        trend: toNumber(data.trend ?? data.delta ?? 0)
    };
}
function mapOccupancyTrends(data) {
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(item => {
        const record = isObject(item) ? item : {};
        return {
            period: toString(record.period ?? record.month ?? record.date ?? ''),
            occupancyRate: toNumber(record.occupancy_rate ?? record.occupancyRate ?? record.rate),
            occupiedUnits: toNumber(record.occupied_units ?? record.occupiedUnits ?? record.occupied),
            totalUnits: toNumber(record.total_units ?? record.totalUnits ?? record.total)
        };
    });
}
function mapVacancyAnalysis(data) {
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(item => {
        const record = isObject(item) ? item : {};
        return {
            propertyId: toString(record.property_id ?? record.propertyId ?? ''),
            propertyName: toString(record.property_name ?? record.propertyName ?? 'Property'),
            vacancyDays: toNumber(record.vacancy_days ?? record.avgVacancyDays ?? record.days),
            turnovers: toNumber(record.turnovers ?? record.move_outs ?? record.turnover_count),
            notes: toString(record.notes ?? record.remark ?? '')
        };
    });
}
function buildOccupancyAnalyticsPageResponse(raw) {
    return {
        metrics: mapOccupancyMetrics(raw.metrics),
        trends: mapOccupancyTrends(raw.trends),
        vacancyAnalysis: mapVacancyAnalysis(raw.vacancy)
    };
}
//# sourceMappingURL=occupancy-analytics.js.map