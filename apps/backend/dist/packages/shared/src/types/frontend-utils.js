"use strict";
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
function tenantHasLeases(tenant) {
    return Array.isArray(tenant.leases) && tenant.leases.length > 0;
}
function isValidId(value) {
    return typeof value === 'string' && value.length > 0;
}
function propertyHasUnits(property) {
    return 'units' in property && Array.isArray(property.units) && property.units.length > 0;
}
function unitHasActiveLeases(unit) {
    return 'leases' in unit && Array.isArray(unit.leases) &&
        unit.leases.some(lease => lease.status === 'ACTIVE');
}
function getTenantLeases(tenant) {
    return tenant.leases || [];
}
function getActiveTenantLeases(tenant) {
    return getTenantLeases(tenant).filter(lease => lease.status === 'ACTIVE');
}
function getPropertyUnits(property) {
    return 'units' in property && Array.isArray(property.units) ? property.units : [];
}
function getOccupiedUnitsCount(property) {
    const units = getPropertyUnits(property);
    return units.filter(unit => unitHasActiveLeases(unit)).length;
}
function getPropertyRevenue(property) {
    const units = getPropertyUnits(property);
    return units.reduce((total, unit) => {
        if (unitHasActiveLeases(unit)) {
            return total + (unit.rent || 0);
        }
        return total;
    }, 0);
}
function canAccessProperty(property, userId) {
    return property.ownerId === userId;
}
function canAccessTenant(tenant, userId) {
    return tenant.leases.some(lease => lease.unit?.property?.ownerId === userId);
}
function canAccessUnit(unit, userId) {
    return unit.property.ownerId === userId;
}
