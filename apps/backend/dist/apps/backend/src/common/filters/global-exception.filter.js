"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionExceptionFilter = exports.DevelopmentExceptionFilter = exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const database_1 = require("@repo/database");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(GlobalExceptionFilter_1.name);
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.isProduction = process.env.NODE_ENV === 'production';
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const errorContext = this.buildErrorContext(request);
        const structuredError = this.processException(exception, errorContext);
        this.logError(exception, structuredError, errorContext);
        const errorResponse = this.buildErrorResponse(structuredError, errorContext);
        response
            .status(structuredError.statusCode)
            .send(errorResponse);
    }
    processException(exception, context) {
        if (exception instanceof common_1.HttpException) {
            return this.handleHttpException(exception, context);
        }
        if (exception instanceof zod_1.ZodError) {
            return this.handleZodError(exception, context);
        }
        if (this.isPrismaError(exception)) {
            return this.handlePrismaError(exception, context);
        }
        if (exception instanceof Error) {
            return this.handleGenericError(exception, context);
        }
        return this.handleUnknownException(exception, context);
    }
    handleHttpException(exception, _context) {
        const status = exception.getStatus();
        const response = exception.getResponse();
        let message = exception.message;
        let details = undefined;
        let code = 'HTTP_EXCEPTION';
        if (typeof response === 'object' && response !== null) {
            const errorObj = response;
            if (errorObj.message) {
                message = Array.isArray(errorObj.message)
                    ? errorObj.message.join('; ')
                    : String(errorObj.message);
            }
            if (errorObj.errors && typeof errorObj.errors === 'object') {
                details = errorObj.errors;
            }
            if (errorObj.code) {
                code = String(errorObj.code);
            }
        }
        return {
            code,
            message: this.sanitizeErrorMessage(message, status),
            details: this.isDevelopment ? details : undefined,
            statusCode: status
        };
    }
    handleZodError(error, _context) {
        const validationErrors = error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
            received: 'received' in issue ? issue.received : undefined
        }));
        return {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: { errors: validationErrors },
            statusCode: common_1.HttpStatus.BAD_REQUEST
        };
    }
    handlePrismaError(error, _context) {
        const { code, meta, message } = error;
        switch (code) {
            case 'P2002':
                return {
                    code: 'UNIQUE_CONSTRAINT_VIOLATION',
                    message: `Duplicate value for ${this.getMetaTarget(meta) || 'field'}`,
                    details: this.isDevelopment ? { constraintField: this.getMetaTarget(meta) } : undefined,
                    statusCode: common_1.HttpStatus.CONFLICT
                };
            case 'P2025':
                return {
                    code: 'RECORD_NOT_FOUND',
                    message: 'The requested record was not found',
                    statusCode: common_1.HttpStatus.NOT_FOUND
                };
            case 'P2003':
                return {
                    code: 'FOREIGN_KEY_CONSTRAINT',
                    message: 'Operation violates foreign key constraint',
                    details: this.isDevelopment ? { field: this.getMetaFieldName(meta) } : undefined,
                    statusCode: common_1.HttpStatus.BAD_REQUEST
                };
            case 'P2014':
                return {
                    code: 'INVALID_ID',
                    message: 'The provided ID is invalid',
                    statusCode: common_1.HttpStatus.BAD_REQUEST
                };
            case 'P1001':
                return {
                    code: 'DATABASE_CONNECTION_ERROR',
                    message: 'Unable to connect to the database',
                    statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE
                };
            case 'P1008':
                return {
                    code: 'DATABASE_TIMEOUT',
                    message: 'Database operation timed out',
                    statusCode: common_1.HttpStatus.REQUEST_TIMEOUT
                };
            default:
                return {
                    code: 'DATABASE_ERROR',
                    message: this.isProduction
                        ? 'A database error occurred'
                        : String(message) || 'Unknown database error',
                    details: this.isDevelopment ? { prismaCode: code, meta } : undefined,
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR
                };
        }
    }
    handleGenericError(error, _context) {
        if (error.name === 'ValidationError') {
            return {
                code: 'VALIDATION_ERROR',
                message: error.message,
                statusCode: common_1.HttpStatus.BAD_REQUEST
            };
        }
        if (error.name === 'UnauthorizedError' || error.message.toLowerCase().includes('unauthorized')) {
            return {
                code: 'UNAUTHORIZED',
                message: 'Access denied',
                statusCode: common_1.HttpStatus.UNAUTHORIZED
            };
        }
        if (error.name === 'ForbiddenError' || error.message.toLowerCase().includes('forbidden')) {
            return {
                code: 'FORBIDDEN',
                message: 'Insufficient permissions',
                statusCode: common_1.HttpStatus.FORBIDDEN
            };
        }
        if (error.name === 'NotFoundError' || error.message.toLowerCase().includes('not found')) {
            return {
                code: 'NOT_FOUND',
                message: 'Resource not found',
                statusCode: common_1.HttpStatus.NOT_FOUND
            };
        }
        return {
            code: 'INTERNAL_SERVER_ERROR',
            message: this.isProduction
                ? 'An internal server error occurred'
                : error.message,
            details: this.isDevelopment ? {
                name: error.name,
                stack: error.stack?.split('\n').slice(0, 10)
            } : undefined,
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR
        };
    }
    handleUnknownException(exception, _context) {
        return {
            code: 'UNKNOWN_ERROR',
            message: this.isProduction
                ? 'An unexpected error occurred'
                : `Unknown exception: ${String(exception)}`,
            details: this.isDevelopment ? { exception: String(exception) } : undefined,
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR
        };
    }
    buildErrorContext(request) {
        return {
            requestId: request.headers['x-correlation-id'],
            userId: request.user?.id,
            path: request.url,
            method: request.method,
            timestamp: new Date().toISOString(),
            userAgent: request.headers['user-agent'],
            ip: request.ip
        };
    }
    buildErrorResponse(error, context) {
        const createAppError = (error) => {
            const baseError = {
                name: error.code,
                message: error.message,
                statusCode: error.statusCode,
            };
            if (error.code.includes('VALIDATION') || error.statusCode === common_1.HttpStatus.BAD_REQUEST) {
                return {
                    ...baseError,
                    type: 'VALIDATION_ERROR',
                    code: 'VALIDATION_FAILED',
                    ...(error.field && { field: error.field })
                };
            }
            else if (error.code.includes('AUTH') || error.statusCode === common_1.HttpStatus.UNAUTHORIZED) {
                return {
                    ...baseError,
                    type: 'AUTH_ERROR',
                    code: 'UNAUTHORIZED'
                };
            }
            else if (error.code.includes('DATABASE') || error.code.includes('PRISMA')) {
                return {
                    ...baseError,
                    type: 'SERVER_ERROR',
                    code: 'DATABASE_ERROR'
                };
            }
            else {
                return {
                    ...baseError,
                    type: 'SERVER_ERROR',
                    code: 'INTERNAL_ERROR'
                };
            }
        };
        const response = {
            success: false,
            data: null,
            message: error.message,
            error: createAppError(error),
            timestamp: new Date(context.timestamp),
            ...(context.requestId && { requestId: context.requestId })
        };
        if (this.isDevelopment) {
            response.debug = {
                path: context.path,
                method: context.method,
                userId: context.userId
            };
        }
        return response;
    }
    logError(exception, structuredError, context) {
        const logContext = {
            requestId: context.requestId,
            userId: context.userId,
            path: context.path,
            method: context.method,
            userAgent: context.userAgent,
            ip: context.ip,
            errorCode: structuredError.code,
            statusCode: structuredError.statusCode
        };
        const logMessage = `${structuredError.code}: ${structuredError.message}`;
        if (structuredError.statusCode >= 500) {
            this.logger.error(logMessage, {
                ...logContext,
                exception: this.isDevelopment ? exception : undefined,
                stack: exception instanceof Error ? exception.stack : undefined
            });
        }
        else if (structuredError.statusCode >= 400) {
            this.logger.warn(logMessage, logContext);
        }
        else {
            this.logger.log(logMessage, logContext);
        }
        if (this.isProduction && structuredError.statusCode >= 500) {
            this.logger.error('PRODUCTION_ERROR_ALERT', {
                ...logContext,
                errorType: structuredError.code,
                timestamp: context.timestamp
            });
        }
    }
    sanitizeErrorMessage(message, statusCode) {
        if (this.isDevelopment) {
            return message;
        }
        const sensitivePatterns = [
            /password/gi,
            /token/gi,
            /secret/gi,
            /key/gi,
            /email.*@/gi,
            /user.*id/gi
        ];
        let sanitized = message;
        for (const pattern of sensitivePatterns) {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        }
        if (statusCode >= 500) {
            return 'An internal server error occurred';
        }
        return sanitized;
    }
    getMetaTarget(meta) {
        if (meta && typeof meta === 'object' && 'target' in meta) {
            return String(meta.target);
        }
        return undefined;
    }
    getMetaFieldName(meta) {
        if (meta && typeof meta === 'object' && 'field_name' in meta) {
            return String(meta.field_name);
        }
        return undefined;
    }
    isPrismaError(exception) {
        return exception instanceof database_1.PrismaClientKnownRequestError ||
            exception instanceof database_1.PrismaClientUnknownRequestError ||
            exception instanceof database_1.PrismaClientRustPanicError ||
            exception instanceof database_1.PrismaClientInitializationError ||
            exception instanceof database_1.PrismaClientValidationError ||
            Boolean(exception?.code?.toString().startsWith('P'));
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
let DevelopmentExceptionFilter = class DevelopmentExceptionFilter extends GlobalExceptionFilter {
    catch(exception, host) {
        console.error('🚨 Exception caught in development:', exception);
        if (exception instanceof Error && exception.stack) {
            console.error('📍 Stack trace:', exception.stack);
        }
        super.catch(exception, host);
    }
};
exports.DevelopmentExceptionFilter = DevelopmentExceptionFilter;
exports.DevelopmentExceptionFilter = DevelopmentExceptionFilter = __decorate([
    (0, common_1.Catch)()
], DevelopmentExceptionFilter);
let ProductionExceptionFilter = class ProductionExceptionFilter extends GlobalExceptionFilter {
    catch(exception, host) {
        super.catch(exception, host);
    }
};
exports.ProductionExceptionFilter = ProductionExceptionFilter;
exports.ProductionExceptionFilter = ProductionExceptionFilter = __decorate([
    (0, common_1.Catch)()
], ProductionExceptionFilter);
