/**
 * Logger types shared between frontend and backend
 */

/**
 * Log levels for application logging
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * Log entry structure
 */
export interface LogEntry {
    level: LogLevel
    message: string
    timestamp: string
    context?: Record<string, unknown>
    error?: Error
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
    level: LogLevel
    enableConsole?: boolean
    enableFile?: boolean
    maxFileSize?: number
    maxFiles?: number
}