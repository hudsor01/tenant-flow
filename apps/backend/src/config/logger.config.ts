import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Custom format for development
const devFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('TenantFlow', {
    prettyPrint: true,
    colors: true,
  }),
);

// Custom format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create transports based on environment
const transports: winston.transport[] = [];

if (isTest) {
  // Silent during tests unless explicitly needed
  transports.push(
    new winston.transports.Console({
      silent: true,
    }),
  );
} else if (isDevelopment) {
  // Console output for development
  transports.push(
    new winston.transports.Console({
      format: devFormat,
    }),
  );
} else {
  // Production transports
  transports.push(
    // Console for container logs
    new winston.transports.Console({
      format: prodFormat,
    }),
    // Daily rotating file for application logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: prodFormat,
    }),
    // Separate file for errors
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: prodFormat,
    }),
  );
}

// Create the logger instance
export const winstonConfig: winston.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: isProduction ? prodFormat : devFormat,
  transports,
  // Add default metadata
  defaultMeta: {
    service: 'tenantflow-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  // Handle exceptions and rejections
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

// Create logger instance
export const logger = winston.createLogger(winstonConfig);

// Add stream for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};