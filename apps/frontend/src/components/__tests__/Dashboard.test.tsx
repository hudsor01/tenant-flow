/**
 * Dashboard Component Tests
 * Tests for main dashboard functionality and widgets
 */

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderComponent, expectLoadingState, mockUseProperties, mockUseTenants, mockUseLeases } from '@/test/component-test-helpers'
import { Dashboard } from '@/pages/Dashboard'
import { generateMockPropertyData, generateMockTenantData, generateMockLeaseData } from '@/test/component-test-helpers'

// Mock all the hooks
vi.mock('@/hooks/useProperties', () => ({ useProperties: vi.fn() }))
vi.mock('@/hooks/useTenants', () => ({ useTenants: vi.fn() }))
vi.mock('@/hooks/useLeases', () => ({ useLeases: vi.fn() }))
vi.mock('@/hooks/useMaintenanceRequests', () => ({ useMaintenanceRequests: vi.fn() }))

describe('Dashboard Component', () => {
  const mockProperties = generateMockPropertyData()
  const mockTenants = generateMockTenantData()
  const mockLeases = generateMockLeaseData()

  beforeEach(() => {
    vi.mocked(useProperties).mockReturnValue(mockUseProperties(mockProperties))
    vi.mocked(useTenants).mockReturnValue(mockUseTenants(mockTenants))
    vi.mocked(useLeases).mockReturnValue(mockUseLeases(mockLeases))
    vi.mocked(useMaintenanceRequests).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false
    })
  })

  it('renders dashboard with all widgets', () => {
    renderComponent(<Dashboard />)
    
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/properties/i)).toBeInTheDocument()
    expect(screen.getByText(/tenants/i)).toBeInTheDocument()
    expect(screen.getByText(/leases/i)).toBeInTheDocument()
    expect(screen.getByText(/maintenance/i)).toBeInTheDocument()
  })

  it('displays correct statistics', () => {
    renderComponent(<Dashboard />)
    
    expect(screen.getByText(mockProperties.length.toString())).toBeInTheDocument()
    expect(screen.getByText(mockTenants.length.toString())).toBeInTheDocument()
    expect(screen.getByText(mockLeases.length.toString())).toBeInTheDocument()
  })

  it('shows recent activity feed', () => {
    renderComponent(<Dashboard />)
    
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument()
  })

  it('displays quick actions', () => {
    renderComponent(<Dashboard />)
    
    expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add tenant/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create lease/i })).toBeInTheDocument()
  })

  it('handles navigation to different sections', async () => {
    const { user } = renderComponent(<Dashboard />)
    
    const propertiesLink = screen.getByRole('link', { name: /view all properties/i })
    await user.click(propertiesLink)
    
    // Would verify navigation in a real router context
  })

  it('shows loading state while data is loading', () => {
    vi.mocked(useProperties).mockReturnValue({
      ...mockUseProperties([]),
      isLoading: true
    })
    
    renderComponent(<Dashboard />)
    
    expectLoadingState()
  })

  it('displays financial overview', () => {
    renderComponent(<Dashboard />)
    
    expect(screen.getByText(/monthly revenue/i)).toBeInTheDocument()
    expect(screen.getByText(/occupancy rate/i)).toBeInTheDocument()
  })

  it('shows upcoming tasks and alerts', () => {
    renderComponent(<Dashboard />)
    
    expect(screen.getByText(/upcoming tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/alerts/i)).toBeInTheDocument()
  })
})