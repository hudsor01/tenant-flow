import type { HealthCheckResult } from '@nestjs/terminus'
import { HealthCheckService } from '@nestjs/terminus'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Response } from 'express'
import { SilentLogger } from '../__test__/silent-logger'
import { StripeSyncService } from '../billing/stripe-sync.service'
import { ResilienceService } from '../shared/services/resilience.service'
import { HealthController } from './health.controller'
import { StripeFdwHealthIndicator } from './stripe-fdw.health'
import { SupabaseHealthIndicator } from './supabase.health'

describe('HealthController', () => {
	let controller: HealthController
	let healthCheckService: HealthCheckService
	let supabaseHealth: SupabaseHealthIndicator
	let stripeFdwHealth: StripeFdwHealthIndicator
	let mockResponse: Partial<Response>

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [HealthController],
			providers: [
				{
					provide: HealthCheckService,
					useValue: {
						check: jest.fn()
					}
				},
				{
					provide: SupabaseHealthIndicator,
					useValue: {
						pingCheck: jest.fn(),
						quickPing: jest.fn()
					}
				},
				{
					provide: StripeFdwHealthIndicator,
					useValue: {
						isHealthy: jest.fn(),
						quickPing: jest.fn(),
						detailedCheck: jest.fn()
					}
				},
				{
					provide: StripeSyncService,
					useValue: {
						getHealthStatus: jest.fn().mockReturnValue({
							initialized: true,
							migrationsRun: true
						}),
						testConnection: jest.fn().mockResolvedValue(true)
					}
				},
				{
					provide: 'SUPABASE_SERVICE_FOR_HEALTH',
					useValue: {
						checkConnection: jest.fn().mockResolvedValue({
							status: 'healthy',
							message: 'Database connection successful'
						}),
						getAdminClient: jest.fn()
					}
				},
				{
					provide: ResilienceService,
					useValue: {
						getHealthStatus: jest.fn().mockReturnValue({
							cacheSize: 0,
							memoryUsage: 50
						})
					}
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		controller = module.get<HealthController>(HealthController)
		healthCheckService = module.get<HealthCheckService>(HealthCheckService)
		supabaseHealth = module.get<SupabaseHealthIndicator>(
			SupabaseHealthIndicator
		)
		stripeFdwHealth = module.get<StripeFdwHealthIndicator>(
			StripeFdwHealthIndicator
		)

		// Spy on the actual logger instance created by the controller
		jest.spyOn(controller['logger'], 'log').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'error').mockImplementation(() => {})

		// Setup mock response for all tests
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis()
		}

		jest.clearAllMocks()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('Constructor', () => {
		it('should be defined', () => {
			expect(controller).toBeDefined()
		})
	})

	describe('GET /health', () => {
		it('should perform comprehensive health check with database connectivity', async () => {
			await controller.check(mockResponse as Response)

			expect(mockResponse.status).toHaveBeenCalledWith(200)
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'ok',
				timestamp: expect.any(String),
				environment: 'test',
				uptime: expect.any(Number),
				memory: expect.any(Number),
				version: expect.any(String),
				service: 'backend-api',
				env_vars_loaded: {
					health_check_function: expect.any(Boolean),
					public_cache_max_age: expect.any(Boolean),
					node_env: expect.any(Boolean)
				},
				database: {
					status: 'healthy',
					message: 'Database connection successful'
				}
			})
			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Health check started - checking database connectivity'
			)
		})

		it('should handle health check failures gracefully', async () => {
			// Mock the supabase service to return unhealthy status
			const supabaseService = controller['supabaseClient']
			jest.spyOn(supabaseService, 'checkConnection').mockResolvedValue({
				status: 'unhealthy',
				message: 'Database connection failed'
			})

			await controller.check(mockResponse as Response)

			expect(mockResponse.status).toHaveBeenCalledWith(503)
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'unhealthy',
					database: {
						status: 'unhealthy',
						message: 'Database connection failed'
					},
					error: 'Database connection failed'
				})
			)
		})

		it('should log health check initiation with correct environment', async () => {
			await controller.check(mockResponse as Response)

			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Health check started - checking database connectivity'
			)
			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Database connectivity check passed'
			)
		})
	})

	describe('GET /health/check', () => {
		it('should use the main check endpoint as an alias', async () => {
			await controller.checkEndpoint(mockResponse as Response)

			expect(mockResponse.status).toHaveBeenCalledWith(200)
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'ok',
					database: {
						status: 'healthy',
						message: 'Database connection successful'
					}
				})
			)
		})
	})

	describe('GET /health/ping', () => {
		it('should return basic ping response with system information', () => {
			const originalEnv = process.env.NODE_ENV
			const originalPort = process.env.PORT
			process.env.NODE_ENV = 'test'
			process.env.PORT = '3001'

			// Mock process methods
			const mockUptime = jest.spyOn(process, 'uptime').mockReturnValue(120.5)
			const mockMemoryUsage = jest
				.spyOn(process, 'memoryUsage')
				.mockReturnValue({
					rss: 52428800, // 50MB
					heapTotal: 41943040, // 40MB
					heapUsed: 31457280, // 30MB
					external: 1048576, // 1MB
					arrayBuffers: 524288 // 0.5MB
				})

			const result = controller.ping()

			expect(result).toMatchObject({
				status: 'ok',
				timestamp: expect.any(String),
				uptime: 121, // Math.round(120.5)
				memory: 30, // Math.round(31457280 / 1024 / 1024)
				env: 'test',
				port: '3001'
			})

			// Verify timestamp is a valid ISO string
			expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)

			mockUptime.mockRestore()
			mockMemoryUsage.mockRestore()
			process.env.NODE_ENV = originalEnv
			process.env.PORT = originalPort
		})

		it('should handle missing environment variables gracefully', () => {
			const originalEnv = process.env.NODE_ENV
			const originalPort = process.env.PORT
			delete process.env.NODE_ENV
			delete process.env.PORT

			const result = controller.ping()

			expect(result).toMatchObject({
				status: 'ok',
				env: undefined,
				port: undefined
			})

			process.env.NODE_ENV = originalEnv
			process.env.PORT = originalPort
		})
	})

	describe('GET /health/ready', () => {
		it('should perform readiness check with both database and Stripe FDW quick pings', async () => {
			const mockReadyResult: HealthCheckResult = {
				status: 'ok',
				info: {
					database: { status: 'up', type: 'quick' },
					stripe_fdw: { status: 'up', type: 'fdw-quick' }
				},
				error: {},
				details: {
					database: { status: 'up', type: 'quick' },
					stripe_fdw: { status: 'up', type: 'fdw-quick' }
				}
			}

			jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockReadyResult)
			jest.spyOn(supabaseHealth, 'quickPing').mockResolvedValue({
				database: {
					status: 'up',
					responseTime: 10,
					supabaseStatus: 'healthy' as const,
					message: undefined
				}
			})
			jest.spyOn(stripeFdwHealth, 'quickPing').mockResolvedValue({
				stripe_fdw: {
					status: 'up',
					responseTime: 15,
					supabaseStatus: 'healthy' as const,
					message: undefined
				}
			})

			const result = await controller.ready()

			expect(result).toEqual(mockReadyResult)
			expect(healthCheckService.check).toHaveBeenCalledWith([
				expect.any(Function),
				expect.any(Function)
			])
		})

		it('should handle readiness check failures', async () => {
			const mockErrorResult: HealthCheckResult = {
				status: 'error',
				info: {
					database: { status: 'up', type: 'quick' }
				},
				error: {
					stripe_fdw: {
						status: 'down',
						type: 'fdw-quick',
						error: 'Quick ping failed'
					}
				},
				details: {
					database: { status: 'up', type: 'quick' },
					stripe_fdw: {
						status: 'down',
						type: 'fdw-quick',
						error: 'Quick ping failed'
					}
				}
			}

			jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockErrorResult)

			const result = await controller.ready()

			expect(result).toEqual(mockErrorResult)
			expect(result.status).toBe('error')
		})
	})

	describe('GET /health/stripe', () => {
		it('should perform detailed Stripe FDW health check', async () => {
			const mockStripeResult: HealthCheckResult = {
				status: 'ok',
				info: {
					stripe_fdw: {
						status: 'up',
						type: 'fdw-detailed',
						realTime: true,
						responseTime: '15ms'
					}
				},
				error: {},
				details: {
					stripe_fdw: {
						status: 'up',
						type: 'fdw-detailed',
						realTime: true,
						responseTime: '15ms'
					}
				}
			}

			jest
				.spyOn(healthCheckService, 'check')
				.mockResolvedValue(mockStripeResult)
			jest.spyOn(stripeFdwHealth, 'detailedCheck').mockResolvedValue({
				stripe_fdw: {
					status: 'up',
					type: 'fdw-detailed',
					realTime: true,
					responseTime: '15ms'
				}
			})

			const result = await controller.stripeCheck()

			expect(result).toEqual(mockStripeResult)
			expect(healthCheckService.check).toHaveBeenCalledWith([
				expect.any(Function)
			])
			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Stripe FDW health check started'
			)
		})

		it('should handle Stripe FDW health check failures', async () => {
			const mockErrorResult: HealthCheckResult = {
				status: 'error',
				info: {},
				error: {
					stripe_fdw: {
						status: 'down',
						type: 'fdw-detailed',
						error: 'Detailed check failed',
						realTime: false
					}
				},
				details: {
					stripe_fdw: {
						status: 'down',
						type: 'fdw-detailed',
						error: 'Detailed check failed',
						realTime: false
					}
				}
			}

			jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockErrorResult)

			const result = await controller.stripeCheck()

			expect(result).toEqual(mockErrorResult)
			expect(result.status).toBe('error')
			expect(result.error).toHaveProperty('stripe_fdw')
		})

		it('should log Stripe health check initiation', async () => {
			jest.spyOn(healthCheckService, 'check').mockResolvedValue({
				status: 'ok',
				info: {},
				error: {},
				details: {}
			})

			await controller.stripeCheck()

			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Stripe FDW health check started'
			)
		})
	})

	describe('Integration', () => {
		it('should handle concurrent health check requests', async () => {
			const mockHealthCheckResult: HealthCheckResult = {
				status: 'ok',
				info: {
					database: { status: 'up' },
					stripe_fdw: { status: 'up' }
				},
				error: {},
				details: {
					database: { status: 'up' },
					stripe_fdw: { status: 'up' }
				}
			}

			jest
				.spyOn(healthCheckService, 'check')
				.mockResolvedValue(mockHealthCheckResult)

			// Simulate concurrent requests
			const [readyResult, stripeResult] = await Promise.all([
				controller.ready(),
				controller.stripeCheck()
			])

			// check() needs to be called separately with response
			await controller.check(mockResponse as Response)

			// check() now returns via response.json()
			expect(mockResponse.status).toHaveBeenCalledWith(200)
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'ok',
				timestamp: expect.any(String),
				environment: 'test',
				uptime: expect.any(Number),
				memory: expect.any(Number),
				version: expect.any(String),
				service: 'backend-api',
				env_vars_loaded: {
					health_check_function: expect.any(Boolean),
					public_cache_max_age: expect.any(Boolean),
					node_env: expect.any(Boolean)
				},
				database: {
					status: 'healthy',
					message: 'Database connection successful'
				}
			})

			// ready() and stripeCheck() return HealthCheckResult format
			expect(readyResult).toEqual(mockHealthCheckResult)
			expect(stripeResult).toEqual(mockHealthCheckResult)

			// Verify health check service was called for ready and stripe endpoints
			expect(healthCheckService.check).toHaveBeenCalledTimes(2)
		})

		it('should maintain performance under load', async () => {
			jest.spyOn(healthCheckService, 'check').mockResolvedValue({
				status: 'ok',
				info: {},
				error: {},
				details: {}
			})

			const startTime = Date.now()

			// Simulate multiple concurrent requests
			const promises = Array(10)
				.fill(null)
				.map(() => {
					const res = {
						status: jest.fn().mockReturnThis(),
						json: jest.fn().mockReturnThis()
					} as unknown as Response
					return controller.check(res)
				})
			await Promise.all(promises)

			const endTime = Date.now()
			const totalTime = endTime - startTime

			// Should complete all requests within a reasonable time
			expect(totalTime).toBeLessThan(5000) // 5 seconds max for 10 concurrent requests
		})
	})

	describe('Error Handling', () => {
		it('should handle database connection errors gracefully', async () => {
			const supabaseService = controller['supabaseClient']
			jest
				.spyOn(supabaseService, 'checkConnection')
				.mockRejectedValue(new Error('Database connection failed'))

			await controller.check(mockResponse as Response)

			expect(mockResponse.status).toHaveBeenCalledWith(503)
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'unhealthy',
					database: {
						status: 'unhealthy',
						message: 'Database connection failed'
					},
					error: 'Database connection failed'
				})
			)
			expect(controller['logger'].error).toHaveBeenCalledWith(
				'Health check failed with error',
				'Database connection failed'
			)
		})

		it('should handle supabase service injection errors gracefully', async () => {
			// Mock the controller to return null for supabaseClient
			const originalSupabaseClient = controller['supabaseClient']
			Object.defineProperty(controller, 'supabaseClient', {
				value: null,
				writable: true,
				configurable: true
			})

			await controller.check(mockResponse as Response)

			expect(mockResponse.status).toHaveBeenCalledWith(503)
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'unhealthy',
					database: {
						status: 'unhealthy',
						message: 'SupabaseService not injected properly'
					},
					error: 'SupabaseService not injected properly'
				})
			)
			expect(controller['logger'].error).toHaveBeenCalledWith(
				'Health check failed with error',
				'SupabaseService not injected properly'
			)

			// Restore original value
			Object.defineProperty(controller, 'supabaseClient', {
				value: originalSupabaseClient,
				writable: true,
				configurable: true
			})
		})
	})
})
