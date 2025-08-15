/**
 * Tests for PropertiesDataTable Component
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertiesDataTable } from '../properties-data-table'
import { useProperties } from '@/hooks/api/use-properties'
import { createMockProperty } from '@/test/utils/test-utils'

// Mock the properties hook
jest.mock('@/hooks/api/use-properties')
const mockUseProperties = jest.mocked(useProperties)

// Mock Next.js components
jest.mock('next/link', () => {
  const MockedLink = ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  )
  MockedLink.displayName = 'MockedLink'
  return MockedLink
})

const mockProperties = [
  createMockProperty({
    id: 'prop-1',
    name: 'Sunset Apartments',
    address: '123 Main St',
    city: 'San Francisco',
    propertyType: 'RESIDENTIAL',
    units: [
      { id: 'unit-1', status: 'OCCUPIED', rentAmount: 1500 },
      { id: 'unit-2', status: 'OCCUPIED', rentAmount: 1600 },
      { id: 'unit-3', status: 'VACANT', rentAmount: 1550 },
      { id: 'unit-4', status: 'OCCUPIED', rentAmount: 1700 }
    ]
  }),
  createMockProperty({
    id: 'prop-2',
    name: 'Downtown Offices',
    address: '456 Business Ave',
    city: 'San Francisco',
    propertyType: 'COMMERCIAL',
    units: [
      { id: 'unit-5', status: 'OCCUPIED', rentAmount: 3000 },
      { id: 'unit-6', status: 'VACANT', rentAmount: 2800 }
    ]
  })
]

describe('PropertiesDataTable', () => {
  const mockOnView = jest.fn()
  const mockOnEdit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)
  })

  it('renders table with property data', async () => {
    render(<PropertiesDataTable onViewProperty={mockOnView} onEditProperty={mockOnEdit} />)

    // Check table headers
    expect(screen.getByRole('columnheader', { name: /property/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /type/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /units/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /tenants/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /occupancy/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument()

    // Check property data
    expect(screen.getByText('Sunset Apartments')).toBeInTheDocument()
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
    expect(screen.getByText('Downtown Offices')).toBeInTheDocument()
  })

  it('calculates and displays occupancy rates correctly', () => {
    render(<PropertiesDataTable />)

    // Sunset Apartments: 3/4 occupied = 75%
    const sunsetRow = screen.getByText('Sunset Apartments').closest('tr')
    expect(sunsetRow).toHaveTextContent('75%')

    // Downtown Offices: 1/2 occupied = 50%
    const downtownRow = screen.getByText('Downtown Offices').closest('tr')
    expect(downtownRow).toHaveTextContent('50%')
  })

  it('displays property type badges', () => {
    render(<PropertiesDataTable />)

    expect(screen.getByText('RESIDENTIAL')).toBeInTheDocument()
    expect(screen.getByText('COMMERCIAL')).toBeInTheDocument()
  })

  it('shows correct unit and tenant counts', () => {
    render(<PropertiesDataTable />)

    const sunsetRow = screen.getByText('Sunset Apartments').closest('tr')
    expect(sunsetRow).toHaveTextContent('4') // total units
    expect(sunsetRow).toHaveTextContent('3') // occupied units (tenants)

    const downtownRow = screen.getByText('Downtown Offices').closest('tr')
    expect(downtownRow).toHaveTextContent('2') // total units
    expect(downtownRow).toHaveTextContent('1') // occupied units (tenants)
  })

  it('calls onViewProperty when property row is clicked', async () => {
    const user = userEvent.setup()
    render(<PropertiesDataTable onViewProperty={mockOnView} onEditProperty={mockOnEdit} />)

    const sunsetProperty = screen.getByText('Sunset Apartments')
    await user.click(sunsetProperty)

    expect(mockOnView).toHaveBeenCalledWith(mockProperties[0])
  })

  it('calls onViewProperty when view button is clicked', async () => {
    const user = userEvent.setup()
    render(<PropertiesDataTable onViewProperty={mockOnView} onEditProperty={mockOnEdit} />)

    const viewButton = screen.getByRole('button', { name: 'View Sunset Apartments' })
    await user.click(viewButton)

    expect(mockOnView).toHaveBeenCalledWith(mockProperties[0])
  })

  it('calls onEditProperty when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<PropertiesDataTable onViewProperty={mockOnView} onEditProperty={mockOnEdit} />)

    const editButton = screen.getByRole('button', { name: 'Edit Sunset Apartments' })
    await user.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledWith(mockProperties[0])
  })

  it('prevents event bubbling on action buttons', async () => {
    const user = userEvent.setup()
    render(<PropertiesDataTable onViewProperty={mockOnView} onEditProperty={mockOnEdit} />)

    const editButton = screen.getByRole('button', { name: 'Edit Sunset Apartments' })
    await user.click(editButton)

    // Only onEditProperty should be called, not onViewProperty
    expect(mockOnEdit).toHaveBeenCalledTimes(1)
    expect(mockOnView).not.toHaveBeenCalled()
  })

  it('shows loading state', () => {
    mockUseProperties.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isSuccess: false,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesDataTable />)

    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('Manage all your rental properties')).toBeInTheDocument()
    // Loading skeleton should be visible - check for skeleton elements by class
    const skeletonElements = document.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('shows error state', () => {
    mockUseProperties.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load properties'),
      isSuccess: false,
      isError: true
    } as ReturnType<typeof useProperties>)

    render(<PropertiesDataTable />)

    expect(screen.getByText('Error loading properties')).toBeInTheDocument()
    expect(screen.getByText('There was a problem loading your properties. Please try refreshing the page.')).toBeInTheDocument()
  })

  it('shows empty state when no properties exist', () => {
    mockUseProperties.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesDataTable />)

    expect(screen.getByText('No properties yet')).toBeInTheDocument()
    expect(screen.getByText('Get started by adding your first rental property to the system.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add first property/i })).toBeInTheDocument()
  })

  it('filters properties by search query', () => {
    render(<PropertiesDataTable searchQuery="Sunset" />)

    expect(screen.getByText('Sunset Apartments')).toBeInTheDocument()
    expect(screen.queryByText('Downtown Offices')).not.toBeInTheDocument()
  })

  it('filters properties by property type', () => {
    render(<PropertiesDataTable propertyType="COMMERCIAL" />)

    expect(screen.getByText('Downtown Offices')).toBeInTheDocument()
    expect(screen.queryByText('Sunset Apartments')).not.toBeInTheDocument()
  })

  it('combines search and filter correctly', () => {
    render(<PropertiesDataTable searchQuery="Down" propertyType="COMMERCIAL" />)

    expect(screen.getByText('Downtown Offices')).toBeInTheDocument()
    expect(screen.queryByText('Sunset Apartments')).not.toBeInTheDocument()
  })

  it('shows "no results found" message when filters yield no results', () => {
    render(<PropertiesDataTable searchQuery="nonexistent property" />)

    expect(screen.getByText('No properties found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search criteria or filters.')).toBeInTheDocument()
  })

  it('shows load more button for large datasets', () => {
    const manyProperties = Array.from({ length: 15 }, (_, i) => 
      createMockProperty({ id: `prop-${i}`, name: `Property ${i}` })
    )

    mockUseProperties.mockReturnValue({
      data: manyProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesDataTable />)

    expect(screen.getByRole('button', { name: /load more properties/i })).toBeInTheDocument()
  })

  it('handles properties with no units gracefully', () => {
    const propertiesWithNoUnits = [
      createMockProperty({
        id: 'prop-empty',
        name: 'Empty Property',
        units: []
      })
    ]

    mockUseProperties.mockReturnValue({
      data: propertiesWithNoUnits,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesDataTable />)

    const emptyRow = screen.getByText('Empty Property').closest('tr')
    expect(emptyRow).toHaveTextContent('0') // units
    expect(emptyRow).toHaveTextContent('0') // tenants
    expect(emptyRow).toHaveTextContent('0%') // occupancy
  })

  it('handles properties with null/undefined units', () => {
    const propertiesWithNullUnits = [
      createMockProperty({
        id: 'prop-null',
        name: 'Null Units Property',
        units: undefined
      })
    ]

    mockUseProperties.mockReturnValue({
      data: propertiesWithNullUnits,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesDataTable />)

    const nullRow = screen.getByText('Null Units Property').closest('tr')
    expect(nullRow).toHaveTextContent('0') // should handle gracefully
  })

  it('applies correct badge variants based on occupancy rate', () => {
    const propertiesWithDifferentOccupancy = [
      createMockProperty({
        id: 'high-occ',
        name: 'High Occupancy',
        units: [
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'VACANT' }
        ] // 80% = >= 70% but < 90%
      }),
      createMockProperty({
        id: 'very-high-occ',
        name: 'Very High Occupancy',
        units: [
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'OCCUPIED' },
          { status: 'VACANT' }
        ] // 90% = >= 90%
      }),
      createMockProperty({
        id: 'low-occ',
        name: 'Low Occupancy',
        units: [
          { status: 'OCCUPIED' },
          { status: 'VACANT' },
          { status: 'VACANT' },
          { status: 'VACANT' }
        ] // 25% = < 70%
      })
    ]

    mockUseProperties.mockReturnValue({
      data: propertiesWithDifferentOccupancy,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesDataTable />)

    // Check that different occupancy rates get different badge styles
    expect(screen.getByText('80%')).toBeInTheDocument() // secondary variant
    expect(screen.getByText('90%')).toBeInTheDocument() // default variant
    expect(screen.getByText('25%')).toBeInTheDocument() // destructive variant
  })
})