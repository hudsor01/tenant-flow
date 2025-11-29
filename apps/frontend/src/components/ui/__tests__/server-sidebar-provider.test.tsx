/**
 * Server Sidebar Provider Tests
 *
 * Tests for server-side cookie reading and SSR compatibility.
 */

import { render, screen } from '#test/utils/test-render'
import { vi } from 'vitest'
import { ServerSidebarProvider } from '#components/ui/server-sidebar-provider'
import type { ReactNode, CSSProperties, HTMLAttributes } from 'react'

// Mock Next.js cookies
const mockCookies = vi.fn()
vi.mock('next/headers', () => ({
	cookies: () => mockCookies()
}))

// Mock the SidebarProvider to avoid client-side rendering issues
vi.mock('#components/ui/sidebar', () => {
	interface MockSidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
		defaultOpen?: boolean
		open?: boolean
		onOpenChange?: (open: boolean) => void
		className?: string
		style?: CSSProperties
		children: ReactNode
	}

	const MockSidebarProvider = ({ defaultOpen, children, className, style, ...props }: MockSidebarProviderProps) => (
		<div
			data-testid="sidebar-provider"
			data-default-open={defaultOpen}
			className={className}
			style={style}
			{...props}
		>
			{children}
		</div>
	)

	return {
		SidebarProvider: MockSidebarProvider
	}
})

// Test component that uses sidebar context
function TestSidebarConsumer() {
	return <div data-testid="server-sidebar-test">Server Sidebar Test</div>
}

describe('ServerSidebarProvider', () => {
	beforeEach(() => {
		mockCookies.mockClear()
	})

	describe('Server-side Cookie Reading', () => {
		it('should read sidebar_state=true from cookies and pass as defaultOpen', async () => {
			const mockCookieStore = {
				get: vi.fn().mockReturnValue({ value: 'true' })
			}
			mockCookies.mockResolvedValue(mockCookieStore)

			render(await ServerSidebarProvider({
				children: <TestSidebarConsumer />
			}))

			expect(mockCookieStore.get).toHaveBeenCalledWith('sidebar_state')
			expect(screen.getByTestId('sidebar-provider')).toHaveAttribute('data-default-open', 'true')
			expect(screen.getByTestId('server-sidebar-test')).toBeInTheDocument()
		})

		it('should read sidebar_state=false from cookies and pass as defaultOpen', async () => {
			const mockCookieStore = {
				get: vi.fn().mockReturnValue({ value: 'false' })
			}
			mockCookies.mockResolvedValue(mockCookieStore)

			render(await ServerSidebarProvider({
				children: <TestSidebarConsumer />
			}))

			expect(mockCookieStore.get).toHaveBeenCalledWith('sidebar_state')
			expect(screen.getByTestId('sidebar-provider')).toHaveAttribute('data-default-open', 'false')
		})

		it('should use defaultOpen=true when no cookie exists', async () => {
			const mockCookieStore = {
				get: vi.fn().mockReturnValue(undefined)
			}
			mockCookies.mockResolvedValue(mockCookieStore)

			render(await ServerSidebarProvider({
				defaultOpen: true,
				children: <TestSidebarConsumer />
			}))

			expect(mockCookieStore.get).toHaveBeenCalledWith('sidebar_state')
			expect(screen.getByTestId('sidebar-provider')).toHaveAttribute('data-default-open', 'true')
		})

		it('should use defaultOpen=false when no cookie exists', async () => {
			const mockCookieStore = {
				get: vi.fn().mockReturnValue(undefined)
			}
			mockCookies.mockResolvedValue(mockCookieStore)

			render(await ServerSidebarProvider({
				defaultOpen: false,
				children: <TestSidebarConsumer />
			}))

			expect(mockCookieStore.get).toHaveBeenCalledWith('sidebar_state')
			expect(screen.getByTestId('sidebar-provider')).toHaveAttribute('data-default-open', 'false')
		})

		it('should handle malformed cookie values gracefully', async () => {
			const mockCookieStore = {
				get: vi.fn().mockReturnValue({ value: 'invalid' })
			}
			mockCookies.mockResolvedValue(mockCookieStore)

			render(await ServerSidebarProvider({
				defaultOpen: true,
				children: <TestSidebarConsumer />
			}))

			expect(mockCookieStore.get).toHaveBeenCalledWith('sidebar_state')
			// Should fallback to defaultOpen=true when cookie is malformed
			expect(screen.getByTestId('sidebar-provider')).toHaveAttribute('data-default-open', 'true')
		})

		it('should prioritize explicit open prop over cookie value', async () => {
			const mockCookieStore = {
				get: vi.fn().mockReturnValue({ value: 'false' })
			}
			mockCookies.mockResolvedValue(mockCookieStore)

			render(await ServerSidebarProvider({
				open: true, // Explicit prop should override cookie
				children: <TestSidebarConsumer />
			}))

			expect(mockCookieStore.get).toHaveBeenCalledWith('sidebar_state')
			// Should use explicit open prop, not cookie value
			expect(screen.getByTestId('sidebar-provider')).toHaveAttribute('data-default-open', 'true')
		})

		it('should handle cookies API errors gracefully', async () => {
			mockCookies.mockImplementation(() => Promise.reject(new Error('Cookies API failed')))

			render(await ServerSidebarProvider({
				defaultOpen: true,
				children: <TestSidebarConsumer />
			}))

			// Should fallback to defaultOpen when cookies API fails
			expect(screen.getByTestId('sidebar-provider')).toHaveAttribute('data-default-open', 'true')
		})
	})

	describe('SSR Compatibility', () => {
		it('should be a server component that can be awaited', async () => {
			const mockCookieStore = {
				get: vi.fn().mockReturnValue({ value: 'true' })
			}
			mockCookies.mockResolvedValue(mockCookieStore)

			const result = await ServerSidebarProvider({
				children: <TestSidebarConsumer />
			})

			expect(result).toBeDefined()
			expect(result.props.children).toBeDefined()
		})

		it('should pass through all props to SidebarProvider', async () => {
			const mockCookieStore = {
				get: vi.fn().mockReturnValue({ value: 'true' })
			}
			mockCookies.mockResolvedValue(mockCookieStore)

			const customClass = 'custom-sidebar'

			render(await ServerSidebarProvider({
				className: customClass,
				children: <TestSidebarConsumer />
			}))

			const provider = screen.getByTestId('sidebar-provider')
			expect(provider).toHaveClass(customClass)
		})
	})
})
