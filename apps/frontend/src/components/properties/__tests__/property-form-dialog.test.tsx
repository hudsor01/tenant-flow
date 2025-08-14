/**
 * Tests for PropertyFormDialog Component
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyFormDialog } from '../property-form-dialog'
import { useCreateProperty, useUpdateProperty } from '@/hooks/api/use-properties'
import { createMockProperty } from '@/test/utils/test-utils'

// Mock the properties hooks
jest.mock('@/hooks/api/use-properties')
const mockUseCreateProperty = jest.mocked(useCreateProperty)
const mockUseUpdateProperty = jest.mocked(useUpdateProperty)

const mockCreateMutate = jest.fn()
const mockUpdateMutate = jest.fn()

describe('PropertyFormDialog', () => {
  const mockOnOpenChange = jest.fn()
  const mockProperty = createMockProperty({
    id: 'prop-1',
    name: 'Test Property',
    address: '123 Test St',
    city: 'Test City',
    state: 'CA',
    zipCode: '12345',
    propertyType: 'SINGLE_FAMILY',
    yearBuilt: 2020,
    totalSize: 5000,
    description: 'Test description'
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseCreateProperty.mockReturnValue({
      mutateAsync: mockCreateMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null
    } as ReturnType<typeof useCreateProperty>)

    mockUseUpdateProperty.mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null
    } as ReturnType<typeof useUpdateProperty>)
  })

  describe('Create Mode', () => {
    it('renders create form correctly', () => {
      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add New Property')).toBeInTheDocument()
      expect(screen.getByText('Fill in the details for your new property.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Property' })).toBeInTheDocument()
    })

    it('has empty form fields in create mode', () => {
      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      expect(screen.getByLabelText('Property Name')).toHaveValue('')
      expect(screen.getByLabelText('Street Address')).toHaveValue('')
      expect(screen.getByLabelText('City')).toHaveValue('')
      expect(screen.getByLabelText('State')).toHaveValue('')
      expect(screen.getByLabelText('Zip Code')).toHaveValue('')
      expect(screen.getByLabelText('Year Built (Optional)')).toHaveValue(null)
      expect(screen.getByLabelText('Total Size (sq ft) (Optional)')).toHaveValue(null)
      expect(screen.getByLabelText('Description (Optional)')).toHaveValue('')
    })

    it('creates property with valid form data', async () => {
      const user = userEvent.setup()
      mockCreateMutate.mockResolvedValue(mockProperty)

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Fill form
      await user.type(screen.getByLabelText('Property Name'), 'New Property')
      await user.type(screen.getByLabelText('Street Address'), '456 New Ave')
      await user.type(screen.getByLabelText('City'), 'New City')
      await user.type(screen.getByLabelText('State'), 'NY')
      await user.type(screen.getByLabelText('Zip Code'), '54321')

      // Select property type using fireEvent to avoid JSDOM pointer capture issues
      const typeSelect = screen.getByRole('combobox')
      fireEvent.click(typeSelect)
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Commercial' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('option', { name: 'Commercial' }))

      // Optional fields
      await user.type(screen.getByLabelText('Year Built (Optional)'), '2021')
      await user.type(screen.getByLabelText('Total Size (sq ft) (Optional)'), '6000')
      await user.type(screen.getByLabelText('Description (Optional)'), 'New description')

      // Submit
      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        expect(mockCreateMutate).toHaveBeenCalledWith({
          name: 'New Property',
          address: '456 New Ave',
          city: 'New City',
          state: 'NY',
          zipCode: '54321',
          propertyType: 'COMMERCIAL',
          yearBuilt: 2021,
          totalSize: 6000,
          description: 'New description'
        })
      })

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        expect(screen.getByText('Property name is required')).toBeInTheDocument()
        expect(screen.getByText('Address is required')).toBeInTheDocument()
        expect(screen.getByText('City is required')).toBeInTheDocument()
        expect(screen.getByText('State is required')).toBeInTheDocument()
        expect(screen.getByText('Please enter a valid zip code (12345 or 12345-6789)')).toBeInTheDocument()
      })

      expect(mockCreateMutate).not.toHaveBeenCalled()
    })

    it('validates zip code format', async () => {
      const user = userEvent.setup()

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Fill form with invalid zip
      await user.type(screen.getByLabelText('Property Name'), 'Test')
      await user.type(screen.getByLabelText('Street Address'), 'Test')
      await user.type(screen.getByLabelText('City'), 'Test')
      await user.type(screen.getByLabelText('State'), 'CA')
      await user.type(screen.getByLabelText('Zip Code'), '123') // Too short

      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid zip code (12345 or 12345-6789)')).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode', () => {
    it('renders edit form correctly', () => {
      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={mockProperty}
          mode="edit"
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Property')).toBeInTheDocument()
      expect(screen.getByText('Update the property information below.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Update Property' })).toBeInTheDocument()
    })

    it('pre-fills form with existing property data', () => {
      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={mockProperty}
          mode="edit"
        />
      )

      expect(screen.getByLabelText('Property Name')).toHaveValue('Test Property')
      expect(screen.getByLabelText('Street Address')).toHaveValue('123 Test St')
      expect(screen.getByLabelText('City')).toHaveValue('Test City')
      expect(screen.getByLabelText('State')).toHaveValue('CA')
      expect(screen.getByLabelText('Zip Code')).toHaveValue('12345')
      expect(screen.getByLabelText('Year Built (Optional)')).toHaveValue(2020)
      expect(screen.getByLabelText('Total Size (sq ft) (Optional)')).toHaveValue(5000)
      expect(screen.getByLabelText('Description (Optional)')).toHaveValue('Test description')
    })

    it('updates property with modified data', async () => {
      const user = userEvent.setup()
      mockUpdateMutate.mockResolvedValue({ ...mockProperty, name: 'Updated Property' })

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={mockProperty}
          mode="edit"
        />
      )

      // Modify name
      const nameField = screen.getByLabelText('Property Name')
      await user.clear(nameField)
      await user.type(nameField, 'Updated Property')

      // Submit
      await user.click(screen.getByRole('button', { name: 'Update Property' }))

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          id: 'prop-1',
          data: {
            name: 'Updated Property',
            address: '123 Test St',
            city: 'Test City',
            state: 'CA',
            zipCode: '12345',
            propertyType: 'SINGLE_FAMILY',
            yearBuilt: 2020,
            totalSize: 5000,
            description: 'Test description'
          }
        })
      })

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Loading States', () => {
    it('shows loading state during creation', () => {
      mockUseCreateProperty.mockReturnValue({
        mutateAsync: mockCreateMutate,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null
      } as ReturnType<typeof useCreateProperty>)

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      const submitButton = screen.getByRole('button', { name: /creating/i })
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Creating...')).toBeInTheDocument()
    })

    it('shows loading state during update', () => {
      mockUseUpdateProperty.mockReturnValue({
        mutateAsync: mockUpdateMutate,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null
      } as ReturnType<typeof useUpdateProperty>)

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={mockProperty}
          mode="edit"
        />
      )

      const submitButton = screen.getByRole('button', { name: /updating/i })
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when creation fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to create property'
      mockCreateMutate.mockRejectedValue(new Error(errorMessage))

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText('Property Name'), 'Test')
      await user.type(screen.getByLabelText('Street Address'), 'Test')
      await user.type(screen.getByLabelText('City'), 'Test')
      await user.type(screen.getByLabelText('State'), 'CA')
      await user.type(screen.getByLabelText('Zip Code'), '12345')

      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('displays error message when update fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to update property'
      mockUpdateMutate.mockRejectedValue(new Error(errorMessage))

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={mockProperty}
          mode="edit"
        />
      )

      await user.click(screen.getByRole('button', { name: 'Update Property' }))

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('handles non-Error objects in catch block', async () => {
      const user = userEvent.setup()
      mockCreateMutate.mockRejectedValue('String error')

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText('Property Name'), 'Test')
      await user.type(screen.getByLabelText('Street Address'), 'Test')
      await user.type(screen.getByLabelText('City'), 'Test')
      await user.type(screen.getByLabelText('State'), 'CA')
      await user.type(screen.getByLabelText('Zip Code'), '12345')

      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument()
      })
    })
  })

  describe('Form Controls', () => {
    it('cancels form and closes dialog', async () => {
      const user = userEvent.setup()

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('resets form after successful creation', async () => {
      const user = userEvent.setup()
      mockCreateMutate.mockResolvedValue(mockProperty)

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Fill and submit form
      await user.type(screen.getByLabelText('Property Name'), 'Test Property')
      await user.type(screen.getByLabelText('Street Address'), '123 Test St')
      await user.type(screen.getByLabelText('City'), 'Test City')
      await user.type(screen.getByLabelText('State'), 'CA')
      await user.type(screen.getByLabelText('Zip Code'), '12345')

      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('handles optional numeric fields correctly', async () => {
      const user = userEvent.setup()
      mockCreateMutate.mockResolvedValue(mockProperty)

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText('Property Name'), 'Test')
      await user.type(screen.getByLabelText('Street Address'), 'Test')
      await user.type(screen.getByLabelText('City'), 'Test')
      await user.type(screen.getByLabelText('State'), 'CA')
      await user.type(screen.getByLabelText('Zip Code'), '12345')

      // Leave optional fields empty
      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        expect(mockCreateMutate).toHaveBeenCalledWith({
          name: 'Test',
          address: 'Test',
          city: 'Test',
          state: 'CA',
          zipCode: '12345',
          propertyType: 'SINGLE_FAMILY',
          yearBuilt: undefined,
          totalSize: undefined,
          units: undefined,
          description: undefined
        })
      })
    })

    it('handles property type selection', async () => {
      const user = userEvent.setup()
      mockCreateMutate.mockResolvedValue(mockProperty)

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText('Property Name'), 'Test')
      await user.type(screen.getByLabelText('Street Address'), 'Test')
      await user.type(screen.getByLabelText('City'), 'Test')
      await user.type(screen.getByLabelText('State'), 'CA')
      await user.type(screen.getByLabelText('Zip Code'), '12345')

      // Select different property types using fireEvent
      const typeSelect = screen.getByRole('combobox')
      
      fireEvent.click(typeSelect)
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Commercial' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('option', { name: 'Commercial' }))

      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({
          propertyType: 'COMMERCIAL'
        }))
      })
    })

    it('handles form field interactions correctly', async () => {
      const user = userEvent.setup()

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      // Test field clearing
      const nameField = screen.getByLabelText('Property Name')
      await user.type(nameField, 'Test')
      await user.clear(nameField)
      expect(nameField).toHaveValue('')

      // Test field focus
      await user.click(screen.getByLabelText('Street Address'))
      expect(screen.getByLabelText('Street Address')).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByLabelText('Property Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Street Address')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Property' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('shows form validation messages with proper attributes', async () => {
      const user = userEvent.setup()

      render(
        <PropertyFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          property={null}
          mode="create"
        />
      )

      await user.click(screen.getByRole('button', { name: 'Create Property' }))

      await waitFor(() => {
        const nameField = screen.getByLabelText('Property Name')
        expect(nameField).toBeInvalid()
      })
    })
  })
})