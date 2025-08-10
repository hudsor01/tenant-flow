"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const security_utils_1 = require("./security.utils");
const simple_security_service_1 = require("./simple-security.service");
const fastify_hooks_service_1 = require("../hooks/fastify-hooks.service");
const prisma_module_1 = require("../../prisma/prisma.module");
const audit_service_1 = require("./audit.service");
const security_monitor_service_1 = require("./security-monitor.service");
const compliance_monitor_service_1 = require("./compliance-monitor.service");
const privacy_service_1 = require("./privacy.service");
const encryption_service_1 = require("./encryption.service");
const logger_module_1 = require("../modules/logger.module");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule, logger_module_1.LoggerModule],
        providers: [
            security_utils_1.SecurityUtils,
            simple_security_service_1.SimpleSecurityService,
            fastify_hooks_service_1.FastifyHooksService,
            audit_service_1.SecurityAuditService,
            security_monitor_service_1.SecurityMonitorService,
            compliance_monitor_service_1.ComplianceMonitorService,
            privacy_service_1.PrivacyService,
            encryption_service_1.EncryptionService,
        ],
        exports: [
            security_utils_1.SecurityUtils,
            simple_security_service_1.SimpleSecurityService,
            fastify_hooks_service_1.FastifyHooksService,
            audit_service_1.SecurityAuditService,
            security_monitor_service_1.SecurityMonitorService,
            compliance_monitor_service_1.ComplianceMonitorService,
            privacy_service_1.PrivacyService,
            encryption_service_1.EncryptionService,
        ]
    })
], SecurityModule);
