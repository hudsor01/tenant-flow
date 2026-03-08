import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the frontend-logger before importing api-error
vi.mock('#shared/lib/frontend-logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	})
}))

import {
	ApiErrorCode,
	ApiError,
	createApiErrorFromResponse,
	isApiError,
	logErrorInDev
} from '../api-error'

describe('ApiErrorCode', () => {
	it('has auth error codes', () => {
		expect(ApiErrorCode.AUTH_TOKEN_MISSING).toBe('AUTH-001')
		expect(ApiErrorCode.AUTH_TOKEN_INVALID).toBe('AUTH-002')
		expect(ApiErrorCode.AUTH_SESSION_EXPIRED).toBe('AUTH-003')
		expect(ApiErrorCode.AUTH_UNAUTHORIZED).toBe('AUTH-004')
	})
	it('has network error codes', () => {
		expect(ApiErrorCode.NETWORK_ERROR).toBe('NET-001')
		expect(ApiErrorCode.NETWORK_TIMEOUT).toBe('NET-002')
		expect(ApiErrorCode.NETWORK_OFFLINE).toBe('NET-003')
	})
	it('has API error codes', () => {
		expect(ApiErrorCode.API_NOT_FOUND).toBe('API-404')
		expect(ApiErrorCode.API_BAD_REQUEST).toBe('API-400')
		expect(ApiErrorCode.API_SERVER_ERROR).toBe('API-500')
		expect(ApiErrorCode.API_SERVICE_UNAVAILABLE).toBe('API-503')
		expect(ApiErrorCode.API_RATE_LIMITED).toBe('API-429')
	})
	it('has unknown error code', () => {
		expect(ApiErrorCode.UNKNOWN_ERROR).toBe('ERR-000')
	})
})

describe('ApiError', () => {
	it('creates error with message, code, and statusCode', () => {
		const err = new ApiError('Not found', ApiErrorCode.API_NOT_FOUND, 404)
		expect(err.message).toBe('Not found')
		expect(err.code).toBe('API-404')
		expect(err.statusCode).toBe(404)
		expect(err.name).toBe('ApiError')
	})
	it('extends Error', () => {
		const err = new ApiError('Test', ApiErrorCode.UNKNOWN_ERROR)
		expect(err).toBeInstanceOf(Error)
	})
	it('stores optional details', () => {
		const details = { field: 'email', issue: 'invalid' }
		const err = new ApiError(
			'Bad input',
			ApiErrorCode.API_BAD_REQUEST,
			400,
			details
		)
		expect(err.details).toEqual(details)
	})
	it('has a stack trace', () => {
		const err = new ApiError('Test', ApiErrorCode.UNKNOWN_ERROR)
		expect(err.stack).toBeDefined()
	})

	describe('getUserMessage', () => {
		it('returns auth message for auth codes', () => {
			const msg = 'Authentication required. Please sign in and try again.'
			expect(
				new ApiError('x', ApiErrorCode.AUTH_TOKEN_MISSING).getUserMessage()
			).toBe(msg)
			expect(
				new ApiError('x', ApiErrorCode.AUTH_TOKEN_INVALID).getUserMessage()
			).toBe(msg)
			expect(
				new ApiError('x', ApiErrorCode.AUTH_SESSION_EXPIRED).getUserMessage()
			).toBe(msg)
			expect(
				new ApiError('x', ApiErrorCode.AUTH_UNAUTHORIZED).getUserMessage()
			).toBe(msg)
		})
		it('returns network message for network codes', () => {
			const msg = 'Network error. Please check your connection and try again.'
			expect(
				new ApiError('x', ApiErrorCode.NETWORK_ERROR).getUserMessage()
			).toBe(msg)
			expect(
				new ApiError('x', ApiErrorCode.NETWORK_TIMEOUT).getUserMessage()
			).toBe(msg)
			expect(
				new ApiError('x', ApiErrorCode.NETWORK_OFFLINE).getUserMessage()
			).toBe(msg)
		})
		it('returns not found message', () => {
			expect(
				new ApiError('x', ApiErrorCode.API_NOT_FOUND).getUserMessage()
			).toBe('The requested resource was not found.')
		})
		it('returns bad request message', () => {
			expect(
				new ApiError('x', ApiErrorCode.API_BAD_REQUEST).getUserMessage()
			).toBe('Invalid request. Please check your input and try again.')
		})
		it('returns server error message', () => {
			const msg = 'Server error. Please try again later.'
			expect(
				new ApiError('x', ApiErrorCode.API_SERVER_ERROR).getUserMessage()
			).toBe(msg)
			expect(
				new ApiError('x', ApiErrorCode.API_SERVICE_UNAVAILABLE).getUserMessage()
			).toBe(msg)
		})
		it('returns rate limit message', () => {
			expect(
				new ApiError('x', ApiErrorCode.API_RATE_LIMITED).getUserMessage()
			).toBe('Too many requests. Please wait a moment and try again.')
		})
		it('returns default message for unknown codes', () => {
			expect(
				new ApiError('x', ApiErrorCode.UNKNOWN_ERROR).getUserMessage()
			).toBe('An unexpected error occurred. Please try again.')
		})
	})

	describe('toJSON', () => {
		it('serializes error fields', () => {
			const err = new ApiError('Test error', ApiErrorCode.API_NOT_FOUND, 404, {
				key: 'val'
			})
			const json = err.toJSON()
			expect(json.name).toBe('ApiError')
			expect(json.message).toBe('Test error')
			expect(json.code).toBe('API-404')
			expect(json.statusCode).toBe(404)
			expect(json.details).toEqual({ key: 'val' })
			expect(json.stack).toBeDefined()
		})
	})
})

