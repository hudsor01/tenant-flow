"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalServiceException = exports.RateLimitException = exports.SubscriptionException = exports.PaymentException = exports.ResourceLimitException = exports.DuplicateResourceException = exports.ConflictException = exports.NotFoundException = exports.AuthorizationException = exports.AuthenticationException = exports.ValidationException = exports.BusinessException = exports.BaseException = void 0;
const common_1 = require("@nestjs/common");
class BaseException extends common_1.HttpException {
    constructor(code, message, statusCode, details) {
        super({
            message,
            code,
            statusCode,
            timestamp: new Date().toISOString(),
            details
        }, statusCode);
        this.code = code;
        this.timestamp = new Date().toISOString();
        this.details = details;
        this.name = this.constructor.name;
    }
}
exports.BaseException = BaseException;
class BusinessException extends BaseException {
    constructor(code, message, statusCode = common_1.HttpStatus.BAD_REQUEST, details) {
        super(code, message, statusCode, details);
    }
}
exports.BusinessException = BusinessException;
class ValidationException extends BaseException {
    constructor(message, field, errors, details) {
        super('VALIDATION_ERROR', message, common_1.HttpStatus.BAD_REQUEST, {
            field,
            errors,
            ...details
        });
        this.field = field;
        this.errors = errors;
    }
}
exports.ValidationException = ValidationException;
class AuthenticationException extends BaseException {
    constructor(code = 'UNAUTHORIZED', message = 'Authentication required', details) {
        super(code, message, common_1.HttpStatus.UNAUTHORIZED, details);
    }
}
exports.AuthenticationException = AuthenticationException;
class AuthorizationException extends BaseException {
    constructor(message = 'Access denied', resource, operation, details) {
        super('FORBIDDEN', message, common_1.HttpStatus.FORBIDDEN, {
            resource,
            operation,
            ...details
        });
        this.resource = resource;
        this.operation = operation;
    }
}
exports.AuthorizationException = AuthorizationException;
class NotFoundException extends BaseException {
    constructor(resource, identifier, details) {
        const message = identifier
            ? `${resource} with ID '${identifier}' not found`
            : `${resource} not found`;
        super('RESOURCE_NOT_FOUND', message, common_1.HttpStatus.NOT_FOUND, {
            resource,
            identifier,
            ...details
        });
        this.resource = resource;
        this.identifier = identifier;
    }
}
exports.NotFoundException = NotFoundException;
class ConflictException extends BaseException {
    constructor(resource, identifier, customMessage, field, details) {
        const message = customMessage ||
            (identifier ? `${resource} with ID '${identifier}' has conflicts that prevent this operation`
                : `${resource} conflict`);
        super('RESOURCE_CONFLICT', message, common_1.HttpStatus.CONFLICT, {
            resource,
            identifier,
            field,
            ...details
        });
        this.resource = resource;
        this.field = field;
        this.identifier = identifier;
    }
}
exports.ConflictException = ConflictException;
class DuplicateResourceException extends BaseException {
    constructor(resource, field, value, details) {
        const message = `A ${resource.toLowerCase()} with ${field} "${value}" already exists`;
        super('DUPLICATE_RESOURCE', message, common_1.HttpStatus.CONFLICT, {
            resource,
            field,
            value,
            ...details
        });
        this.resource = resource;
        this.field = field;
        this.value = value;
    }
}
exports.DuplicateResourceException = DuplicateResourceException;
class ResourceLimitException extends BaseException {
    constructor(resource, limit, current, details) {
        const message = `You have reached your ${resource.toLowerCase()} limit of ${limit}. You currently have ${current} ${resource.toLowerCase()}${current === 1 ? '' : 's'}. Please upgrade your subscription to add more.`;
        super('RESOURCE_LIMIT_EXCEEDED', message, common_1.HttpStatus.FORBIDDEN, {
            resource,
            limit,
            current,
            ...details
        });
        this.resource = resource;
        this.limit = limit;
        this.current = current;
    }
}
exports.ResourceLimitException = ResourceLimitException;
class PaymentException extends BaseException {
    constructor(code, message, paymentCode, details) {
        super(code, message, common_1.HttpStatus.PAYMENT_REQUIRED, {
            paymentCode,
            ...details
        });
        this.paymentCode = paymentCode;
    }
}
exports.PaymentException = PaymentException;
class SubscriptionException extends BaseException {
    constructor(message, planType, requiredFeature, details) {
        super('SUBSCRIPTION_REQUIRED', message, common_1.HttpStatus.PAYMENT_REQUIRED, {
            planType,
            requiredFeature,
            ...details
        });
        this.planType = planType;
        this.requiredFeature = requiredFeature;
    }
}
exports.SubscriptionException = SubscriptionException;
class RateLimitException extends BaseException {
    constructor(message = 'Rate limit exceeded', retryAfter, limit, details) {
        super('RATE_LIMIT_EXCEEDED', message, common_1.HttpStatus.TOO_MANY_REQUESTS, {
            retryAfter,
            limit,
            ...details
        });
        this.retryAfter = retryAfter;
        this.limit = limit;
    }
}
exports.RateLimitException = RateLimitException;
class ExternalServiceException extends BaseException {
    constructor(message, service, serviceError, details) {
        super('EXTERNAL_SERVICE_ERROR', message, common_1.HttpStatus.BAD_GATEWAY, {
            service,
            serviceError,
            ...details
        });
        this.service = service;
        this.serviceError = serviceError;
    }
}
exports.ExternalServiceException = ExternalServiceException;
