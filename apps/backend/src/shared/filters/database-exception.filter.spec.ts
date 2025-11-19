import { Test, type TestingModule } from '@nestjs/testing'
import { HttpStatus } from '@nestjs/common'
import { DatabaseExceptionFilter } from './database-exception.filter'
import type { ArgumentsHost } from '@nestjs/common'

// Mock NestJS Logger to suppress console output during tests
jest.mock('@nestjs/common', () => {
	const actual = jest.requireActual('@nestjs/common')
	return {
		...actual,
		Logger: jest.fn().mockImplementation(() => ({
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn()
		}))
	}
})

describe('DatabaseExceptionFilter', () => {
	let filter: DatabaseExceptionFilter
	let mockResponse: {
		status: jest.Mock
		json: jest.Mock
	}
	let mockHost: ArgumentsHost

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [DatabaseExceptionFilter]
		}).compile()

		filter = module.get<DatabaseExceptionFilter>(DatabaseExceptionFilter)

		// Mock response object
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn()
		}

		// Mock ArgumentsHost
		mockHost = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest.fn()
			}),
			getArgByIndex: jest.fn(),
			getArgs: jest.fn(),
			getType: jest.fn(),
			switchToRpc: jest.fn(),
			switchToWs: jest.fn()
		}
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should be defined', () => {
		expect(filter).toBeDefined()
	})

	describe('PostgREST Error Code Mapping', () => {
		it('should map PGRST116 to 404 Not Found', () => {
			const exception = {
				code: 'PGRST116',
				message: 'Resource not found'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'Resource not found',
				error: 'PGRST116'
			})
		})

		it('should map PGRST301 (JWT expired) to 401 Unauthorized', () => {
			const exception = {
				code: 'PGRST301',
				message: 'JWT expired'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'Invalid or expired authentication token',
				error: 'PGRST301'
			})
		})

		it('should map PGRST302 (JWT invalid) to 401 Unauthorized', () => {
			const exception = {
				code: 'PGRST302',
				message: 'JWT invalid'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'Invalid or expired authentication token',
				error: 'PGRST302'
			})
		})

		it('should map 23505 (unique violation) to 409 Conflict', () => {
			const exception = {
				code: '23505',
				message: 'duplicate key value violates unique constraint'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.CONFLICT,
				message: 'Resource already exists',
				error: '23505'
			})
		})

		it('should map 23503 (foreign key violation) to 400 Bad Request', () => {
			const exception = {
				code: '23503',
				message: 'violates foreign key constraint'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.BAD_REQUEST,
				message: 'Invalid reference to related resource',
				error: '23503'
			})
		})

		it('should map 42501 (insufficient privilege) to 403 Forbidden', () => {
			const exception = {
				code: '42501',
				message: 'permission denied'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.FORBIDDEN,
				message: 'Insufficient permissions',
				error: '42501'
			})
		})

		it('should include details field when present', () => {
			const exception = {
				code: 'PGRST116',
				message: 'Resource not found',
				details: 'The result contains 0 rows'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'Resource not found',
				error: 'PGRST116',
				details: 'The result contains 0 rows'
			})
		})

		it('should handle unknown error codes with 500 Internal Server Error', () => {
			const exception = {
				code: 'UNKNOWN_CODE',
				message: 'Unknown database error'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: 'Internal server error',
				error: 'UNKNOWN_CODE'
			})
		})

		it('should handle exceptions without code with 500 Internal Server Error', () => {
			const exception = {
				message: 'Generic error without code'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: 'Internal server error',
				error: undefined
			})
		})

		it('should use default message when error message is missing for PGRST116', () => {
			const exception = {
				code: 'PGRST116'
			}

			filter.catch(exception, mockHost)

			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'Resource not found',
				error: 'PGRST116'
			})
		})
	})

	describe('Edge Cases', () => {
		it('should handle null exception', () => {
			filter.catch(null, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: 'Internal server error',
				error: undefined
			})
		})

		it('should handle undefined exception', () => {
			filter.catch(undefined, mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
			expect(mockResponse.json).toHaveBeenCalledWith({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: 'Internal server error',
				error: undefined
			})
		})

		it('should handle exception with hint field (should not expose hint to client)', () => {
			const exception = {
				code: '23505',
				message: 'duplicate key',
				hint: 'Use different email address',
				details: 'Key (email)=(test@example.com) already exists'
			}

			filter.catch(exception, mockHost)

			const jsonCall = mockResponse.json.mock.calls[0][0]
			expect(jsonCall).not.toHaveProperty('hint')
			expect(jsonCall).toHaveProperty('details')
		})
	})
})
