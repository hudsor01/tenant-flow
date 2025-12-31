/**
 * MainNav Component Tests
 *
 * Tests the main navigation sidebar component including:
 * - Core navigation items rendering
 * - Expandable/collapsible sections
 * - Active state highlighting
 * - Settings menu behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainNav } from '../main-nav'

// Mock next/navigation
const mockPathname = vi.fn().mockReturnValue('/dashboard')
vi.mock('next/navigation', () => ({
	usePathname: () => mockPathname()
}))

describe('MainNav', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockPathname.mockReturnValue('/dashboard')
	})

	describe('core navigation items', () => {
		it('should render all core navigation items', () => {
			render(<MainNav />)

			expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /properties/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /tenants/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /leases/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /maintenance/i })).toBeInTheDocument()
		})

		it('should render correct hrefs for core items', () => {
			render(<MainNav />)

			expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
				'href',
				'/dashboard'
			)
			expect(screen.getByRole('link', { name: /properties/i })).toHaveAttribute(
				'href',
				'/properties'
			)
			expect(screen.getByRole('link', { name: /tenants/i })).toHaveAttribute(
				'href',
				'/tenants'
			)
			expect(screen.getByRole('link', { name: /leases/i })).toHaveAttribute(
				'href',
				'/leases'
			)
			expect(screen.getByRole('link', { name: /maintenance/i })).toHaveAttribute(
				'href',
				'/maintenance'
			)
		})
	})

	describe('active state highlighting', () => {
		it('should highlight Dashboard when on /dashboard', () => {
			mockPathname.mockReturnValue('/dashboard')
			render(<MainNav />)

			const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
			expect(dashboardLink.className).toContain('text-primary')
		})

		it('should highlight Properties when on /properties', () => {
			mockPathname.mockReturnValue('/properties')
			render(<MainNav />)

			const propertiesLink = screen.getByRole('link', { name: /properties/i })
			expect(propertiesLink.className).toContain('text-primary')
		})

		it('should highlight Properties when on nested property route', () => {
			mockPathname.mockReturnValue('/properties/123')
			render(<MainNav />)

			const propertiesLink = screen.getByRole('link', { name: /properties/i })
			expect(propertiesLink.className).toContain('text-primary')
		})

		it('should not highlight other items when Dashboard is active', () => {
			mockPathname.mockReturnValue('/dashboard')
			render(<MainNav />)

			const propertiesLink = screen.getByRole('link', { name: /properties/i })
			expect(propertiesLink.className).not.toContain('text-primary')
		})
	})

	describe('expandable sections', () => {
		it('should render Analytics as expandable button', () => {
			render(<MainNav />)

			const analyticsButton = screen.getByRole('button', { name: /analytics/i })
			expect(analyticsButton).toBeInTheDocument()
		})

		it('should render Reports as expandable button', () => {
			render(<MainNav />)

			const reportsButton = screen.getByRole('button', { name: /reports/i })
			expect(reportsButton).toBeInTheDocument()
		})

		it('should render Financials as expandable button', () => {
			render(<MainNav />)

			const financialsButton = screen.getByRole('button', { name: /financials/i })
			expect(financialsButton).toBeInTheDocument()
		})

		it('should toggle Analytics children visibility on click', async () => {
			const user = userEvent.setup()
			render(<MainNav />)

			const analyticsButton = screen.getByRole('button', { name: /analytics/i })

			// Click to expand
			await user.click(analyticsButton)

			// Now we should find Overview link
			expect(screen.getByRole('link', { name: /^overview$/i })).toBeInTheDocument()
		})

		it('should show Financials children when expanded', async () => {
			const user = userEvent.setup()
			render(<MainNav />)

			const financialsButton = screen.getByRole('button', { name: /financials/i })
			await user.click(financialsButton)

			expect(screen.getByRole('link', { name: /rent collection/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /income statement/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /cash flow/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /balance sheet/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /tax documents/i })).toBeInTheDocument()
		})
	})

	describe('documents section', () => {
		it('should render Documents section header', () => {
			render(<MainNav />)

			expect(screen.getByText('Documents')).toBeInTheDocument()
		})

		it('should render Generate Lease link', () => {
			render(<MainNav />)

			const generateLeaseLink = screen.getByRole('link', { name: /generate lease/i })
			expect(generateLeaseLink).toBeInTheDocument()
			expect(generateLeaseLink).toHaveAttribute('href', '/leases/new')
		})

		it('should render Lease Template link', () => {
			render(<MainNav />)

			const leaseTemplateLink = screen.getByRole('link', { name: /lease template/i })
			expect(leaseTemplateLink).toBeInTheDocument()
			expect(leaseTemplateLink).toHaveAttribute('href', '/documents/lease-template')
		})
	})

	describe('settings menu', () => {
		it('should render Settings button', () => {
			render(<MainNav />)

			const settingsButton = screen.getByRole('button', { name: /settings/i })
			expect(settingsButton).toBeInTheDocument()
		})

		it('should show dropdown menu when Settings is clicked', async () => {
			const user = userEvent.setup()
			render(<MainNav />)

			const settingsButton = screen.getByRole('button', { name: /settings/i })
			await user.click(settingsButton)

			expect(screen.getByRole('link', { name: /help & support/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /documentation/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /send feedback/i })).toBeInTheDocument()
		})

		it('should show keyboard shortcuts item in dropdown', async () => {
			const user = userEvent.setup()
			render(<MainNav />)

			const settingsButton = screen.getByRole('button', { name: /settings/i })
			await user.click(settingsButton)

			expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument()
		})
	})

	describe('onNavigate callback', () => {
		it('should call onNavigate when a core nav item is clicked', async () => {
			const user = userEvent.setup()
			const onNavigate = vi.fn()
			render(<MainNav onNavigate={onNavigate} />)

			const propertiesLink = screen.getByRole('link', { name: /properties/i })
			await user.click(propertiesLink)

			expect(onNavigate).toHaveBeenCalledTimes(1)
		})

		it('should call onNavigate when an expanded child is clicked', async () => {
			const user = userEvent.setup()
			const onNavigate = vi.fn()
			render(<MainNav onNavigate={onNavigate} />)

			// Expand Financials
			const financialsButton = screen.getByRole('button', { name: /financials/i })
			await user.click(financialsButton)

			// Click a child link
			const rentCollectionLink = screen.getByRole('link', { name: /rent collection/i })
			await user.click(rentCollectionLink)

			expect(onNavigate).toHaveBeenCalledTimes(1)
		})

		it('should call onNavigate when document link is clicked', async () => {
			const user = userEvent.setup()
			const onNavigate = vi.fn()
			render(<MainNav onNavigate={onNavigate} />)

			const generateLeaseLink = screen.getByRole('link', { name: /generate lease/i })
			await user.click(generateLeaseLink)

			expect(onNavigate).toHaveBeenCalledTimes(1)
		})
	})
})
