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
exports.stream = exports.logger = exports.winstonConfig = void 0;
const winston = __importStar(require("winston"));
require("winston-daily-rotate-file");
const nest_winston_1 = require("nest-winston");
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const devFormat = winston.format.combine(winston.format.timestamp(), winston.format.ms(), nest_winston_1.utilities.format.nestLike('TenantFlow', {
    prettyPrint: true,
    colors: true,
}));
const prodFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
const transports = [];
if (isTest) {
    transports.push(new winston.transports.Console({
        silent: true,
    }));
}
else if (isDevelopment) {
    transports.push(new winston.transports.Console({
        format: devFormat,
    }));
}
else {
    transports.push(new winston.transports.Console({
        format: prodFormat,
    }), new winston.transports.DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: prodFormat,
    }), new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: prodFormat,
    }));
}
exports.winstonConfig = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: isProduction ? prodFormat : devFormat,
    transports,
    defaultMeta: {
        service: 'tenantflow-backend',
        environment: process.env.NODE_ENV || 'development',
    },
    exceptionHandlers: isProduction
        ? [
            new winston.transports.DailyRotateFile({
                filename: 'logs/exceptions-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d',
                format: prodFormat,
            }),
        ]
        : [],
    rejectionHandlers: isProduction
        ? [
            new winston.transports.DailyRotateFile({
                filename: 'logs/rejections-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d',
                format: prodFormat,
            }),
        ]
        : [],
    exitOnError: false,
};
exports.logger = winston.createLogger(exports.winstonConfig);
exports.stream = {
    write: (message) => {
        exports.logger.info(message.trim());
    },
};
