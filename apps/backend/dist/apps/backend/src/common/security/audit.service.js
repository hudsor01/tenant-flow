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
exports.SecurityAuditService = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("../services/logger.service");
let SecurityAuditService = class SecurityAuditService {
    constructor(logger) {
        this.logger = logger;
        this.logger.setContext('SecurityAudit');
    }
    async logSecurityEvent(event) {
        const details = typeof event.details === 'string'
            ? JSON.parse(event.details)
            : event.details;
        this.logger.logSecurity(event.eventType, event.userId, {
            ipAddress: event.ipAddress,
            resource: event.resource,
            action: event.action,
            organizationId: event.organizationId,
            ...details
        });
    }
    async getSecurityEvents(filters) {
        this.logger.debug('Security events requested with filters:', String(filters));
        return [];
    }
};
exports.SecurityAuditService = SecurityAuditService;
exports.SecurityAuditService = SecurityAuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], SecurityAuditService);
