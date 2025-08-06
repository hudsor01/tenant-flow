/**
 * TenantManagement Component Tests
 * Comprehensive tests for tenant management functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderComponent, fillFormField, submitForm, expectSuccessMessage, expectErrorMessage, mockUseTenants } from '@/test/component-test-helpers'
import { TenantManagement } from '@/pages/Tenants/TenantManagement'
import { generateMockTenantData } from '@/test/component-test-helpers'

// Mock the hooks
vi.mock('@/hooks/useTenants', () => ({
  useTenants: vi.fn()
}))

describe('TenantManagement Component', () => {
  const mockTenants = generateMockTenantData(3)

  beforeEach(() => {
    vi.mocked(useTenants).mockReturnValue(mockUseTenants(mockTenants))
  })

  it('renders tenant list correctly', () => {
    renderComponent(<TenantManagement />)
    
    expect(screen.getByRole('heading', { name: /tenants/i })).toBeInTheDocument()
    mockTenants.forEach(tenant => {
      expect(screen.getByText(`${tenant.first_name} ${tenant.last_name}`)).toBeInTheDocument()
      expect(screen.getByText(tenant.email)).toBeInTheDocument()
    })
  })

  it('opens add tenant modal', async () => {
    const { user } = renderComponent(<TenantManagement />)
    
    const addButton = screen.getByRole('button', { name: /add tenant/i })
    await user.click(addButton)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/add new tenant/i)).toBeInTheDocument()
  })

  it('creates new tenant successfully', async () => {
    const { user } = renderComponent(<TenantManagement />)
    
    const addButton = screen.getByRole('button', { name: /add tenant/i })
    await user.click(addButton)
    
    await fillFormField('first name', 'John')
    await fillFormField('last name', 'Doe')
    await fillFormField('email', 'john.doe@example.com')
    await fillFormField('phone', '555-0123')
    
    await submitForm('save')
    
    await waitFor(() => {
      expectSuccessMessage('Tenant added successfully')
    })
  })

  it('validates required fields', async () => {
    const { user } = renderComponent(<TenantManagement />)
    
    const addButton = screen.getByRole('button', { name: /add tenant/i })
    await user.click(addButton)
    
    await submitForm('save')
    
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })

  it('filters tenants by search term', async () => {
    const { user } = renderComponent(<TenantManagement />)
    
    const searchInput = screen.getByPlaceholderText(/search tenants/i)
    await user.type(searchInput, mockTenants[0].first_name)
    
    await waitFor(() => {
      expect(screen.getByText(`${mockTenants[0].first_name} ${mockTenants[0].last_name}`)).toBeInTheDocument()
    })
  })

  it('shows empty state when no tenants', () => {
    vi.mocked(useTenants).mockReturnValue(mockUseTenants([]))
    
    renderComponent(<TenantManagement />)
    
    expect(screen.getByText(/no tenants found/i)).toBeInTheDocument()
  })

  it('handles loading state', () => {
    vi.mocked(useTenants).mockReturnValue({
      ...mockUseTenants([]),
      isLoading: true
    })
    
    renderComponent(<TenantManagement />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles error state', () => {
    vi.mocked(useTenants).mockReturnValue({
      ...mockUseTenants([]),
      isError: true,
      error: new Error('Failed to load tenants')
    })
    
    renderComponent(<TenantManagement />)
    
    expectErrorMessage('Failed to load tenants')
  })
})