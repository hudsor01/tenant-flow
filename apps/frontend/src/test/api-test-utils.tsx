/**
 * API Test Utilities
 *
 * Reusable utilities for testing TanStack Query hooks.
 * Extracted from existing test patterns in use-properties.test.tsx.
 *
 * Usage:
 * ```typescript
 * import { createTestWrapper, createMockFetchResponse } from '@/test/api-test-utils';
 *
 * const { result } = renderHook(() => useTenant('id'), {
 *   wrapper: createTestWrapper()
 * });
 * ```
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * Creates a wrapper component for testing React Query hooks.
 * Returns a fresh QueryClient per call to ensure test isolation.
 *
 * @returns Wrapper component with QueryClientProvider
 *
 * @example
 * ```typescript
 * const { result } = renderHook(() => useProperty('id'), {
 *   wrapper: createTestWrapper()
 * });
 * ```
 */
export function createTestWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
	}
}

/**
 * Creates a mock Response object that works with apiRequest.
 * apiRequest uses .text() then JSON.parse, so both json() and text() are mocked.
 *
 * @param data - The data to return from the response
 * @param ok - Whether the response should be successful (default: true)
 * @param status - HTTP status code (default: 200 for ok, 500 otherwise)
 * @returns Mock Response object
 *
 * @example
 * ```typescript
 * mockFetch.mockResolvedValue(createMockFetchResponse({ id: '123', name: 'Test' }));
 * // For errors:
 * mockFetch.mockResolvedValue(createMockFetchResponse({ message: 'Error' }, false, 400));
 * ```
 */
export function createMockFetchResponse<T>(
	data: T,
	ok: boolean = true,
	status?: number
): Response {
	const resolvedStatus = status ?? (ok ? 200 : 500)
	const jsonString = JSON.stringify(data)

	return {
		ok,
		status: resolvedStatus,
		statusText: ok ? 'OK' : 'Error',
		json: () => Promise.resolve(data),
		text: () => Promise.resolve(jsonString)
	} as Response
}

/**
 * Creates standard mock functions for Supabase client.
 * Use with vi.hoisted() to avoid initialization errors.
 *
 * @example
 * ```typescript
 * // At top of test file, before vi.mock calls:
 * const { mockGetSession, mockSupabaseSelect } = vi.hoisted(() => createSupabaseMocks());
 *
 * vi.mock('#utils/supabase/client', () => ({
 *   createClient: () => ({
 *     from: () => ({ select: mockSupabaseSelect }),
 *     auth: { getSession: mockGetSession }
 *   })
 * }));
 * ```
 */
export function createSupabaseMocks() {
	return {
		mockGetSession: vi.fn(),
		mockSupabaseSelect: vi.fn(),
		mockSupabaseInsert: vi.fn(),
		mockSupabaseUpdate: vi.fn(),
		mockSupabaseDelete: vi.fn(),
		mockSupabaseEq: vi.fn(),
		mockSupabaseOrder: vi.fn(),
		mockSupabaseSingle: vi.fn()
	}
}

/**
 * Standard mock setup for authenticated session.
 * Call in beforeEach to reset session mock.
 *
 * @param mockGetSession - The mocked getSession function
 * @param accessToken - Token to return (default: 'test-token')
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   setupAuthenticatedSession(mockGetSession);
 * });
 * ```
 */
export function setupAuthenticatedSession(
	mockGetSession: ReturnType<typeof vi.fn>,
	accessToken: string = 'test-token'
) {
	mockGetSession.mockResolvedValue({
		data: { session: { access_token: accessToken } }
	})
}

/**
 * Standard mock setup for unauthenticated session (no token).
 *
 * @param mockGetSession - The mocked getSession function
 *
 * @example
 * ```typescript
 * it('should handle unauthenticated state', async () => {
 *   setupUnauthenticatedSession(mockGetSession);
 *   // ... test code
 * });
 * ```
 */
export function setupUnauthenticatedSession(
	mockGetSession: ReturnType<typeof vi.fn>
) {
	mockGetSession.mockResolvedValue({
		data: { session: null }
	})
}

/**
 * Creates a paginated response structure matching backend API format.
 *
 * @param data - Array of items
 * @param total - Total count (defaults to data.length)
 * @returns Paginated response object
 *
 * @example
 * ```typescript
 * mockFetch.mockResolvedValue(
 *   createMockFetchResponse(createPaginatedResponse([item1, item2], 100))
 * );
 * ```
 */
export function createPaginatedResponse<T>(data: T[], total?: number) {
	return {
		data,
		total: total ?? data.length
	}
}

/**
 * Common mock setup pattern for API config and logger.
 * Call at the top of test files after imports.
 *
 * NOTE: You still need to call these mocks manually since vi.mock
 * needs to be at module level. This function documents the pattern.
 *
 * @example
 * ```typescript
 * // In your test file:
 * vi.mock('#lib/api-config', () => ({
 *   getApiBaseUrl: () => 'http://localhost:4600'
 * }));
 *
 * vi.mock('@repo/shared/lib/frontend-logger', () => ({
 *   logger: {
 *     info: vi.fn(),
 *     error: vi.fn(),
 *     warn: vi.fn(),
 *     debug: vi.fn()
 *   },
 *   createLogger: () => ({
 *     info: vi.fn(),
 *     error: vi.fn(),
 *     warn: vi.fn(),
 *     debug: vi.fn()
 *   })
 * }));
 *
 * vi.mock('sonner', () => ({
 *   toast: {
 *     success: vi.fn(),
 *     error: vi.fn()
 *   }
 * }));
 * ```
 */
export const STANDARD_MOCKS_PATTERN = `
// Mock api-config (used by api-request internally)
vi.mock('#lib/api-config', () => ({
  getApiBaseUrl: () => 'http://localhost:4600'
}));

// Mock logger
vi.mock('@repo/shared/lib/frontend-logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));
` as const

/**
 * Test API base URL constant.
 * Use this in expect assertions for consistent URL checking.
 */
export const TEST_API_BASE_URL = 'http://localhost:4600'
