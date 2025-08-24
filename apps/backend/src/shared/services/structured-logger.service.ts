import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class StructuredLoggerService {
	private readonly logger = new Logger(StructuredLoggerService.name)

	log(message: string, context?: Record<string, unknown>): void {
		this.logger.log(message, context)
	}

	error(message: string, error?: unknown, context?: Record<string, unknown>): void {
		this.logger.error(message, error, context)
	}

	warn(message: string, context?: Record<string, unknown>): void {
		this.logger.warn(message, context)
	}

	debug(message: string, context?: Record<string, unknown>): void {
		this.logger.debug(message, context)
	}
}