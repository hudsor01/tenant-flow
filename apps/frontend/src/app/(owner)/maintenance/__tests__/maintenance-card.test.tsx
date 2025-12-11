/**
 * MaintenanceCard Component Tests
 * Tests maintenance request card display, priority badges, and navigation
 *
 * @jest-environment jsdom
 */

import { render, screen } from '#test/utils/test-render'
import { DEFAULT_MAINTENANCE_REQUEST } from '#test/utils/test-data'

import { MaintenanceCard } from '../maintenance-card'

describe('MaintenanceCard', () => {
	const defaultRequest = DEFAULT_MAINTENANCE_REQUEST

	describe('Display and Rendering', () => {
		test('renders maintenance request description', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert
			expect(screen.getByText(defaultRequest.description)).toBeInTheDocument()
		})

		test('displays property and unit information', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert
			expect(screen.getByText('Test Property')).toBeInTheDocument()
			expect(screen.getByText('Unit Apt 101')).toBeInTheDocument()
		})

		test('displays created date in formatted style', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert
			const formattedDate = new Date(
				defaultRequest.created_at
			).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric'
			})
			expect(screen.getByText(formattedDate)).toBeInTheDocument()
		})

		test('renders without property when property is null', () => {
			// Arrange
			const requestWithoutProperty = {
				...defaultRequest,
				property: null,
				unit: null
			}

			// Act
			render(<MaintenanceCard request={requestWithoutProperty} />)

			// Assert
			expect(screen.queryByText('Test Property')).not.toBeInTheDocument()
		})

		test('renders without description when description is null', () => {
			// Arrange
			const requestWithoutDescription = {
				...defaultRequest,
				description: '' // Use empty string instead of null for type safety
			}

			// Act
			render(<MaintenanceCard request={requestWithoutDescription} />)

			// Assert
			expect(
				screen.queryByText('Kitchen faucet has been dripping for the past week')
			).not.toBeInTheDocument()
		})
	})

	describe('Priority Badges', () => {
		test('displays urgent priority with destructive variant', () => {
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

		test('displays high priority with destructive variant', () => {
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

		test('displays medium priority with secondary variant', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert
			expect(screen.getByText('medium')).toBeInTheDocument()
		})

		test('displays low priority with outline variant', () => {
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

	describe('Actions and Navigation', () => {
		test('has view button that links to detail page', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert
			const viewButton = screen.getByRole('link', { name: /View/i })
			expect(viewButton).toHaveAttribute(
				'href',
				'/maintenance/maintenance-1'
			)
		})

		test('has edit button that links to edit page', () => {
			// Act
			render(<MaintenanceCard request={defaultRequest} />)

			// Assert
			const editButton = screen.getByRole('link', { name: /Edit/i })
			expect(editButton).toHaveAttribute(
				'href',
				'/maintenance/maintenance-1/edit'
			)
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
			const cardElement = container.querySelector('[class*="card"]')
			expect(cardElement).toBeInTheDocument()
			const classes = cardElement?.className || ''
			expect(classes).not.toMatch(/opacity-50/)
		})
	})
})
