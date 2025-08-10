/**
 * Frontend utility types and type guards
 * Type guards, utility functions, and frontend-specific relationship types
 */
// ========================
// Type Guards
// ========================
/**
 * Type guard to check if tenant has leases
 */
export function tenantHasLeases(tenant) {
    return Array.isArray(tenant.leases) && tenant.leases.length > 0;
}
/**
 * Type guard to check if a value is a valid string ID
 */
export function isValidId(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Type guard to check if a property has units
 */
export function propertyHasUnits(property) {
    return 'units' in property && Array.isArray(property.units) && property.units.length > 0;
}
/**
 * Type guard to check if a unit has active leases
 */
export function unitHasActiveLeases(unit) {
    return 'leases' in unit && Array.isArray(unit.leases) &&
        unit.leases.some(lease => lease.status === 'ACTIVE');
}
// ========================
// Utility Functions
// ========================
/**
 * Get leases from tenant safely
 */
export function getTenantLeases(tenant) {
    return tenant.leases || [];
}
/**
 * Get active leases from tenant
 */
export function getActiveTenantLeases(tenant) {
    return getTenantLeases(tenant).filter(lease => lease.status === 'ACTIVE');
}
/**
 * Get units from property safely
 */
export function getPropertyUnits(property) {
    return 'units' in property && Array.isArray(property.units) ? property.units : [];
}
/**
 * Get occupied units count
 */
export function getOccupiedUnitsCount(property) {
    const units = getPropertyUnits(property);
    return units.filter(unit => unitHasActiveLeases(unit)).length;
}
/**
 * Get total revenue from property
 */
export function getPropertyRevenue(property) {
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
export function canAccessProperty(property, userId) {
    return property.ownerId === userId;
}
/**
 * Check if user can access tenant data
 */
export function canAccessTenant(tenant, userId) {
    return tenant.leases.some(lease => lease.unit?.property?.ownerId === userId);
}
/**
 * Check if user can access unit
 */
export function canAccessUnit(unit, userId) {
    return unit.property.ownerId === userId;
}
//# sourceMappingURL=frontend-utils.js.map