/**
 * Tenant Hooks Tests
 *
 * Tests tenant hooks for:
 * - Correct query configuration
 * - Mutation hooks with cache invalidation
 * - Error handling
 * - Disabled state when ID is empty
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
	useTenant,
	useTenantList,
	useTenantStats,
	useAllTenants,
	useTenantWithLease,
	useNotificationPreferences,
	useInvitations,
	useCreateTenantMutation,
	useUpdateTenantMutation,
	useDeleteTenantMutation,
	useInviteTenantMutation,
	useResendInvitationMutation,
	useCancelInvitationMutation,
	usePrefetchTenantDetail
} from '../use-tenant'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock api-config (used by api-request internally)
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: () => 'http://localhost:4600'
}))

// Mock logger
vi.mock('@repo/shared/lib/frontend-logger', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	},
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	})
}))

// Mock toast
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}))

// Mock Supabase client using vi.hoisted() to avoid initialization errors
const { mockGetSession } = vi.hoisted(() => ({
	mockGetSession: vi.fn()
}))

vi.mock('#utils/supabase/client', () => ({
	createClient: () => ({
		from: () => ({
			select: vi.fn()
		}),
		auth: {
			getSession: mockGetSession
		}
	})
}))

// Wrapper for hooks
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
	}
}

// Sample tenant data
const mockTenant = {
	id: 'tenant-123',
	name: 'John Doe',
	email: 'john@example.com',
	phone: '555-1234',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

const mockTenantWithLease = {
	...mockTenant,
	lease: {
		id: 'lease-123',
		property_name: 'Test Property',
		unit_number: '101',
		rent_amount: 1500
	}
}

describe('Query Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		// Setup default session mock
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})

		// Setup default fetch mock (apiRequest uses .text() then JSON.parse)
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockTenant),
			text: () => Promise.resolve(JSON.stringify(mockTenant))
		})
	})

	describe('useTenant', () => {
		it('should fetch tenant by ID', async () => {
			const { result } = renderHook(() => useTenant('tenant-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123',
				expect.anything()
			)
		})

		it('should not fetch when ID is empty', () => {
			const { result } = renderHook(() => useTenant(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useTenantWithLease', () => {
		it('should fetch tenant with lease info', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockTenantWithLease),
				text: () => Promise.resolve(JSON.stringify(mockTenantWithLease))
			})

			const { result } = renderHook(() => useTenantWithLease('tenant-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123/with-lease',
				expect.anything()
			)
		})

		it('should not fetch when ID is empty', () => {
			const { result } = renderHook(() => useTenantWithLease(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useTenantList', () => {
		it('should fetch tenant list with default pagination', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: [mockTenant], total: 1 }),
				text: () =>
					Promise.resolve(JSON.stringify({ data: [mockTenant], total: 1 }))
			})

			const { result } = renderHook(() => useTenantList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants?limit=50',
				expect.anything()
			)
		})

		it('should include pagination params when provided', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: [], total: 0 }),
				text: () => Promise.resolve(JSON.stringify({ data: [], total: 0 }))
			})

			const { result } = renderHook(() => useTenantList(2, 25), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			// page 2 with limit 25 means offset=25
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants?limit=25&offset=25',
				expect.anything()
			)
		})

		it('should select data array with pagination info', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: [mockTenant], total: 100 }),
				text: () =>
					Promise.resolve(JSON.stringify({ data: [mockTenant], total: 100 }))
			})

			const { result } = renderHook(() => useTenantList(1, 50), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toEqual({
				data: [mockTenant],
				total: 100,
				page: 1,
				limit: 50
			})
		})
	})

	describe('useAllTenants', () => {
		it('should fetch all tenants', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockTenant]),
				text: () => Promise.resolve(JSON.stringify([mockTenant]))
			})

			const { result } = renderHook(() => useAllTenants(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants',
				expect.anything()
			)
		})
	})

	describe('useTenantStats', () => {
		it('should fetch tenant stats', async () => {
			const mockStats = { total: 50, active: 40, moved_out: 10 }
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockStats),
				text: () => Promise.resolve(JSON.stringify(mockStats))
			})

			const { result } = renderHook(() => useTenantStats(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/stats',
				expect.anything()
			)
		})
	})

	describe('useNotificationPreferences', () => {
		it('should fetch notification preferences for a tenant', async () => {
			const mockPrefs = {
				emailNotifications: true,
				smsNotifications: false,
				maintenanceUpdates: true,
				paymentReminders: true
			}
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockPrefs),
				text: () => Promise.resolve(JSON.stringify(mockPrefs))
			})

			const { result } = renderHook(
				() => useNotificationPreferences('tenant-123'),
				{
					wrapper: createWrapper()
				}
			)

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123/notification-preferences',
				expect.anything()
			)
		})

		it('should not fetch when tenant_id is empty', () => {
			const { result } = renderHook(() => useNotificationPreferences(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useInvitations', () => {
		it('should fetch invitations list', async () => {
			const mockInvitations = {
				data: [{ id: 'inv-1', email: 'test@example.com', status: 'sent' }],
				total: 1
			}
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockInvitations),
				text: () => Promise.resolve(JSON.stringify(mockInvitations))
			})

			const { result } = renderHook(() => useInvitations(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/invitations',
				expect.anything()
			)
		})
	})
})

describe('Mutation Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		// Setup default session mock
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})

		// Setup default fetch mock
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockTenant),
			text: () => Promise.resolve(JSON.stringify(mockTenant))
		})
	})

	describe('useCreateTenantMutation', () => {
		it('should call API with correct endpoint and data', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockTenant),
				text: () => Promise.resolve(JSON.stringify(mockTenant))
			})

			const { result } = renderHook(() => useCreateTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				user_id: 'user-123',
				stripe_customer_id: 'cus_test123'
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('user-123')
				})
			)
		})
	})

	describe('useUpdateTenantMutation', () => {
		it('should call API with correct endpoint and data', async () => {
			const updatedTenant = { ...mockTenant, identity_verified: true }
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(updatedTenant),
				text: () => Promise.resolve(JSON.stringify(updatedTenant))
			})

			const { result } = renderHook(() => useUpdateTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				id: 'tenant-123',
				data: { identity_verified: true }
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123',
				expect.objectContaining({
					method: 'PUT',
					body: expect.stringContaining('identity_verified')
				})
			)
		})
	})

	describe('useDeleteTenantMutation', () => {
		it('should call API with DELETE method', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
				text: () => Promise.resolve('{}')
			})

			const { result } = renderHook(() => useDeleteTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('tenant-123')

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123',
				expect.objectContaining({
					method: 'DELETE'
				})
			)
		})
	})

	describe('useInviteTenantMutation', () => {
		it('should create tenant and associate with lease', async () => {
			const createdTenant = { ...mockTenant, id: 'new-tenant-123' }
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(createdTenant),
					text: () => Promise.resolve(JSON.stringify(createdTenant))
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({}),
					text: () => Promise.resolve('{}')
				})

			const { result } = renderHook(() => useInviteTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				email: 'newuser@example.com',
				first_name: 'New',
				last_name: 'User',
				phone: '555-9999',
				lease_id: 'lease-456'
			})

			// First call: create tenant
			expect(mockFetch).toHaveBeenNthCalledWith(
				1,
				'http://localhost:4600/api/v1/tenants',
				expect.objectContaining({
					method: 'POST'
				})
			)

			// Second call: associate with lease
			expect(mockFetch).toHaveBeenNthCalledWith(
				2,
				'http://localhost:4600/api/v1/leases/lease-456',
				expect.objectContaining({
					method: 'PUT'
				})
			)
		})
	})

	describe('useResendInvitationMutation', () => {
		it('should call resend endpoint', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ message: 'Invitation sent' }),
				text: () => Promise.resolve(JSON.stringify({ message: 'Invitation sent' }))
			})

			const { result } = renderHook(() => useResendInvitationMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('tenant-123')

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123/resend-invitation',
				expect.objectContaining({
					method: 'POST'
				})
			)
		})
	})

	describe('useCancelInvitationMutation', () => {
		it('should call cancel endpoint', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ message: 'Invitation cancelled' }),
				text: () =>
					Promise.resolve(JSON.stringify({ message: 'Invitation cancelled' }))
			})

			const { result } = renderHook(() => useCancelInvitationMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('invitation-123')

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/invitations/invitation-123/cancel',
				expect.objectContaining({
					method: 'POST'
				})
			)
		})
	})
})

describe('Utility Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})
	})

	describe('usePrefetchTenantDetail', () => {
		it('should be a declarative prefetch hook', () => {
			const { result } = renderHook(() => usePrefetchTenantDetail('tenant-123'), {
				wrapper: createWrapper()
			})

			expect(result.current).toBeUndefined()
		})
	})
})

describe('Error Handling', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})
	})

	it('should handle fetch errors in query hooks', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			json: () => Promise.resolve({ message: 'Server error' }),
			text: () => Promise.resolve(JSON.stringify({ message: 'Server error' }))
		})

		const { result } = renderHook(() => useTenant('tenant-123'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})
	})

	it('should handle network errors', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'))

		const { result } = renderHook(() => useTenant('tenant-123'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})
	})

	it('should handle mutation errors', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 400,
			statusText: 'Bad Request',
			json: () => Promise.resolve({ message: 'Invalid data' }),
			text: () => Promise.resolve(JSON.stringify({ message: 'Invalid data' }))
		})

		const { result } = renderHook(() => useCreateTenantMutation(), {
			wrapper: createWrapper()
		})

		await expect(
			result.current.mutateAsync({
				user_id: '',
				stripe_customer_id: ''
			})
		).rejects.toThrow()
	})
})
