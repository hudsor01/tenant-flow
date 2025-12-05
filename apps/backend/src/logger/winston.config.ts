import path from 'node:path'
import type { LogLevel } from '../config/config.constants'

export interface WinstonConfig {
	level: LogLevel
	consoleLevel?: LogLevel
	logDir: string
	serviceName: string
	maxFiles?: string | number
	maxSize?: string | number
}

export const DEFAULT_LOG_DIR = path.resolve(process.cwd(), 'logs/backend')
export const DEFAULT_SERVICE_NAME = 'TenantFlowBackend'
export const DEFAULT_MAX_FILES = '14d'
export const DEFAULT_MAX_SIZE = '20m'
export const DEFAULT_DATE_PATTERN = 'YYYY-MM-DD'
