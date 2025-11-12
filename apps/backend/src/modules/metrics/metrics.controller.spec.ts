import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MetricsController } from './metrics.controller'
import type { Request, Response } from 'express'

// Mock PrometheusController with proper index method
const mockIndexMethod = jest.fn().mockResolvedValue(undefined)

jest.mock('@willsoto/nestjs-prometheus', () => {
	return {
		PrometheusController: class {
			async index(res: Response) {
				return mockIndexMethod(res)
			}
		}
	}
})

describe('MetricsController', () => {
	let controller: MetricsController
	let mockConfigService: jest.Mocked<ConfigService>
	const VALID_TOKEN = 'test-prometheus-bearer-token-12345'

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		// Create mock ConfigService
		mockConfigService = {
			get: jest.fn((key: string) => {
				if (key === 'PROMETHEUS_BEARER_TOKEN') return VALID_TOKEN
				return undefined
			})
		} as unknown as jest.Mocked<ConfigService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [MetricsController],
			providers: [
				{
					provide: ConfigService,
					useValue: mockConfigService
				}
			]
		}).compile()

		controller = module.get<MetricsController>(MetricsController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('Authentication', () => {
		let mockRequest: Partial<Request>
		let mockResponse: Partial<Response>

		beforeEach(() => {
			mockRequest = {
				headers: {},
				ip: '127.0.0.1'
			}
			mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn(),
				send: jest.fn(),
				setHeader: jest.fn()
			}
		})

		it('should throw UnauthorizedException when PROMETHEUS_BEARER_TOKEN is not configured', async () => {
			mockConfigService.get = jest.fn().mockReturnValue(undefined)

			await expect(
				controller.getMetrics(mockRequest as Request, mockResponse as Response)
			).rejects.toThrow('Metrics endpoint not configured')
		})

		it('should throw UnauthorizedException when Authorization header is missing', async () => {
			await expect(
				controller.getMetrics(mockRequest as Request, mockResponse as Response)
			).rejects.toThrow('Bearer token required')
		})

		it('should throw UnauthorizedException when Authorization header does not start with Bearer', async () => {
			mockRequest.headers = {
				authorization: 'Basic some-token'
			}

			await expect(
				controller.getMetrics(mockRequest as Request, mockResponse as Response)
			).rejects.toThrow('Bearer token required')
		})

		it('should throw UnauthorizedException when bearer token is invalid', async () => {
			mockRequest.headers = {
				authorization: 'Bearer invalid-token'
			}

			await expect(
				controller.getMetrics(mockRequest as Request, mockResponse as Response)
			).rejects.toThrow('Invalid bearer token')
		})

		it('should throw UnauthorizedException when bearer token has wrong length', async () => {
			mockRequest.headers = {
				authorization: 'Bearer short'
			}

			await expect(
				controller.getMetrics(mockRequest as Request, mockResponse as Response)
			).rejects.toThrow(UnauthorizedException)
		})

		it('should accept valid bearer token and call parent controller', async () => {
			mockRequest.headers = {
				authorization: `Bearer ${VALID_TOKEN}`
			}

			await controller.getMetrics(mockRequest as Request, mockResponse as Response)

			// Verify successful authentication by checking parent controller was called
			expect(mockIndexMethod).toHaveBeenCalledWith(mockResponse)
			expect(mockIndexMethod).toHaveBeenCalledTimes(1)
		})

		it('should reject invalid token even with correct length (timing-safe comparison)', async () => {
			const wrongToken = 'x'.repeat(VALID_TOKEN.length)
			mockRequest.headers = {
				authorization: `Bearer ${wrongToken}`
			}

			await expect(
				controller.getMetrics(mockRequest as Request, mockResponse as Response)
			).rejects.toThrow('Invalid bearer token')
		})
	})

	describe('Response Format', () => {
		let mockRequest: Partial<Request>
		let mockResponse: Partial<Response>

		beforeEach(() => {
			mockRequest = {
				headers: {
					authorization: `Bearer ${VALID_TOKEN}`
				},
				ip: '127.0.0.1'
			}
			mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn(),
				send: jest.fn(),
				setHeader: jest.fn()
			}
			mockIndexMethod.mockClear()
		})

		it('should delegate to parent PrometheusController.index() with only response object', async () => {
			await controller.getMetrics(mockRequest as Request, mockResponse as Response)

			// Verify parent controller called with only response (not request)
			expect(mockIndexMethod).toHaveBeenCalledTimes(1)
			expect(mockIndexMethod).toHaveBeenCalledWith(mockResponse)
		})
	})

	describe('Edge Cases', () => {
		let mockRequest: Partial<Request>
		let mockResponse: Partial<Response>

		beforeEach(() => {
			mockRequest = {
				headers: {},
				ip: '192.168.1.100'
			}
			mockResponse = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn(),
				send: jest.fn(),
				setHeader: jest.fn()
			}
		})

		it('should handle empty bearer token after prefix', async () => {
			mockRequest.headers = {
				authorization: 'Bearer '
			}

			await expect(
				controller.getMetrics(mockRequest as Request, mockResponse as Response)
			).rejects.toThrow(UnauthorizedException)
		})

		it('should handle bearer token with only whitespace', async () => {
			mockRequest.headers = {
				authorization: 'Bearer    '
			}

			await expect(
				controller.getMetrics(mockRequest as Request, mockResponse as Response)
			).rejects.toThrow(UnauthorizedException)
		})
	})
})
