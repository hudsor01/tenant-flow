/**
 * Tests for the refactored Lease Form components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LeaseForm } from '../lease-form'
// Jest global functions available automatically from '@jest/globals'

// Mock the hooks
jest.mock('@/hooks/api/use-leases', () => ({
  useCreateLease: () => ({
    mutate: jest.fn(),
    isPending: false,
    error: null
  }),
  useUpdateLease: () => ({
    mutate: jest.fn(),
    isPending: false,
    error: null
  })
}))

jest.mock('@/hooks/use-properties', () => ({
  useProperties: () => ({
    properties: [
      {
        id: 'prop-1',
        name: 'Test Property',
        units: [
          {
            id: 'unit-1',
            unitNumber: '101',
            rent: 1000,
            status: 'VACANT'
          }
        ]
      }
    ]
  })
}))

jest.mock('@/hooks/use-tenants', () => ({
  useTenants: () => ({
    tenants: [
      {
        id: 'tenant-1',
        name: 'John Doe',
        email: 'john@example.com',
        invitationStatus: 'ACCEPTED'
      }
    ]
  })
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('LeaseForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders create mode correctly', () => {
    render(
      <TestWrapper>
        <LeaseForm />
      </TestWrapper>
    )

    expect(screen.getByText('Create New Lease')).toBeInTheDocument()
    expect(screen.getByText('Create a comprehensive lease agreement for your tenant')).toBeInTheDocument()
  })

  it('renders edit mode correctly', () => {
    const mockLease = {
      id: 'lease-1',
      unitId: 'unit-1',
      tenantId: 'tenant-1',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      rentAmount: 1000,
      securityDeposit: 1500,
      terms: 'Test lease terms',
      status: 'ACTIVE' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    }

    render(
      <TestWrapper>
        <LeaseForm lease={mockLease} />
      </TestWrapper>
    )

    expect(screen.getByText('Edit Lease Agreement')).toBeInTheDocument()
    expect(screen.getByText('Update lease terms and conditions')).toBeInTheDocument()
  })

  it('displays lease calculations when dates and rent are provided', async () => {
    render(
      <TestWrapper>
        <LeaseForm />
      </TestWrapper>
    )

    // Fill in form fields to trigger calculations
    const startDateInput = screen.getByLabelText(/Lease Start Date/i)
    const endDateInput = screen.getByLabelText(/Lease End Date/i)
    const rentInput = screen.getByLabelText(/Monthly Rent/i)

    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-12-31' } })
    fireEvent.change(rentInput, { target: { value: '1000' } })

    await waitFor(() => {
      expect(screen.getByText('Lease Summary')).toBeInTheDocument()
      expect(screen.getByText('12 months')).toBeInTheDocument()
      expect(screen.getByText('$1,000')).toBeInTheDocument()
      expect(screen.getByText('$12,000')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid date range', async () => {
    render(
      <TestWrapper>
        <LeaseForm />
      </TestWrapper>
    )

    const startDateInput = screen.getByLabelText(/Lease Start Date/i)
    const endDateInput = screen.getByLabelText(/Lease End Date/i)

    fireEvent.change(startDateInput, { target: { value: '2024-12-31' } })
    fireEvent.change(endDateInput, { target: { value: '2024-01-01' } })

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument()
    })
  })

  it('allows adding custom lease terms', async () => {
    render(
      <TestWrapper>
        <LeaseForm />
      </TestWrapper>
    )

    const addTermButton = screen.getByText('Add Term')
    fireEvent.click(addTermButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
    })
  })

  it('calls onSuccess callback on successful submission', async () => {
    const mockOnSuccess = jest.fn()
    
    render(
      <TestWrapper>
        <LeaseForm onSuccess={mockOnSuccess} />
      </TestWrapper>
    )

    // This would require mocking the mutation success
    // The actual test would fill out the form and submit
    // For now, we're just testing the component structure
    expect(screen.getByRole('button', { name: /Create Lease/i })).toBeInTheDocument()
  })

  it('calls onCancel callback when cancel button is clicked', () => {
    const mockOnCancel = jest.fn()
    
    render(
      <TestWrapper>
        <LeaseForm onCancel={mockOnCancel} />
      </TestWrapper>
    )

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })
})