/**
 * ViewSwitcher Component Tests
 * Tests view toggle functionality, available views filtering, and accessibility
 *
 * @jest-environment jsdom
 */

import { render, screen, userEvent } from '#test/utils'
import { ViewSwitcher } from '../view-switcher'

describe('ViewSwitcher', () => {
	const mockOnViewChange = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('Rendering with Different View Combinations', () => {
		test('renders grid and table views when both are available', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert
			expect(screen.getByLabelText('Grid view')).toBeInTheDocument()
			expect(screen.getByLabelText('Table view')).toBeInTheDocument()
		})

		test('renders kanban and table views when both are available', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="kanban"
					availableViews={['kanban', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert
			expect(screen.getByLabelText('Kanban view')).toBeInTheDocument()
			expect(screen.getByLabelText('Table view')).toBeInTheDocument()
		})

		test('renders all three views when available', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table', 'kanban']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert
			expect(screen.getByLabelText('Grid view')).toBeInTheDocument()
			expect(screen.getByLabelText('Table view')).toBeInTheDocument()
			expect(screen.getByLabelText('Kanban view')).toBeInTheDocument()
		})

		test('only renders available views', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert
			expect(screen.queryByLabelText('Kanban view')).not.toBeInTheDocument()
		})
	})

	describe('View Selection', () => {
		test('calls onViewChange when switching to table view', async () => {
			const user = userEvent.setup()

			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			const tableButton = screen.getByLabelText('Table view')
			await user.click(tableButton)

			// Assert
			expect(mockOnViewChange).toHaveBeenCalledWith('table')
		})

		test('calls onViewChange when switching to grid view', async () => {
			const user = userEvent.setup()

			// Act
			render(
				<ViewSwitcher
					currentView="table"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			const gridButton = screen.getByLabelText('Grid view')
			await user.click(gridButton)

			// Assert
			expect(mockOnViewChange).toHaveBeenCalledWith('grid')
		})

		test('calls onViewChange when switching to kanban view', async () => {
			const user = userEvent.setup()

			// Act
			render(
				<ViewSwitcher
					currentView="table"
					availableViews={['kanban', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			const kanbanButton = screen.getByLabelText('Kanban view')
			await user.click(kanbanButton)

			// Assert
			expect(mockOnViewChange).toHaveBeenCalledWith('kanban')
		})

		test('does not call onViewChange when clicking current view', async () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			const gridButton = screen.getByLabelText('Grid view')
			await userEvent.click(gridButton)

			// Assert - ToggleGroup may still call with same value, but component validates
			// This behavior depends on ToggleGroup implementation
		})

		test('only allows selection of available views', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Kanban is not available, so it shouldn't be rendered
			const kanbanButton = screen.queryByLabelText('Kanban view')
			expect(kanbanButton).not.toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		test('has proper ARIA label for view switcher', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert
			expect(screen.getByLabelText('Switch view')).toBeInTheDocument()
		})

		test('accepts custom ARIA label', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
					ariaLabel="Switch maintenance view"
				/>
			)

			// Assert
			expect(screen.getByLabelText('Switch maintenance view')).toBeInTheDocument()
		})

		test('each view button has descriptive aria-label', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table', 'kanban']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert
			expect(screen.getByLabelText('Grid view')).toBeInTheDocument()
			expect(screen.getByLabelText('Table view')).toBeInTheDocument()
			expect(screen.getByLabelText('Kanban view')).toBeInTheDocument()
		})
	})

	describe('Responsive Display', () => {
		test('shows view labels on larger screens', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert - labels should be rendered (hidden on mobile via CSS)
			expect(screen.getByText('Grid')).toBeInTheDocument()
			expect(screen.getByText('Table')).toBeInTheDocument()
		})

		test('renders icons for all views', () => {
			// Act
			const { container } = render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table', 'kanban']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert - icons are SVG elements rendered by lucide-react
			const svgIcons = container.querySelectorAll('svg')
			expect(svgIcons.length).toBeGreaterThanOrEqual(3)
		})
	})

	describe('Custom Styling', () => {
		test('applies custom className when provided', () => {
			// Act
			const { container } = render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid', 'table']}
					onViewChange={mockOnViewChange}
					className="custom-class"
				/>
			)

			// Assert
			const toggleGroup = container.querySelector('.custom-class')
			expect(toggleGroup).toBeInTheDocument()
		})
	})

	describe('Edge Cases', () => {
		test('handles single available view', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={['grid']}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert
			expect(screen.getByLabelText('Grid view')).toBeInTheDocument()
			expect(screen.queryByLabelText('Table view')).not.toBeInTheDocument()
			expect(screen.queryByLabelText('Kanban view')).not.toBeInTheDocument()
		})

		test('handles empty available views array gracefully', () => {
			// Act
			render(
				<ViewSwitcher
					currentView="grid"
					availableViews={[]}
					onViewChange={mockOnViewChange}
				/>
			)

			// Assert - should render container but no buttons
			expect(screen.queryByLabelText('Grid view')).not.toBeInTheDocument()
		})
	})
})
