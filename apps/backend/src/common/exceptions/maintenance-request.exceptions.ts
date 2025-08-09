import { 
  NotFoundException,
  AuthorizationException,
  ValidationException,
  BusinessException
} from './base.exception'

/**
 * Exception thrown when a maintenance request is not found
 */
export class MaintenanceRequestNotFoundException extends NotFoundException {
  constructor(maintenanceRequestId: string) {
    super('MaintenanceRequest', maintenanceRequestId)
  }
}

/**
 * Exception thrown when user doesn't have permission to access a maintenance request
 */
export class MaintenanceRequestAccessDeniedException extends AuthorizationException {
  constructor(maintenanceRequestId: string, operation: string) {
    super(`You do not have permission to ${operation} this maintenance request`, 'MaintenanceRequest', operation, { 
      identifier: maintenanceRequestId 
    })
  }
}

/**
 * Exception thrown when trying to perform invalid status transition
 */
export class InvalidMaintenanceRequestStatusException extends ValidationException {
  constructor(maintenanceRequestId: string, currentStatus: string, targetStatus: string) {
    const message = `Cannot change maintenance request status from ${currentStatus} to ${targetStatus}`
    super(message, 'status', [currentStatus, targetStatus], { 
      resource: 'MaintenanceRequest',
      identifier: maintenanceRequestId,
      currentStatus,
      targetStatus 
    })
  }
}

/**
 * Exception thrown when file operations fail
 */
export class MaintenanceRequestFileException extends BusinessException {
  constructor(maintenanceRequestId: string, operation: string, reason: string) {
    const message = `File ${operation} failed for maintenance request: ${reason}`
    super('MAINTENANCE_REQUEST_FILE_ERROR', message, undefined, { 
      resource: 'MaintenanceRequest',
      identifier: maintenanceRequestId,
      operation,
      reason 
    })
  }
}