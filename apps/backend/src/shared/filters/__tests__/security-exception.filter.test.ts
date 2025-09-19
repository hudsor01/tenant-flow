import { Logger } from '@nestjs/common'
import type { SecurityErrorContext } from '@repo/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { SecurityMonitorService } from '../../services/security-monitor.service'
import { SecurityExceptionFilter } from '../security-exception.filter'

// Mock services
const mockSecurityLogger = new Logger('SecurityExceptionFilter')
const mockSecurityMonitor = {
	logSecurityEvent: jest.fn()
} as unknown as SecurityMonitorService

describe('SecurityExceptionFilter', () => {
	let filter: SecurityExceptionFilter
	let mockResponse: FastifyReply

	beforeEach(() => {
		filter = new SecurityExceptionFilter(
			mockSecurityLogger,
			mockSecurityMonitor
		)
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			type: jest.fn().mockReturnThis(),
			send: jest.fn(),
			header: jest.fn().mockReturnThis()
		} as unknown as FastifyReply
	})

	describe('generateSafeErrorResponse', () => {
		it('should return standardized error response without internal details', () => {
			const mockContext: SecurityErrorContext = {
				ip: '127.0.0.1',
				userAgent: 'test-agent',
				endpoint: '/api/test',
				method: 'GET',
				timestamp: '2023-01-01T00:00:00Z',
				errorType: 'Error',
				statusCode: 500
			}

			// @ts-expect-error - accessing private method for testing
			const result = filter.generateSafeErrorResponse(
				new Error('Internal server error'),
				mockContext
			)

			expect(result.statusCode).toBe(500)
			expect(result.message).toBe('An error occurred')
			expect(result.error).toBe('Application Error')
			expect(result.path).toBe('/api/test')
			expect(result.timestamp).toBe('2023-01-01T00:00:00Z')
			expect(result.requestId).toBeDefined()
		})

		it('should sanitize error messages in development environment', () => {
			// Simulate development environment
			const originalEnv = process.env.NODE_ENV
			process.env.NODE_ENV = 'development'

			const mockContext: SecurityErrorContext = {
				ip: '127.0.0.1',
				userAgent: 'test-agent',
				endpoint: '/api/test',
				method: 'GET',
				timestamp: '2023-01-01T00:00:00Z',
				errorType: 'Error',
				statusCode: 500
			}

			// @ts-expect-error - accessing private method for testing
			const result = filter.generateSafeErrorResponse(
				new Error('Database connection failed'),
				mockContext
			)

			// Should still return safe response even in development
			expect(result.message).toBe('An error occurred')
			expect(result.error).toBe('Application Error')

			// Restore environment
			process.env.NODE_ENV = originalEnv
		})

		it('should handle specific error types with safe messages', () => {
			const mockContext: SecurityErrorContext = {
				ip: '127.0.0.1',
				userAgent: 'test-agent',
				endpoint: '/api/test',
				method: 'POST',
				timestamp: '2023-01-01T00:00:00Z',
				errorType: 'BadRequestException',
				statusCode: 400
			}

			class BadRequestException extends Error {
				constructor(message: string) {
					super(message)
					this.name = 'BadRequestException'
				}
			}

			// @ts-expect-error - accessing private method for testing
			const result = filter.generateSafeErrorResponse(
				new BadRequestException('Validation failed: password too short'),
				mockContext
			)

			expect(result.statusCode).toBe(400)
			expect(result.message).toBe('Invalid request format')
			expect(result.error).toBe('Application Error')
		})
	})

	describe('sanitizeMessage', () => {
		it('should remove sensitive information from error messages', () => {
			// @ts-expect-error - accessing private method for testing
			const result = filter.sanitizeMessage(
				'Failed to connect to database user:admin pass:secret123 host:192.168.1.100 port:5432'
			)

			expect(result).toBe(
				'Failed to connect to database user:[REDACTED] host:[IP] port:5432'
			)
		})

		it('should remove email addresses', () => {
			// @ts-expect-error - accessing private method for testing
			const result = filter.sanitizeMessage(
				'User john.doe@example.com failed authentication'
			)

			expect(result).toBe('User [EMAIL] failed authentication')
		})

		it('should remove IP addresses', () => {
			// @ts-expect-error - accessing private method for testing
			const result = filter.sanitizeMessage(
				'Connection failed from 192.168.1.100:8080'
			)

			expect(result).toBe('Connection failed from [IP]:8080')
		})

		it('should remove UUIDs', () => {
			// @ts-expect-error - accessing private method for testing
			const result = filter.sanitizeMessage(
				'Operation failed for user 550e8400-e29b-41d4-a716-446655440000'
			)

			expect(result).toBe('Operation failed for user [UUID]')
		})

		it('should remove credentials', () => {
			// @ts-expect-error - accessing private method for testing
			const result = filter.sanitizeMessage(
				'Auth failed: token=sk-1234567890abcdef'
			)

			expect(result).toBe('Auth failed: [REDACTED]')
		})

		it('should limit message length', () => {
			const longMessage = 'A'.repeat(300)
			// @ts-expect-error - accessing private method for testing
			const result = filter.sanitizeMessage(longMessage)

			expect(result.length).toBe(200)
		})
	})

	describe('catch', () => {
		it('should handle exceptions and send safe responses', () => {
			const mockRequest = {
				url: '/api/test',
				method: 'GET',
				headers: {},
				ip: '127.0.0.1'
			} as unknown as FastifyRequest

			const mockHost = {
				switchToHttp: () => ({
					getRequest: () => mockRequest,
					getResponse: () => mockResponse
				}),
				getArgs: () => [mockRequest, mockResponse],
				getArgByIndex: (index: number) => [mockRequest, mockResponse][index],
				switchToRpc: () => ({
					getData: () => ({}),
					getContext: () => ({})
				}),
				switchToWs: () => ({
					getData: () => ({}),
					getClient: () => ({})
				}),
				getType: () => 'http'
			}

			filter.catch(new Error('Internal server error'), mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(500)
			expect(mockResponse.type).toHaveBeenCalledWith('application/json')
			expect(mockResponse.send).toHaveBeenCalled()
		})
	})
})
