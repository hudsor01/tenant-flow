/**
 * MaintenanceCard Component Tests
 * Tests maintenance request card display, priority badges, and navigation
 *
 * NOTE: The MaintenanceCard component displays:
 * - Title (or description as fallback) in the card header
 * - Property/unit combined as "Property Name · Unit X"
 * - Aging display (Today, X days) instead of formatted date
 * - Entire card wrapped in Link (no separate View/Edit buttons)
 *
 * @jest-environment jsdom
 */

import { render, screen } from '#test/utils/test-render'
import { DEFAULT_MAINTENANCE_REQUEST } from '#test/utils/test-data'

import { MaintenanceCard } from '../cards/maintenance-card'

describe('MaintenanceCard', () => {
	const defaultRequest = DEFAULT_MAINTENANCE_REQUEST

	describe('Display and Rendering', () => {
		test('renders maintenance request title when present', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert - component shows title ?? description
			expect(screen.getByText(defaultRequest.title)).toBeInTheDocument()
		})

		test('renders description when title is not present', () => {
			// Arrange
			// Use null since component uses ?? (nullish coalescing)
			// Cast to unknown first since title is normally required
			const requestWithoutTitle = {
				...defaultRequest,
				title: null as unknown as string
			}

			// Act
			render(<MaintenanceCard request={requestWithoutTitle} />)

			// Assert - falls back to description
			expect(screen.getByText(defaultRequest.description)).toBeInTheDocument()
		})

		test('displays property and unit information combined', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert - property and unit are combined with " · Unit " separator
			// The actual format is: "Test Property · Unit Apt 101"
			const locationText = screen.getByText(/Test Property.*Unit.*Apt 101/i)
			expect(locationText).toBeInTheDocument()
		})

		test('displays aging indicator instead of formatted date', () => {
			// Arrange - use a recent date so aging shows "Today" or "X days"
			const recentRequest = {
				...defaultRequest,
				created_at: new Date().toISOString()
			}

			// Act
			render(<MaintenanceCard request={recentRequest} />)

			// Assert - aging display shows "Today" for same-day requests
			expect(screen.getByText('Today')).toBeInTheDocument()
		})

		test('renders without property when property is null', () => {
			// Arrange
			const requestWithoutProperty = {
				...defaultRequest,
				property: null,
				unit: null,
				unit_id: null as unknown as string
			}

			// Act
			render(<MaintenanceCard request={requestWithoutProperty} />)

			// Assert - shows "Unknown Property" as fallback (no unit suffix when unit_id is null)
			expect(screen.getByText('Unknown Property')).toBeInTheDocument()
		})

		test('renders with title even when description is empty', () => {
			// Arrange
			const requestWithEmptyDescription = {
				...defaultRequest,
				description: ''
			}

			// Act
			render(<MaintenanceCard request={requestWithEmptyDescription} />)

			// Assert - still shows title
			expect(screen.getByText(defaultRequest.title)).toBeInTheDocument()
		})
	})

	describe('Priority Badges', () => {
		test('displays urgent priority with destructive styling', () => {
			// Arrange
			const emergencyRequest = {
				...defaultRequest,
				priority: 'urgent' as const
			}

			// Act
			render(<MaintenanceCard request={emergencyRequest} />)

			// Assert
			expect(screen.getByText('urgent')).toBeInTheDocument()
		})

		test('displays high priority', () => {
			// Arrange
			const highPriorityRequest = {
				...defaultRequest,
				priority: 'high' as const
			}

			// Act
			render(<MaintenanceCard request={highPriorityRequest} />)

			// Assert
			expect(screen.getByText('high')).toBeInTheDocument()
		})

		test('displays medium priority', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert
			expect(screen.getByText('medium')).toBeInTheDocument()
		})

		test('displays low priority', () => {
			// Arrange
			const lowPriorityRequest = {
				...defaultRequest,
				priority: 'low' as const
			}

			// Act
			render(<MaintenanceCard request={lowPriorityRequest} />)

			// Assert
			expect(screen.getByText('low')).toBeInTheDocument()
		})
	})

	describe('Navigation', () => {
		test('card is wrapped in link to detail page', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert - entire card is wrapped in a Link
			const link = screen.getByRole('link')
			expect(link).toHaveAttribute('href', '/maintenance/maintenance-1')
		})

		test('uses onView callback when provided instead of Link', () => {
			// Arrange
			const onView = vi.fn()

			// Act
			render(<MaintenanceCard request={defaultRequest} onView={onView} />)

			// Assert - card is now a button, not a link
			const button = screen.getByRole('button', { name: /plumbing issue/i })
			expect(button).toBeInTheDocument()
		})

		test('has more options button', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert - "More options" button exists
			const moreButton = screen.getByRole('button', { name: /more options/i })
			expect(moreButton).toBeInTheDocument()
		})
	})

	describe('Drag State', () => {
		test('applies opacity when isDragging is true', () => {
			// Act
			const { container } = render(
				<MaintenanceCard request={defaultRequest} isDragging />
			)

			// Assert
			const card = container.querySelector('[class*="opacity-50"]')
			expect(card).toBeInTheDocument()
		})

		test('does not apply opacity when isDragging is false or undefined', () => {
			// Act
			const { container } = render(
				<MaintenanceCard request={defaultRequest} isDragging={false} />
			)

			// Assert - the card wrapper should not have opacity-50 class
			const cardElement = container.querySelector('[class*="bg-card"]')
			expect(cardElement).toBeInTheDocument()
			const classes = cardElement?.className || ''
			expect(classes).not.toMatch(/opacity-50/)
		})
	})

	describe('Urgent Requests', () => {
		test('shows BorderBeam for urgent priority', () => {
			// Arrange
			const urgentRequest = {
				...defaultRequest,
				priority: 'urgent' as const
			}

			// Act
			const { container } = render(<MaintenanceCard request={urgentRequest} />)

			// Assert - BorderBeam is rendered for urgent requests
			const borderBeam = container.querySelector('[class*="border-beam"]')
			expect(borderBeam).toBeInTheDocument()
		})

		test('does not show BorderBeam for non-urgent priority', () => {
			// Act
			const { container } = render(<MaintenanceCard request={defaultRequest} />)

			// Assert - BorderBeam is not rendered for medium priority
			const borderBeam = container.querySelector('[class*="border-beam"]')
			expect(borderBeam).not.toBeInTheDocument()
		})
	})

	describe('Tenant Display', () => {
		test('shows tenant name when tenant is provided', () => {
			// Arrange
			const requestWithTenant = {
				...defaultRequest,
				tenant: { name: 'John Doe' }
			}

			// Act
			render(<MaintenanceCard request={requestWithTenant} />)

			// Assert
			expect(screen.getByText('John Doe')).toBeInTheDocument()
		})

		test('does not show tenant section when tenant is not provided', () => {
			// Arrange - default request has no tenant
			const requestWithoutTenant = {
				...defaultRequest,
				tenant: null
			}

			// Act
			render(<MaintenanceCard request={requestWithoutTenant} />)

			// Assert - no tenant section
			expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
		})
	})
})
