/**
 * Custom Render Utilities
 * Provides custom render functions with common providers pre-configured
 * to reduce boilerplate in component tests.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import { render as rtlRender } from '@testing-library/react'
import type { ReactElement } from 'react'

/**
 * Custom render options extending RTL's RenderOptions
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
	queryClientConfig?: {
		defaultOptions?: {
			queries?: Record<string, unknown>
			mutations?: Record<string, unknown>
		}
	}
}

/**
 * Create a QueryClient with test-friendly defaults
 * Disables retries and sets appropriate cache times for testing
 */
export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
				staleTime: 0
			},
			mutations: {
				retry: false
			}
		}
	})
}

/**
 * Custom render function with QueryClientProvider
 *
 * Automatically wraps components in QueryClientProvider with test-optimized settings.
 * Eliminates boilerplate of manually setting up providers in every test.
 *
 * @example
 * test('renders component', () => {
 *   render(<MyComponent />)
 *   expect(screen.getByText('Hello')).toBeInTheDocument()
 * })
 *
 * @example With custom query client config
 * test('renders with custom settings', () => {
 *   render(<MyComponent />, {
 *     queryClientConfig: {
 *       defaultOptions: {
 *         queries: { staleTime: 5000 }
 *       }
 *     }
 *   })
 * })
 */
export function render(
	ui: ReactElement,
	options?: CustomRenderOptions
): RenderResult {
	const { queryClientConfig, ...renderOptions } = options || {}

	const queryClient = queryClientConfig
		? new QueryClient(queryClientConfig)
		: createTestQueryClient()

	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
	}

	return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Create a reusable wrapper component for tests that need the same setup
 * Useful for describe blocks where multiple tests share the same providers
 *
 * @example
 * describe('MyComponent', () => {
 *   const { Wrapper } = createTestWrapper()
 *
 *   test('first test', () => {
 *     render(<MyComponent />, { wrapper: Wrapper })
 *   })
 *
 *   test('second test', () => {
 *     render(<MyComponent />, { wrapper: Wrapper })
 *   })
 * })
 */
export function createTestWrapper(queryClient?: QueryClient) {
	const client = queryClient || createTestQueryClient()

	const Wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)

	return { Wrapper, queryClient: client }
}

/**
 * Re-export everything from testing-library for convenience
 * Allows importing all testing utilities from a single location
 */
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
