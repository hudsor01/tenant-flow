import { Injectable, Logger } from '@nestjs/common'
import type { FastifyInstance } from 'fastify'

@Injectable()
export class RequestContextHooksService {
	private readonly logger = new Logger(RequestContextHooksService.name)

	registerContextHooks(_fastifyInstance: FastifyInstance): void {
		// Simple implementation - just log that hooks were registered
		this.logger.log('Request context hooks registered')
	}
}