import type { HealthCheckResult } from '@nestjs/terminus'
import { HealthCheckService } from '@nestjs/terminus'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { SilentLogger } from '../__test__/silent-logger'
import { StripeSyncService } from '../modules/billing/stripe-sync.service'
import { CircuitBreakerService } from './circuit-breaker.service'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'
import { MetricsService } from './metrics.service'
import { SupabaseHealthIndicator } from './supabase.health'

describe('HealthController', () => {
	let controller: HealthController
	let module: TestingModule
	let healthCheckService: HealthCheckService
	let supabaseHealth: SupabaseHealthIndicator

	beforeEach(async () => {
		module = await Test.createTestingModule({
			controllers: [HealthController],
			providers: [
				{
					provide: HealthService,
					useValue: {
						checkSystemHealth: jest.fn().mockResolvedValue({
							status: 'ok',
							timestamp: new Date().toISOString(),
							environment: 'test',
							uptime: 120,
							memory: 30,
							version: '1.0.0',
							service: 'backend-api',
							config_loaded: {
								node_env: true,
								cors_origins: true,
								supabase_url: true
							},
							database: {
								status: 'healthy',
								message: 'Database connection successful'
							}
						}),
						getPingResponse: jest.fn().mockReturnValue({
							status: 'ok',
							timestamp: new Date().toISOString(),
							uptime: 121,
							memory: 30,
							env: 'test',
							port: 4600
						})
					}
				},
				{
					provide: MetricsService,
					useValue: {
						getDetailedPerformanceMetrics: jest.fn().mockReturnValue({
							uptime: 120,
							memory: {
								used: 30,
								free: 10,
								total: 40,
								usagePercent: 75
							},
							cpu: {
								user: 100,
								system: 50
							},
							healthCheckHistory: null,
							thresholds: {
								memory: { warning: 80, critical: 95 },
								cache: { memoryLimit: 100_000_000 },
								responseTime: { warning: 100, critical: 200 }
							},
							cache: {
								cacheSize: 0,
								memoryUsage: 50
							}
						})
					}
				},
				{
					provide: CircuitBreakerService,
					useValue: {
						getCircuitBreakerStatus: jest.fn().mockReturnValue({
							timestamp: new Date().toISOString(),
							services: {
								database: {
									open: false,
									lastSuccess: Date.now(),
									failureCount: 0
								},
								stripe: {
									open: false,
									lastSuccess: Date.now(),
									failureCount: 0
								},
								cache: {
									open: false,
									lastSuccess: Date.now(),
									failureCount: 0
								}
							},
							systemStatus: 'healthy'
						})
					}
				},
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
					provide: StripeSyncService,
					useValue: {
						getHealthStatus: jest.fn().mockReturnValue({
							status: 'healthy',
							initialized: true,
							timestamp: new Date().toISOString()
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

		// Logger is handled by SilentLogger in the module

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
			const result = await controller.check()

			expect(result).toEqual({
				status: 'ok',
				timestamp: expect.any(String),
				environment: 'test', // Test environment sets NODE_ENV=test
				uptime: expect.any(Number),
				memory: expect.any(Number),
				version: expect.any(String),
				service: 'backend-api',
				config_loaded: {
					node_env: expect.any(Boolean),
					cors_origins: expect.any(Boolean),
					supabase_url: expect.any(Boolean)
				},
				database: {
					status: 'healthy',
					message: 'Database connection successful'
				}
			})
			// Log call is now handled by the HealthService
		})

		it('should handle health check failures gracefully', async () => {
			// Mock the health service to return unhealthy status
			const healthService = module.get<HealthService>(HealthService)
			jest.spyOn(healthService, 'checkSystemHealth').mockResolvedValue({
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				environment: 'test',
				uptime: 120,
				memory: 30,
				version: '1.0.0',
				service: 'backend-api',
				config_loaded: {
					node_env: true,
					cors_origins: true,
					supabase_url: true
				},
				database: {
					status: 'unhealthy',
					message: 'Database connection failed'
				},
				error: 'Database connection failed'
			})

			const result = await controller.check()

			expect(result).toEqual(
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

		it('should delegate to health service for health check', async () => {
			const healthService = module.get<HealthService>(HealthService)
			const spy = jest.spyOn(healthService, 'checkSystemHealth')

			await controller.check()

			expect(spy).toHaveBeenCalledTimes(1)
		})
	})

	describe('GET /health/check', () => {
		it('should use the main check endpoint as an alias', async () => {
			const result = await controller.checkEndpoint()

			expect(result).toEqual(
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
			const result = controller.ping()

			expect(result).toMatchObject({
				status: 'ok',
				timestamp: expect.any(String),
				uptime: 121,
				memory: 30,
				env: 'test',
				port: 4600 // Backend port (not frontend port 3001)
			})

			// Verify timestamp is a valid ISO string
			expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
		})

		it('should delegate to health service for ping response', () => {
			const healthService = module.get<HealthService>(HealthService)
			const spy = jest.spyOn(healthService, 'getPingResponse')

			controller.ping()

			expect(spy).toHaveBeenCalledTimes(1)
		})
	})

	describe('GET /health/ready', () => {
		it('should perform readiness check with database quick ping', async () => {
			const mockReadyResult: HealthCheckResult = {
				status: 'ok',
				info: {
					database: { status: 'up', type: 'quick' }
				},
				error: {},
				details: {
					database: { status: 'up', type: 'quick' }
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

			const result = await controller.ready()

			expect(result).toEqual(mockReadyResult)
			expect(healthCheckService.check).toHaveBeenCalledWith([
				expect.any(Function)
			])
		})

		it('should handle readiness check failures', async () => {
			const mockErrorResult: HealthCheckResult = {
				status: 'error',
				info: {},
				error: {
					database: {
						status: 'down',
						type: 'quick',
						error: 'Database quick ping failed'
					}
				},
				details: {
					database: {
						status: 'down',
						type: 'quick',
						error: 'Database quick ping failed'
					}
				}
			}

			jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockErrorResult)

			const result = await controller.ready()

			expect(result).toEqual(mockErrorResult)
			expect(result.status).toBe('error')
		})
	})

	describe('Integration', () => {
		it('should handle concurrent health check requests', async () => {
			const mockHealthCheckResult: HealthCheckResult = {
				status: 'ok',
				info: {
					database: { status: 'up' }
				},
				error: {},
				details: {
					database: { status: 'up' }
				}
			}

			jest
				.spyOn(healthCheckService, 'check')
				.mockResolvedValue(mockHealthCheckResult)

			// Simulate concurrent requests
			const readyResult = await controller.ready()

			// check() needs to be called separately
			const checkResult = await controller.check()

			// check() now returns the health check result directly
			expect(checkResult).toEqual({
				status: 'ok',
				timestamp: expect.any(String),
				environment: 'test', // Test environment sets NODE_ENV=test
				uptime: expect.any(Number),
				memory: expect.any(Number),
				version: expect.any(String),
				service: 'backend-api',
				config_loaded: {
					node_env: expect.any(Boolean),
					cors_origins: expect.any(Boolean),
					supabase_url: expect.any(Boolean)
				},
				database: {
					status: 'healthy',
					message: 'Database connection successful'
				}
			})

			// ready() returns HealthCheckResult format
			expect(readyResult).toEqual(mockHealthCheckResult)

			// Verify health check service was called for ready endpoint
			expect(healthCheckService.check).toHaveBeenCalledTimes(1)
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
				.map(() => controller.check())
			await Promise.all(promises)

			const endTime = Date.now()
			const totalTime = endTime - startTime

			// Should complete all requests within a reasonable time
			expect(totalTime).toBeLessThan(5000) // 5 seconds max for 10 concurrent requests
		})
	})

	describe('Additional endpoints', () => {
		it('should return stripe sync health status', async () => {
			const result = await controller.checkStripeSyncHealth()

			expect(result).toEqual({
				status: 'healthy',
				initialized: true,
				timestamp: expect.any(String)
			})
		})

		it('should return performance metrics', () => {
			const result = controller.performanceMetrics()

			expect(result).toMatchObject({
				uptime: 120,
				memory: {
					used: 30,
					free: 10,
					total: 40,
					usagePercent: 75
				},
				cpu: {
					user: 100,
					system: 50
				},
				cache: {
					cacheSize: 0,
					memoryUsage: 50
				}
			})
		})

		it('should return circuit breaker status', () => {
			const result = controller.circuitBreakerStatus()

			expect(result).toMatchObject({
				timestamp: expect.any(String),
				services: {
					database: {
						open: false,
						lastSuccess: expect.any(Number),
						failureCount: 0
					},
					stripe: {
						open: false,
						lastSuccess: expect.any(Number),
						failureCount: 0
					},
					cache: {
						open: false,
						lastSuccess: expect.any(Number),
						failureCount: 0
					}
				},
				systemStatus: 'healthy'
			})
		})
	})
})
