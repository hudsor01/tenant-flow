import { Injectable, Logger } from '@nestjs/common'

/**
 * Structured logger service for consistent logging
 * This is a simple stub for now - can be enhanced with proper structured logging later
 */
@Injectable()
export class StructuredLoggerService {
	private readonly logger: Logger

	constructor(context?: string) {
		this.logger = new Logger(context || 'StructuredLogger')
	}

	info(message: string, metadata?: Record<string, unknown>) {
		this.logger.log(
			message,
			metadata ? JSON.stringify(metadata) : undefined
		)
	}

	error(message: string, error: Error, metadata?: Record<string, unknown>) {
		this.logger.error(
			message,
			error.stack,
			metadata ? JSON.stringify(metadata) : undefined
		)
	}

	warn(message: string, metadata?: Record<string, unknown>) {
		this.logger.warn(
			message,
			metadata ? JSON.stringify(metadata) : undefined
		)
	}

	debug(message: string, metadata?: Record<string, unknown>) {
		this.logger.debug(
			message,
			metadata ? JSON.stringify(metadata) : undefined
		)
	}
}
