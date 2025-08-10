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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("../services/logger.service");
const library_1 = require("@prisma/client/runtime/library");
let ErrorHandler = class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
        if (this.logger && typeof this.logger.setContext === 'function') {
            this.logger.setContext('ErrorHandler');
        }
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const errorResponse = this.buildErrorResponse(exception, request);
        this.logError(exception, errorResponse, request);
        response
            .status(errorResponse.statusCode)
            .send(errorResponse);
    }
    buildErrorResponse(exception, request) {
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';
        let details = undefined;
        if (exception instanceof common_1.HttpException) {
            statusCode = exception.getStatus();
            const response = exception.getResponse();
            if (typeof response === 'object' && response !== null) {
                message = 'message' in response && typeof response.message === 'string' ? response.message : exception.message;
                error = 'error' in response && typeof response.error === 'string' ? response.error : exception.name;
                details = 'details' in response ? response.details : undefined;
            }
            else {
                message = String(response);
            }
        }
        else if (exception instanceof library_1.PrismaClientKnownRequestError) {
            const prismaError = this.handlePrismaError(exception);
            statusCode = prismaError.statusCode;
            message = prismaError.message;
            error = prismaError.error;
            details = { code: exception.code, meta: exception.meta };
        }
        else if (exception instanceof Error) {
            message = exception.message;
            error = exception.name;
            if (process.env.NODE_ENV === 'production') {
                message = 'An unexpected error occurred';
                details = undefined;
            }
            else {
                details = { stack: exception.stack };
            }
        }
        return {
            statusCode,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url || '/',
            correlationId: request.context?.requestId || request.id,
            details
        };
    }
    handlePrismaError(error) {
        switch (error.code) {
            case 'P2002':
                return {
                    statusCode: common_1.HttpStatus.CONFLICT,
                    message: 'A record with this value already exists',
                    error: 'Duplicate Entry'
                };
            case 'P2025':
                return {
                    statusCode: common_1.HttpStatus.NOT_FOUND,
                    message: 'The requested record was not found',
                    error: 'Not Found'
                };
            case 'P2003':
                return {
                    statusCode: common_1.HttpStatus.BAD_REQUEST,
                    message: 'Invalid reference: related record does not exist',
                    error: 'Invalid Reference'
                };
            case 'P2014':
                return {
                    statusCode: common_1.HttpStatus.BAD_REQUEST,
                    message: 'Invalid relation: constraint violation',
                    error: 'Constraint Violation'
                };
            default:
                return {
                    statusCode: common_1.HttpStatus.BAD_REQUEST,
                    message: 'Database operation failed',
                    error: 'Database Error'
                };
        }
    }
    logError(exception, errorResponse, request) {
        const userId = request.user?.id;
        const metadata = {
            url: request.url,
            method: request.method,
            ip: request.ip,
            userAgent: request.headers?.['user-agent'] || 'unknown',
            correlationId: request.context?.requestId || request.id,
            statusCode: errorResponse.statusCode
        };
        if (errorResponse.statusCode >= 500) {
            if (exception instanceof Error) {
                this.logger.logError(exception, 'Request Handler', userId, metadata);
            }
            else {
                this.logger.error('Non-error exception thrown', String(exception));
            }
        }
        else if (errorResponse.statusCode >= 400) {
            this.logger.warn(`Client error: ${errorResponse.message}`, 'Request Handler');
        }
        if (errorResponse.statusCode === 401 || errorResponse.statusCode === 403) {
            this.logger.warn(`Authentication failure - User: ${userId}, Path: ${request.url}, Status: ${errorResponse.statusCode}`);
        }
    }
};
exports.ErrorHandler = ErrorHandler;
exports.ErrorHandler = ErrorHandler = __decorate([
    (0, common_1.Injectable)(),
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], ErrorHandler);
