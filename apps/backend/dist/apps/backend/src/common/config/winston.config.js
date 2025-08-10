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
exports.createLogger = exports.createWinstonConfig = void 0;
const winston = __importStar(require("winston"));
require("winston-daily-rotate-file");
const nest_winston_1 = require("nest-winston");
const { combine, timestamp, errors, json, printf, colorize } = winston.format;
const devFormat = printf(({ level, message, timestamp, context, trace, ...meta }) => {
    const formattedMessage = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
    if (trace) {
        return `${formattedMessage}\n${trace}`;
    }
    if (Object.keys(meta).length > 0) {
        return `${formattedMessage} ${JSON.stringify(meta)}`;
    }
    return formattedMessage;
});
const prodFormat = combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), errors({ stack: true }), json());
const devFormatConfig = combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), errors({ stack: true }), colorize({ all: true }), devFormat);
const createWinstonConfig = (isProduction) => {
    const transports = [];
    if (isProduction) {
        transports.push(new winston.transports.DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info',
            format: prodFormat,
        }));
        transports.push(new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
            format: prodFormat,
        }));
        transports.push(new winston.transports.Console({
            level: 'warn',
            format: combine(timestamp(), nest_winston_1.utilities.format.nestLike('TenantFlow', {
                prettyPrint: false,
                colors: false,
            })),
        }));
    }
    else {
        transports.push(new winston.transports.Console({
            level: process.env.LOG_LEVEL || 'debug',
            format: combine(timestamp(), nest_winston_1.utilities.format.nestLike('TenantFlow', {
                prettyPrint: true,
                colors: true,
            })),
        }));
        if (process.env.LOG_TO_FILE === 'true') {
            transports.push(new winston.transports.File({
                filename: 'logs/development.log',
                level: 'debug',
                format: devFormatConfig,
            }));
        }
    }
    return {
        level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
        format: isProduction ? prodFormat : devFormatConfig,
        transports,
        exitOnError: false,
    };
};
exports.createWinstonConfig = createWinstonConfig;
const createLogger = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return winston.createLogger((0, exports.createWinstonConfig)(isProduction));
};
exports.createLogger = createLogger;
