/**
 * TestBed Utilities for Suites (Automock)
 *
 * Modern testing utilities using @automock/jest for automatic dependency mocking.
 * Eliminates 50+ lines of manual mock boilerplate per test file.
 *
 * @see TESTING-BEST-PRACTICES.md for usage examples
 */

import { TestBed } from '@automock/jest'
import { Test } from '@nestjs/testing'

/**
 * TestBed result containing the unit under test and mock retrieval utilities
 */
export interface TestBedResult<T> {
	/** The class instance being tested */
	unit: T
	/** Unit reference for accessing dependencies */
	unitRef: any
	/** Get a mocked dependency with type safety */
	get: <TDep>(token: new (...args: any[]) => TDep) => jest.Mocked<TDep>
}

/**
 * Create a TestBed for a class with automatic dependency mocking
 *
 * Benefits:
 * - Auto-mocks all dependencies (no manual mock setup)
 * - Type-safe mock retrieval
 * - Reduces test boilerplate by 95%
 * - Easy to refactor when dependencies change
 *
 * @example
 * ```typescript
 * describe('TenantPaymentsController', () => {
 *   let testBed: TestBedResult<TenantPaymentsController>
 *   let stripeService: jest.Mocked<StripeService>
 *   let supabaseService: jest.Mocked<SupabaseService>
 *
 *   beforeEach(async () => {
 *     testBed = await createTestBed(TenantPaymentsController)
 *     stripeService = testBed.get(StripeService)
 *     supabaseService = testBed.get(SupabaseService)
 *   })
 *
 *   it('processes payment successfully', async () => {
 *     stripeService.createPaymentIntent.mockResolvedValue({ id: 'pi_123' })
 *
 *     const result = await testBed.unit.processPayment({ amount: 1000 })
 *
 *     expect(result.id).toBe('pi_123')
 *     expect(stripeService.createPaymentIntent).toHaveBeenCalledWith({
 *       amount: 1000,
 *       currency: 'usd'
 *     })
 *   })
 * })
 * ```
 *
 * @param classType - The class to test (controller, service, etc.)
 * @returns TestBedResult with the unit under test and mock utilities
 */
export async function createTestBed<T>(
	classType: new (...args: any[]) => T
): Promise<TestBedResult<T>> {
	const { unit, unitRef } = TestBed.create(classType).compile()

	return {
		unit,
		unitRef,
		get: <TDep>(token: new (...args: any[]) => TDep): jest.Mocked<TDep> => {
			return unitRef.get(token)
		}
	}
}

/**
 * Create a TestBed with custom provider overrides
 *
 * Use this when you need to:
 * - Provide custom mock implementations
 * - Override specific dependencies
 * - Add global providers (like ConfigService)
 *
 * @example
 * ```typescript
 * const testBed = await createTestBedWithOverrides(
 *   DashboardFinancialController,
 *   [
 *     {
 *       provide: ConfigService,
 *       useValue: {
 *         get: jest.fn((key) => {
 *           if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123'
 *           return undefined
 *         })
 *       }
 *     }
 *   ]
 * )
 * ```
 *
 * @param classType - The class to test
 * @param customProviders - Array of custom provider overrides
 * @returns TestBedResult with the unit under test and mock utilities
 */
export async function createTestBedWithOverrides<T>(
	classType: new (...args: any[]) => T,
	customProviders: any[]
): Promise<TestBedResult<T>> {
	// Create base test module using NestJS testing utilities
	const moduleRef = await Test.createTestingModule({
		controllers: [classType],
		providers: [classType, ...customProviders]
	}).compile()

	const unit = moduleRef.get<T>(classType)

	return {
		unit,
		unitRef: moduleRef as any,
		get: <TDep>(token: new (...args: any[]) => TDep): jest.Mocked<TDep> => {
			return moduleRef.get(token)
		}
	}
}

