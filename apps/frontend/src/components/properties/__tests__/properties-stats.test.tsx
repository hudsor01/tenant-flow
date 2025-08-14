/**
 * Tests for PropertiesStats Component
 */

import { render, screen } from '@testing-library/react'
import { PropertiesStats } from '../properties-stats'
import { useProperties } from '@/hooks/api/use-properties'
import { createMockProperty } from '@/test/utils/test-utils'

// Mock the properties hook
jest.mock('@/hooks/api/use-properties')
const mockUseProperties = jest.mocked(useProperties)

describe('PropertiesStats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state with skeleton cards', () => {
    mockUseProperties.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isSuccess: false,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    // Should show 3 skeleton cards
    const skeletonElements = document.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('shows error state when properties fail to load', () => {
    mockUseProperties.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
      isSuccess: false,
      isError: true
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    expect(screen.getByText('Error loading properties')).toBeInTheDocument()
    expect(screen.getByText('There was a problem loading your properties data.')).toBeInTheDocument()
  })

  it('displays stats for empty properties list', () => {
    mockUseProperties.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    expect(screen.getByText('Total Properties')).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(2) // total properties and active tenants
    expect(screen.getByText('0 total units')).toBeInTheDocument()
    
    expect(screen.getByText('Occupancy Rate')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0/0 occupied')).toBeInTheDocument()
    
    expect(screen.getByText('Active Tenants')).toBeInTheDocument()
    expect(screen.getByText('Current tenants')).toBeInTheDocument()
  })

  it('calculates and displays statistics correctly', () => {
    const mockProperties = [
      createMockProperty({
        id: 'prop-1',
        units: [
          { id: 'unit-1', status: 'OCCUPIED' },
          { id: 'unit-2', status: 'OCCUPIED' },
          { id: 'unit-3', status: 'VACANT' }
        ]
      }),
      createMockProperty({
        id: 'prop-2',
        units: [
          { id: 'unit-4', status: 'OCCUPIED' },
          { id: 'unit-5', status: 'VACANT' }
        ]
      }),
      createMockProperty({
        id: 'prop-3',
        units: [
          { id: 'unit-6', status: 'OCCUPIED' }
        ]
      })
    ]

    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    // Total Properties: 3
    expect(screen.getByText('Total Properties')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    
    // Total units: 6, Occupied: 4 (4/6 = 67%)
    expect(screen.getByText('6 total units')).toBeInTheDocument()
    expect(screen.getByText('Occupancy Rate')).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('4/6 occupied')).toBeInTheDocument()
    
    // Active Tenants: 4
    expect(screen.getByText('Active Tenants')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Current tenants')).toBeInTheDocument()
  })

  it('handles properties with no units', () => {
    const mockProperties = [
      createMockProperty({
        id: 'prop-1',
        units: []
      }),
      createMockProperty({
        id: 'prop-2',
        units: undefined
      })
    ]

    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    expect(screen.getByText('2')).toBeInTheDocument() // 2 properties
    expect(screen.getByText('0 total units')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument() // occupancy rate
    expect(screen.getByText('0/0 occupied')).toBeInTheDocument()
  })

  it('displays correct occupancy rate colors for high occupancy (>=90%)', () => {
    const mockProperties = [
      createMockProperty({
        id: 'prop-1',
        units: [
          { id: 'unit-1', status: 'OCCUPIED' },
          { id: 'unit-2', status: 'OCCUPIED' },
          { id: 'unit-3', status: 'OCCUPIED' },
          { id: 'unit-4', status: 'OCCUPIED' },
          { id: 'unit-5', status: 'OCCUPIED' },
          { id: 'unit-6', status: 'OCCUPIED' },
          { id: 'unit-7', status: 'OCCUPIED' },
          { id: 'unit-8', status: 'OCCUPIED' },
          { id: 'unit-9', status: 'OCCUPIED' },
          { id: 'unit-10', status: 'VACANT' }
        ] // 90% occupancy
      })
    ]

    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    expect(screen.getByText('90%')).toBeInTheDocument()
    
    // Find the Home icon (occupancy rate icon) and check its color classes
    const occupancyCard = screen.getByText('Occupancy Rate').closest('[data-slot="card"]')
    const homeIcon = occupancyCard?.querySelector('svg')
    expect(homeIcon).toHaveClass('text-green-600')
  })

  it('displays correct occupancy rate colors for medium occupancy (70-89%)', () => {
    const mockProperties = [
      createMockProperty({
        id: 'prop-1',
        units: [
          { id: 'unit-1', status: 'OCCUPIED' },
          { id: 'unit-2', status: 'OCCUPIED' },
          { id: 'unit-3', status: 'OCCUPIED' },
          { id: 'unit-4', status: 'OCCUPIED' },
          { id: 'unit-5', status: 'OCCUPIED' },
          { id: 'unit-6', status: 'OCCUPIED' },
          { id: 'unit-7', status: 'OCCUPIED' },
          { id: 'unit-8', status: 'VACANT' },
          { id: 'unit-9', status: 'VACANT' },
          { id: 'unit-10', status: 'VACANT' }
        ] // 70% occupancy
      })
    ]

    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    expect(screen.getByText('70%')).toBeInTheDocument()
    
    const occupancyCard = screen.getByText('Occupancy Rate').closest('[data-slot="card"]')
    const homeIcon = occupancyCard?.querySelector('svg')
    expect(homeIcon).toHaveClass('text-yellow-600')
  })

  it('displays correct occupancy rate colors for low occupancy (<70%)', () => {
    const mockProperties = [
      createMockProperty({
        id: 'prop-1',
        units: [
          { id: 'unit-1', status: 'OCCUPIED' },
          { id: 'unit-2', status: 'VACANT' },
          { id: 'unit-3', status: 'VACANT' },
          { id: 'unit-4', status: 'VACANT' }
        ] // 25% occupancy
      })
    ]

    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    expect(screen.getByText('25%')).toBeInTheDocument()
    
    const occupancyCard = screen.getByText('Occupancy Rate').closest('[data-slot="card"]')
    const homeIcon = occupancyCard?.querySelector('svg')
    expect(homeIcon).toHaveClass('text-red-600')
  })

  it('displays all stat card icons with correct colors', () => {
    const mockProperties = [
      createMockProperty({
        id: 'prop-1',
        units: [
          { id: 'unit-1', status: 'OCCUPIED' },
          { id: 'unit-2', status: 'VACANT' }
        ]
      })
    ]

    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    // Total Properties card - should have Building2 icon with blue color
    const totalCard = screen.getByText('Total Properties').closest('[data-slot="card"]')
    const buildingIcon = totalCard?.querySelector('svg')
    expect(buildingIcon).toHaveClass('text-blue-600')

    // Active Tenants card - should have Users icon with purple color
    const tenantsCard = screen.getByText('Active Tenants').closest('[data-slot="card"]')
    const usersIcon = tenantsCard?.querySelector('svg')
    expect(usersIcon).toHaveClass('text-purple-600')
  })

  it('handles mixed unit statuses correctly', () => {
    const mockProperties = [
      createMockProperty({
        id: 'prop-1',
        units: [
          { id: 'unit-1', status: 'OCCUPIED' },
          { id: 'unit-2', status: 'VACANT' },
          { id: 'unit-3', status: 'MAINTENANCE' },
          { id: 'unit-4', status: 'OCCUPIED' }
        ]
      })
    ]

    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    // Only OCCUPIED units should count as occupied (not MAINTENANCE)
    expect(screen.getByText('1')).toBeInTheDocument() // 1 property
    expect(screen.getByText('4 total units')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument() // 2/4 occupied
    expect(screen.getByText('2/4 occupied')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // 2 active tenants
  })

  it('has proper accessibility structure', () => {
    const mockProperties = [createMockProperty()]

    mockUseProperties.mockReturnValue({
      data: mockProperties,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    // Check that all stat titles are present and accessible
    expect(screen.getByText('Total Properties')).toBeInTheDocument()
    expect(screen.getByText('Occupancy Rate')).toBeInTheDocument()
    expect(screen.getByText('Active Tenants')).toBeInTheDocument()

    // Check that all stat values are displayed
    const statValues = document.querySelectorAll('.text-2xl.font-bold')
    expect(statValues).toHaveLength(3)

    // Check that all descriptions are present
    expect(screen.getByText(/total units/)).toBeInTheDocument()
    expect(screen.getByText(/occupied/)).toBeInTheDocument()
    expect(screen.getByText('Current tenants')).toBeInTheDocument()
  })

  it('handles null/undefined properties data gracefully', () => {
    mockUseProperties.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false
    } as ReturnType<typeof useProperties>)

    render(<PropertiesStats />)

    // Should show 0 values for everything
    expect(screen.getAllByText('0')).toHaveLength(2) // total properties and active tenants
    expect(screen.getByText('0 total units')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0/0 occupied')).toBeInTheDocument()
  })
})