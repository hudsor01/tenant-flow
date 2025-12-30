/**
 * Sidebar Component Tests
 *
 * Tests for sidebar state management, SSR cookie access, and security enhancements.
 */

import { act, render, screen } from '#test/utils/test-render'
import { vi } from 'vitest'
import { SidebarProvider, useSidebar } from '#components/ui/sidebar/context'

// Mock document.cookie
const mockCookie = vi.fn()
Object.defineProperty(document, 'cookie', {
	get: mockCookie,
	set: mockCookie,
	configurable: true
})

// Mock window.matchMedia for useIsMobile hook
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
})

// Test component that uses sidebar context
function TestSidebarConsumer() {
	const { open, setOpen, state } = useSidebar()
	return (
		<div>
			<span data-testid="sidebar-state">{state}</span>
			<span data-testid="sidebar-open">{open.toString()}</span>
			<button onClick={() => setOpen(!open)} data-testid="toggle-button">
				Toggle
			</button>
		</div>
	)
}

describe('SidebarProvider', () => {
	beforeEach(() => {
		mockCookie.mockClear()
		// Reset document.cookie mock
		mockCookie.mockReturnValue('')
	})

	describe('SSR Cookie Access', () => {
		it('should initialize with defaultOpen=true when no cookie exists', () => {
			mockCookie.mockReturnValue('')

			render(
				<SidebarProvider>
					<TestSidebarConsumer />
				</SidebarProvider>
			)

			expect(screen.getByTestId('sidebar-open')).toHaveTextContent('true')
			expect(screen.getByTestId('sidebar-state')).toHaveTextContent('expanded')
		})

		it('should initialize with cookie value when sidebar_state=true', () => {
			mockCookie.mockReturnValue('sidebar_state=true')

			render(
				<SidebarProvider>
					<TestSidebarConsumer />
				</SidebarProvider>
			)

			expect(screen.getByTestId('sidebar-open')).toHaveTextContent('true')
			expect(screen.getByTestId('sidebar-state')).toHaveTextContent('expanded')
		})

		it('should initialize with cookie value when sidebar_state=false', () => {
			mockCookie.mockReturnValue('sidebar_state=false')

			render(
				<SidebarProvider>
					<TestSidebarConsumer />
				</SidebarProvider>
			)

			expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false')
			expect(screen.getByTestId('sidebar-state')).toHaveTextContent('collapsed')
		})

		it('should handle multiple cookies correctly', () => {
			mockCookie.mockReturnValue(
				'other_cookie=value; sidebar_state=false; another=value'
			)

			render(
				<SidebarProvider>
					<TestSidebarConsumer />
				</SidebarProvider>
			)

			expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false')
		})

		it('should fallback to defaultOpen when cookie parsing fails', () => {
			mockCookie.mockReturnValue('sidebar_state=invalid')

			render(
				<SidebarProvider defaultOpen={false}>
					<TestSidebarConsumer />
				</SidebarProvider>
			)

			expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false')
		})
	})

	describe('Cookie Security Enhancements', () => {
		it('should set secure cookie attributes when setting sidebar state', () => {
			mockCookie.mockReturnValue('')

			render(
				<SidebarProvider>
					<TestSidebarConsumer />
				</SidebarProvider>
			)

			// Click toggle to trigger cookie setting
			const toggleButton = screen.getByTestId('toggle-button')
			act(() => {
				toggleButton.click()
			})

			// Verify cookie was set with security attributes
			expect(mockCookie).toHaveBeenCalledWith(
				expect.stringContaining(
					'sidebar_state=false; path=/; max-age=604800; SameSite=Lax; Secure'
				)
			)
		})

		it('should maintain cookie security attributes on subsequent state changes', () => {
			mockCookie.mockReturnValue('')

			render(
				<SidebarProvider>
					<TestSidebarConsumer />
				</SidebarProvider>
			)

			// Clear any initial calls
			mockCookie.mockClear()

			// Toggle twice
			const toggleButton = screen.getByTestId('toggle-button')
			act(() => {
				toggleButton.click()
			})
			act(() => {
				toggleButton.click()
			})

			// Should have been called with secure attributes both times
			expect(mockCookie).toHaveBeenNthCalledWith(
				1,
				expect.stringContaining(
					'sidebar_state=false; path=/; max-age=604800; SameSite=Lax; Secure'
				)
			)
			expect(mockCookie).toHaveBeenNthCalledWith(
				2,
				expect.stringContaining(
					'sidebar_state=true; path=/; max-age=604800; SameSite=Lax; Secure'
				)
			)
		})
	})

	describe('State Persistence', () => {
		it('should persist state changes to cookie', () => {
			mockCookie.mockReturnValue('')

			render(
				<SidebarProvider>
					<TestSidebarConsumer />
				</SidebarProvider>
			)

			const toggleButton = screen.getByTestId('toggle-button')
			act(() => {
				toggleButton.click()
			})

			expect(mockCookie).toHaveBeenCalledWith(
				'sidebar_state=false; path=/; max-age=604800; SameSite=Lax; Secure'
			)
		})

		it('should handle cookie setting errors gracefully', () => {
			mockCookie.mockImplementation(() => {
				throw new Error('Cookie setting failed')
			})

			// Should not throw when cookie setting fails
			expect(() => {
				render(
					<SidebarProvider>
						<TestSidebarConsumer />
					</SidebarProvider>
				)
			}).not.toThrow()
		})
	})
})
