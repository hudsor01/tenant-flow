/**
 * Frontend Logger Module
 * Centralized logging for the frontend application
 * Replaces all console.log statements with structured logging
 */

export { logger, FrontendLogger } from '@/lib/logger/logger'
export type { ILogger, LogContext } from '@repo/shared'

// Direct export of logger instance for convenience
export { logger as log } from '@/lib/logger/logger'
