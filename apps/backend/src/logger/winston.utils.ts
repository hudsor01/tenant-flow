import fs from 'node:fs'
import { utilities as nestWinstonUtilities } from 'nest-winston'
import { format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import type { LogLevel } from '../config/config.constants'
import {
	DEFAULT_DATE_PATTERN,
	DEFAULT_LOG_DIR,
	DEFAULT_MAX_FILES,
	DEFAULT_MAX_SIZE,
	DEFAULT_SERVICE_NAME
} from './winston.config'

// NOTE: Sync fs APIs are used intentionally here. This runs once during bootstrap
// before the event loop starts accepting requests, so blocking is acceptable.
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
		// Use process.stderr for bootstrap logging (logger not yet initialized)
		process.stderr.write(
			`[WARN] Failed to create log directory ${targetDir}: ${error instanceof Error ? error.message : String(error)}. Falling back to ${fallbackDir}\n`
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
