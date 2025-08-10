"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const winston = __importStar(require("winston"));
const config_1 = require("@nestjs/config");
let LoggerService = class LoggerService {
    constructor(configService) {
        this.configService = configService;
        const isDevelopment = this.configService.get('NODE_ENV') !== 'production';
        this.winston = winston.createLogger({
            level: this.configService.get('LOG_LEVEL', 'info'),
            format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
            defaultMeta: {
                service: 'tenantflow-backend',
                environment: this.configService.get('NODE_ENV', 'development')
            },
            transports: [
                new winston.transports.Console({
                    format: isDevelopment
                        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
                        : winston.format.json()
                }),
                ...(isDevelopment ? [] : [
                    new winston.transports.File({
                        filename: 'logs/error.log',
                        level: 'error',
                        maxsize: 5242880,
                        maxFiles: 5
                    }),
                    new winston.transports.File({
                        filename: 'logs/combined.log',
                        maxsize: 5242880,
                        maxFiles: 5
                    })
                ])
            ]
        });
    }
    setContext(context) {
        this.context = context;
    }
    log(message, context) {
        this.winston.info(this.formatMessage(message), { context: context || this.context });
    }
    error(message, trace, context) {
        this.winston.error(this.formatMessage(message), {
            context: context || this.context,
            trace,
            stack: trace
        });
    }
    warn(message, context) {
        this.winston.warn(this.formatMessage(message), { context: context || this.context });
    }
    debug(message, context) {
        this.winston.debug(this.formatMessage(message), { context: context || this.context });
    }
    verbose(message, context) {
        this.winston.verbose(this.formatMessage(message), { context: context || this.context });
    }
    logRequest(method, url, statusCode, duration, userId) {
        this.winston.info('HTTP Request', {
            type: 'http',
            method,
            url,
            statusCode,
            duration,
            userId,
            context: 'HTTP'
        });
    }
    logPerformance(operation, duration, metadata) {
        const level = duration > 1000 ? 'warn' : 'info';
        this.winston.log(level, 'Performance metric', {
            type: 'performance',
            operation,
            duration,
            slow: duration > 1000,
            ...metadata,
            context: 'Performance'
        });
    }
    logSecurity(eventType, userId, details) {
        const level = this.getSecurityLogLevel(eventType);
        this.winston.log(level, 'Security event', {
            type: 'security',
            eventType,
            userId,
            details,
            timestamp: new Date().toISOString(),
            context: 'Security'
        });
    }
    logAudit(action, entityType, entityId, userId, changes) {
        this.winston.info('Audit event', {
            type: 'audit',
            action,
            entityType,
            entityId,
            userId,
            changes,
            timestamp: new Date().toISOString(),
            context: 'Audit'
        });
    }
    logError(error, context, userId, metadata) {
        this.winston.error('Application error', {
            type: 'error',
            message: error.message,
            stack: error.stack,
            name: error.name,
            context: context || this.context,
            userId,
            ...metadata
        });
    }
    logWithMetadata(level, message, metadata) {
        this.winston.log(level, message, {
            ...metadata,
            context: this.context
        });
    }
    formatMessage(message) {
        if (typeof message === 'object') {
            return JSON.stringify(message);
        }
        return String(message);
    }
    getSecurityLogLevel(eventType) {
        const eventLower = eventType.toLowerCase();
        if (eventLower.includes('failure') || eventLower.includes('denied') || eventLower.includes('suspicious')) {
            return 'warn';
        }
        if (eventLower.includes('breach') || eventLower.includes('brute') || eventLower.includes('attack')) {
            return 'error';
        }
        return 'info';
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.TRANSIENT }),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LoggerService);
