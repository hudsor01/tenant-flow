import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Exception thrown when a property is not found
 */
export class PropertyNotFoundException extends HttpException {
  constructor(propertyId: string) {
    super({
      error: {
        code: 'PROPERTY_NOT_FOUND',
        message: `Property with ID ${propertyId} not found`,
        statusCode: HttpStatus.NOT_FOUND,
        resource: 'Property',
        identifier: propertyId
      }
    }, HttpStatus.NOT_FOUND)
  }
}

/**
 * Exception thrown when user exceeds their property limit
 */
export class PropertyLimitExceededException extends HttpException {
  constructor(limit: number, currentCount: number) {
    super({
      error: {
        code: 'PROPERTY_LIMIT_EXCEEDED',
        message: `You have reached your property limit of ${limit}. You currently have ${currentCount} properties. Please upgrade your subscription to add more properties.`,
        statusCode: HttpStatus.FORBIDDEN,
        resource: 'Property',
        limit,
        currentCount
      }
    }, HttpStatus.FORBIDDEN)
  }
}

/**
 * Exception thrown when user doesn't have permission to access a property
 */
export class PropertyAccessDeniedException extends HttpException {
  constructor(propertyId: string, operation: string) {
    super({
      error: {
        code: 'PROPERTY_ACCESS_DENIED',
        message: `You do not have permission to ${operation} this property`,
        statusCode: HttpStatus.FORBIDDEN,
        resource: 'Property',
        identifier: propertyId,
        operation
      }
    }, HttpStatus.FORBIDDEN)
  }
}

/**
 * Exception thrown when property name already exists for user
 */
export class DuplicatePropertyNameException extends HttpException {
  constructor(propertyName: string) {
    super({
      error: {
        code: 'DUPLICATE_PROPERTY_NAME',
        message: `A property with the name "${propertyName}" already exists in your account`,
        statusCode: HttpStatus.CONFLICT,
        resource: 'Property',
        field: 'name',
        value: propertyName
      }
    }, HttpStatus.CONFLICT)
  }
}

/**
 * Exception thrown when property has active leases and cannot be deleted
 */
export class PropertyHasActiveLeasesException extends HttpException {
  constructor(propertyId: string, activeLeaseCount: number) {
    super({
      error: {
        code: 'PROPERTY_HAS_ACTIVE_LEASES',
        message: `Cannot delete property because it has ${activeLeaseCount} active lease${activeLeaseCount > 1 ? 's' : ''}. Please terminate all leases before deleting the property.`,
        statusCode: HttpStatus.CONFLICT,
        resource: 'Property',
        identifier: propertyId,
        activeLeaseCount
      }
    }, HttpStatus.CONFLICT)
  }
}

/**
 * Exception thrown when property has occupied units and cannot be deleted
 */
export class PropertyHasOccupiedUnitsException extends HttpException {
  constructor(propertyId: string, occupiedUnitCount: number) {
    super({
      error: {
        code: 'PROPERTY_HAS_OCCUPIED_UNITS',
        message: `Cannot delete property because it has ${occupiedUnitCount} occupied unit${occupiedUnitCount > 1 ? 's' : ''}. Please ensure all units are vacant before deleting the property.`,
        statusCode: HttpStatus.CONFLICT,
        resource: 'Property',
        identifier: propertyId,
        occupiedUnitCount
      }
    }, HttpStatus.CONFLICT)
  }
}

/**
 * Exception thrown when invalid property type is provided
 */
export class InvalidPropertyTypeException extends HttpException {
  constructor(propertyType: string, validTypes: string[]) {
    super({
      error: {
        code: 'INVALID_PROPERTY_TYPE',
        message: `Invalid property type "${propertyType}". Valid types are: ${validTypes.join(', ')}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Property',
        field: 'propertyType',
        value: propertyType,
        validTypes
      }
    }, HttpStatus.BAD_REQUEST)
  }
}

/**
 * Exception thrown when property address is invalid
 */
export class InvalidPropertyAddressException extends HttpException {
  constructor(field: string, reason: string) {
    super({
      error: {
        code: 'INVALID_PROPERTY_ADDRESS',
        message: `Invalid property address: ${reason}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Property',
        field,
        reason
      }
    }, HttpStatus.BAD_REQUEST)
  }
}