describe('createApiErrorFromResponse', () => {
	const makeResponse = (status: number, statusText: string) =>
		({ status, statusText }) as Response

	it('maps 401 to AUTH_UNAUTHORIZED', () => {
		const err = createApiErrorFromResponse(makeResponse(401, 'Unauthorized'))
		expect(err.code).toBe(ApiErrorCode.AUTH_UNAUTHORIZED)
		expect(err.statusCode).toBe(401)
	})
	it('maps 404 to API_NOT_FOUND', () => {
		const err = createApiErrorFromResponse(makeResponse(404, 'Not Found'))
		expect(err.code).toBe(ApiErrorCode.API_NOT_FOUND)
	})
	it('maps 400 to API_BAD_REQUEST', () => {
		const err = createApiErrorFromResponse(makeResponse(400, 'Bad Request'))
		expect(err.code).toBe(ApiErrorCode.API_BAD_REQUEST)
	})
	it('maps 429 to API_RATE_LIMITED', () => {
		const err = createApiErrorFromResponse(
			makeResponse(429, 'Too Many Requests')
		)
		expect(err.code).toBe(ApiErrorCode.API_RATE_LIMITED)
	})
	it('maps 500 to API_SERVER_ERROR', () => {
		const err = createApiErrorFromResponse(
			makeResponse(500, 'Internal Server Error')
		)
		expect(err.code).toBe(ApiErrorCode.API_SERVER_ERROR)
	})
	it('maps 503 to API_SERVICE_UNAVAILABLE', () => {
		const err = createApiErrorFromResponse(
			makeResponse(503, 'Service Unavailable')
		)
		expect(err.code).toBe(ApiErrorCode.API_SERVICE_UNAVAILABLE)
	})
	it('uses default code for unmapped status', () => {
		const err = createApiErrorFromResponse(makeResponse(418, 'Teapot'))
		expect(err.code).toBe(ApiErrorCode.UNKNOWN_ERROR)
	})
	it('uses custom default code', () => {
		const err = createApiErrorFromResponse(
			makeResponse(418, 'Teapot'),
			ApiErrorCode.NETWORK_ERROR
		)
		expect(err.code).toBe(ApiErrorCode.NETWORK_ERROR)
	})
	it('includes statusText in message', () => {
		const err = createApiErrorFromResponse(makeResponse(404, 'Not Found'))
		expect(err.message).toContain('Not Found')
	})
})

describe('isApiError', () => {
	it('returns true for ApiError instance', () => {
		expect(isApiError(new ApiError('test', ApiErrorCode.UNKNOWN_ERROR))).toBe(
			true
		)
	})
	it('returns false for plain Error', () => {
		expect(isApiError(new Error('test'))).toBe(false)
	})
	it('returns false for string', () => {
		expect(isApiError('error')).toBe(false)
	})
	it('returns false for null', () => {
		expect(isApiError(null)).toBe(false)
	})
	it('returns false for undefined', () => {
		expect(isApiError(undefined)).toBe(false)
	})
})

describe('logErrorInDev', () => {
	beforeEach(() => {
		vi.stubEnv('NODE_ENV', 'development')
	})

	it('does not throw for ApiError in dev', () => {
		expect(() =>
			logErrorInDev(new ApiError('test', ApiErrorCode.UNKNOWN_ERROR))
		).not.toThrow()
	})
	it('does not throw for plain Error in dev', () => {
		expect(() => logErrorInDev(new Error('test'))).not.toThrow()
	})
	it('does not throw for unknown error in dev', () => {
		expect(() => logErrorInDev('some string error')).not.toThrow()
	})
	it('accepts optional context string', () => {
		expect(() => logErrorInDev(new Error('test'), 'MyComponent')).not.toThrow()
	})
	it('does nothing in production', () => {
		vi.stubEnv('NODE_ENV', 'production')
		expect(() => logErrorInDev(new Error('test'))).not.toThrow()
	})
})
