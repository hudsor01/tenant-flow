/**
 * MaintenanceViewClient Component Tests
 * Tests view switching between kanban and table, preference persistence
 *
 * @jest-environment jsdom
 */

import { DEFAULT_MAINTENANCE_REQUEST, render, screen, userEvent } from '#test/utils'
import { MaintenanceViewClient } from '../maintenance-view.client'

// Mock preferences provider
const mockSetViewPreference = jest.fn()
let mockViewPreferences = {
	properties: 'grid' as const,
	maintenance: 'kanban' as 'kanban' | 'table'
}

jest.mock('@/providers/preferences-provider', () => ({
	usePreferencesStore: (selector: (state: { viewPreferences: typeof mockViewPreferences; setViewPreference: typeof mockSetViewPreference }) => unknown) =>
		selector({
			viewPreferences: mockViewPreferences,
			setViewPreference: mockSetViewPreference
		})
}))

// Mock child components
jest.mock('../maintenance-kanban.client', () => ({
	MaintenanceKanban: ({ initialRequests }: { initialRequests: unknown[] }) => (
		<div data-testid="kanban-view">
			Kanban View - {initialRequests.length} requests
		</div>
	)
}))

jest.mock('../maintenance-table.client', () => ({
	MaintenanceTableClient: ({ initialRequests }: { initialRequests: unknown[] }) => (
		<div data-testid="table-view">
			Table View - {initialRequests.length} requests
		</div>
	)
}))

jest.mock('../columns', () => ({
	columns: []
}))

describe('MaintenanceViewClient', () => {
	const defaultRequests = [DEFAULT_MAINTENANCE_REQUEST]

	beforeEach(() => {
		jest.clearAllMocks()
		// Reset mock preference to kanban
		mockViewPreferences.maintenance = 'kanban'
	})

	describe('View Switching', () => {
		test('renders kanban view by default', () => {
			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert
			expect(screen.getByTestId('kanban-view')).toBeInTheDocument()
			expect(screen.queryByTestId('table-view')).not.toBeInTheDocument()
		})

		test('renders table view when preference is set to table', () => {
			// Arrange
			mockViewPreferences.maintenance = 'table'

			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert
			expect(screen.getByTestId('table-view')).toBeInTheDocument()
			expect(screen.queryByTestId('kanban-view')).not.toBeInTheDocument()
		})

		test('switches to table view when table button is clicked', async () => {
			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			const tableButton = screen.getByLabelText('Table view')
			await userEvent.click(tableButton)

			// Assert
			expect(mockSetViewPreference).toHaveBeenCalledWith('maintenance', 'table')
		})

		test('switches to kanban view when kanban button is clicked', async () => {
			const user = userEvent.setup()
			mockViewPreferences.maintenance = 'table'

			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			const kanbanButton = screen.getByLabelText('Kanban view')
			await user.click(kanbanButton)

			// Assert
			expect(mockSetViewPreference).toHaveBeenCalledWith('maintenance', 'kanban')
		})

		test('does not switch view for invalid view type', () => {
			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Grid view is not available for maintenance
			expect(screen.queryByLabelText('Grid view')).not.toBeInTheDocument()
		})
	})

	describe('ViewSwitcher Integration', () => {
		test('renders ViewSwitcher with correct available views', () => {
			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert
			expect(screen.getByLabelText('Kanban view')).toBeInTheDocument()
			expect(screen.getByLabelText('Table view')).toBeInTheDocument()
			expect(screen.queryByLabelText('Grid view')).not.toBeInTheDocument()
		})

		test('ViewSwitcher has correct aria-label', () => {
			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert
			expect(screen.getByLabelText('Switch maintenance view')).toBeInTheDocument()
		})

		test('ViewSwitcher reflects current view selection', () => {
			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert - current view should be active
			const kanbanButton = screen.getByLabelText('Kanban view')
			expect(kanbanButton).toBeInTheDocument()
		})
	})

	describe('Data Passing', () => {
		test('passes initialRequests to kanban view', () => {
			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert
			expect(screen.getByText(/Kanban View - 1 requests/)).toBeInTheDocument()
		})

		test('passes initialRequests to table view', () => {
			// Arrange
			mockViewPreferences.maintenance = 'table'

			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert
			expect(screen.getByText(/Table View - 1 requests/)).toBeInTheDocument()
		})

		test('handles empty requests array', () => {
			// Act
			render(<MaintenanceViewClient initialRequests={[]} />)

			// Assert
			expect(screen.getByText(/Kanban View - 0 requests/)).toBeInTheDocument()
		})

		test('handles multiple requests', () => {
			// Arrange
			const multipleRequests = [
				DEFAULT_MAINTENANCE_REQUEST,
				{ ...DEFAULT_MAINTENANCE_REQUEST, id: 'req-2' },
				{ ...DEFAULT_MAINTENANCE_REQUEST, id: 'req-3' }
			]

			// Act
			render(<MaintenanceViewClient initialRequests={multipleRequests} />)

			// Assert
			expect(screen.getByText(/Kanban View - 3 requests/)).toBeInTheDocument()
		})
	})

	describe('Preference Persistence', () => {
		test('persists view preference when switching views', async () => {
			const user = userEvent.setup()

			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			const tableButton = screen.getByLabelText('Table view')
			await user.click(tableButton)

			// Assert
			expect(mockSetViewPreference).toHaveBeenCalledWith('maintenance', 'table')
			expect(mockSetViewPreference).toHaveBeenCalledTimes(1)
		})

		test('loads persisted view preference on mount', () => {
			// Arrange
			mockViewPreferences.maintenance = 'table'

			// Act
			render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert - should render table view based on persisted preference
			expect(screen.getByTestId('table-view')).toBeInTheDocument()
		})
	})

	describe('Layout and Structure', () => {
		test('renders view switcher at the top', () => {
			// Act
			const { container } = render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert - ViewSwitcher should be in a flex container at the top
			const flexContainer = container.querySelector('[class*="flex"]')
			expect(flexContainer).toBeInTheDocument()
		})

		test('applies correct spacing between switcher and view', () => {
			// Act
			const { container } = render(<MaintenanceViewClient initialRequests={defaultRequests} />)

			// Assert - space-y-4 class for vertical spacing
			const spaceContainer = container.querySelector('[class*="space-y"]')
			expect(spaceContainer).toBeInTheDocument()
		})
	})
})
