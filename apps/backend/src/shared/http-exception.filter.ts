import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import { Response } from 'express'

type ExceptionResponse = {
	message?: string
	error?: string
	[key: string]: unknown
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const request = ctx.getRequest<Request>()

		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = 'Internal server error'

		if (exception instanceof HttpException) {
			status = exception.getStatus()
			const exceptionResponse = exception.getResponse()
			if (typeof exceptionResponse === 'string') {
				message = exceptionResponse
			} else if (
				typeof exceptionResponse === 'object' &&
				exceptionResponse !== null &&
				'message' in exceptionResponse
			) {
				const responseObj = exceptionResponse as ExceptionResponse
				message = responseObj.message || message
			}
		}

		// Sanitize error response - only include safe fields
		const errorResponse: Record<string, unknown> = {
			success: false,
			message: message,
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url
		}

		// Only include stack trace in development
		if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
			errorResponse.stack = exception.stack
		}

		response.status(status).json(errorResponse)
	}
}
