/**
 * Maintenance constants
 */
export const PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    EMERGENCY: 'EMERGENCY'
};
export const MAINTENANCE_CATEGORY = {
    GENERAL: 'GENERAL',
    PLUMBING: 'PLUMBING',
    ELECTRICAL: 'ELECTRICAL',
    HVAC: 'HVAC',
    APPLIANCES: 'APPLIANCES',
    SAFETY: 'SAFETY',
    OTHER: 'OTHER'
};
export const REQUEST_STATUS = {
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELED: 'CANCELED',
    ON_HOLD: 'ON_HOLD'
};
// Derived options arrays for frontend use
export const PRIORITY_OPTIONS = Object.values(PRIORITY);
export const REQUEST_STATUS_OPTIONS = Object.values(REQUEST_STATUS);
//# sourceMappingURL=maintenance.js.map