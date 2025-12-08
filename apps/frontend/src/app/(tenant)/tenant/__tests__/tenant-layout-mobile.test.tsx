/**
 * Tenant Layout Mobile Tests (TDD)
 *
 * Tests for task 4.3: Update tenant layout for mobile
 * - Hide sidebar on mobile viewport
 * - Show mobile header with hamburger menu
 *
 * Requirements covered:
 * - 2.2: Hide sidebar on mobile, show mobile navigation menu
 *
 * Note: These tests verify the presence of responsive CSS classes.
 * For actual visual regression testing and real browser behavior,
 * see the E2E tests in apps/e2e-tests/
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('next/navigation', () => ({
	usePathname: vi.fn(() => '/tenant')
}))

vi.mock('#components/dashboard/site-header', () => ({
	SiteHeader: () => <header data-testid="site-header">Header</header>
}))

vi.mock('#components/dashboard/tenant-sidebar', () => ({
	TenantSidebar: () => <aside data-testid="tenant-sidebar">Sidebar</aside>
}))

vi.mock('#components/ui/sidebar', () => ({
	SidebarProvider: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sidebar-provider">{children}</div>
	),
	SidebarInset: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sidebar-inset">{children}</div>
	)
}))

vi.mock('#components/dashboard/tenant-mobile-nav', () => ({
	TenantMobileNav: () => <nav data-testid="tenant-mobile-nav">Mobile Nav</nav>
}))

// Import after mocks
import TenantLayout from '../layout'

function mockViewport(isMobile: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation(query => ({
			matches: isMobile ? query.includes('max-width') : false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	})
}

describe('Tenant Layout Mobile Behavior (Requirement 2.2)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('hides sidebar on mobile viewport (< 768px)', () => {
		mockViewport(true)
		render(
			<TenantLayout>
				<div>Test Content</div>
			</TenantLayout>
		)

		// Sidebar container should have the hidden class on mobile
		const sidebarContainer = screen.getByTestId('tenant-layout-sidebar')
		expect(sidebarContainer).toBeInTheDocument()
		expect(sidebarContainer).toHaveClass('hidden')
		expect(sidebarContainer).toHaveClass('md:flex')
	})

	it('shows sidebar on desktop viewport (>= 768px)', () => {
		mockViewport(false)
		render(
			<TenantLayout>
				<div>Test Content</div>
			</TenantLayout>
		)

		const sidebarContainer = screen.getByTestId('tenant-layout-sidebar')
		expect(sidebarContainer).toBeInTheDocument()
		expect(sidebarContainer).toHaveClass('md:flex')
	})

	it('shows mobile navigation wrapper on mobile viewport', () => {
		mockViewport(true)
		render(
			<TenantLayout>
				<div>Test Content</div>
			</TenantLayout>
		)

		const mobileNavWrapper = screen.getByTestId('tenant-mobile-nav-wrapper')
		expect(mobileNavWrapper).toBeInTheDocument()
		expect(mobileNavWrapper).toHaveClass('md:hidden')
	})

	it('hides mobile navigation on desktop viewport', () => {
		mockViewport(false)
		render(
			<TenantLayout>
				<div>Test Content</div>
			</TenantLayout>
		)

		const mobileNavWrapper = screen.getByTestId('tenant-mobile-nav-wrapper')
		expect(mobileNavWrapper).toBeInTheDocument()
		expect(mobileNavWrapper).toHaveClass('md:hidden')
	})

	it('renders site header on all viewports', () => {
		mockViewport(true)
		render(
			<TenantLayout>
				<div>Test Content</div>
			</TenantLayout>
		)

		const header = screen.getByTestId('site-header')
		expect(header).toBeInTheDocument()
	})

	it('maintains proper layout structure with main content area', () => {
		mockViewport(true)
		render(
			<TenantLayout>
				<div data-testid="test-content">Test Content</div>
			</TenantLayout>
		)

		const layoutRoot = screen.getByTestId('tenant-layout-root')
		const mainColumn = screen.getByTestId('tenant-layout-main')
		const content = screen.getByTestId('test-content')

		expect(layoutRoot).toBeInTheDocument()
		expect(mainColumn).toBeInTheDocument()
		expect(content).toBeInTheDocument()
	})

	it('applies mobile-friendly padding on mobile viewport', () => {
		mockViewport(true)
		render(
			<TenantLayout>
				<div>Test Content</div>
			</TenantLayout>
		)

		const layoutRoot = screen.getByTestId('tenant-layout-root')
		// Should have bottom padding for mobile nav (pb-20) and reduced on desktop (md:pb-4)
		expect(layoutRoot).toHaveClass('pb-20')
		expect(layoutRoot).toHaveClass('md:pb-4')
	})

	it('shows mobile-friendly header with navigation controls', () => {
		mockViewport(true)
		render(
			<TenantLayout>
				<div>Test Content</div>
			</TenantLayout>
		)

		// Header should be present and accessible on mobile
		const header = screen.getByTestId('site-header')
		expect(header).toBeInTheDocument()
	})

	it('maintains responsive layout structure on mobile', () => {
		mockViewport(true)
		render(
			<TenantLayout>
				<div>Test Content</div>
			</TenantLayout>
		)

		// Verify the layout has proper responsive classes
		const layoutRoot = screen.getByTestId('tenant-layout-root')
		expect(layoutRoot).toHaveClass('min-h-screen')
		expect(layoutRoot).toHaveClass('overflow-x-hidden')

		// Main column should be flexible
		const mainColumn = screen.getByTestId('tenant-layout-main')
		expect(mainColumn).toHaveClass('flex-1')
		expect(mainColumn).toHaveClass('flex-col')
	})
})
