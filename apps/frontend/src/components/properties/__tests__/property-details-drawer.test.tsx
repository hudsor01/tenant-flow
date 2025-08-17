/**
 * Tests for PropertyDetailsDrawer Component
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyDetailsDrawer } from '../property-details-drawer'
import { useProperty } from '@/hooks/api/use-properties'
import { createMockProperty } from '@/test/utils/test-utils'

// Mock the properties hook
jest.mock('@/hooks/api/use-properties')
const mockUseProperty = jest.mocked(useProperty)

// Mock Next.js components
jest.mock('next/link', () => {
	const MockedLink = ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode
		href: string
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
	MockedLink.displayName = 'MockedLink'
	return MockedLink
})

// Mock date-fns
jest.mock('date-fns', () => ({
	format: jest.fn(() => 'Jan 01, 2024')
}))

const mockProperty = createMockProperty({
	id: 'prop-1',
	name: 'Sunset Apartments',
	address: '123 Main St',
	city: 'San Francisco',
	state: 'CA',
	propertyType: 'RESIDENTIAL',
	yearBuilt: 2010,
	totalSize: 10000,
	description: 'Beautiful apartment complex',
	createdAt: '2024-01-01T00:00:00.000Z',
	units: [
		{
			id: 'unit-1',
			unitNumber: '101',
			bedrooms: 2,
			bathrooms: 1,
			squareFeet: 800,
			status: 'OCCUPIED',
			rentAmount: 1500
		},
		{
			id: 'unit-2',
			unitNumber: '102',
			bedrooms: 1,
			bathrooms: 1,
			squareFeet: 600,
			status: 'VACANT',
			rentAmount: 1200
		},
		{
			id: 'unit-3',
			unitNumber: '103',
			bedrooms: 2,
			bathrooms: 2,
			squareFeet: 900,
			status: 'OCCUPIED',
			rentAmount: 1800
		}
	],
	manager: {
		name: 'John Manager',
		email: 'john@example.com',
		phone: '(555) 123-4567'
	}
})

describe('PropertyDetailsDrawer', () => {
	const mockOnOpenChange = jest.fn()
	const mockOnEdit = jest.fn()
	const mockOnDelete = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
		mockUseProperty.mockReturnValue({
			data: mockProperty,
			isLoading: false,
			error: null,
			isSuccess: true,
			isError: false
		} as ReturnType<typeof useProperty>)
	})

	it('renders when propertyId is provided', () => {
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
			/>
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()
		expect(screen.getByText('Sunset Apartments')).toBeInTheDocument()
		expect(screen.getByText('123 Main St')).toBeInTheDocument()
	})

	it('does not render when propertyId is null', () => {
		render(
			<PropertyDetailsDrawer
				propertyId={null}
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('displays property information correctly', () => {
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		// Header information
		expect(screen.getByText('Sunset Apartments')).toBeInTheDocument()
		expect(screen.getByText('123 Main St')).toBeInTheDocument()

		// Property Information tab content
		expect(screen.getByText('Property Information')).toBeInTheDocument()
		expect(screen.getByText('RESIDENTIAL')).toBeInTheDocument()
		expect(screen.getByText('2010')).toBeInTheDocument()
		expect(screen.getByText('10000 sq ft')).toBeInTheDocument()
		expect(screen.getByText('Jan 01, 2024')).toBeInTheDocument()
	})

	it('calculates and displays occupancy statistics correctly', () => {
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		// Total units: 3
		expect(screen.getByText('3')).toBeInTheDocument()

		// Occupied units: 2
		expect(screen.getByText('2')).toBeInTheDocument()

		// Vacant units: 1
		expect(screen.getByText('1')).toBeInTheDocument()

		// Occupancy rate: 67% (2/3 * 100, rounded)
		expect(screen.getByText('67%')).toBeInTheDocument()
	})

	it('displays property manager information', () => {
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		expect(screen.getByText('Property Manager')).toBeInTheDocument()
		expect(screen.getByText('John Manager')).toBeInTheDocument()
		expect(screen.getByText('john@example.com')).toBeInTheDocument()
		expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
	})

	it('shows "Not Assigned" when no manager', () => {
		const propertyWithoutManager = { ...mockProperty, manager: null }
		mockUseProperty.mockReturnValue({
			data: propertyWithoutManager,
			isLoading: false,
			error: null,
			isSuccess: true,
			isError: false
		} as ReturnType<typeof useProperty>)

		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		expect(screen.getByText('Not Assigned')).toBeInTheDocument()
	})

	it('displays units in the units tab', async () => {
		const user = userEvent.setup()
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		// Click Units tab
		await user.click(screen.getByRole('tab', { name: 'Units' }))

		// Check unit details
		expect(screen.getByText('Unit 101')).toBeInTheDocument()
		expect(
			screen.getByText('2 bed, 1 bath • 800 sq ft')
		).toBeInTheDocument()
		expect(screen.getByText('$1500/mo')).toBeInTheDocument()

		expect(screen.getByText('Unit 102')).toBeInTheDocument()
		expect(
			screen.getByText('1 bed, 1 bath • 600 sq ft')
		).toBeInTheDocument()
		expect(screen.getByText('$1200/mo')).toBeInTheDocument()

		expect(screen.getByText('Unit 103')).toBeInTheDocument()
		expect(
			screen.getByText('2 bed, 2 bath • 900 sq ft')
		).toBeInTheDocument()
		expect(screen.getByText('$1800/mo')).toBeInTheDocument()
	})

	it('shows "No units added yet" message when property has no units', async () => {
		const user = userEvent.setup()
		const propertyWithoutUnits = { ...mockProperty, units: [] }
		mockUseProperty.mockReturnValue({
			data: propertyWithoutUnits,
			isLoading: false,
			error: null,
			isSuccess: true,
			isError: false
		} as ReturnType<typeof useProperty>)

		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		await user.click(screen.getByRole('tab', { name: 'Units' }))

		expect(screen.getByText('No units added yet')).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'Add Unit' })
		).toBeInTheDocument()
	})

	it('displays unit status badges correctly', async () => {
		const user = userEvent.setup()
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		await user.click(screen.getByRole('tab', { name: 'Units' }))

		// Check status badges
		const occupiedBadges = screen.getAllByText('OCCUPIED')
		expect(occupiedBadges).toHaveLength(2)

		const vacantBadges = screen.getAllByText('VACANT')
		expect(vacantBadges).toHaveLength(1)
	})

	it('calculates and displays financial information', async () => {
		const user = userEvent.setup()
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		await user.click(screen.getByRole('tab', { name: 'Financials' }))

		expect(screen.getByText('Revenue Overview')).toBeInTheDocument()

		// Current Monthly Revenue: $1500 + $1800 = $3300 (only occupied units)
		expect(screen.getByText('$3,300')).toBeInTheDocument()

		// Potential Monthly Revenue: $1500 + $1200 + $1800 = $4500 (all units)
		expect(screen.getByText('$4,500')).toBeInTheDocument()

		// Revenue Loss: $4500 - $3300 = $1200
		expect(screen.getByText('-$1,200')).toBeInTheDocument()
	})

	it('shows documents tab with empty state', async () => {
		const user = userEvent.setup()
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		await user.click(screen.getByRole('tab', { name: 'Documents' }))

		expect(
			screen.getByRole('tab', { name: 'Documents' })
		).toBeInTheDocument()
		expect(screen.getByText('No documents uploaded')).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'Upload Document' })
		).toBeInTheDocument()
	})

	it('calls onEdit when edit button is clicked', async () => {
		const user = userEvent.setup()
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
				onEdit={mockOnEdit}
			/>
		)

		const editButton = screen.getByRole('button', { name: 'Edit property' })
		await user.click(editButton)

		expect(mockOnEdit).toHaveBeenCalledTimes(1)
	})

	it('calls onDelete when delete button is clicked', async () => {
		const user = userEvent.setup()
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
				onDelete={mockOnDelete}
			/>
		)

		const deleteButton = screen.getByRole('button', {
			name: 'Delete property'
		})
		await user.click(deleteButton)

		expect(mockOnDelete).toHaveBeenCalledTimes(1)
	})

	it('shows loading state', () => {
		mockUseProperty.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
			isSuccess: false,
			isError: false
		} as ReturnType<typeof useProperty>)

		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		// Loading skeletons should be visible
		const skeletonElements = document.querySelectorAll('.animate-pulse')
		expect(skeletonElements.length).toBe(3)
	})

	it('shows error state', () => {
		mockUseProperty.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error('Failed to load property'),
			isSuccess: false,
			isError: true
		} as ReturnType<typeof useProperty>)

		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		expect(
			screen.getByText(
				'Failed to load property details. Please try again.'
			)
		).toBeInTheDocument()
	})

	it('handles properties with missing optional fields gracefully', () => {
		const minimalProperty = {
			...mockProperty,
			yearBuilt: null,
			totalSize: null,
			description: null,
			manager: null,
			units: []
		}

		mockUseProperty.mockReturnValue({
			data: minimalProperty,
			isLoading: false,
			error: null,
			isSuccess: true,
			isError: false
		} as ReturnType<typeof useProperty>)

		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		// Should show N/A for missing fields
		expect(screen.getAllByText('N/A')).toHaveLength(2) // year built and total size
		expect(screen.getByText('Not Assigned')).toBeInTheDocument()
	})

	it('switches tabs correctly', async () => {
		const user = userEvent.setup()
		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		// Start on Overview tab (default)
		expect(screen.getByText('Property Information')).toBeInTheDocument()

		// Switch to Units tab
		await user.click(screen.getByRole('tab', { name: 'Units' }))
		expect(screen.getByText('Unit 101')).toBeInTheDocument()

		// Switch to Financials tab
		await user.click(screen.getByRole('tab', { name: 'Financials' }))
		expect(screen.getByText('Revenue Overview')).toBeInTheDocument()

		// Switch to Documents tab
		await user.click(screen.getByRole('tab', { name: 'Documents' }))
		expect(screen.getByText('No documents uploaded')).toBeInTheDocument()

		// Switch back to Overview
		await user.click(screen.getByRole('tab', { name: 'Overview' }))
		expect(screen.getByText('Property Information')).toBeInTheDocument()
	})

	it('displays occupancy rate badge with correct variant based on rate', () => {
		// Test high occupancy (>= 90%)
		const highOccupancyProperty = {
			...mockProperty,
			units: [
				{ id: '1', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '2', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '3', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '4', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '5', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '6', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '7', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '8', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '9', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '10', status: 'VACANT', rentAmount: 1000 }
			] // 90% occupancy
		}

		mockUseProperty.mockReturnValue({
			data: highOccupancyProperty,
			isLoading: false,
			error: null,
			isSuccess: true,
			isError: false
		} as ReturnType<typeof useProperty>)

		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		expect(screen.getByText('90%')).toBeInTheDocument()
		// Should have up-trending icon for high occupancy
		expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument()
	})

	it('shows down-trending icon for low occupancy', () => {
		const lowOccupancyProperty = {
			...mockProperty,
			units: [
				{ id: '1', status: 'OCCUPIED', rentAmount: 1000 },
				{ id: '2', status: 'VACANT', rentAmount: 1000 },
				{ id: '3', status: 'VACANT', rentAmount: 1000 },
				{ id: '4', status: 'VACANT', rentAmount: 1000 }
			] // 25% occupancy
		}

		mockUseProperty.mockReturnValue({
			data: lowOccupancyProperty,
			isLoading: false,
			error: null,
			isSuccess: true,
			isError: false
		} as ReturnType<typeof useProperty>)

		render(
			<PropertyDetailsDrawer
				propertyId="prop-1"
				open={true}
				onOpenChange={mockOnOpenChange}
			/>
		)

		expect(screen.getByText('25%')).toBeInTheDocument()
		// Should have down-trending icon for low occupancy
		expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument()
	})
})
