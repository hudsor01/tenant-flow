/**
 * Logger types shared between frontend and backend
 */

/**
 * Log levels for application logging
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
} as const

export type LogLevel = typeof LogLevel[keyof typeof LogLevel]

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