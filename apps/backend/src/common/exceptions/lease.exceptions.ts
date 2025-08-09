import { 
  NotFoundException,
  AuthorizationException,
  ValidationException,
  ConflictException,
  BusinessException
} from './base.exception'

/**
 * Exception thrown when a lease is not found
 */
export class LeaseNotFoundException extends NotFoundException {
  constructor(leaseId: string) {
    super('Lease', leaseId)
  }
}

/**
 * Exception thrown when user doesn't have permission to access a lease
 */
export class LeaseAccessDeniedException extends AuthorizationException {
  constructor(leaseId: string, operation: string) {
    super(`You do not have permission to ${operation} this lease`, 'Lease', operation, { 
      identifier: leaseId 
    })
  }
}

/**
 * Exception thrown when trying to perform invalid status transition
 */
export class InvalidLeaseStatusException extends ValidationException {
  constructor(leaseId: string, currentStatus: string, targetStatus: string) {
    const message = `Cannot change lease status from ${currentStatus} to ${targetStatus}`
    super(message, 'status', [currentStatus, targetStatus], { 
      resource: 'Lease',
      identifier: leaseId,
      currentStatus,
      targetStatus 
    })
  }
}

/**
 * Exception thrown when lease dates are invalid
 */
export class InvalidLeaseDatesException extends ValidationException {
  constructor(leaseId: string, startDate: string, endDate: string) {
    const message = `Lease end date (${endDate}) must be after start date (${startDate})`
    super(message, 'dates', [startDate, endDate], { 
      resource: 'Lease',
      identifier: leaseId,
      startDate,
      endDate 
    })
  }
}

/**
 * Exception thrown when lease conflicts with existing lease
 */
export class LeaseConflictException extends ConflictException {
  constructor(unitId: string, startDate: string, endDate: string) {
    const message = `Lease dates conflict with existing lease for this unit`
    super('Lease', undefined, message, undefined, { 
      unitId,
      conflictingPeriod: { startDate, endDate } 
    })
  }
}

/**
 * Exception thrown when trying to terminate a lease that cannot be terminated
 */
export class LeaseTerminationException extends BusinessException {
  constructor(leaseId: string, reason: string) {
    const message = `Cannot terminate lease: ${reason}`
    super('LEASE_TERMINATION_ERROR', message, undefined, { 
      resource: 'Lease',
      identifier: leaseId,
      reason 
    })
  }
}