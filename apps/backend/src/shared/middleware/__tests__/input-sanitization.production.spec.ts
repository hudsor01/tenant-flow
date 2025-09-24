/**
 * Production-Environment Test for InputSanitizationMiddleware
 *
 * This test replicates the exact Railway production environment where:
 * - req.query and req.body are read-only properties with getters only
 * - Direct property assignment throws: "Cannot set property query of IncomingMessage which has only a getter"
 * - Our Object.defineProperty fix must handle this scenario
 *
 * Test validates the fix works in the production Node.js HTTP server environment.
 */

import type { NextFunction, Request, Response } from 'express'
import { IncomingMessage } from 'http'
import type { SecurityMonitorService } from '../../services/security-monitor.service'
import { InputSanitizationMiddleware } from '../input-sanitization.middleware'

describe('InputSanitizationMiddleware - Production Environment', () => {
	let middleware: InputSanitizationMiddleware
	let mockSecurityMonitor: {
		logSecurityEvent: jest.Mock
		detectThreats: jest.Mock
		isBlocked: jest.Mock
	}
	let mockNext: jest.MockedFunction<NextFunction>
	let mockResponse: Partial<Response>

	beforeEach(() => {
		// Mock SecurityMonitorService that the middleware actually needs
		mockSecurityMonitor = {
			logSecurityEvent: jest.fn(),
			detectThreats: jest.fn().mockReturnValue([]),
			isBlocked: jest.fn().mockReturnValue(false)
		}

		middleware = new InputSanitizationMiddleware(
			mockSecurityMonitor as unknown as SecurityMonitorService
		)
		mockNext = jest.fn()
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis()
		}
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('Production req.query Read-Only Property Handling', () => {
		it('should handle Railway production req.query read-only property using Object.defineProperty', () => {
			// Create a mock request that simulates Railway production IncomingMessage behavior
			const mockRequest = Object.create(IncomingMessage.prototype) as Request

			// Use SAFE content that won't trigger malicious detection, focusing on testing the read-only property fix
			const originalQuery = {
				search: 'safe search term',
				page: '1',
				filter: 'active'
			}
			Object.defineProperty(mockRequest, 'query', {
				get: () => originalQuery,
				enumerable: true,
				configurable: true
				// No setter - this causes "Cannot set property query" error with direct assignment
			})

			// Add other required properties
			mockRequest.method = 'GET'
			mockRequest.url = '/api/test?search=safe&page=1&filter=active'
			mockRequest.headers = { 'user-agent': 'test-agent' }
			mockRequest.body = {}

			// Verify the read-only behavior exists (this should throw with old approach)
			expect(() => {
				;(mockRequest as unknown as Record<string, unknown>).query = {
					test: 'value'
				}
			}).toThrow(/Cannot set property/)

			// Execute middleware - should NOT throw error due to our Object.defineProperty fix
			expect(() => {
				middleware.use(mockRequest, mockResponse as Response, mockNext)
			}).not.toThrow()

			// Verify middleware completed successfully
			expect(mockNext).toHaveBeenCalledTimes(1)
			expect(mockNext).toHaveBeenCalledWith()

			// Verify safe content was preserved
			expect(mockRequest.query.search).toBe('safe search term')
			expect(mockRequest.query.page).toBe('1')
			expect(mockRequest.query.filter).toBe('active')
		})

		it('should handle Railway production req.body read-only property using Object.defineProperty', () => {
			// Create a mock request that simulates Railway production IncomingMessage behavior
			const mockRequest = Object.create(IncomingMessage.prototype) as Request

			// Use SAFE content that won't trigger malicious detection, focusing on the read-only property fix
			const originalBody = {
				comment: 'This is a safe comment with normal content',
				title: 'Valid Title',
				category: 'general'
			}
			Object.defineProperty(mockRequest, 'body', {
				get: () => originalBody,
				enumerable: true,
				configurable: true
				// No setter - this causes "Cannot set property body" error with direct assignment
			})

			// Add other required properties
			mockRequest.method = 'POST'
			mockRequest.url = '/api/comments'
			mockRequest.headers = { 'content-type': 'application/json' }
			mockRequest.query = {}

			// Verify the read-only behavior exists (this should throw with old approach)
			expect(() => {
				;(mockRequest as unknown as Record<string, unknown>).body = {
					test: 'value'
				}
			}).toThrow(/Cannot set property/)

			// Execute middleware - should NOT throw error due to our Object.defineProperty fix
			expect(() => {
				middleware.use(mockRequest, mockResponse as Response, mockNext)
			}).not.toThrow()

			// Verify middleware completed successfully
			expect(mockNext).toHaveBeenCalledTimes(1)
			expect(mockNext).toHaveBeenCalledWith()

			// Verify safe content was preserved
			expect(mockRequest.body.comment).toBe(
				'This is a safe comment with normal content'
			)
			expect(mockRequest.body.title).toBe('Valid Title')
			expect(mockRequest.body.category).toBe('general')
		})
	})

	describe('Critical Railway Production Scenario', () => {
		it('should handle the exact error scenario from Railway production logs (Object.defineProperty fix)', () => {
			// Test the core fix: Railway production requests with read-only properties
			const mockRequest = Object.create(IncomingMessage.prototype) as Request

			// Use safe content to focus on testing the read-only property fix specifically
			const productionQuery = {
				search: 'properties in dallas',
				filter: 'all',
				page: '1'
			}

			// Create read-only query property that matches Railway's behavior
			Object.defineProperty(mockRequest, 'query', {
				get: () => productionQuery,
				enumerable: true,
				configurable: true
				// CRITICAL: No setter property - this is what causes the TypeError in production
			})

			mockRequest.method = 'GET'
			mockRequest.url = '/api/properties'
			mockRequest.headers = { 'user-agent': 'production-client' }
			mockRequest.body = {}

			// Before our fix, this would throw: "Cannot set property query of IncomingMessage which has only a getter"
			// With our fix using Object.defineProperty, this should work without errors
			let threwError = false
			let errorMessage = ''

			try {
				middleware.use(mockRequest, mockResponse as Response, mockNext)
			} catch (error) {
				threwError = true
				errorMessage = error instanceof Error ? error.message : String(error)
			}

			// CRITICAL: This must NOT throw the "Cannot set property" error for production to work
			expect(threwError).toBe(false)
			expect(errorMessage).toBe('')

			// Verify middleware completed successfully
			expect(mockNext).toHaveBeenCalledTimes(1)
			expect(mockNext).toHaveBeenCalledWith()

			// Verify the safe content was preserved
			const processedQuery = mockRequest.query
			expect(processedQuery.search).toBe('properties in dallas')
			expect(processedQuery.filter).toBe('all')
			expect(processedQuery.page).toBe('1')
		})
	})

	describe('Fallback Mechanism Test', () => {
		it('should use individual property merging when Object.defineProperty fails', () => {
			const mockRequest = Object.create(IncomingMessage.prototype) as Request

			// Create a scenario where Object.defineProperty might fail with safe content
			const originalQuery = { param: 'safe parameter value', type: 'test' }
			Object.defineProperty(mockRequest, 'query', {
				get: () => originalQuery,
				enumerable: true,
				configurable: false // Non-configurable - might cause Object.defineProperty to fail
			})

			mockRequest.method = 'GET'
			mockRequest.url = '/api/test'
			mockRequest.headers = {}
			mockRequest.body = {}

			// Should still work via fallback mechanism (no "Cannot set property" error)
			expect(() => {
				middleware.use(mockRequest, mockResponse as Response, mockNext)
			}).not.toThrow()

			expect(mockNext).toHaveBeenCalledWith()

			// Verify safe content was preserved
			expect(mockRequest.query.param).toBe('safe parameter value')
			expect(mockRequest.query.type).toBe('test')
		})
	})
})
