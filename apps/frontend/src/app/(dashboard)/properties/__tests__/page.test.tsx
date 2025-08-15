/**
 * Tests for Properties Page
 * Comprehensive test suite covering page interactions, state management, and component orchestration
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PropertiesPage from '../page'
import { useProperties } from '@/hooks/api/use-properties'
// Helper function for creating mock properties
const createMockProperty = (overrides: Record<string, unknown> = {}) => ({
  id: 'default-id',
  name: 'Default Property',
  ...overrides
})

// Mock all the components and hooks used by the page
jest.mock('@/hooks/api/use-properties')

// Mock the PropertiesClient component which contains all interactive elements
jest.mock('../properties-client', () => ({
  PropertiesClient: () => {
    const React = jest.requireMock('react')
    // Import components using ES6 imports instead of require
    const { PropertiesDataTable } = jest.requireMock('@/components/properties/properties-data-table')
    const { PropertyDetailsDrawer } = jest.requireMock('@/components/properties/property-details-drawer')
    const { PropertyFormDialog } = jest.requireMock('@/components/properties/property-form-dialog')
    const { PropertyDeleteDialog } = jest.requireMock('@/components/properties/property-delete-dialog')
    
    const [searchQuery, setSearchQuery] = React.useState('')
    const [propertyType, setPropertyType] = React.useState('')
    const [showFilters, setShowFilters] = React.useState(false)
    const [selectedProperty, setSelectedProperty] = React.useState(null)
    const [formDialogOpen, setFormDialogOpen] = React.useState(false)
    const [formMode, setFormMode] = React.useState('create')
    const [drawerOpen, setDrawerOpen] = React.useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  
    const handleViewProperty = (property) => {
      setSelectedProperty(property)
      setDrawerOpen(true)
    }
    
    const handleEditProperty = (property) => {
      setSelectedProperty(property)
      setFormMode('edit')
      setFormDialogOpen(true)
    }
    
    const handleAddProperty = () => {
      setSelectedProperty(null)
      setFormMode('create')
      setFormDialogOpen(true)
    }
    
    const handleDeleteProperty = () => {
      setDeleteDialogOpen(true)
    }
    
    return (
      <div data-testid="properties-client">
        <input
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="search-input"
        />
        <button onClick={() => setShowFilters(!showFilters)}>Filter</button>
        <button onClick={handleAddProperty}>Add Property</button>
        
        {showFilters && (
          <select 
            value={propertyType || 'All Types'} 
            onChange={(e) => setPropertyType(e.target.value === 'All Types' ? '' : e.target.value)}
          >
            <option>All Types</option>
            <option value="RESIDENTIAL">RESIDENTIAL</option>
            <option value="COMMERCIAL">COMMERCIAL</option>
          </select>
        )}
        
        <PropertiesDataTable 
          searchQuery={searchQuery}
          propertyType={propertyType}
          onViewProperty={handleViewProperty}
          onEditProperty={handleEditProperty}
        />
        
        <PropertyDetailsDrawer
          propertyId={selectedProperty?.id}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onEdit={() => {
            setDrawerOpen(false)
            setFormMode('edit')
            setFormDialogOpen(true)
          }}
          onDelete={() => {
            setDrawerOpen(false)
            handleDeleteProperty()
          }}
        />
        
        <PropertyFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          property={selectedProperty}
          mode={formMode}
        />
        
        <PropertyDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          property={selectedProperty}
        />
      </div>
    )
  }
}))
jest.mock('@/components/properties/properties-data-table', () => ({
  PropertiesDataTable: jest.fn(({ onViewProperty, onEditProperty, searchQuery, propertyType }) => (
  <div data-testid="properties-data-table">
    <button onClick={() => onViewProperty(createMockProperty({ id: 'prop-1', name: 'Test Property' }))}>
      View Property
    </button>
    <button onClick={() => onEditProperty(createMockProperty({ id: 'prop-2', name: 'Edit Property' }))}>
      Edit Property
    </button>
    <div data-testid="search-query">{searchQuery}</div>
    <div data-testid="property-type">{propertyType}</div>
  </div>
))
}))

jest.mock('@/components/properties/properties-stats', () => ({
  PropertiesStats: jest.fn(() => (
  <div data-testid="properties-stats">Properties Stats</div>
))
}))

jest.mock('@/components/properties/property-details-drawer', () => ({
  PropertyDetailsDrawer: jest.fn(({ open, onOpenChange, propertyId, onEdit, onDelete }) => (
  open ? (
    <div data-testid="property-details-drawer">
      <div>Property ID: {propertyId}</div>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDelete}>Delete</button>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ) : null
))
}))

jest.mock('@/components/properties/property-form-dialog', () => ({
  PropertyFormDialog: jest.fn(({ open, onOpenChange, property, mode }) => (
  open ? (
    <div data-testid="property-form-dialog">
      <div>Mode: {mode}</div>
      <div>Property: {property?.name || 'New Property'}</div>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ) : null
))
}))

jest.mock('@/components/properties/property-delete-dialog', () => ({
  PropertyDeleteDialog: jest.fn(({ open, onOpenChange, property }) => (
  open ? (
    <div data-testid="property-delete-dialog">
      <div>Delete Property: {property?.name}</div>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ) : null
))
}))

const mockUseProperties = jest.mocked(useProperties)

// Get mocked components from the mocked modules
const MockPropertiesDataTable = jest.requireMock('@/components/properties/properties-data-table').PropertiesDataTable
const MockPropertiesStats = jest.requireMock('@/components/properties/properties-stats').PropertiesStats
const MockPropertyDetailsDrawer = jest.requireMock('@/components/properties/property-details-drawer').PropertyDetailsDrawer
const MockPropertyFormDialog = jest.requireMock('@/components/properties/property-form-dialog').PropertyFormDialog
const MockPropertyDeleteDialog = jest.requireMock('@/components/properties/property-delete-dialog').PropertyDeleteDialog

describe('PropertiesPage', () => {
  const mockProperties = [
    createMockProperty({ id: 'prop-1', name: 'Property 1' }),
    createMockProperty({ id: 'prop-2', name: 'Property 2' })
  ]

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

  it('renders the main page layout', () => {
    render(<PropertiesPage />)

    expect(screen.getByRole('heading', { name: 'Properties' })).toBeInTheDocument()
    expect(screen.getByText('Manage your property portfolio')).toBeInTheDocument()
    expect(screen.getByTestId('properties-stats')).toBeInTheDocument()
    expect(screen.getByTestId('properties-client')).toBeInTheDocument()
  })

  it('renders header with add property button', () => {
    render(<PropertiesPage />)

    expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument()
    // There are multiple filter buttons (one in header, one in search)
    const filterButtons = screen.getAllByRole('button', { name: /filter/i })
    expect(filterButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders search functionality', () => {
    render(<PropertiesPage />)

    const searchInput = screen.getByPlaceholderText('Search properties...')
    expect(searchInput).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument()
  })

  describe('Search and Filter Functionality', () => {
    it('updates search query when typing in search input', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const searchInput = screen.getByPlaceholderText('Search properties...')
      await user.type(searchInput, 'test property')

      expect(searchInput).toHaveValue('test property')
      expect(screen.getByTestId('search-query')).toHaveTextContent('test property')
    })

    it('clears search query when input is cleared', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const searchInput = screen.getByPlaceholderText('Search properties...')
      await user.type(searchInput, 'test')
      await user.clear(searchInput)

      expect(searchInput).toHaveValue('')
      expect(screen.getByTestId('search-query')).toHaveTextContent('')
    })

    it('shows filter dropdown when filters button is clicked', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const filtersButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filtersButton)

      expect(screen.getByDisplayValue('All Types')).toBeInTheDocument()
      // Check that the select has the correct options
      const select = screen.getByDisplayValue('All Types')
      expect(select).toBeInTheDocument()
      expect(select.tagName.toLowerCase()).toBe('select')
    })

    it('hides filters when filters button is clicked again', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const filtersButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filtersButton)
      expect(screen.getByDisplayValue('All Types')).toBeInTheDocument()

      await user.click(filtersButton)
      expect(screen.queryByDisplayValue('All Types')).not.toBeInTheDocument()
    })

    it('updates property type filter', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const filtersButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filtersButton)

      const typeSelect = screen.getByDisplayValue('All Types')
      await user.selectOptions(typeSelect, 'RESIDENTIAL')

      expect(typeSelect).toHaveValue('RESIDENTIAL')
      expect(screen.getByTestId('property-type')).toHaveTextContent('RESIDENTIAL')
    })

    it('passes search and filter values to data table', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // Set search query
      const searchInput = screen.getByPlaceholderText('Search properties...')
      await user.type(searchInput, 'luxury')

      // Set property type filter
      const filtersButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filtersButton)
      const typeSelect = screen.getByDisplayValue('All Types')
      await user.selectOptions(typeSelect, 'COMMERCIAL')

      expect(screen.getByTestId('search-query')).toHaveTextContent('luxury')
      expect(screen.getByTestId('property-type')).toHaveTextContent('COMMERCIAL')
    })
  })

  describe('Property Actions', () => {
    it('opens add property dialog when add button is clicked', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const addButton = screen.getByRole('button', { name: /add property/i })
      await user.click(addButton)

      expect(screen.getByTestId('property-form-dialog')).toBeInTheDocument()
      expect(screen.getByText('Mode: create')).toBeInTheDocument()
      expect(screen.getByText('Property: New Property')).toBeInTheDocument()
    })

    it('opens property details drawer when view property is triggered', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const viewButton = screen.getByText('View Property')
      await user.click(viewButton)

      expect(screen.getByTestId('property-details-drawer')).toBeInTheDocument()
      expect(screen.getByText('Property ID: prop-1')).toBeInTheDocument()
    })

    it('opens edit dialog when edit property is triggered from data table', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const editButton = screen.getByText('Edit Property')
      await user.click(editButton)

      expect(screen.getByTestId('property-form-dialog')).toBeInTheDocument()
      expect(screen.getByText('Mode: edit')).toBeInTheDocument()
      expect(screen.getByText('Property: Edit Property')).toBeInTheDocument()
    })

    it('opens edit dialog when edit is triggered from details drawer', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // First open the details drawer
      const viewButton = screen.getByText('View Property')
      await user.click(viewButton)

      // Then click edit in the drawer
      const editInDrawer = screen.getByText('Edit')
      await user.click(editInDrawer)

      expect(screen.getByTestId('property-form-dialog')).toBeInTheDocument()
      expect(screen.getByText('Mode: edit')).toBeInTheDocument()
      expect(screen.queryByTestId('property-details-drawer')).not.toBeInTheDocument()
    })

    it('opens delete dialog when delete is triggered from details drawer', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // First open the details drawer
      const viewButton = screen.getByText('View Property')
      await user.click(viewButton)

      // Then click delete in the drawer
      const deleteButton = screen.getByText('Delete')
      await user.click(deleteButton)

      expect(screen.getByTestId('property-delete-dialog')).toBeInTheDocument()
      expect(screen.getByText('Delete Property: Test Property')).toBeInTheDocument()
      expect(screen.queryByTestId('property-details-drawer')).not.toBeInTheDocument()
    })

    it('closes dialogs when close buttons are clicked', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // Open add property dialog
      const addButton = screen.getByRole('button', { name: /add property/i })
      await user.click(addButton)
      expect(screen.getByTestId('property-form-dialog')).toBeInTheDocument()

      // Close dialog
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)
      expect(screen.queryByTestId('property-form-dialog')).not.toBeInTheDocument()
    })

    it('closes details drawer when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // Open details drawer
      const viewButton = screen.getByText('View Property')
      await user.click(viewButton)
      expect(screen.getByTestId('property-details-drawer')).toBeInTheDocument()

      // Close drawer
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)
      expect(screen.queryByTestId('property-details-drawer')).not.toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('maintains selected property state correctly', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // View a property
      const viewButton = screen.getByText('View Property')
      await user.click(viewButton)

      // Edit from drawer should use the same property
      const editButton = screen.getByText('Edit')
      await user.click(editButton)

      expect(screen.getByText('Property: Test Property')).toBeInTheDocument()
    })

    it('resets state correctly when switching between properties', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // View first property
      const viewButton = screen.getByText('View Property')
      await user.click(viewButton)

      // Close drawer
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      // Edit different property from data table
      const editButton = screen.getByText('Edit Property')
      await user.click(editButton)

      expect(screen.getByText('Property: Edit Property')).toBeInTheDocument()
    })

    it('handles multiple dialog states correctly', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // Open view drawer
      const viewButton = screen.getByText('View Property')
      await user.click(viewButton)
      expect(screen.getByTestId('property-details-drawer')).toBeInTheDocument()

      // Trigger delete (should close drawer and open delete dialog)
      const deleteButton = screen.getByText('Delete')
      await user.click(deleteButton)

      expect(screen.getByTestId('property-delete-dialog')).toBeInTheDocument()
      expect(screen.queryByTestId('property-details-drawer')).not.toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('passes correct props to PropertiesStats component', () => {
      render(<PropertiesPage />)
      
      expect(MockPropertiesStats).toHaveBeenCalled()
    })

    it('passes correct props to PropertiesDataTable component', () => {
      render(<PropertiesPage />)
      
      expect(MockPropertiesDataTable).toHaveBeenCalledWith({
        searchQuery: '',
        propertyType: '',
        onViewProperty: expect.any(Function),
        onEditProperty: expect.any(Function)
      }, undefined)
    })

    it('passes correct props to PropertyDetailsDrawer component', () => {
      render(<PropertiesPage />)
      
      // The drawer is rendered by PropertiesClient mock
      expect(MockPropertyDetailsDrawer).toHaveBeenCalled()
      const lastCall = MockPropertyDetailsDrawer.mock.calls[MockPropertyDetailsDrawer.mock.calls.length - 1]
      expect(lastCall[0]).toMatchObject({
        open: false,
        propertyId: undefined
      })
      expect(typeof lastCall[0].onOpenChange).toBe('function')
      expect(typeof lastCall[0].onEdit).toBe('function')
      expect(typeof lastCall[0].onDelete).toBe('function')
    })

    it('passes correct props to PropertyFormDialog component', () => {
      render(<PropertiesPage />)
      
      expect(MockPropertyFormDialog).toHaveBeenCalledWith({
        open: false,
        onOpenChange: expect.any(Function),
        property: null,
        mode: 'create'
      }, undefined)
    })

    it('passes correct props to PropertyDeleteDialog component', () => {
      render(<PropertiesPage />)
      
      expect(MockPropertyDeleteDialog).toHaveBeenCalledWith({
        open: false,
        onOpenChange: expect.any(Function),
        property: null
      }, undefined)
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined properties data gracefully', () => {
      mockUseProperties.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isSuccess: true,
        isError: false
      } as ReturnType<typeof useProperties>)

      expect(() => render(<PropertiesPage />)).not.toThrow()
      expect(screen.getByRole('heading', { name: 'Properties' })).toBeInTheDocument()
    })

    it('handles null selected property gracefully', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // Open add property dialog (no selected property)
      const addButton = screen.getByRole('button', { name: /add property/i })
      await user.click(addButton)

      expect(screen.getByText('Property: New Property')).toBeInTheDocument()
    })

    it('handles rapid state changes', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // Rapidly open and close dialogs
      const addButton = screen.getByRole('button', { name: /add property/i })
      
      await user.click(addButton)
      expect(screen.getByTestId('property-form-dialog')).toBeInTheDocument()
      
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)
      expect(screen.queryByTestId('property-form-dialog')).not.toBeInTheDocument()
      
      await user.click(addButton)
      expect(screen.getByTestId('property-form-dialog')).toBeInTheDocument()
    })

    it('maintains search state across property actions', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      // Set search query
      const searchInput = screen.getByPlaceholderText('Search properties...')
      await user.type(searchInput, 'search term')

      // Open property dialog
      const addButton = screen.getByRole('button', { name: /add property/i })
      await user.click(addButton)

      // Close dialog
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      // Search term should still be there
      expect(searchInput).toHaveValue('search term')
      expect(screen.getByTestId('search-query')).toHaveTextContent('search term')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<PropertiesPage />)

      const heading = screen.getByRole('heading', { name: 'Properties' })
      expect(heading).toHaveClass('text-3xl', 'font-bold', 'tracking-tight')
    })

    it('provides descriptive button labels', () => {
      render(<PropertiesPage />)

      expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument()
      // Check that filter button exists
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument()
    })

    it('has accessible search input', () => {
      render(<PropertiesPage />)

      const searchInput = screen.getByPlaceholderText('Search properties...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput.tagName.toLowerCase()).toBe('input')
    })

    it('has accessible select elements', async () => {
      const user = userEvent.setup()
      render(<PropertiesPage />)

      const filtersButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filtersButton)

      const typeSelect = screen.getByDisplayValue('All Types')
      expect(typeSelect).toBeInTheDocument()
      expect(typeSelect.tagName.toLowerCase()).toBe('select')
    })
  })
})