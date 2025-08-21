import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus
} from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { FastifyReply } from 'fastify'

/**
 * Simple rate limit exception filter
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
	catch(_exception: ThrottlerException, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<FastifyReply>()

		response.status(HttpStatus.TOO_MANY_REQUESTS).send({
			success: false,
			error: 'Too many requests. Please try again in 1 minute.',
			code: 'TOO_MANY_REQUESTS'
		})
	}
}