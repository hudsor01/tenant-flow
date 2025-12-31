/**
 * QuickActionsDock Component Tests
 *
 * Tests the floating quick actions dock that provides
 * shortcuts to common actions like adding properties,
 * creating leases, and recording payments.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuickActionsDock, type QuickAction } from '../quick-actions-dock'
import { Plus, FileText, Wrench } from 'lucide-react'

describe('QuickActionsDock', () => {
	describe('default actions', () => {
		it('should render all default quick actions', () => {
			render(<QuickActionsDock />)

			expect(screen.getByLabelText('Add Property')).toBeInTheDocument()
			expect(screen.getByLabelText('New Lease')).toBeInTheDocument()
			expect(screen.getByLabelText('Maintenance')).toBeInTheDocument()
			expect(screen.getByLabelText('Record Payment')).toBeInTheDocument()
			expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
		})

		it('should render correct hrefs for default actions', () => {
			render(<QuickActionsDock />)

			expect(screen.getByLabelText('Add Property')).toHaveAttribute(
				'href',
				'/properties/new'
			)
			expect(screen.getByLabelText('New Lease')).toHaveAttribute(
				'href',
				'/leases/new'
			)
			expect(screen.getByLabelText('Maintenance')).toHaveAttribute(
				'href',
				'/maintenance/new'
			)
			expect(screen.getByLabelText('Record Payment')).toHaveAttribute(
				'href',
				'/rent-collection'
			)
			expect(screen.getByLabelText('Notifications')).toHaveAttribute(
				'href',
				'/dashboard/settings?tab=notifications'
			)
		})
	})

	describe('custom actions', () => {
		it('should render custom actions when provided', () => {
			const customActions: QuickAction[] = [
				{ id: 'custom-1', label: 'Custom Action', icon: Plus, href: '/custom' }
			]

			render(<QuickActionsDock actions={customActions} />)

			expect(screen.getByLabelText('Custom Action')).toBeInTheDocument()
			expect(screen.getByLabelText('Custom Action')).toHaveAttribute(
				'href',
				'/custom'
			)
		})

		it('should only render custom actions, not defaults', () => {
			const customActions: QuickAction[] = [
				{ id: 'custom-1', label: 'Custom Only', icon: Plus, href: '/custom' }
			]

			render(<QuickActionsDock actions={customActions} />)

			expect(screen.getByLabelText('Custom Only')).toBeInTheDocument()
			expect(screen.queryByLabelText('Add Property')).not.toBeInTheDocument()
		})

		it('should render multiple custom actions', () => {
			const customActions: QuickAction[] = [
				{ id: 'action-1', label: 'First Action', icon: Plus, href: '/first' },
				{ id: 'action-2', label: 'Second Action', icon: FileText, href: '/second' },
				{ id: 'action-3', label: 'Third Action', icon: Wrench, href: '/third' }
			]

			render(<QuickActionsDock actions={customActions} />)

			expect(screen.getByLabelText('First Action')).toBeInTheDocument()
			expect(screen.getByLabelText('Second Action')).toBeInTheDocument()
			expect(screen.getByLabelText('Third Action')).toBeInTheDocument()
		})
	})

	describe('styling and accessibility', () => {
		it('should have aria-label on each action for accessibility', () => {
			render(<QuickActionsDock />)

			const links = screen.getAllByRole('link')
			for (const link of links) {
				expect(link).toHaveAttribute('aria-label')
			}
		})

		it('should apply custom className when provided', () => {
			const { container } = render(<QuickActionsDock className="custom-class" />)

			const wrapper = container.firstChild as HTMLElement
			expect(wrapper.className).toContain('custom-class')
		})

		it('should render tooltips for each action', () => {
			render(<QuickActionsDock />)

			// Tooltips are rendered as spans inside each link
			expect(screen.getByText('Add Property')).toBeInTheDocument()
			expect(screen.getByText('New Lease')).toBeInTheDocument()
			expect(screen.getByText('Maintenance')).toBeInTheDocument()
			expect(screen.getByText('Record Payment')).toBeInTheDocument()
			expect(screen.getByText('Notifications')).toBeInTheDocument()
		})
	})

	describe('responsive behavior', () => {
		it('should have lg:block class for desktop visibility', () => {
			const { container } = render(<QuickActionsDock />)

			const wrapper = container.firstChild as HTMLElement
			expect(wrapper.className).toContain('lg:block')
		})

		it('should have hidden class for mobile', () => {
			const { container } = render(<QuickActionsDock />)

			const wrapper = container.firstChild as HTMLElement
			expect(wrapper.className).toContain('hidden')
		})
	})

	describe('empty actions', () => {
		it('should render empty dock with no actions', () => {
			render(<QuickActionsDock actions={[]} />)

			expect(screen.queryAllByRole('link')).toHaveLength(0)
		})
	})
})
