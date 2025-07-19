/**
 * Maintenance constants
 * Runtime constants and enums for maintenance management
 */
export const PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    EMERGENCY: 'EMERGENCY'
};
export const PRIORITY_OPTIONS = Object.values(PRIORITY);
export const REQUEST_STATUS = {
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELED: 'CANCELED',
    ON_HOLD: 'ON_HOLD'
};
export const REQUEST_STATUS_OPTIONS = Object.values(REQUEST_STATUS);
