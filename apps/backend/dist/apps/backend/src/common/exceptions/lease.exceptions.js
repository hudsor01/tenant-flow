"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseTerminationException = exports.LeaseConflictException = exports.InvalidLeaseDatesException = exports.InvalidLeaseStatusException = exports.LeaseAccessDeniedException = exports.LeaseNotFoundException = void 0;
const base_exception_1 = require("./base.exception");
class LeaseNotFoundException extends base_exception_1.NotFoundException {
    constructor(leaseId) {
        super('Lease', leaseId);
    }
}
exports.LeaseNotFoundException = LeaseNotFoundException;
class LeaseAccessDeniedException extends base_exception_1.AuthorizationException {
    constructor(leaseId, operation) {
        super(`You do not have permission to ${operation} this lease`, 'Lease', operation, {
            identifier: leaseId
        });
    }
}
exports.LeaseAccessDeniedException = LeaseAccessDeniedException;
class InvalidLeaseStatusException extends base_exception_1.ValidationException {
    constructor(leaseId, currentStatus, targetStatus) {
        const message = `Cannot change lease status from ${currentStatus} to ${targetStatus}`;
        super(message, 'status', [currentStatus, targetStatus], {
            resource: 'Lease',
            identifier: leaseId,
            currentStatus,
            targetStatus
        });
    }
}
exports.InvalidLeaseStatusException = InvalidLeaseStatusException;
class InvalidLeaseDatesException extends base_exception_1.ValidationException {
    constructor(leaseId, startDate, endDate) {
        const message = `Lease end date (${endDate}) must be after start date (${startDate})`;
        super(message, 'dates', [startDate, endDate], {
            resource: 'Lease',
            identifier: leaseId,
            startDate,
            endDate
        });
    }
}
exports.InvalidLeaseDatesException = InvalidLeaseDatesException;
class LeaseConflictException extends base_exception_1.ConflictException {
    constructor(unitId, startDate, endDate) {
        const message = `Lease dates conflict with existing lease for this unit`;
        super('Lease', undefined, message, undefined, {
            unitId,
            conflictingPeriod: { startDate, endDate }
        });
    }
}
exports.LeaseConflictException = LeaseConflictException;
class LeaseTerminationException extends base_exception_1.BusinessException {
    constructor(leaseId, reason) {
        const message = `Cannot terminate lease: ${reason}`;
        super('LEASE_TERMINATION_ERROR', message, undefined, {
            resource: 'Lease',
            identifier: leaseId,
            reason
        });
    }
}
exports.LeaseTerminationException = LeaseTerminationException;
