/**
 * Dashboard Onboarding Component Tests
 * Tests for the enhanced onboarding flow with modern UI
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { renderWithQueryClient, user } from '@/test/utils/test-utils'
import { DashboardOnboarding } from '../dashboard-onboarding'
import { useDashboardStats } from '@/hooks/api/use-dashboard'

// Mock the dashboard stats hook
jest.mock('@/hooks/api/use-dashboard', () => ({
	useDashboardStats: jest.fn()
}))

// Mock Next.js Link component to avoid render issues
jest.mock('next/link', () => {
	const MockedLink = ({
		children,
		...props
	}: {
		children: React.ReactNode
		href: string
	}) => {
		return <a {...props}>{children}</a>
	}
	MockedLink.displayName = 'MockedLink'
	return MockedLink
})

const mockUseDashboardStats = useDashboardStats as jest.MockedFunction<
	typeof useDashboardStats
>

// Mock localStorage
const localStorageMock = {
	getItem: jest.fn(),
	setItem: jest.fn(),
	removeItem: jest.fn(),
	clear: jest.fn()
}

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
	writable: true
})

describe('DashboardOnboarding', () => {
	const mockStatsNoData = {
		properties: { totalProperties: 0 },
		tenants: { totalTenants: 0 },
		leases: { totalLeases: 0 }
	}

	const mockStatsPartialData = {
		properties: { totalProperties: 5 },
		tenants: { totalTenants: 0 },
		leases: { totalLeases: 0 }
	}

	const mockStatsCompleteData = {
		properties: { totalProperties: 5 },
		tenants: { totalTenants: 10 },
		leases: { totalLeases: 8 }
	}

	beforeEach(() => {
		jest.clearAllMocks()
		localStorageMock.getItem.mockReturnValue(null)
	})

	describe('Visibility Logic', () => {
		it('should show onboarding for new users with no data', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			renderWithQueryClient(<DashboardOnboarding />)

			expect(
				screen.getByText('Welcome to TenantFlow!')
			).toBeInTheDocument()
			expect(
				screen.getByText(/Let's get your property management set up/)
			).toBeInTheDocument()
		})

		it('should show onboarding for users with partial data', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsPartialData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			renderWithQueryClient(<DashboardOnboarding />)

			expect(
				screen.getByText('Welcome to TenantFlow!')
			).toBeInTheDocument()
		})

		it('should not show onboarding when all steps are complete', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsCompleteData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			expect(container.firstChild).toBeNull()
		})

		it('should not show onboarding when dismissed', () => {
			localStorageMock.getItem.mockReturnValue('true')
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			expect(container.firstChild).toBeNull()
		})
	})

	describe('Progress Tracking', () => {
		it('should show 0% progress for new users', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			renderWithQueryClient(<DashboardOnboarding />)

			expect(screen.getByText('0 of 3 completed')).toBeInTheDocument()
			expect(screen.getByText('0%')).toBeInTheDocument()
		})

		it('should calculate progress correctly', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsPartialData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			renderWithQueryClient(<DashboardOnboarding />)

			expect(screen.getByText('1 of 3 completed')).toBeInTheDocument()
			expect(screen.getByText('33%')).toBeInTheDocument()
		})

		it('should show completed checkmarks for finished steps', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsPartialData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			// Look for checkmark icon in completed step
			const completedSteps = container.querySelectorAll('.text-green-600')
			expect(completedSteps.length).toBeGreaterThan(0)
		})
	})

	describe('User Interactions', () => {
		it('should dismiss onboarding when dismiss button is clicked', async () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			const { rerender } = renderWithQueryClient(<DashboardOnboarding />)

			const dismissButton = screen.getByRole('button', {
				name: /Dismiss/i
			})
			await user.click(dismissButton)

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				'onboarding-dismissed',
				'true'
			)

			// Rerender to check if component is hidden
			rerender(<DashboardOnboarding />)
			await waitFor(() => {
				expect(
					screen.queryByText('Welcome to TenantFlow!')
				).not.toBeInTheDocument()
			})
		})

		it('should render start buttons for incomplete steps', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			renderWithQueryClient(<DashboardOnboarding />)

			const startButtons = screen.getAllByRole('link', { name: /Start/i })
			expect(startButtons).toHaveLength(3) // All 3 steps should have start buttons
		})

		it('should have correct links for each step', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			renderWithQueryClient(<DashboardOnboarding />)

			const startLinks = screen.getAllByRole('link', { name: /Start/i })
			expect(startLinks[0]).toHaveAttribute('href', '/properties/new')
			expect(startLinks[1]).toHaveAttribute('href', '/tenants/new')
			expect(startLinks[2]).toHaveAttribute('href', '/leases/new')
		})
	})

	describe('Visual Elements', () => {
		beforeEach(() => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)
		})

		it('should render animated background elements', () => {
			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			const animatedElements =
				container.querySelectorAll('.animate-pulse')
			expect(animatedElements.length).toBeGreaterThan(0)
		})

		it('should apply gradient backgrounds', () => {
			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			const gradientElement = container.querySelector(
				'[class*="bg-gradient"]'
			)
			expect(gradientElement).toBeInTheDocument()
		})

		it('should render step icons', () => {
			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			// Should have icons for each step
			const icons = container.querySelectorAll('svg')
			expect(icons.length).toBeGreaterThanOrEqual(3)
		})

		it('should show step numbers for incomplete steps', () => {
			renderWithQueryClient(<DashboardOnboarding />)

			expect(screen.getByText('1')).toBeInTheDocument()
			expect(screen.getByText('2')).toBeInTheDocument()
			expect(screen.getByText('3')).toBeInTheDocument()
		})
	})

	describe('Progress Bar', () => {
		it('should render progress bar with correct value', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsPartialData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			// Progress bar is rendered with data-slot attribute
			const progressBar = container.querySelector(
				'[data-slot="progress"]'
			)
			expect(progressBar).toBeInTheDocument()

			// Check that the progress indicator has correct transform style
			const progressIndicator = container.querySelector(
				'[data-slot="progress-indicator"]'
			)
			expect(progressIndicator).toBeInTheDocument()
			// 33.33% progress means translateX(-66.67%)
			expect(progressIndicator).toHaveStyle({
				transform: 'translateX(-66.66666666666667%)'
			})
		})

		it('should have proper styling for progress bar', () => {
			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			const progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).toHaveClass('h-3')
		})
	})

	describe('Responsive Design', () => {
		it('should use responsive grid for steps', () => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			const { container } = renderWithQueryClient(<DashboardOnboarding />)

			// Find the grid that contains the steps
			const grids = container.querySelectorAll('.grid')
			// There should be at least one grid with gap-3 class
			const stepGrid = Array.from(grids).find(grid =>
				grid.classList.contains('gap-3')
			)
			expect(stepGrid).toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		beforeEach(() => {
			mockUseDashboardStats.mockReturnValue({
				data: mockStatsNoData,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)
		})

		it('should have accessible headings', () => {
			renderWithQueryClient(<DashboardOnboarding />)

			// CardTitle renders as a div with data-slot="card-title", not a heading element
			expect(
				screen.getByText('Welcome to TenantFlow!')
			).toBeInTheDocument()
			// Check it's in the title element
			const title = document.querySelector('[data-slot="card-title"]')
			expect(title).toHaveTextContent('Welcome to TenantFlow!')
		})

		it('should have accessible progress information', () => {
			renderWithQueryClient(<DashboardOnboarding />)

			expect(screen.getByText('Setup Progress')).toBeInTheDocument()
			expect(screen.getByText('0 of 3 completed')).toBeInTheDocument()
		})

		it('should have accessible buttons and links', () => {
			renderWithQueryClient(<DashboardOnboarding />)

			const dismissButton = screen.getByRole('button', {
				name: /Dismiss/i
			})
			expect(dismissButton).toBeInTheDocument()

			const startLinks = screen.getAllByRole('link', { name: /Start/i })
			expect(startLinks).toHaveLength(3)
		})
	})

	describe('Edge Cases', () => {
		it('should handle undefined stats data', () => {
			mockUseDashboardStats.mockReturnValue({
				data: undefined,
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			renderWithQueryClient(<DashboardOnboarding />)

			expect(
				screen.getByText('Welcome to TenantFlow!')
			).toBeInTheDocument()
			expect(screen.getByText('0 of 3 completed')).toBeInTheDocument()
		})

		it('should handle null values in stats', () => {
			mockUseDashboardStats.mockReturnValue({
				data: {
					properties: null,
					tenants: null,
					leases: null
				},
				isLoading: false,
				error: null
			} as ReturnType<typeof useDashboardStats>)

			renderWithQueryClient(<DashboardOnboarding />)

			expect(screen.getByText('0 of 3 completed')).toBeInTheDocument()
		})
	})
})
