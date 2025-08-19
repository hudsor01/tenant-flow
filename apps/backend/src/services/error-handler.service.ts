import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'

export enum ErrorCode {
	CONFIG_ERROR = 'CONFIG_ERROR',
	BUSINESS_ERROR = 'BUSINESS_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	UNAUTHORIZED = 'UNAUTHORIZED',
	NOT_FOUND = 'NOT_FOUND',
	BAD_REQUEST = 'BAD_REQUEST',
	CONFLICT = 'CONFLICT',
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
	FORBIDDEN = 'FORBIDDEN',
	SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
	STORAGE_ERROR = 'STORAGE_ERROR'
}

@Injectable()
export class ErrorHandlerService {
	private readonly logger = new Logger(ErrorHandlerService.name)

	handleError(error: unknown, contextOrString?: string | { operation: string; resource: string; metadata?: Record<string, unknown> }) {
		if (typeof contextOrString === 'string') {
			this.logger.error(`Error in ${contextOrString}:`, error)
		} else if (contextOrString) {
			this.logger.error(`Error in ${contextOrString.operation} on ${contextOrString.resource}:`, error, contextOrString.metadata)
		} else {
			this.logger.error('Error:', error)
		}
		
		if (error instanceof Error) {
			throw error
		}
		
		throw new Error('An unknown error occurred')
	}

	createConfigError(message: string, code: ErrorCode = ErrorCode.CONFIG_ERROR, context?: unknown) {
		this.logger.error(`Config error: ${message}`, context)
		return new InternalServerErrorException({
			code,
			message,
			timestamp: new Date().toISOString(),
			context
		})
	}

	createBusinessError(code: ErrorCode, message: string, context?: unknown) {
		this.logger.error(`Business error: ${message}`, context)
		
		switch (code) {
			case ErrorCode.BAD_REQUEST:
				return new BadRequestException({
					code,
					message,
					timestamp: new Date().toISOString(),
					context
				})
			case ErrorCode.CONFLICT:
				return new ConflictException({
					code,
					message,
					timestamp: new Date().toISOString(),
					context
				})
			case ErrorCode.FORBIDDEN:
				return new ForbiddenException({
					code,
					message,
					timestamp: new Date().toISOString(),
					context
				})
			case ErrorCode.UNAUTHORIZED:
				return new UnauthorizedException({
					code,
					message,
					timestamp: new Date().toISOString(),
					context
				})
			case ErrorCode.TOO_MANY_REQUESTS:
				return new ThrottlerException(message)
			case ErrorCode.SERVICE_UNAVAILABLE:
				return new ServiceUnavailableException({
					code,
					message,
					timestamp: new Date().toISOString(),
					context
				})
			case ErrorCode.INTERNAL_SERVER_ERROR:
			default:
				return new InternalServerErrorException({
					code,
					message,
					timestamp: new Date().toISOString(),
					context
				})
		}
	}

	createNotFoundError(resource: string, identifier: string) {
		return this.createBusinessError(
			ErrorCode.NOT_FOUND,
			`${resource} with identifier '${identifier}' not found`,
			{ resource, identifier }
		)
	}

	createValidationError(message: string, context?: unknown) {
		return this.createBusinessError(
			ErrorCode.VALIDATION_ERROR,
			message,
			context
		)
	}
}