/**
 * Mock a chainable Supabase query builder
 *
 * Useful when auto-mocking doesn't handle the chainable API correctly.
 *
 * @example
 * ```typescript
 * const supabaseService = testBed.get(SupabaseService)
 * supabaseService.getAdminClient.mockReturnValue(
 *   createSupabaseChainMock({ data: [{ id: '1' }], error: null })
 * )
 * ```
 */
export function createSupabaseChainMock(
	finalResult: { data: any; error: any } = { data: null, error: null }
) {
	const chain: any = {
		from: jest.fn().mockReturnThis(),
		select: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnThis(),
		delete: jest.fn().mockReturnThis(),
		upsert: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		neq: jest.fn().mockReturnThis(),
		gt: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lt: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		like: jest.fn().mockReturnThis(),
		ilike: jest.fn().mockReturnThis(),
		is: jest.fn().mockReturnThis(),
		in: jest.fn().mockReturnThis(),
		contains: jest.fn().mockReturnThis(),
		containedBy: jest.fn().mockReturnThis(),
		rangeGt: jest.fn().mockReturnThis(),
		rangeGte: jest.fn().mockReturnThis(),
		rangeLt: jest.fn().mockReturnThis(),
		rangeLte: jest.fn().mockReturnThis(),
		rangeAdjacent: jest.fn().mockReturnThis(),
		overlaps: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		range: jest.fn().mockResolvedValue(finalResult),
		single: jest.fn().mockResolvedValue(finalResult),
		maybeSingle: jest.fn().mockResolvedValue(finalResult),
		csv: jest.fn().mockResolvedValue(finalResult),
		rpc: jest.fn().mockResolvedValue(finalResult)
	}

	// Support awaiting the chain directly (for queries that don't call .single() or .range())
	chain.then = jest
		.fn()
		.mockImplementation((resolve: any) => Promise.resolve(resolve(finalResult)))

	return chain
}

/**
 * Create a mock ConfigService with common environment variables
 *
 * @example
 * ```typescript
 * const configService = createMockConfigService({
 *   STRIPE_SECRET_KEY: 'sk_test_123',
 *   DATABASE_URL: 'postgresql://localhost/test'
 * })
 * ```
 */
export function createMockConfigService(
	env: Record<string, string | number | boolean> = {}
) {
	return {
		get: jest.fn((key: string, defaultValue?: any) => {
			return env[key] ?? defaultValue
		}),
		getOrThrow: jest.fn((key: string) => {
			if (!(key in env)) {
				throw new Error(`Config key "${key}" not found`)
			}
			return env[key]
		})
	}
}

/**
 * Create a mock Logger service
 */
export function createMockLogger() {
	return {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
		verbose: jest.fn(),
		setContext: jest.fn(),
		setLogLevels: jest.fn()
	}
}

/**
 * Create a mock CacheManager
 */
export function createMockCacheManager() {
	const store = new Map<string, any>()

	return {
		get: jest.fn(async (key: string) => store.get(key)),
		set: jest.fn(async (key: string, value: any) => {
			store.set(key, value)
		}),
		del: jest.fn(async (key: string) => {
			store.delete(key)
		}),
		reset: jest.fn(async () => {
			store.clear()
		}),
		wrap: jest.fn(async (key: string, fn: () => Promise<any>) => {
			if (store.has(key)) {
				return store.get(key)
			}
			const value = await fn()
			store.set(key, value)
			return value
		})
	}
}

/**
 * Test cleanup utilities
 */
export const TestCleanup = {
	/**
	 * Clear all mocks between tests
	 */
	clearMocks: () => {
		jest.clearAllMocks()
	},

	/**
	 * Reset all mocks between tests (clears calls + return values)
	 */
	resetMocks: () => {
		jest.resetAllMocks()
	},

	/**
	 * Restore all mocks to original implementations
	 */
	restoreMocks: () => {
		jest.restoreAllMocks()
	}
}
