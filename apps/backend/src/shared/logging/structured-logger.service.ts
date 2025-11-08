import { Injectable, type LoggerService } from '@nestjs/common'

export interface LogContext {
	[key: string]: unknown
}

@Injectable()
export class StructuredLogger implements LoggerService {
	/**
	 * Write an info log
	 */
	log(message: string, context?: LogContext): void {
		this.write('info', message, context)
	}

	/**
	 * Write an error log
	 */
	error(message: string, error?: Error, context?: LogContext): void {
		this.write('error', message, {
			...context,
			error: error?.message,
			stack: error?.stack,
			errorName: error?.constructor.name
		})
	}

	/**
	 * Write a warning log
	 */
	warn(message: string, context?: LogContext): void {
		this.write('warn', message, context)
	}

	/**
	 * Write a debug log
	 */
	debug(message: string, context?: LogContext): void {
		this.write('debug', message, context)
	}

	/**
	 * Write a verbose log
	 */
	verbose(message: string, context?: LogContext): void {
		this.write('verbose', message, context)
	}

	/**
	 * Write structured log in JSON format (for Promtail → Loki)
	 */
	private write(level: string, message: string, context?: LogContext): void {
		const log = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...context
		}

		// JSON format for Promtail to parse
		console.log(JSON.stringify(log))
	}
}
