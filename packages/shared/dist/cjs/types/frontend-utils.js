"use strict";
/**
 * Frontend utility types and type guards
 * Type guards, utility functions, and frontend-specific relationship types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantHasLeases = tenantHasLeases;
exports.isValidId = isValidId;
exports.propertyHasUnits = propertyHasUnits;
exports.unitHasActiveLeases = unitHasActiveLeases;
exports.getTenantLeases = getTenantLeases;
exports.getActiveTenantLeases = getActiveTenantLeases;
exports.getPropertyUnits = getPropertyUnits;
exports.getOccupiedUnitsCount = getOccupiedUnitsCount;
exports.getPropertyRevenue = getPropertyRevenue;
exports.canAccessProperty = canAccessProperty;
exports.canAccessTenant = canAccessTenant;
exports.canAccessUnit = canAccessUnit;
// ========================
// Type Guards
// ========================
/**
 * Type guard to check if tenant has leases
 */
function tenantHasLeases(tenant) {
    return Array.isArray(tenant.leases) && tenant.leases.length > 0;
}
/**
 * Type guard to check if a value is a valid string ID
 */
function isValidId(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Type guard to check if a property has units
 */
function propertyHasUnits(property) {
    return 'units' in property && Array.isArray(property.units) && property.units.length > 0;
}
/**
 * Type guard to check if a unit has active leases
 */
function unitHasActiveLeases(unit) {
    return 'leases' in unit && Array.isArray(unit.leases) &&
        unit.leases.some(lease => lease.status === 'ACTIVE');
}
// ========================
// Utility Functions
// ========================
/**
 * Get leases from tenant safely
 */
function getTenantLeases(tenant) {
    return tenant.leases || [];
}
/**
 * Get active leases from tenant
 */
function getActiveTenantLeases(tenant) {
    return getTenantLeases(tenant).filter(lease => lease.status === 'ACTIVE');
}
/**
 * Get units from property safely
 */
function getPropertyUnits(property) {
    return 'units' in property && Array.isArray(property.units) ? property.units : [];
}
/**
 * Get occupied units count
 */
function getOccupiedUnitsCount(property) {
    const units = getPropertyUnits(property);
    return units.filter(unit => unitHasActiveLeases(unit)).length;
}
/**
 * Get total revenue from property
 */
function getPropertyRevenue(property) {
    const units = getPropertyUnits(property);
    return units.reduce((total, unit) => {
        if (unitHasActiveLeases(unit)) {
            return total + (unit.rent || 0);
        }
        return total;
    }, 0);
}
/**
 * Check if user can access property
 */
function canAccessProperty(property, userId) {
    return property.ownerId === userId;
}
/**
 * Check if user can access tenant data
 */
function canAccessTenant(tenant, userId) {
    return tenant.leases.some(lease => lease.unit?.property?.ownerId === userId);
}
/**
 * Check if user can access unit
 */
function canAccessUnit(unit, userId) {
    return unit.property.ownerId === userId;
}
//# sourceMappingURL=frontend-utils.js.map