"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceRequestFileException = exports.InvalidMaintenanceRequestStatusException = exports.MaintenanceRequestAccessDeniedException = exports.MaintenanceRequestNotFoundException = void 0;
const base_exception_1 = require("./base.exception");
class MaintenanceRequestNotFoundException extends base_exception_1.NotFoundException {
    constructor(maintenanceRequestId) {
        super('MaintenanceRequest', maintenanceRequestId);
    }
}
exports.MaintenanceRequestNotFoundException = MaintenanceRequestNotFoundException;
class MaintenanceRequestAccessDeniedException extends base_exception_1.AuthorizationException {
    constructor(maintenanceRequestId, operation) {
        super(`You do not have permission to ${operation} this maintenance request`, 'MaintenanceRequest', operation, {
            identifier: maintenanceRequestId
        });
    }
}
exports.MaintenanceRequestAccessDeniedException = MaintenanceRequestAccessDeniedException;
class InvalidMaintenanceRequestStatusException extends base_exception_1.ValidationException {
    constructor(maintenanceRequestId, currentStatus, targetStatus) {
        const message = `Cannot change maintenance request status from ${currentStatus} to ${targetStatus}`;
        super(message, 'status', [currentStatus, targetStatus], {
            resource: 'MaintenanceRequest',
            identifier: maintenanceRequestId,
            currentStatus,
            targetStatus
        });
    }
}
exports.InvalidMaintenanceRequestStatusException = InvalidMaintenanceRequestStatusException;
class MaintenanceRequestFileException extends base_exception_1.BusinessException {
    constructor(maintenanceRequestId, operation, reason) {
        const message = `File ${operation} failed for maintenance request: ${reason}`;
        super('MAINTENANCE_REQUEST_FILE_ERROR', message, undefined, {
            resource: 'MaintenanceRequest',
            identifier: maintenanceRequestId,
            operation,
            reason
        });
    }
}
exports.MaintenanceRequestFileException = MaintenanceRequestFileException;
