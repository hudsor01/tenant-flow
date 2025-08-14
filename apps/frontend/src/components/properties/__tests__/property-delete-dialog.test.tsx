/**
 * Tests for PropertyDeleteDialog Component
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyDeleteDialog } from '../property-delete-dialog'
import { useDeleteProperty } from '@/hooks/api/use-properties'
import { createMockProperty } from '@/test/utils/test-utils'

// Mock the delete property hook
jest.mock('@/hooks/api/use-properties')
const mockUseDeleteProperty = jest.mocked(useDeleteProperty)

const mockDeleteMutate = jest.fn()

describe('PropertyDeleteDialog', () => {
  const mockOnOpenChange = jest.fn()
  const mockProperty = createMockProperty({
    id: 'prop-1',
    name: 'Test Property',
    units: [
      { id: 'unit-1', status: 'VACANT' },
      { id: 'unit-2', status: 'OCCUPIED' }
    ]
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseDeleteProperty.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null
    } as ReturnType<typeof useDeleteProperty>)
  })

  it('renders with property information', () => {
    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={mockProperty}
      />
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delete Property' })).toBeInTheDocument()
    expect(screen.getByText('Test Property')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
  })

  it('does not render when property is null', () => {
    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={null}
      />
    )

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows warning for occupied units and disables delete', () => {
    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={mockProperty}
      />
    )

    expect(screen.getByText(/This property has occupied units/)).toBeInTheDocument()
    expect(screen.getByText(/Please ensure all tenants are relocated/)).toBeInTheDocument()
    
    const deleteButton = screen.getByRole('button', { name: 'Delete Property' })
    expect(deleteButton).toBeDisabled()
  })

  it('shows unit count warning for vacant units only', () => {
    const propertyWithVacantUnits = createMockProperty({
      id: 'prop-2',
      name: 'Vacant Property',
      units: [
        { id: 'unit-1', status: 'VACANT' },
        { id: 'unit-2', status: 'VACANT' }
      ]
    })

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={propertyWithVacantUnits}
      />
    )

    expect(screen.getByText(/This property has 2 unit\(s\) that will also be deleted/)).toBeInTheDocument()
    expect(screen.queryByText(/occupied units/)).not.toBeInTheDocument()
    
    const deleteButton = screen.getByRole('button', { name: 'Delete Property' })
    expect(deleteButton).not.toBeDisabled()
  })

  it('allows deletion for property with no units', () => {
    const propertyWithNoUnits = createMockProperty({
      id: 'prop-3',
      name: 'Empty Property',
      units: []
    })

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={propertyWithNoUnits}
      />
    )

    expect(screen.queryByText(/This property has.*units/)).not.toBeInTheDocument()
    expect(screen.queryByText(/occupied units/)).not.toBeInTheDocument()
    
    const deleteButton = screen.getByRole('button', { name: 'Delete Property' })
    expect(deleteButton).not.toBeDisabled()
  })

  it('shows permanent deletion warning', () => {
    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={mockProperty}
      />
    )

    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    expect(screen.getByText(/All associated data including units, leases, and maintenance records/)).toBeInTheDocument()
  })

  it('calls delete mutation when delete button is clicked', async () => {
    const user = userEvent.setup()
    const propertyWithVacantUnits = createMockProperty({
      id: 'prop-delete',
      name: 'Delete Me',
      units: [{ id: 'unit-1', status: 'VACANT' }]
    })
    
    mockDeleteMutate.mockResolvedValue({})

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={propertyWithVacantUnits}
      />
    )

    const deleteButton = screen.getByRole('button', { name: 'Delete Property' })
    await user.click(deleteButton)

    expect(mockDeleteMutate).toHaveBeenCalledWith('prop-delete')
    
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows loading state during deletion', () => {
    mockUseDeleteProperty.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: true,
      isSuccess: false,
      isError: false,
      error: null
    } as ReturnType<typeof useDeleteProperty>)

    const propertyWithVacantUnits = createMockProperty({
      units: [{ id: 'unit-1', status: 'VACANT' }]
    })

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={propertyWithVacantUnits}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /deleting/i })
    expect(deleteButton).toBeDisabled()
    expect(screen.getByText('Deleting...')).toBeInTheDocument()
  })

  it('displays error message when deletion fails', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to delete property'
    const localMockOnOpenChange = jest.fn() // Fresh mock for this test
    
    // Create a fresh mock that rejects
    const failingDeleteMutate = jest.fn().mockRejectedValue(new Error(errorMessage))
    mockUseDeleteProperty.mockReturnValue({
      mutateAsync: failingDeleteMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null
    } as ReturnType<typeof useDeleteProperty>)

    const propertyWithVacantUnits = createMockProperty({
      units: [{ id: 'unit-1', status: 'VACANT' }]
    })

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={localMockOnOpenChange}
        property={propertyWithVacantUnits}
      />
    )

    const deleteButton = screen.getByRole('button', { name: 'Delete Property' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // The dialog should still be open when there's an error
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('handles non-Error objects in catch block', async () => {
    const user = userEvent.setup()
    mockDeleteMutate.mockRejectedValue('String error')

    const propertyWithVacantUnits = createMockProperty({
      units: [{ id: 'unit-1', status: 'VACANT' }]
    })

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={propertyWithVacantUnits}
      />
    )

    const deleteButton = screen.getByRole('button', { name: 'Delete Property' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to delete property')).toBeInTheDocument()
    })
  })

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={mockProperty}
      />
    )

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not call delete when property is null in handler', async () => {
    const _user = userEvent.setup()

    // Render with property first
    const { rerender } = render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={createMockProperty({ units: [] })}
      />
    )

    // Then rerender with null property (edge case)
    rerender(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={null}
      />
    )

    // Dialog should not be visible with null property
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('calculates unit status correctly with undefined units', () => {
    const propertyWithUndefinedUnits = createMockProperty({
      id: 'prop-undefined',
      name: 'Undefined Units',
      units: undefined
    })

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={propertyWithUndefinedUnits}
      />
    )

    // Should not show any unit warnings
    expect(screen.queryByText(/This property has.*units/)).not.toBeInTheDocument()
    expect(screen.queryByText(/occupied units/)).not.toBeInTheDocument()
    
    const deleteButton = screen.getByRole('button', { name: 'Delete Property' })
    expect(deleteButton).not.toBeDisabled()
  })

  it('handles mixed unit statuses correctly', () => {
    const propertyWithMixedUnits = createMockProperty({
      id: 'prop-mixed',
      name: 'Mixed Units',
      units: [
        { id: 'unit-1', status: 'VACANT' },
        { id: 'unit-2', status: 'OCCUPIED' },
        { id: 'unit-3', status: 'MAINTENANCE' }
      ]
    })

    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={propertyWithMixedUnits}
      />
    )

    // Should show occupied units warning since at least one is occupied
    expect(screen.getByText(/This property has occupied units/)).toBeInTheDocument()
    expect(screen.queryByText(/This property has.*unit\(s\) that will also be deleted/)).not.toBeInTheDocument()
    
    const deleteButton = screen.getByRole('button', { name: 'Delete Property' })
    expect(deleteButton).toBeDisabled()
  })

  it('has proper accessibility attributes', () => {
    render(
      <PropertyDeleteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        property={mockProperty}
      />
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delete Property' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Property' })).toBeInTheDocument()
  })
})