"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPropertyPerformanceRpcResponse = isPropertyPerformanceRpcResponse;
exports.isMaintenanceAnalyticsRpcResponse = isMaintenanceAnalyticsRpcResponse;
function isPropertyPerformanceRpcResponse(data) {
    if (!data || typeof data !== 'object')
        return false;
    const obj = data;
    return ('property_name' in obj &&
        typeof obj.property_name === 'string' &&
        'property_id' in obj &&
        typeof obj.property_id === 'string' &&
        'total_units' in obj &&
        typeof obj.total_units === 'number');
}
function isMaintenanceAnalyticsRpcResponse(data) {
    if (!data || typeof data !== 'object')
        return false;
    const obj = data;
    return ('avg_resolution_time' in obj &&
        typeof obj.avg_resolution_time === 'number' &&
        'completion_rate' in obj &&
        typeof obj.completion_rate === 'number');
}
