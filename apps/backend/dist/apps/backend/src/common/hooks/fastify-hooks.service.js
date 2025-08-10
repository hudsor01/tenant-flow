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
exports.FastifyHooksService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const logger_service_1 = require("../services/logger.service");
let FastifyHooksService = class FastifyHooksService {
    constructor(logger) {
        this.performanceMetrics = new Map();
        this.logger = logger;
        this.logger.setContext('FastifyHooksService');
    }
    registerHooks(fastify) {
        fastify.addHook('onRequest', this.handleOnRequest.bind(this));
        fastify.addHook('preValidation', this.handlePreValidation.bind(this));
        fastify.addHook('preHandler', this.handlePreHandler.bind(this));
        fastify.addHook('onSend', this.handleOnSend.bind(this));
        fastify.addHook('onResponse', this.handleOnResponse.bind(this));
        fastify.addHook('onError', this.handleOnError.bind(this));
        fastify.addHook('onTimeout', this.handleOnTimeout.bind(this));
        this.logger.log('Fastify hooks registered successfully');
    }
    async handleOnRequest(request, reply) {
        const requestId = request.headers['x-request-id'] || (0, crypto_1.randomUUID)();
        const context = {
            requestId,
            startTime: Date.now(),
            path: request.url,
            method: request.method,
            ip: request.ip || request.headers['x-forwarded-for'] || 'unknown'
        };
        request.context = context;
        reply.header('x-request-id', requestId);
        this.logger.debug(`[${requestId}] ${request.method} ${request.url} - Request started`);
    }
    async handlePreValidation(request, reply) {
        if (this.shouldValidateContentType(request)) {
            const validationResult = await this.validateContentType(request);
            if (!validationResult.isValid) {
                reply.code(validationResult.statusCode).send(validationResult.response);
                return;
            }
        }
        this.extractTenantContext(request);
    }
    async handlePreHandler(request, reply) {
        const path = request.url || '';
        const isPublicPath = this.isPublicPath(path);
        if (!isPublicPath && request.context.userId && request.context.tenantId) {
            const ownerValidationResult = this.validateOwnerAccess(request);
            if (!ownerValidationResult.isValid) {
                this.logSecurityEvent('PERMISSION_DENIED', 'HIGH', request, {
                    requestedOwnerId: ownerValidationResult.requestedOwnerId,
                    userOrganizationId: request.context.tenantId,
                    reason: 'Cross-tenant access attempt'
                });
                reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied: insufficient permissions for requested resource'
                });
                return;
            }
        }
        if (this.isSensitiveEndpoint(request.url)) {
            this.logSecurityEvent('AUTH_ATTEMPT', 'LOW', request, {
                tenantId: request.context.tenantId
            });
        }
    }
    async handleOnSend(request, reply, payload) {
        const duration = Date.now() - request.context.startTime;
        reply.header('x-response-time', `${duration}ms`);
        reply.header('x-tenant-id', request.context.tenantId || 'none');
        if (duration > 1000) {
            this.logger.warn(`[${request.context.requestId}] Slow request: ${request.method} ${request.url} took ${duration}ms`);
        }
        return payload;
    }
    async handleOnResponse(request, reply) {
        const duration = Date.now() - request.context.startTime;
        this.logger.debug(`[${request.context.requestId}] ${request.method} ${request.url} - ${reply.statusCode} in ${duration}ms`);
        if (request.context.tenantId) {
            this.updatePerformanceMetrics(request.context.tenantId, duration, reply.statusCode);
        }
    }
    async handleOnError(request, _reply, error) {
        this.logger.error(`[${request.context.requestId}] Error processing request: ${error.message}`, error.stack);
        this.logSecurityEvent('SYSTEM_ERROR', 'HIGH', request, {
            error: error.message,
            stack: error.stack
        });
    }
    async handleOnTimeout(request) {
        this.logger.error(`[${request.context.requestId}] Request timeout: ${request.method} ${request.url}`);
        this.logSecurityEvent('SYSTEM_ERROR', 'HIGH', request, {
            error: 'Request timeout'
        });
    }
    isSensitiveEndpoint(url) {
        if (!url)
            return false;
        const sensitivePatterns = [
            '/auth',
            '/subscriptions',
            '/stripe',
            '/users',
            '/api/v1/auth',
            '/api/v1/subscriptions',
            '/api/v1/stripe'
        ];
        return sensitivePatterns.some(pattern => url.includes(pattern));
    }
    shouldValidateContentType(request) {
        const method = request.method;
        const path = request.url || '';
        if (!['POST', 'PUT', 'PATCH'].includes(method)) {
            return false;
        }
        const skipPatterns = ['/stripe/webhook', '/health', '/metrics'];
        return !skipPatterns.some(pattern => path.includes(pattern));
    }
    async validateContentType(request) {
        const contentType = request.headers['content-type'];
        if (!contentType) {
            const validationError = {
                type: 'VALIDATION_ERROR',
                code: 'VALIDATION_FAILED',
                message: 'Content-Type header is required',
                statusCode: 400,
                timestamp: new Date()
            };
            return {
                isValid: false,
                statusCode: 400,
                response: {
                    success: false,
                    error: validationError,
                    timestamp: new Date()
                }
            };
        }
        const validTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'];
        const isValid = validTypes.some(type => contentType.includes(type));
        if (!isValid) {
            const validationError = {
                type: 'VALIDATION_ERROR',
                code: 'VALIDATION_FAILED',
                message: 'Invalid Content-Type',
                statusCode: 415,
                timestamp: new Date()
            };
            return {
                isValid: false,
                statusCode: 415,
                response: {
                    success: false,
                    error: validationError,
                    timestamp: new Date()
                }
            };
        }
        return { isValid: true, statusCode: 200, response: null };
    }
    extractTenantContext(request) {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const parts = token.split('.');
                if (parts.length !== 3)
                    return;
                const payload = JSON.parse(Buffer.from(parts[1] || '', 'base64').toString());
                request.context.tenantId = payload.organization_id || payload.tenant_id;
                request.context.userId = payload.sub || payload.user_id;
                request.tenantId = request.context.tenantId;
            }
            catch (_error) {
                this.logger.debug('Could not extract tenant context from token');
            }
        }
    }
    isPublicPath(path) {
        const publicPaths = [
            '/health',
            '/metrics',
            '/auth/login',
            '/auth/register',
            '/auth/callback',
            '/stripe/webhook',
            '/api/v1/auth/login',
            '/api/v1/auth/register'
        ];
        return publicPaths.some(publicPath => path.startsWith(publicPath));
    }
    validateOwnerAccess(request) {
        const queryOwnerId = request.query?.owner_id;
        const bodyOwnerId = request.body?.owner_id;
        const requestedOwnerId = queryOwnerId || bodyOwnerId;
        if (!requestedOwnerId) {
            return { isValid: true };
        }
        const isValid = requestedOwnerId === request.context.tenantId;
        return {
            isValid,
            requestedOwnerId
        };
    }
    logSecurityEvent(eventType, severity, request, additionalData = {}) {
        try {
            this.logger.logSecurity(eventType, request.context.userId, {
                severity,
                tenantId: request.context.tenantId,
                endpoint: request.url || '',
                method: request.method,
                ...additionalData,
                ipAddress: request.context.ip,
                userAgent: request.headers['user-agent'] || 'unknown'
            });
        }
        catch (error) {
            this.logger.error('Failed to log security event: ' + String(error));
        }
    }
    updatePerformanceMetrics(tenantId, duration, statusCode) {
        const existing = this.performanceMetrics.get(tenantId) || {
            tenantId,
            avgResponseTime: 0,
            errorCount: 0,
            requestCount: 0,
            lastUpdated: Date.now()
        };
        existing.requestCount++;
        existing.avgResponseTime = ((existing.avgResponseTime * (existing.requestCount - 1)) + duration) / existing.requestCount;
        if (statusCode >= 400) {
            existing.errorCount++;
        }
        existing.lastUpdated = Date.now();
        this.performanceMetrics.set(tenantId, existing);
        if (statusCode >= 500) {
            this.logger.error(`Tenant ${tenantId} - 5xx error: ${statusCode} (${duration}ms) - Error rate: ${(existing.errorCount / existing.requestCount * 100).toFixed(1)}%`);
        }
        else if (duration > 1000) {
            this.logger.warn(`Tenant ${tenantId} - Slow request: ${statusCode} (${duration}ms) - Avg: ${existing.avgResponseTime.toFixed(0)}ms`);
        }
        if (this.performanceMetrics.size > 1000) {
            const oldestKey = Array.from(this.performanceMetrics.keys())[0];
            if (oldestKey) {
                this.performanceMetrics.delete(oldestKey);
            }
        }
    }
};
exports.FastifyHooksService = FastifyHooksService;
exports.FastifyHooksService = FastifyHooksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], FastifyHooksService);
