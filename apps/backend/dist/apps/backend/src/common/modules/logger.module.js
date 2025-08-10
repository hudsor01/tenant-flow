"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerModule = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("../services/logger.service");
const metrics_service_1 = require("../services/metrics.service");
const metrics_controller_1 = require("../controllers/metrics.controller");
const fastify_request_logger_service_1 = require("../logging/fastify-request-logger.service");
let LoggerModule = class LoggerModule {
};
exports.LoggerModule = LoggerModule;
exports.LoggerModule = LoggerModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [metrics_controller_1.MetricsController],
        providers: [
            logger_service_1.LoggerService,
            metrics_service_1.MetricsService,
            fastify_request_logger_service_1.FastifyRequestLoggerService,
        ],
        exports: [
            logger_service_1.LoggerService,
            metrics_service_1.MetricsService,
            fastify_request_logger_service_1.FastifyRequestLoggerService,
        ],
    })
], LoggerModule);
