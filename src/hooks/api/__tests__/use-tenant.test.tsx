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
	usePrefetchTenantDetail
} from '../use-tenant'
import {
	useCreateTenantMutation,
	useUpdateTenantMutation,
	useDeleteTenantMutation
} from '../use-tenant-mutations'
import {
	useInviteTenantMutation,
	useResendInvitationMutation,
	useCancelInvitationMutation
} from '../use-tenant-invite-mutations'
import { createQueryChain } from '#test/mocks/supabase-query-mock'

// Mock logger
vi.mock('#shared/lib/frontend-logger', () => ({
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

// Note: useResendInvitationMutation and useCancelInvitationMutation update tenant_invitations via PostgREST

// Mock fetch for Edge Function calls (send-tenant-invitation)
const mockFetch = vi.hoisted(() =>
	vi.fn().mockResolvedValue({
		ok: true,
		json: async () => ({ sent: true, email_id: 'test-id' })
	})
)
vi.stubGlobal('fetch', mockFetch)

// Supabase mock with configurable from() responses
const supabaseFromMock = vi.fn()
let supabaseInsertMock = vi.fn()
let supabaseUpdateMock = vi.fn()
const supabaseAuthGetUserMock = vi.fn()
const supabaseAuthGetSessionMock = vi.fn()

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		from: supabaseFromMock,
		auth: {
			getUser: supabaseAuthGetUserMock,
			getSession: supabaseAuthGetSessionMock
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

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: 'test-jwt-token' } }
		})

		// Default: from() returns a query chain with mock tenant data
		supabaseFromMock.mockImplementation((table: string) => {
			if (table === 'tenants') {
				return createQueryChain({ data: mockTenant, count: 1 })
			}
			if (table === 'notification_settings') {
				return createQueryChain({
					data: { email: true, sms: false, maintenance: true, general: true }
				})
			}
			if (table === 'tenant_invitations') {
				return createQueryChain({ data: [], count: 0 })
			}
			if (table === 'rent_payments') {
				return createQueryChain({ data: [], count: 0 })
			}
			if (table === 'lease_tenants') {
				return createQueryChain({ data: [] })
			}
			return createQueryChain({ data: null })
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
					return createQueryChain({ data: mockTenantWithLease })
				}
				return createQueryChain({ data: null })
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
					return createQueryChain({ data: [mockTenantWithLease], count: 1 })
				}
				return createQueryChain({ data: null })
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
					return createQueryChain({ data: [mockTenantWithLease] })
				}
				return createQueryChain({ data: null })
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
					return createQueryChain({ data: null, count: 10 })
				}
				return createQueryChain({ data: null, count: 0 })
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
					return createQueryChain({ data: { user_id: 'user-123' } })
				}
				if (table === 'notification_settings') {
					return createQueryChain({
						data: { email: true, sms: false, maintenance: true, general: true }
					})
				}
				return createQueryChain({ data: null })
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

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: 'test-jwt-token' } }
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
					update: supabaseUpdateMock,
					select: vi.fn().mockReturnValue({
						order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
					})
				}
			}
			if (table === 'lease_tenants') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({ data: [], error: null })
						})
					}),
					delete: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: null, error: null })
					})
				}
			}
			return createQueryChain({ data: null })
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
		it('should check active leases then soft-delete tenant by updating users status to inactive', async () => {
			// Mock the users table update (soft-delete goes to users, not tenants)
			const usersUpdateMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ data: null, error: null })
			})

			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'tenants') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { user_id: 'user-123' },
									error: null
								})
							})
						})
					}
				}
				if (table === 'lease_tenants') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockResolvedValue({ data: [], error: null })
							})
						})
					}
				}
				if (table === 'users') {
					return { update: usersUpdateMock }
				}
				return createQueryChain({ data: null })
			})

			const { result } = renderHook(() => useDeleteTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('tenant-123')

			// Should check lease_tenants for active leases first
			expect(supabaseFromMock).toHaveBeenCalledWith('lease_tenants')
			// Should get tenant's user_id
			expect(supabaseFromMock).toHaveBeenCalledWith('tenants')
			// Should soft-delete by updating users table
			expect(supabaseFromMock).toHaveBeenCalledWith('users')
			expect(usersUpdateMock).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'inactive' })
			)
		})

		it('should block deletion when tenant has active lease', async () => {
			// Override lease_tenants mock to return an active lease
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'lease_tenants') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockResolvedValue({
									data: [{ lease_id: 'lease-active', leases: { id: 'lease-active', lease_status: 'active' } }],
									error: null
								})
							})
						})
					}
				}
				return createQueryChain({ data: null })
			})

			const { result } = renderHook(() => useDeleteTenantMutation(), {
				wrapper: createWrapper()
			})

			await expect(result.current.mutateAsync('tenant-123')).rejects.toMatchObject({
				message: expect.stringContaining('Cannot delete tenant with active lease')
			})
		})
	})

	describe('useInviteTenantMutation', () => {
		it('should create tenant via PostgREST and send invitation email', async () => {
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

			// Should have called the send-tenant-invitation Edge Function
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/functions/v1/send-tenant-invitation'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						Authorization: 'Bearer test-jwt-token'
					}),
					body: expect.stringContaining('invite-123')
				})
			)
		})
	})

	describe('useResendInvitationMutation', () => {
		it('should update tenant_invitations via PostgREST and resend email', async () => {
			const { result } = renderHook(() => useResendInvitationMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('invitation-123')

			expect(supabaseFromMock).toHaveBeenCalledWith('tenant_invitations')
			expect(supabaseUpdateMock).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'sent' })
			)

			// Should have called the send-tenant-invitation Edge Function
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/functions/v1/send-tenant-invitation'),
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('invitation-123')
				})
			)
		})
	})

	describe('useCancelInvitationMutation', () => {
		it('should update tenant_invitations status to cancelled via PostgREST', async () => {
			const { result } = renderHook(() => useCancelInvitationMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('invitation-123')

			expect(supabaseFromMock).toHaveBeenCalledWith('tenant_invitations')
			expect(supabaseUpdateMock).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'cancelled' })
			)
		})
	})
})

describe('Utility Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		supabaseFromMock.mockImplementation(() => createQueryChain({ data: null }))
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
			createQueryChain({
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
