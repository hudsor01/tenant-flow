import fs from 'node:fs'
import { utilities as nestWinstonUtilities } from 'nest-winston'
import { createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import type { LogLevel } from '../config/config.constants'
import {
  DEFAULT_DATE_PATTERN,
  DEFAULT_LOG_DIR,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_SIZE,
  DEFAULT_SERVICE_NAME
} from './winston.config'

// Simple winston logger for bootstrap errors (before main logger is configured)
const bootstrapLogger = createLogger({
  level: 'warn',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) =>
      `[${timestamp}] ${level.toUpperCase()}: ${message}`
    )
  ),
  transports: [new transports.Console()]
})

export const ensureLogDirectory = (dir?: string): string => {
  const targetDir = dir ?? DEFAULT_LOG_DIR
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    return targetDir
  } catch (error) {
    // If we can't create the log directory (e.g., permission denied in Docker),
    // fall back to /tmp which should always be writable
    const fallbackDir = '/tmp/logs/backend'
    const errorMsg = error instanceof Error ? error.message : String(error)

    // Use winston for consistent logging (console-only during bootstrap)
    bootstrapLogger.warn(
      `Failed to create log directory ${targetDir}: ${errorMsg}. Falling back to ${fallbackDir}`
    )

    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true })
    }
    return fallbackDir
  }
}

export const createConsoleTransport = (options: {
  level: LogLevel
  serviceName?: string
  enableColors: boolean
}) =>
  new transports.Console({
    level: options.level,
    format: format.combine(
      format.timestamp(),
      format.ms(),
      format.errors({ stack: true }),
      nestWinstonUtilities.format.nestLike(
        options.serviceName ?? DEFAULT_SERVICE_NAME,
        {
          colors: options.enableColors,
          prettyPrint: options.enableColors
        }
      )
    )
  })

export const createDailyRotateFileTransport = (options: {
  level: LogLevel
  logDir?: string
  filename?: string
  maxFiles?: string | number
  maxSize?: string | number
}) =>
  new DailyRotateFile({
    level: options.level,
    dirname: ensureLogDirectory(options.logDir),
    filename: options.filename ?? 'backend-%DATE%.log',
    datePattern: DEFAULT_DATE_PATTERN,
    zippedArchive: true,
    maxFiles: options.maxFiles ?? DEFAULT_MAX_FILES,
    maxSize: options.maxSize ?? DEFAULT_MAX_SIZE,
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    )
  })

export const baseLoggerOptions = (level: LogLevel) => ({
  level,
  silent: false,
  exitOnError: false
})
