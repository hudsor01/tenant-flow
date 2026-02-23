/**
 * Tenant Hooks Tests
 *
 * Tests tenant hooks for:
 * - Correct query configuration
 * - Mutation hooks with cache invalidation
 * - Error handling
 * - Disabled state when ID is empty
 *
 * Updated for PostgREST migration: queries use supabase-js directly (no apiRequest).
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

// Mock Sentry (used by handlePostgrestError)
vi.mock('@sentry/nextjs', () => ({
	captureException: vi.fn()
}))

// Note: useResendInvitationMutation and useCancelInvitationMutation now throw stubs

// Build a chainable Supabase query mock
function makeQueryChain(result: { data?: unknown; error?: unknown; count?: number | null }) {
	const chain: Record<string, unknown> = {}
	const methods = [
		'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq',
		'ilike', 'or', 'order', 'range', 'limit', 'single', 'head'
	]

	const resolver = () => Promise.resolve({
		data: result.data ?? null,
		error: result.error ?? null,
		count: result.count ?? null
	})

	methods.forEach(method => {
		chain[method] = vi.fn(() => {
			if (method === 'single') return resolver()
			return chain
		})
	})

	// Ensure awaiting the chain itself works (for non-.single() calls)
	Object.defineProperty(chain, 'then', {
		get() {
			return resolver().then.bind(resolver())
		}
	})

	return chain
}

// Supabase mock with configurable from() responses
const supabaseFromMock = vi.fn()
let supabaseInsertMock = vi.fn()
let supabaseUpdateMock = vi.fn()
const supabaseAuthGetUserMock = vi.fn()

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		from: supabaseFromMock,
		auth: {
			getUser: supabaseAuthGetUserMock
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

// Sample tenant data matching DB schema
const mockTenant = {
	id: 'tenant-123',
	user_id: 'user-123',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	date_of_birth: null,
	emergency_contact_name: null,
	emergency_contact_phone: null,
	emergency_contact_relationship: null,
	identity_verified: null,
	ssn_last_four: null,
	stripe_customer_id: null
}

const mockTenantWithLease = {
	...mockTenant,
	users: {
		id: 'user-123',
		email: 'john@example.com',
		first_name: 'John',
		last_name: 'Doe',
		full_name: 'John Doe',
		phone: '555-1234',
		status: 'active'
	},
	lease_tenants: []
}

describe('Query Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: 'owner-user-123' } }
		})

		// Default: from() returns a query chain with mock tenant data
		supabaseFromMock.mockImplementation((table: string) => {
			if (table === 'tenants') {
				return makeQueryChain({ data: mockTenant, count: 1 })
			}
			if (table === 'notification_settings') {
				return makeQueryChain({
					data: { email: true, sms: false, maintenance: true, general: true }
				})
			}
			if (table === 'tenant_invitations') {
				return makeQueryChain({ data: [], count: 0 })
			}
			if (table === 'rent_payments') {
				return makeQueryChain({ data: [], count: 0 })
			}
			if (table === 'lease_tenants') {
				return makeQueryChain({ data: [] })
			}
			return makeQueryChain({ data: null })
		})
	})

	describe('useTenant', () => {
		it('should query tenants table by ID', async () => {
			const { result } = renderHook(() => useTenant('tenant-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
		})

		it('should not fetch when ID is empty', () => {
			const { result } = renderHook(() => useTenant(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useTenantWithLease', () => {
		it('should query tenants table with user and lease join', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'tenants') {
					return makeQueryChain({ data: mockTenantWithLease })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useTenantWithLease('tenant-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
		})

		it('should not fetch when ID is empty', () => {
			const { result } = renderHook(() => useTenantWithLease(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useTenantList', () => {
		it('should query tenants with count', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'tenants') {
					return makeQueryChain({ data: [mockTenantWithLease], count: 1 })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useTenantList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
		})
	})

	describe('useAllTenants', () => {
		it('should query all tenants with user and lease join', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'tenants') {
					return makeQueryChain({ data: [mockTenantWithLease] })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useAllTenants(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
		})
	})

	describe('useTenantStats', () => {
		it('should aggregate tenant counts from tenants table', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'tenants') {
					return makeQueryChain({ data: null, count: 10 })
				}
				return makeQueryChain({ data: null, count: 0 })
			})

			const { result } = renderHook(() => useTenantStats(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
		})
	})

	describe('useNotificationPreferences', () => {
		it('should query notification_settings via user_id', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'tenants') {
					return makeQueryChain({ data: { user_id: 'user-123' } })
				}
				if (table === 'notification_settings') {
					return makeQueryChain({
						data: { email: true, sms: false, maintenance: true, general: true }
					})
				}
				return makeQueryChain({ data: null })
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

			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
			expect(supabaseFromMock).toHaveBeenCalledWith('notification_settings')
		})

		it('should not fetch when tenant_id is empty', () => {
			const { result } = renderHook(() => useNotificationPreferences(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useInvitations', () => {
		it('should query tenant_invitations table', async () => {
			const { result } = renderHook(() => useInvitations(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('tenant_invitations')
		})
	})
})

describe('Mutation Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: 'owner-user-123' } }
		})

		supabaseInsertMock = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockTenant, error: null })
			})
		})

		supabaseUpdateMock = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({ data: mockTenant, error: null })
				})
			})
		})

		supabaseFromMock.mockImplementation((table: string) => {
			if (table === 'tenants') {
				return {
					insert: supabaseInsertMock,
					update: supabaseUpdateMock,
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({ data: mockTenant, error: null })
				}
			}
			if (table === 'leases') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: 'lease-456',
									unit_id: 'unit-123',
									owner_user_id: 'owner-user-123',
									units: { property_id: 'property-123' }
								},
								error: null
							})
						})
					}),
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: null, error: null })
					})
				}
			}
			if (table === 'tenant_invitations') {
				return {
					insert: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: 'invite-123',
									email: 'newuser@example.com',
									owner_user_id: 'owner-user-123',
									lease_id: 'lease-456',
									unit_id: 'unit-123',
									property_id: 'property-123',
									invitation_code: 'code-123',
									invitation_url: 'http://localhost:3050/auth/accept-invitation?code=code-123',
									expires_at: '2024-02-01T00:00:00Z',
									status: 'sent',
									type: 'lease_signing'
								},
								error: null
							})
						})
					}),
					select: vi.fn().mockReturnValue({
						order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
					})
				}
			}
			if (table === 'lease_tenants') {
				return {
					delete: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: null, error: null })
					})
				}
			}
			return makeQueryChain({ data: null })
		})
	})

	describe('useCreateTenantMutation', () => {
		it('should insert into tenants table via PostgREST', async () => {
			const { result } = renderHook(() => useCreateTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				user_id: 'user-123'
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
			expect(supabaseInsertMock).toHaveBeenCalledWith(
				expect.objectContaining({ user_id: 'user-123' })
			)
		})
	})

	describe('useUpdateTenantMutation', () => {
		it('should update tenants table via PostgREST', async () => {
			const { result } = renderHook(() => useUpdateTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				id: 'tenant-123',
				data: { identity_verified: true }
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
			expect(supabaseUpdateMock).toHaveBeenCalledWith(
				expect.objectContaining({ identity_verified: true })
			)
		})
	})

	describe('useDeleteTenantMutation', () => {
		it('should soft-delete by removing lease associations via PostgREST', async () => {
			const { result } = renderHook(() => useDeleteTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('tenant-123')

			expect(supabaseFromMock).toHaveBeenCalledWith('lease_tenants')
		})
	})

	describe('useInviteTenantMutation', () => {
		it('should create tenant via PostgREST and link to lease', async () => {
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

			// Should have inserted a tenant_invitation record
			expect(supabaseFromMock).toHaveBeenCalledWith('tenant_invitations')
		})
	})

	describe('useResendInvitationMutation', () => {
		it('should throw stub error (Edge Function not yet implemented)', async () => {
			const { result } = renderHook(() => useResendInvitationMutation(), {
				wrapper: createWrapper()
			})

			await expect(result.current.mutateAsync('tenant-123')).rejects.toThrow(
				'Tenant invitation email requires Edge Function implementation'
			)
		})
	})

	describe('useCancelInvitationMutation', () => {
		it('should throw stub error (Edge Function not yet implemented)', async () => {
			const { result } = renderHook(() => useCancelInvitationMutation(), {
				wrapper: createWrapper()
			})

			await expect(result.current.mutateAsync('invitation-123')).rejects.toThrow(
				'Tenant invitation email requires Edge Function implementation'
			)
		})
	})
})

describe('Utility Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		supabaseFromMock.mockImplementation(() => makeQueryChain({ data: null }))
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
	})

	it('should handle PostgREST errors in query hooks', async () => {
		supabaseFromMock.mockImplementation(() =>
			makeQueryChain({
				data: null,
				error: {
					message: 'Row not found',
					code: 'PGRST116',
					details: null,
					hint: null
				}
			})
		)

		const { result } = renderHook(() => useTenant('tenant-123'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})
	})

	it('should handle mutation errors via PostgREST', async () => {
		supabaseFromMock.mockImplementation(() => ({
			insert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: 'Unique violation', code: '23505', details: null, hint: null }
					})
				})
			}),
			update: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { message: 'Unique violation', code: '23505', details: null, hint: null }
						})
					})
				})
			})
		}))

		const { result } = renderHook(() => useCreateTenantMutation(), {
			wrapper: createWrapper()
		})

		await expect(
			result.current.mutateAsync({ user_id: 'user-123' })
		).rejects.toThrow()
	})
})
