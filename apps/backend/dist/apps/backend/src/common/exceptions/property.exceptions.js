"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidPropertyAddressException = exports.InvalidPropertyTypeException = exports.PropertyHasOccupiedUnitsException = exports.PropertyHasActiveLeasesException = exports.DuplicatePropertyNameException = exports.PropertyAccessDeniedException = exports.PropertyLimitExceededException = exports.PropertyNotFoundException = void 0;
const base_exception_1 = require("./base.exception");
class PropertyNotFoundException extends base_exception_1.NotFoundException {
    constructor(propertyId) {
        super('Property', propertyId);
    }
}
exports.PropertyNotFoundException = PropertyNotFoundException;
class PropertyLimitExceededException extends base_exception_1.ResourceLimitException {
    constructor(limit, currentCount) {
        super('Property', limit, currentCount);
    }
}
exports.PropertyLimitExceededException = PropertyLimitExceededException;
class PropertyAccessDeniedException extends base_exception_1.AuthorizationException {
    constructor(propertyId, operation) {
        super(`You do not have permission to ${operation} this property`, 'Property', operation, {
            identifier: propertyId
        });
    }
}
exports.PropertyAccessDeniedException = PropertyAccessDeniedException;
class DuplicatePropertyNameException extends base_exception_1.DuplicateResourceException {
    constructor(propertyName) {
        super('Property', 'name', propertyName);
    }
}
exports.DuplicatePropertyNameException = DuplicatePropertyNameException;
class PropertyHasActiveLeasesException extends base_exception_1.ConflictException {
    constructor(propertyId, activeLeaseCount) {
        const message = `Cannot delete property because it has ${activeLeaseCount} active lease${activeLeaseCount > 1 ? 's' : ''}. Please terminate all leases before deleting the property.`;
        super('Property', propertyId, message, undefined, { activeLeaseCount });
    }
}
exports.PropertyHasActiveLeasesException = PropertyHasActiveLeasesException;
class PropertyHasOccupiedUnitsException extends base_exception_1.ConflictException {
    constructor(propertyId, occupiedUnitCount) {
        const message = `Cannot delete property because it has ${occupiedUnitCount} occupied unit${occupiedUnitCount > 1 ? 's' : ''}. Please ensure all units are vacant before deleting the property.`;
        super('Property', propertyId, message, undefined, { occupiedUnitCount });
    }
}
exports.PropertyHasOccupiedUnitsException = PropertyHasOccupiedUnitsException;
class InvalidPropertyTypeException extends base_exception_1.ValidationException {
    constructor(propertyType, validTypes) {
        const message = `Invalid property type "${propertyType}". Valid types are: ${validTypes.join(', ')}`;
        super(message, 'propertyType', [propertyType], { validTypes, resource: 'Property' });
    }
}
exports.InvalidPropertyTypeException = InvalidPropertyTypeException;
class InvalidPropertyAddressException extends base_exception_1.ValidationException {
    constructor(field, reason) {
        const message = `Invalid property address: ${reason}`;
        super(message, field, [reason], { resource: 'Property' });
    }
}
exports.InvalidPropertyAddressException = InvalidPropertyAddressException;
