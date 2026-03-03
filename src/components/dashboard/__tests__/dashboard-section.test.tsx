/**
 * DashboardSection Component Tests (TDD)
 *
 * Tests for the unified DashboardSection component that replaces
 * activity-section, performance-section, and quick-actions-section.
 *
 * Requirements:
 * - Render section with title, description, and children
 * - Support variants: activity, performance, actions
 * - Support data attributes: density, tour
 * - Maintain existing CSS class structure for styling
 */

import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { describe, expect, it } from 'vitest'
import { DashboardSection } from '../dashboard-section'

describe('DashboardSection', () => {
	describe('Basic Rendering', () => {
		it('renders section with title and description', () => {
			render(
				<DashboardSection title="Test Title" description="Test description">
					<div data-testid="child-content">Child content</div>
				</DashboardSection>
			)

			expect(screen.getByRole('region')).toBeInTheDocument()
			expect(screen.getByText('Test Title')).toBeInTheDocument()
			expect(screen.getByText('Test description')).toBeInTheDocument()
			expect(screen.getByTestId('child-content')).toBeInTheDocument()
		})

		it('renders children in the body section', () => {
			render(
				<DashboardSection title="Title" description="Desc">
					<button>Action Button</button>
				</DashboardSection>
			)

			const button = screen.getByRole('button', { name: 'Action Button' })
			expect(button).toBeInTheDocument()
		})

		it('uses correct CSS class structure', () => {
			const { container } = render(
				<DashboardSection title="Title" description="Desc">
					Content
				</DashboardSection>
			)

			expect(container.querySelector('.dashboard-panel')).toBeInTheDocument()
			expect(
				container.querySelector('.dashboard-panel-header')
			).toBeInTheDocument()
			expect(
				container.querySelector('.dashboard-panel-title')
			).toBeInTheDocument()
			expect(
				container.querySelector('.dashboard-panel-description')
			).toBeInTheDocument()
			expect(
				container.querySelector('.dashboard-panel-body')
			).toBeInTheDocument()
		})
	})

	describe('Variants', () => {
		it('applies activity variant to header', () => {
			const { container } = render(
				<DashboardSection
					title="Recent Activity"
					description="Latest updates"
					variant="activity"
				>
					Content
				</DashboardSection>
			)

			const header = container.querySelector('.dashboard-panel-header')
			expect(header).toHaveAttribute('data-variant', 'activity')
		})

		it('applies performance variant to header', () => {
			const { container } = render(
				<DashboardSection
					title="Property Performance"
					description="Top properties"
					variant="performance"
				>
					Content
				</DashboardSection>
			)

			const header = container.querySelector('.dashboard-panel-header')
			expect(header).toHaveAttribute('data-variant', 'performance')
		})

		it('applies actions variant to header', () => {
			const { container } = render(
				<DashboardSection
					title="Quick Actions"
					description="Common tasks"
					variant="actions"
				>
					Content
				</DashboardSection>
			)

			const header = container.querySelector('.dashboard-panel-header')
			expect(header).toHaveAttribute('data-variant', 'actions')
		})
	})

	describe('Data Attributes', () => {
		it('applies compact density attribute', () => {
			const { container } = render(
				<DashboardSection title="Title" description="Desc" density="compact">
					Content
				</DashboardSection>
			)

			const section = container.querySelector('.dashboard-panel')
			expect(section).toHaveAttribute('data-density', 'compact')
		})

		it('applies tour attribute for onboarding', () => {
			const { container } = render(
				<DashboardSection
					title="Title"
					description="Desc"
					tourId="quick-actions"
				>
					Content
				</DashboardSection>
			)

			const section = container.querySelector('.dashboard-panel')
			expect(section).toHaveAttribute('data-tour', 'quick-actions')
		})

		it('supports multiple data attributes together', () => {
			const { container } = render(
				<DashboardSection
					title="Quick Actions"
					description="Common tasks"
					variant="actions"
					density="compact"
					tourId="quick-actions"
				>
					Content
				</DashboardSection>
			)

			const section = container.querySelector('.dashboard-panel')
			const header = container.querySelector('.dashboard-panel-header')

			expect(section).toHaveAttribute('data-density', 'compact')
			expect(section).toHaveAttribute('data-tour', 'quick-actions')
			expect(header).toHaveAttribute('data-variant', 'actions')
		})
	})

	describe('Accessibility', () => {
		it('renders as a semantic section element', () => {
			render(
				<DashboardSection title="Title" description="Desc">
					Content
				</DashboardSection>
			)

			expect(screen.getByRole('region')).toBeInTheDocument()
		})

		it('uses heading level 3 for title', () => {
			render(
				<DashboardSection title="Section Title" description="Desc">
					Content
				</DashboardSection>
			)

			const heading = screen.getByRole('heading', { level: 3 })
			expect(heading).toHaveTextContent('Section Title')
		})

		it('associates section with its title via aria-labelledby', () => {
			const { container } = render(
				<DashboardSection title="Labeled Section" description="Desc">
					Content
				</DashboardSection>
			)

			const section = container.querySelector('section')
			const title = container.querySelector('.dashboard-panel-title')

			expect(section).toHaveAttribute('aria-labelledby')
			expect(title?.id).toBe(section?.getAttribute('aria-labelledby'))
		})
	})

	describe('Composition Patterns', () => {
		it('works with ActivityFeed as child', () => {
			const MockActivityFeed = () => (
				<div data-testid="activity-feed">Activity items</div>
			)

			render(
				<DashboardSection
					title="Recent Activity"
					description="Latest updates across your properties"
					variant="activity"
					density="compact"
				>
					<MockActivityFeed />
				</DashboardSection>
			)

			expect(screen.getByTestId('activity-feed')).toBeInTheDocument()
			expect(screen.getByText('Recent Activity')).toBeInTheDocument()
		})

		it('works with PropertyPerformanceTable as child', () => {
			const MockPerformanceTable = () => (
				<div data-testid="performance-table">Performance data</div>
			)

			render(
				<DashboardSection
					title="Property Performance"
					description="Top performing properties this month"
					variant="performance"
				>
					<MockPerformanceTable />
				</DashboardSection>
			)

			expect(screen.getByTestId('performance-table')).toBeInTheDocument()
			expect(screen.getByText('Property Performance')).toBeInTheDocument()
		})

		it('works with QuickActions as child', () => {
			const MockQuickActions = () => (
				<div data-testid="quick-actions">Quick action buttons</div>
			)

			render(
				<DashboardSection
					title="Quick Actions"
					description="Common tasks and shortcuts"
					variant="actions"
					density="compact"
					tourId="quick-actions"
				>
					<MockQuickActions />
				</DashboardSection>
			)

			expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
			expect(screen.getByText('Quick Actions')).toBeInTheDocument()
		})
	})

	describe('Optional Props', () => {
		it('renders without variant', () => {
			const { container } = render(
				<DashboardSection title="Title" description="Desc">
					Content
				</DashboardSection>
			)

			const header = container.querySelector('.dashboard-panel-header')
			expect(header).not.toHaveAttribute('data-variant')
		})

		it('renders without density', () => {
			const { container } = render(
				<DashboardSection title="Title" description="Desc">
					Content
				</DashboardSection>
			)

			const section = container.querySelector('.dashboard-panel')
			expect(section).not.toHaveAttribute('data-density')
		})

		it('renders without tourId', () => {
			const { container } = render(
				<DashboardSection title="Title" description="Desc">
					Content
				</DashboardSection>
			)

			const section = container.querySelector('.dashboard-panel')
			expect(section).not.toHaveAttribute('data-tour')
		})
	})
})
