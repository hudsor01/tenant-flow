import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Exception thrown when a maintenance request is not found
 */
export class MaintenanceRequestNotFoundException extends HttpException {
  constructor(maintenanceRequestId: string) {
    super({
      error: {
        code: 'MAINTENANCE_REQUEST_NOT_FOUND',
        message: `Maintenance request with ID ${maintenanceRequestId} not found`,
        statusCode: HttpStatus.NOT_FOUND,
        resource: 'MaintenanceRequest',
        identifier: maintenanceRequestId
      }
    }, HttpStatus.NOT_FOUND)
  }
}

/**
 * Exception thrown when user doesn't have permission to access a maintenance request
 */
export class MaintenanceRequestAccessDeniedException extends HttpException {
  constructor(maintenanceRequestId: string, operation: string) {
    super({
      error: {
        code: 'MAINTENANCE_REQUEST_ACCESS_DENIED',
        message: `You do not have permission to ${operation} this maintenance request`,
        statusCode: HttpStatus.FORBIDDEN,
        resource: 'MaintenanceRequest',
        identifier: maintenanceRequestId,
        operation
      }
    }, HttpStatus.FORBIDDEN)
  }
}

/**
 * Exception thrown when trying to perform invalid status transition
 */
export class InvalidMaintenanceRequestStatusException extends HttpException {
  constructor(maintenanceRequestId: string, currentStatus: string, targetStatus: string) {
    super({
      error: {
        code: 'INVALID_MAINTENANCE_REQUEST_STATUS_TRANSITION',
        message: `Cannot change maintenance request status from ${currentStatus} to ${targetStatus}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'MaintenanceRequest',
        identifier: maintenanceRequestId,
        currentStatus,
        targetStatus
      }
    }, HttpStatus.BAD_REQUEST)
  }
}

/**
 * Exception thrown when file operations fail
 */
export class MaintenanceRequestFileException extends HttpException {
  constructor(maintenanceRequestId: string, operation: string, reason: string) {
    super({
      error: {
        code: 'MAINTENANCE_REQUEST_FILE_ERROR',
        message: `File ${operation} failed for maintenance request: ${reason}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'MaintenanceRequest',
        identifier: maintenanceRequestId,
        operation,
        reason
      }
    }, HttpStatus.BAD_REQUEST)
  }
}