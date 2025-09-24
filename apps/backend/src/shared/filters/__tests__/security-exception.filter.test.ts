import { Logger } from '@nestjs/common'
import type { SecurityErrorContext } from '@repo/shared'
import type { Request, Response } from 'express'
import type { SecurityMonitorService } from '../../services/security-monitor.service'
import { SecurityExceptionFilter } from '../security-exception.filter'

// Mock services
const mockSecurityLogger = new Logger('SecurityExceptionFilter')
const mockSecurityMonitor = {
	logSecurityEvent: jest.fn()
} as unknown as SecurityMonitorService

describe('SecurityExceptionFilter', () => {
	let filter: SecurityExceptionFilter
	let mockResponse: Response

	beforeEach(() => {
		filter = new SecurityExceptionFilter(
			mockSecurityLogger,
			mockSecurityMonitor
		)
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			type: jest.fn().mockReturnThis(),
			send: jest.fn(),
			setHeader: jest.fn().mockReturnThis(),
			removeHeader: jest.fn().mockReturnThis()
		} as unknown as Response
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

	describe('catch', () => {
		it('should handle exceptions and send safe responses', () => {
			const mockRequest = {
				url: '/api/test',
				method: 'GET',
				headers: {},
				ip: '127.0.0.1'
			} as unknown as Request

			const mockHost = {
				switchToHttp: () => ({
					getRequest: () => mockRequest,
					getResponse: () => mockResponse
				}),
				getArgs: <T extends any[] = [Request, Response]>() => [mockRequest, mockResponse] as unknown as T,
				getArgByIndex: <T>(index: number) => [mockRequest, mockResponse][index] as T,
				switchToRpc: () => ({
					getData: () => ({}),
					getContext: () => ({})
				}),
				switchToWs: () => ({
					getData: () => ({}),
					getClient: () => ({})
				}),
				getType: () => 'http'
			} as any

			filter.catch(new Error('Internal server error'), mockHost)

			expect(mockResponse.status).toHaveBeenCalledWith(500)
			expect(mockResponse.type).toHaveBeenCalledWith('application/json')
			expect(mockResponse.send).toHaveBeenCalled()
		})
	})
})
