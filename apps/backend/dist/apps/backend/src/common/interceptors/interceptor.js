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
exports.AppInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const logger_service_1 = require("../services/logger.service");
const core_1 = require("@nestjs/core");
let AppInterceptor = class AppInterceptor {
    constructor(logger, reflector) {
        this.logger = logger;
        this.reflector = reflector;
        this.logger.setContext('AppInterceptor');
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const handler = context.getHandler();
        const auditAction = this.reflector.get('audit:action', handler);
        const skipLogging = this.reflector.get('skipLogging', handler);
        const sensitiveData = this.reflector.get('sensitiveData', handler);
        const startTime = Date.now();
        const userId = request.user?.id;
        const method = request.method;
        const url = request.url;
        if (!skipLogging) {
            this.logger.debug(`→ ${method} ${url}`, 'HTTP');
        }
        return next.handle().pipe((0, operators_1.tap)((data) => {
            const duration = Date.now() - startTime;
            const statusCode = response.statusCode;
            if (duration > 1000) {
                this.logger.logPerformance(`${method} ${url}`, duration, { statusCode, userId });
            }
            if (!skipLogging) {
                this.logger.logRequest(method, url, statusCode, duration, userId);
            }
            if (auditAction && userId) {
                this.logAuditEvent(auditAction, request, data, duration);
            }
            if (sensitiveData && data) {
                this.maskSensitiveFields(data);
            }
        }), (0, operators_1.catchError)((error) => {
            const duration = Date.now() - startTime;
            this.logger.logError(error, `${method} ${url}`, userId, { duration, requestId: request.id });
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
    logAuditEvent(action, request, responseData, duration) {
        const userId = request.user?.id;
        const entityType = this.extractEntityType(request.url || '');
        const entityId = this.extractEntityId(request, responseData);
        if (userId && entityType) {
            const changes = this.extractChanges(request.method, request.body || {}, responseData);
            this.logger.logAudit(action, entityType, entityId || 'unknown', userId, {
                ...changes,
                duration,
                ip: request.ip,
                userAgent: request.headers?.['user-agent'] || 'unknown'
            });
        }
    }
    extractEntityType(url) {
        const patterns = [
            { regex: /\/properties/i, type: 'Property' },
            { regex: /\/tenants/i, type: 'Tenant' },
            { regex: /\/units/i, type: 'Unit' },
            { regex: /\/leases/i, type: 'Lease' },
            { regex: /\/maintenance/i, type: 'MaintenanceRequest' },
            { regex: /\/payments/i, type: 'Payment' },
            { regex: /\/users/i, type: 'User' },
            { regex: /\/invoices/i, type: 'Invoice' }
        ];
        for (const pattern of patterns) {
            if (pattern.regex.test(url)) {
                return pattern.type;
            }
        }
        return null;
    }
    extractEntityId(request, response) {
        const params = request.params;
        const body = request.body;
        return (params?.id ||
            body?.id ||
            response?.id ||
            response?.data?.id ||
            null);
    }
    extractChanges(method, body, response) {
        switch (method) {
            case 'POST':
                return { created: this.sanitizeData(response) };
            case 'PUT':
            case 'PATCH':
                return { updated: this.sanitizeData(body) };
            case 'DELETE':
                return { deleted: true };
            default:
                return {};
        }
    }
    sanitizeData(data) {
        if (!data)
            return null;
        const sensitiveFields = [
            'password',
            'passwordHash',
            'token',
            'secret',
            'apiKey',
            'creditCard',
            'ssn',
            'bankAccount'
        ];
        const sanitized = { ...data };
        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
    maskSensitiveFields(data) {
        if (!data || typeof data !== 'object')
            return;
        const sensitivePatterns = [
            { field: 'email', mask: (val) => val.replace(/(.{2})(.*)(@.*)/, '$1***$3') },
            { field: 'phone', mask: (val) => val.replace(/(\d{3})(\d+)(\d{4})/, '$1***$3') },
            { field: 'ssn', mask: () => '***-**-****' },
            { field: 'creditCard', mask: () => '****-****-****-****' }
        ];
        const maskObject = (obj) => {
            for (const key in obj) {
                if (obj[key] && typeof obj[key] === 'object') {
                    maskObject(obj[key]);
                }
                else {
                    for (const pattern of sensitivePatterns) {
                        if (key.toLowerCase().includes(pattern.field) && obj[key]) {
                            obj[key] = pattern.mask(String(obj[key]));
                        }
                    }
                }
            }
        };
        if (Array.isArray(data)) {
            data.forEach(maskObject);
        }
        else {
            maskObject(data);
        }
    }
};
exports.AppInterceptor = AppInterceptor;
exports.AppInterceptor = AppInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService,
        core_1.Reflector])
], AppInterceptor);
