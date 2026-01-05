import { Test } from '@nestjs/testing'
import { QueryPerformanceInterceptor } from './query-performance.interceptor'

import { of, throwError } from 'rxjs'
import type { CallHandler, ExecutionContext, Logger } from '@nestjs/common'
import { performance } from 'node:perf_hooks'
import { SilentLogger } from '../__tests__/silent-logger'
import { AppLogger } from '../logger/app-logger.service'

describe('QueryPerformanceInterceptor', () => {
	let interceptor: QueryPerformanceInterceptor
	let mockLogger: jest.Mocked<Logger>
	let mockExecutionContext: jest.Mocked<ExecutionContext>
	let mockCallHandler: jest.Mocked<CallHandler>

	let performanceNowSpy: jest.SpyInstance | undefined

	beforeEach(async () => {
		mockLogger = {
			warn: jest.fn(),
			debug: jest.fn(),
			log: jest.fn()
		} as unknown as jest.Mocked<Logger>

		const module = await Test.createTestingModule({
			providers: [
				QueryPerformanceInterceptor,
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		interceptor = module.get<QueryPerformanceInterceptor>(
			QueryPerformanceInterceptor
		)
		// Override the logger
		;(interceptor as unknown as { logger: Logger }).logger = mockLogger

		mockExecutionContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({
					method: 'GET',
					route: { path: '/api/properties' },
					url: '/api/properties?page=1'
				})
			}),
			getClass: jest.fn().mockReturnValue({ name: 'PropertiesController' }),
			getHandler: jest.fn().mockReturnValue({ name: 'findAll' })
		} as unknown as jest.Mocked<ExecutionContext>

		mockCallHandler = {
			handle: jest.fn()
		} as unknown as jest.Mocked<CallHandler>
	})

	afterEach(() => {
		// Restore performance.now if it was mocked
		if (performanceNowSpy) {
			performanceNowSpy.mockRestore()
			performanceNowSpy = undefined
		}
	})

	describe('TDD: Slow query logging', () => {
		it('should log warning when request takes longer than 1000ms', done => {
			// Mock slow handler that takes >1000ms
			const slowDuration = 1100
			const startTime = 1000 // Use a fixed start time for deterministic testing

			mockCallHandler.handle.mockReturnValue(of('result'))

			// Override performance.now to simulate slow request
			let callCount = 0
			performanceNowSpy = jest
				.spyOn(performance, 'now')
				.mockImplementation(() => {
					callCount++
					if (callCount === 1) return startTime
					return startTime + slowDuration // Second call = after handler completes
				})

			interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
				complete: () => {
					expect(mockLogger.warn).toHaveBeenCalledWith(
						'Slow query detected',
						expect.objectContaining({
							operation: 'slow_query_detected',
							controller: 'PropertiesController',
							handler: 'findAll',
							method: 'GET',
							route: '/api/properties',
							durationMs: expect.any(Number),
							thresholdMs: 1000
						})
					)
					// Verify duration is approximately correct (allow for floating point precision)
					const warnCall = mockLogger.warn.mock.calls[0]
					const loggedDuration = warnCall[1].durationMs
					expect(loggedDuration).toBeGreaterThanOrEqual(slowDuration - 1)
					expect(loggedDuration).toBeLessThanOrEqual(slowDuration + 1)

					done()
				},
				error: done
			})
		})

		it('should NOT log warning when request completes under 1000ms', done => {
			mockCallHandler.handle.mockReturnValue(of('result'))

			interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
				complete: () => {
					expect(mockLogger.warn).not.toHaveBeenCalled()
					expect(mockLogger.debug).toHaveBeenCalled() // Still logs debug
					done()
				},
				error: done
			})
		})

		it('should log debug message for all requests with timing', done => {
			mockCallHandler.handle.mockReturnValue(of('result'))

			interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
				complete: () => {
					expect(mockLogger.debug).toHaveBeenCalledWith(
						'Query performance tracked',
						expect.objectContaining({
							operation: 'query_performance',
							controller: 'PropertiesController',
							handler: 'findAll',
							method: 'GET',
							route: '/api/properties',
							durationMs: expect.any(Number)
						})
					)
					done()
				},
				error: done
			})
		})

		it('should track performance even when handler throws error', done => {
			const error = new Error('Database error')
			mockCallHandler.handle.mockReturnValue(throwError(() => error))

			interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
				next: () => done(new Error('Should not succeed')),
				error: err => {
					expect(err).toBe(error)
					expect(mockLogger.debug).toHaveBeenCalled()
					done()
				}
			})
		})

		it('should handle missing route information gracefully', done => {
			mockExecutionContext.switchToHttp().getRequest = jest
				.fn()
				.mockReturnValue({
					method: undefined,
					route: undefined,
					url: undefined
				})

			mockCallHandler.handle.mockReturnValue(of('result'))

			interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
				complete: () => {
					expect(mockLogger.debug).toHaveBeenCalledWith(
						'Query performance tracked',
						expect.objectContaining({
							controller: 'PropertiesController',
							handler: 'findAll',
							method: 'UNKNOWN',
							route: 'unknown'
						})
					)
					done()
				},
				error: done
			})
		})
	})

	describe('TDD: Configurable threshold', () => {
		it('should use default threshold of 1000ms', () => {
			expect(
				(interceptor as unknown as { slowQueryThresholdMs: number })
					.slowQueryThresholdMs
			).toBe(1000)
		})

		it('should allow custom threshold via environment variable', async () => {
			process.env.SLOW_QUERY_THRESHOLD_MS = '2000'

			const module = await Test.createTestingModule({
				providers: [
					QueryPerformanceInterceptor,
					{
						provide: AppLogger,
						useValue: new SilentLogger()
					}
				]
			}).compile()

			const customInterceptor = module.get<QueryPerformanceInterceptor>(
				QueryPerformanceInterceptor
			)

			expect(
				(customInterceptor as unknown as { slowQueryThresholdMs: number })
					.slowQueryThresholdMs
			).toBe(2000)

			delete process.env.SLOW_QUERY_THRESHOLD_MS
		})
	})
})
