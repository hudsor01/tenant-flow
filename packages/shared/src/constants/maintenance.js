"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_STATUS_OPTIONS = exports.PRIORITY_OPTIONS = exports.REQUEST_STATUS = exports.MAINTENANCE_CATEGORY = exports.PRIORITY = void 0;
exports.PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    EMERGENCY: 'EMERGENCY'
};
exports.MAINTENANCE_CATEGORY = {
    GENERAL: 'GENERAL',
    PLUMBING: 'PLUMBING',
    ELECTRICAL: 'ELECTRICAL',
    HVAC: 'HVAC',
    APPLIANCES: 'APPLIANCES',
    SAFETY: 'SAFETY',
    OTHER: 'OTHER'
};
exports.REQUEST_STATUS = {
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELED: 'CANCELED',
    ON_HOLD: 'ON_HOLD'
};
exports.PRIORITY_OPTIONS = Object.values(exports.PRIORITY);
exports.REQUEST_STATUS_OPTIONS = Object.values(exports.REQUEST_STATUS);
