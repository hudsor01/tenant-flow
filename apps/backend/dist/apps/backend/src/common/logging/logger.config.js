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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_LEVELS = exports.AuditLogger = exports.PerformanceLogger = exports.LogContext = void 0;
exports.setRunningPort = setRunningPort;
exports.createLogger = createLogger;
const nest_winston_1 = require("nest-winston");
const winston = __importStar(require("winston"));
const app_config_1 = require("../../shared/constants/app-config");
const getLogLevels = () => {
    if (app_config_1.APP_CONFIG.IS_PRODUCTION) {
        return ['error', 'warn', 'log'];
    }
    if (app_config_1.APP_CONFIG.IS_TEST) {
        return ['error'];
    }
    return ['error', 'warn', 'log', 'debug', 'verbose'];
};
const customFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.splat(), winston.format.json(), winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const logObject = {
        timestamp,
        level,
        message,
        context,
        ...meta
    };
    return JSON.stringify(logObject);
}));
let runningPort = null;
function setRunningPort(port) {
    runningPort = port;
}
const customConsoleFormat = winston.format.combine(winston.format.timestamp({ format: 'HH:mm:ss' }), winston.format.ms(), winston.format.printf(({ timestamp, level, message, context, ms }) => {
    const pid = process.pid;
    const port = runningPort || '????';
    const contextStr = context ? `[${context}]` : '';
    const colorLevel = winston.format.colorize().colorize(level, level.toUpperCase());
    return `[Nest] ${pid}:${port}  - ${timestamp}  ${colorLevel} ${contextStr} ${message} ${ms || ''}`;
}));
const consoleFormat = winston.format.combine(winston.format.timestamp({ format: 'HH:mm:ss' }), winston.format.ms(), winston.format.errors({ stack: true }), customConsoleFormat);
function createLogger() {
    const transports = [];
    transports.push(new winston.transports.Console({
        format: app_config_1.APP_CONFIG.IS_PRODUCTION ? customFormat : consoleFormat
    }));
    if (app_config_1.APP_CONFIG.IS_PRODUCTION) {
        transports.push(new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: customFormat,
            maxsize: 5242880,
            maxFiles: 5
        }));
        transports.push(new winston.transports.File({
            filename: 'logs/combined.log',
            format: customFormat,
            maxsize: 5242880,
            maxFiles: 5
        }));
    }
    return nest_winston_1.WinstonModule.createLogger({
        level: app_config_1.APP_CONFIG.IS_PRODUCTION ? 'info' : 'debug',
        format: customFormat,
        transports,
        exitOnError: false
    });
}
class LogContext {
    static create(operation, resource, userId) {
        return {
            operation,
            resource,
            userId,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
        };
    }
}
exports.LogContext = LogContext;
class PerformanceLogger {
    constructor(logger, operation, context) {
        this.logger = logger;
        this.operation = operation;
        this.context = context;
        this.startTime = Date.now();
        if ('debug' in this.logger && typeof this.logger.debug === 'function') {
            this.logger.debug(`Starting ${operation}`, { ...this.context, phase: 'start' });
        }
        else {
            this.logger.log(`Starting ${operation}`, { ...this.context, phase: 'start' });
        }
    }
    complete(additionalContext) {
        const duration = Date.now() - this.startTime;
        this.logger.log(`Completed ${this.operation}`, {
            ...this.context,
            ...additionalContext,
            duration,
            phase: 'complete'
        });
    }
    error(error, additionalContext) {
        const duration = Date.now() - this.startTime;
        this.logger.error(`Failed ${this.operation}`, {
            ...this.context,
            ...additionalContext,
            duration,
            phase: 'error',
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            }
        });
    }
}
exports.PerformanceLogger = PerformanceLogger;
class AuditLogger {
    constructor(logger) {
        this.logger = logger;
    }
    logAccess(resource, action, userId, metadata) {
        this.logger.log('Audit: Resource accessed', {
            audit: true,
            resource,
            action,
            userId,
            metadata,
            timestamp: new Date().toISOString()
        });
    }
    logModification(resource, action, userId, before, after) {
        this.logger.log('Audit: Resource modified', {
            audit: true,
            resource,
            action,
            userId,
            changes: { before, after },
            timestamp: new Date().toISOString()
        });
    }
    logSecurityEvent(event, userId, metadata) {
        this.logger.warn('Audit: Security event', {
            audit: true,
            security: true,
            event,
            userId,
            metadata,
            timestamp: new Date().toISOString()
        });
    }
}
exports.AuditLogger = AuditLogger;
exports.LOG_LEVELS = getLogLevels();
