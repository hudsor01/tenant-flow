"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingModule = void 0;
const common_1 = require("@nestjs/common");
const logger_config_1 = require("./logger.config");
const fastify_request_logger_service_1 = require("./fastify-request-logger.service");
let LoggingModule = class LoggingModule {
};
exports.LoggingModule = LoggingModule;
exports.LoggingModule = LoggingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            logger_config_1.AuditLogger,
            fastify_request_logger_service_1.FastifyRequestLoggerService,
            {
                provide: 'PerformanceLoggerFactory',
                useFactory: () => (operation, context) => new logger_config_1.PerformanceLogger((0, logger_config_1.createLogger)(), operation, context),
            }
        ],
        exports: [
            logger_config_1.AuditLogger,
            fastify_request_logger_service_1.FastifyRequestLoggerService,
            'PerformanceLoggerFactory'
        ]
    })
], LoggingModule);
