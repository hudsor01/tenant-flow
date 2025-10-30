/**
 * Common Test Mocks
 * Centralized mock configurations for frequently mocked modules
 * Provides consistent mock behavior across all tests
 */

import { vi } from 'vitest'

/**
 * Mock Next.js router with common methods
 * Returns a router mock with all common navigation methods
 *
 * @example
 * const mockRouter = createMockRouter()
 * vi.mock('next/navigation', () => ({
 *   useRouter: () => mockRouter,
 *   usePathname: () => '/current/path'
 * }))
 */
export function createMockRouter() {
	return {
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		pathname: '/',
		query: {}
	}
}

/**
 * Mock toast notifications (sonner)
 * Returns mock toast object with all common methods
 *
 * @example
 * const mockToast = createMockToast()
 * vi.mock('sonner', () => ({
 *   toast: mockToast
 * }))
 */
export function createMockToast() {
	return {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		info: vi.fn(),
		warning: vi.fn(),
		promise: vi.fn(),
		custom: vi.fn(),
		dismiss: vi.fn()
	}
}

/**
 * Setup common mocks used across multiple tests
 * Call this in beforeEach to reset all mocks to clean state
 *
 * @example
 * describe('MyComponent', () => {
 *   const mocks = setupCommonMocks()
 *
 *   beforeEach(() => {
 *     mocks.reset()
 *   })
 *
 *   test('navigates on click', async () => {
 *     // ... test code
 *     expect(mocks.router.push).toHaveBeenCalledWith('/target')
 *   })
 * })
 */
export function setupCommonMocks() {
	const router = createMockRouter()
	const toast = createMockToast()

	return {
		router,
		toast,
		reset: () => {
			vi.clearAllMocks()
			router.push.mockClear()
			router.replace.mockClear()
			router.prefetch.mockClear()
			router.back.mockClear()
		}
	}
}

/**
 * Create a mock for TanStack Query hooks
 * Provides type-safe mocks for useQuery and useMutation
 *
 * @example
 * const mockQuery = createMockQuery({ data: mockTenant, isLoading: false })
 * mockUseTenant.mockReturnValue(mockQuery)
 */
export function createMockQuery<TData>(
	overrides?: Partial<{
		data: TData
		isLoading: boolean
		isError: boolean
		error: Error | null
		refetch: ReturnType<typeof vi.fn>
	}>
) {
	return {
		data: overrides?.data,
		isLoading: overrides?.isLoading ?? false,
		isError: overrides?.isError ?? false,
		error: overrides?.error ?? null,
		refetch: overrides?.refetch ?? vi.fn(),
		isFetching: false,
		isSuccess: !overrides?.isLoading && !overrides?.isError,
		status: overrides?.isLoading
			? ('pending' as const)
			: overrides?.isError
				? ('error' as const)
				: ('success' as const)
	}
}

/**
 * Create a mock for TanStack Query mutations
 * Provides type-safe mocks for mutations with proper callbacks
 *
 * @example
 * const mockMutation = createMockMutation({
 *   onSuccess: (data) => {
 *     toast.success('Success!')
 *     router.push('/success')
 *   }
 * })
 */
export function createMockMutation<TData = unknown>(config?: {
	onSuccess?: (data: TData) => void
	onError?: (error: Error) => void
	isPending?: boolean
}) {
	return {
		mutate: vi.fn(() => {
			config?.onSuccess?.(undefined as TData)
		}),
		mutateAsync: vi.fn(async (): Promise<TData> => {
			config?.onSuccess?.(undefined as TData)
			return undefined as TData
		}),
		isPending: config?.isPending ?? false,
		isError: false,
		isSuccess: false,
		error: null,
		reset: vi.fn()
	}
}
