import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Exception thrown when a lease is not found
 */
export class LeaseNotFoundException extends HttpException {
  constructor(leaseId: string) {
    super({
      error: {
        code: 'LEASE_NOT_FOUND',
        message: `Lease with ID ${leaseId} not found`,
        statusCode: HttpStatus.NOT_FOUND,
        resource: 'Lease',
        identifier: leaseId
      }
    }, HttpStatus.NOT_FOUND)
  }
}

/**
 * Exception thrown when user doesn't have permission to access a lease
 */
export class LeaseAccessDeniedException extends HttpException {
  constructor(leaseId: string, operation: string) {
    super({
      error: {
        code: 'LEASE_ACCESS_DENIED',
        message: `You do not have permission to ${operation} this lease`,
        statusCode: HttpStatus.FORBIDDEN,
        resource: 'Lease',
        identifier: leaseId,
        operation
      }
    }, HttpStatus.FORBIDDEN)
  }
}

/**
 * Exception thrown when trying to perform invalid status transition
 */
export class InvalidLeaseStatusException extends HttpException {
  constructor(leaseId: string, currentStatus: string, targetStatus: string) {
    super({
      error: {
        code: 'INVALID_LEASE_STATUS_TRANSITION',
        message: `Cannot change lease status from ${currentStatus} to ${targetStatus}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Lease',
        identifier: leaseId,
        currentStatus,
        targetStatus
      }
    }, HttpStatus.BAD_REQUEST)
  }
}

/**
 * Exception thrown when lease dates are invalid
 */
export class InvalidLeaseDatesException extends HttpException {
  constructor(leaseId: string, startDate: string, endDate: string) {
    super({
      error: {
        code: 'INVALID_LEASE_DATES',
        message: `Lease end date (${endDate}) must be after start date (${startDate})`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Lease',
        identifier: leaseId,
        startDate,
        endDate
      }
    }, HttpStatus.BAD_REQUEST)
  }
}

/**
 * Exception thrown when lease conflicts with existing lease
 */
export class LeaseConflictException extends HttpException {
  constructor(unitId: string, startDate: string, endDate: string) {
    super({
      error: {
        code: 'LEASE_CONFLICT',
        message: `Lease dates conflict with existing lease for this unit`,
        statusCode: HttpStatus.CONFLICT,
        resource: 'Lease',
        unitId,
        conflictingPeriod: { startDate, endDate }
      }
    }, HttpStatus.CONFLICT)
  }
}

/**
 * Exception thrown when trying to terminate a lease that cannot be terminated
 */
export class LeaseTerminationException extends HttpException {
  constructor(leaseId: string, reason: string) {
    super({
      error: {
        code: 'LEASE_TERMINATION_ERROR',
        message: `Cannot terminate lease: ${reason}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Lease',
        identifier: leaseId,
        reason
      }
    }, HttpStatus.BAD_REQUEST)
  }
}