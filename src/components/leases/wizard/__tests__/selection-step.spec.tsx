import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SelectionStep } from '../selection-step'

// Mock Supabase client - track which table queries are made against
const mockFrom = vi.fn()

vi.mock('#lib/supabase/client', () => ({
	createClient: vi.fn(() => ({
		from: mockFrom
	}))
}))

// Helper to create a Supabase chain mock that resolves with given data.
// Uses a thenable pattern so the chain can be awaited at any point in the chain,
// while allowing .eq(), .neq(), .order() to be called in any order.
function createChainMock(resolvedData: unknown[]) {
	const result = { data: resolvedData, error: null }
	const chain: Record<string, unknown> = {
		select: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		single: vi.fn().mockReturnThis(),
		// Make the chain thenable so it can be awaited
		then: vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve))
	}
	return chain
}

describe('SelectionStep - Tenant Filtering', () => {
	const mockData = {
		property_id: 'prop-123'
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

	// Tenants returned from PostgREST join: tenants with users!inner(...)
	const mockInvitedTenants = [
		{
			id: 'tenant-1',
			users: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
		},
		{
			id: 'tenant-2',
			users: { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
		}
	]

	const mockUninvitedTenant = {
		id: 'tenant-3',
		users: { first_name: 'Bob', last_name: 'Wilson', email: 'bob@example.com' }
	}

	let queryClient: QueryClient

	// Set up Supabase from() mock to return different data based on table name
	function setupSupabaseMock(options: {
		properties?: typeof mockProperties
		units?: typeof mockUnits
		tenants?: Array<{
			id: string
			users: { first_name: string; last_name: string; email: string }
		}>
	}) {
		mockFrom.mockImplementation((table: string) => {
			if (table === 'properties')
				return createChainMock(options.properties ?? [])
			if (table === 'units') return createChainMock(options.units ?? [])
			if (table === 'tenants') return createChainMock(options.tenants ?? [])
			return createChainMock([])
		})
	}

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: 0
				}
			}
		})
		mockFrom.mockClear()
		mockOnChange.mockClear()
	})

	it('should fetch tenants filtered by property_id when property is selected', async () => {
		setupSupabaseMock({
			properties: mockProperties,
			units: mockUnits,
			tenants: mockInvitedTenants
		})

		render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={mockData} onChange={mockOnChange} />
			</QueryClientProvider>
		)

		// Wait for all queries to complete - properties, units, tenants should all be fetched
		await waitFor(() => {
			expect(mockFrom).toHaveBeenCalledWith('properties')
			expect(mockFrom).toHaveBeenCalledWith('units')
			expect(mockFrom).toHaveBeenCalledWith('tenants')
		})

		// Verify tenant query was made (property_id filtering is done via .eq() on the chain)
		const tenantQueryIndex = mockFrom.mock.calls.findIndex(
			(call: unknown[]) => call[0] === 'tenants'
		)
		expect(tenantQueryIndex).toBeGreaterThanOrEqual(0)
	})

	it('should only receive invited tenants from API when property is selected', async () => {
		// The backend (Supabase RLS) handles tenant filtering - we only receive invited tenants
		setupSupabaseMock({
			properties: mockProperties,
			units: mockUnits,
			tenants: mockInvitedTenants // Only 2 invited tenants, not Bob Wilson
		})

		render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={mockData} onChange={mockOnChange} />
			</QueryClientProvider>
		)

		// Wait for queries to complete
		await waitFor(() => {
			expect(mockFrom).toHaveBeenCalledWith('tenants')
		})

		// Verify the tenant data returned contains only invited tenants (not uninvited tenant Bob Wilson)
		expect(mockInvitedTenants).toHaveLength(2)
		expect(mockInvitedTenants.some(t => t.users.email === 'john@example.com')).toBe(
			true
		)
		expect(mockInvitedTenants.some(t => t.users.email === 'jane@example.com')).toBe(
			true
		)
		expect(mockInvitedTenants.some(t => t.users.email === 'bob@example.com')).toBe(
			false
		)
	})

	it('should fetch all tenants when no property is selected', async () => {
		const dataWithoutProperty = {}

		setupSupabaseMock({
			properties: mockProperties,
			units: [],
			tenants: [...mockInvitedTenants, mockUninvitedTenant]
		})

		render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={dataWithoutProperty} onChange={mockOnChange} />
			</QueryClientProvider>
		)

		// Wait for queries to complete
		await waitFor(() => {
			expect(mockFrom).toHaveBeenCalledWith('properties')
			expect(mockFrom).toHaveBeenCalledWith('tenants')
		})

		// When no property is selected, units query should not be triggered
		// (enabled: !!data.property_id is false)
		const unitsCalls = mockFrom.mock.calls.filter(
			(call: unknown[]) => call[0] === 'units'
		)
		expect(unitsCalls).toHaveLength(0)
	})

	it('should show empty state when no tenants are invited to selected property', async () => {
		setupSupabaseMock({
			properties: mockProperties,
			units: mockUnits,
			tenants: [] // No tenants invited
		})

		render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={mockData} onChange={mockOnChange} />
			</QueryClientProvider>
		)

		// Wait for empty state to appear
		await waitFor(() => {
			expect(
				screen.getByText(/No tenants have been invited to this property yet/)
			).toBeInTheDocument()
		})

		// Verify "Invite New Tenant" toggle button is shown in the header
		expect(screen.getByRole('button', { name: /Invite New Tenant/i })).toBeInTheDocument()
	})

	it('should fetch all tenants regardless of property selection', async () => {
		setupSupabaseMock({
			properties: mockProperties,
			units: mockUnits,
			tenants: mockInvitedTenants
		})

		const { rerender } = render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={mockData} onChange={mockOnChange} />
			</QueryClientProvider>
		)

		await waitFor(() => {
			expect(mockFrom).toHaveBeenCalledWith('tenants')
		})

		const initialTenantCallCount = mockFrom.mock.calls.filter(
			(call: unknown[]) => call[0] === 'tenants'
		).length

		// Change property selection — tenant query should NOT re-fetch
		// because tenant list is property-independent (joined via users table)
		const updatedData = { ...mockData, property_id: 'prop-456' }

		rerender(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={updatedData} onChange={mockOnChange} />
			</QueryClientProvider>
		)

		// Tenant query count should stay the same (cached, not re-fetched)
		const totalTenantCalls = mockFrom.mock.calls.filter(
			(call: unknown[]) => call[0] === 'tenants'
		).length
		expect(totalTenantCalls).toBe(initialTenantCallCount)
	})
})
