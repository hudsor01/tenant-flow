"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ErrorHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlerService = exports.ErrorCode = void 0;
const common_1 = require("@nestjs/common");
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["UNPROCESSABLE_ENTITY"] = "UNPROCESSABLE_ENTITY";
    ErrorCode["PAYMENT_REQUIRED"] = "PAYMENT_REQUIRED";
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["SUBSCRIPTION_ERROR"] = "SUBSCRIPTION_ERROR";
    ErrorCode["STORAGE_ERROR"] = "STORAGE_ERROR";
    ErrorCode["EMAIL_ERROR"] = "EMAIL_ERROR";
    ErrorCode["STRIPE_ERROR"] = "STRIPE_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
let ErrorHandlerService = ErrorHandlerService_1 = class ErrorHandlerService {
    constructor() {
        this.logger = new common_1.Logger(ErrorHandlerService_1.name);
    }
    handleErrorEnhanced(error, context) {
        this.logError(error, context);
        throw error;
    }
    createBusinessError(code, message, context) {
        this.logger.warn(`Business error: ${message}`, {
            code,
            context,
            operation: context?.operation
        });
        const error = new Error(message);
        Object.assign(error, { code, context });
        return error;
    }
    createValidationError(message, fields, context) {
        this.logger.warn(`Validation error: ${message}`, { fields, context });
        const error = new Error(message);
        Object.assign(error, {
            code: 'BAD_REQUEST',
            type: 'VALIDATION_ERROR',
            fields,
            context
        });
        return error;
    }
    createNotFoundError(resource, identifier, context) {
        const message = identifier
            ? `${resource} with ID '${identifier}' not found`
            : `${resource} not found`;
        this.logger.warn(`Resource not found: ${message}`, { resource, identifier, context });
        const error = new Error(message);
        Object.assign(error, {
            code: 'NOT_FOUND',
            type: 'NOT_FOUND_ERROR',
            resource,
            identifier,
            context
        });
        return error;
    }
    createPermissionError(operation, resource, context) {
        const message = resource
            ? `Not authorized to ${operation} ${resource}`
            : `Not authorized to ${operation}`;
        this.logger.warn(`Permission denied: ${message}`, { operation, resource, context });
        const error = new Error(message);
        Object.assign(error, {
            code: 'FORBIDDEN',
            type: 'PERMISSION_ERROR',
            operation,
            resource,
            context
        });
        return error;
    }
    createConfigError(message, context) {
        this.logger.error(`Configuration error: ${message}`, { context });
        const error = new Error(message);
        Object.assign(error, {
            code: 'INTERNAL_SERVER_ERROR',
            type: 'CONFIG_ERROR',
            context
        });
        return error;
    }
    logError(error, context) {
        if (error instanceof Error) {
            this.logger.error(`Error occurred: ${error.message}`, {
                error: error.message,
                stack: error.stack,
                context,
                operation: context?.operation
            });
        }
        else {
            this.logger.error('Unknown error occurred', {
                error: String(error),
                context,
                operation: context?.operation
            });
        }
    }
    createAuthError(code, message, _context) {
        return {
            name: 'AuthError',
            type: 'AUTH_ERROR',
            code,
            message,
            statusCode: 401,
            timestamp: new Date()
        };
    }
    createValidationAppError(message, field, errors, _context) {
        return {
            name: 'ValidationError',
            type: 'VALIDATION_ERROR',
            code: 'VALIDATION_FAILED',
            message,
            field,
            errors,
            statusCode: 400,
            timestamp: new Date()
        };
    }
    createBusinessAppError(code, message, _context) {
        return {
            name: 'BusinessError',
            type: 'BUSINESS_ERROR',
            code,
            message,
            statusCode: 400,
            timestamp: new Date()
        };
    }
    createServerAppError(code, message, _context) {
        return {
            name: 'ServerError',
            type: 'SERVER_ERROR',
            code,
            message,
            statusCode: 500,
            timestamp: new Date()
        };
    }
    createPaymentAppError(code, message, _context) {
        return {
            name: 'PaymentError',
            type: 'PAYMENT_ERROR',
            code,
            message,
            statusCode: 402,
            timestamp: new Date()
        };
    }
};
exports.ErrorHandlerService = ErrorHandlerService;
exports.ErrorHandlerService = ErrorHandlerService = ErrorHandlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ErrorHandlerService);
