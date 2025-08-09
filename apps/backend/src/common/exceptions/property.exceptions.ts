import { 
  NotFoundException,
  ResourceLimitException,
  AuthorizationException,
  DuplicateResourceException,
  ConflictException,
  ValidationException
} from './base.exception'

/**
 * Exception thrown when a property is not found
 */
export class PropertyNotFoundException extends NotFoundException {
  constructor(propertyId: string) {
    super('Property', propertyId)
  }
}

/**
 * Exception thrown when user exceeds their property limit
 */
export class PropertyLimitExceededException extends ResourceLimitException {
  constructor(limit: number, currentCount: number) {
    super('Property', limit, currentCount)
  }
}

/**
 * Exception thrown when user doesn't have permission to access a property
 */
export class PropertyAccessDeniedException extends AuthorizationException {
  constructor(propertyId: string, operation: string) {
    super(`You do not have permission to ${operation} this property`, 'Property', operation, { 
      identifier: propertyId 
    })
  }
}

/**
 * Exception thrown when property name already exists for user
 */
export class DuplicatePropertyNameException extends DuplicateResourceException {
  constructor(propertyName: string) {
    super('Property', 'name', propertyName)
  }
}

/**
 * Exception thrown when property has active leases and cannot be deleted
 */
export class PropertyHasActiveLeasesException extends ConflictException {
  constructor(propertyId: string, activeLeaseCount: number) {
    const message = `Cannot delete property because it has ${activeLeaseCount} active lease${activeLeaseCount > 1 ? 's' : ''}. Please terminate all leases before deleting the property.`
    super('Property', propertyId, message, undefined, { activeLeaseCount })
  }
}

/**
 * Exception thrown when property has occupied units and cannot be deleted
 */
export class PropertyHasOccupiedUnitsException extends ConflictException {
  constructor(propertyId: string, occupiedUnitCount: number) {
    const message = `Cannot delete property because it has ${occupiedUnitCount} occupied unit${occupiedUnitCount > 1 ? 's' : ''}. Please ensure all units are vacant before deleting the property.`
    super('Property', propertyId, message, undefined, { occupiedUnitCount })
  }
}

/**
 * Exception thrown when invalid property type is provided
 */
export class InvalidPropertyTypeException extends ValidationException {
  constructor(propertyType: string, validTypes: string[]) {
    const message = `Invalid property type "${propertyType}". Valid types are: ${validTypes.join(', ')}`
    super(message, 'propertyType', [propertyType], { validTypes, resource: 'Property' })
  }
}

/**
 * Exception thrown when property address is invalid
 */
export class InvalidPropertyAddressException extends ValidationException {
  constructor(field: string, reason: string) {
    const message = `Invalid property address: ${reason}`
    super(message, field, [reason], { resource: 'Property' })
  }
}