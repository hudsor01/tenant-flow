/**
 * Logger types shared between frontend and backend
 */
/**
 * Log levels for application logging
 */
export declare const LogLevel: {
    readonly DEBUG: 0;
    readonly INFO: 1;
    readonly WARN: 2;
    readonly ERROR: 3;
};
export type LogLevel = typeof LogLevel[keyof typeof LogLevel];
/**
 * Log entry structure
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
    error?: Error;
}
/**
 * Logger configuration options
 */
export interface LoggerConfig {
    level: LogLevel;
    enableConsole?: boolean;
    enableFile?: boolean;
    maxFileSize?: number;
    maxFiles?: number;
}
//# sourceMappingURL=logger.d.ts.map