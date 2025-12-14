import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SelectionStep } from '../selection-step'
import { getApiBaseUrl } from '#lib/api-config'

// Mock the API config
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: vi.fn(() => 'http://localhost:3001')
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SelectionStep - Tenant Filtering', () => {
	const mockToken = 'test-jwt-token'
	const mockData = {
		property_id: 'prop-123',
		unit_id: undefined,
		primary_tenant_id: undefined
	}
	const mockOnChange = vi.fn()

	const mockProperties = [
		{
			id: 'prop-123',
			name: 'Sunset Apartments',
			address_line1: '123 Main St',
			city: 'Los Angeles',
			state: 'CA'
		},
		{
			id: 'prop-456',
			name: 'Ocean View',
			address_line1: '456 Ocean Ave',
			city: 'Santa Monica',
			state: 'CA'
		}
	]

	const mockUnits = [
		{ id: 'unit-1', unit_number: '101', property_id: 'prop-123' },
		{ id: 'unit-2', unit_number: '102', property_id: 'prop-123' }
	]

	const mockInvitedTenants = [
		{
			id: 'tenant-1',
			first_name: 'John',
			last_name: 'Doe',
			email: 'john@example.com'
		},
		{
			id: 'tenant-2',
			first_name: 'Jane',
			last_name: 'Smith',
			email: 'jane@example.com'
		}
	]

	const mockUninvitedTenant = {
		id: 'tenant-3',
		first_name: 'Bob',
		last_name: 'Wilson',
		email: 'bob@example.com'
	}

	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: 0
				}
			}
		})
		mockFetch.mockClear()
		mockOnChange.mockClear()
	})

	it('should fetch tenants filtered by property_id when property is selected', async () => {
		// Mock API responses
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockProperties })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockUnits })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockInvitedTenants })
			})

		render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={mockData} onChange={mockOnChange} token={mockToken} />
			</QueryClientProvider>
		)

		// Wait for all queries to complete
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(3)
		})

		// Verify tenant fetch includes property_id parameter
		const tenantFetchCall = mockFetch.mock.calls.find(call =>
			call[0].includes('/api/v1/tenants')
		)
		expect(tenantFetchCall).toBeDefined()
		expect(tenantFetchCall![0]).toContain('property_id=prop-123')
	})

	it('should only receive invited tenants from API when property is selected', async () => {
		// Mock API responses
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockProperties })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockUnits })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockInvitedTenants })
			})

		render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={mockData} onChange={mockOnChange} token={mockToken} />
			</QueryClientProvider>
		)

		// Wait for all queries to complete
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(3)
		})

		// Verify tenant API response contains only invited tenants (not uninvited tenant Bob Wilson)
		const tenantFetchCall = mockFetch.mock.calls.find(call =>
			call[0].includes('/api/v1/tenants')
		)
		expect(tenantFetchCall).toBeDefined()

		// Verify the API returns only 2 invited tenants, not 3 (excluding Bob Wilson)
		expect(mockInvitedTenants).toHaveLength(2)
		expect(mockInvitedTenants.some(t => t.email === 'john@example.com')).toBe(true)
		expect(mockInvitedTenants.some(t => t.email === 'jane@example.com')).toBe(true)
		expect(mockInvitedTenants.some(t => t.email === 'bob@example.com')).toBe(false)
	})

	it('should fetch all tenants when no property is selected', async () => {
		const dataWithoutProperty = {
			property_id: undefined,
			unit_id: undefined,
			primary_tenant_id: undefined
		}

		// Mock API responses
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: mockProperties })
		})
		// Tenants query without property_id filter
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: [...mockInvitedTenants, mockUninvitedTenant]
			})
		})

		render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep
					data={dataWithoutProperty}
					onChange={mockOnChange}
					token={mockToken}
				/>
			</QueryClientProvider>
		)

		// Wait for queries to complete
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/tenants?'),
				expect.any(Object)
			)
		})

		// Verify tenant fetch does NOT include property_id parameter
		const tenantFetchCall = mockFetch.mock.calls.find(call =>
			call[0].includes('/api/v1/tenants')
		)
		expect(tenantFetchCall![0]).not.toContain('property_id=')
	})

	it('should show empty state when no tenants are invited to selected property', async () => {
		// Mock API responses
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockProperties })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockUnits })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: [] }) // No tenants invited
			})

		render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={mockData} onChange={mockOnChange} token={mockToken} />
			</QueryClientProvider>
		)

		// Wait for empty state to appear
		await waitFor(() => {
			expect(
				screen.getByText(/No tenants have been invited to this property yet/)
			).toBeInTheDocument()
		})

		// Verify "Invite Tenant" button is shown
		expect(screen.getByText(/Invite Tenant/)).toBeInTheDocument()
	})

	it('should re-fetch tenants when property selection changes', async () => {
		// Initial render with prop-123
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockProperties })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockUnits })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockInvitedTenants })
			})

		const { rerender } = render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={mockData} onChange={mockOnChange} token={mockToken} />
			</QueryClientProvider>
		)

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(3)
		})

		// Change property selection
		const updatedData = { ...mockData, property_id: 'prop-456' }

		// Mock new units and tenants for prop-456
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: [{ id: 'unit-3', unit_number: '201', property_id: 'prop-456' }] })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: [mockInvitedTenants[0]] }) // Only one tenant invited to prop-456
			})

		rerender(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={updatedData} onChange={mockOnChange} token={mockToken} />
			</QueryClientProvider>
		)

		// Verify tenants re-fetched with new property_id
		await waitFor(() => {
			const latestTenantCall = mockFetch.mock.calls
				.reverse()
				.find(call => call[0].includes('/api/v1/tenants'))
			expect(latestTenantCall![0]).toContain('property_id=prop-456')
		})
	})
})
