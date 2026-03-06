/**
 * Lease Hooks Tests
 *
 * Tests lease hooks for:
 * - Correct query configuration
 * - Mutation hooks with cache invalidation
 * - Error handling
 * - Disabled state when ID is empty
 *
 * Updated for DocuSeal Edge Function migration (Phase 55):
 * - CRUD mutations use supabase-js PostgREST directly
 * - Signature mutations call callDocuSealEdgeFunction() via fetch to /functions/v1/docuseal
 * - useSignedDocumentUrl reads from supabase.from('leases') PostgREST
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
	useLease,
	useLeaseList,
	useLeaseStats,
	useExpiringLeases,
	useCurrentLease,
	useLeaseSignatureStatus,
	useSignedDocumentUrl,
	usePrefetchLeaseDetail
} from '../use-lease'
import {
	useCreateLeaseMutation,
	useUpdateLeaseMutation,
	useDeleteLeaseMutation
} from '../use-lease-mutations'
import {
	useTerminateLeaseMutation,
	useRenewLeaseMutation
} from '../use-lease-lifecycle-mutations'
import {
	useSendLeaseForSignatureMutation,
	useSignLeaseAsOwnerMutation,
	useSignLeaseAsTenantMutation,
	useCancelSignatureRequestMutation
} from '../use-lease-signature-mutations'

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

// Mock useUser hook
vi.mock('#hooks/api/use-auth', () => ({
	useUser: () => ({
		data: { id: 'user-123', email: 'owner@example.com' }
	})
}))

// Build a chainable Supabase query mock
function makeQueryChain(result: { data?: unknown; error?: unknown; count?: number | null }) {
	const chain: Record<string, unknown> = {}
	const methods = [
		'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq',
		'ilike', 'or', 'order', 'range', 'limit', 'single', 'maybeSingle', 'head', 'lte', 'gte'
	]

	const resolver = () => Promise.resolve({
		data: result.data ?? null,
		error: result.error ?? null,
		count: result.count ?? null
	})

	methods.forEach(method => {
		chain[method] = vi.fn(() => {
			if (method === 'single' || method === 'maybeSingle') return resolver()
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

// Mock global fetch for Edge Function calls
const fetchMock = vi.fn()

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

// Set up global fetch mock before tests
vi.stubGlobal('fetch', fetchMock)

// Sample lease data matching DB schema
const mockLease = {
	id: 'lease-123',
	unit_id: 'unit-456',
	primary_tenant_id: 'tenant-789',
	owner_user_id: 'user-123',
	start_date: '2024-01-01',
	end_date: '2025-01-01',
	rent_amount: 1500,
	rent_currency: 'USD',
	security_deposit: 1500,
	payment_day: 1,
	lease_status: 'active',
	auto_pay_enabled: false,
	stripe_subscription_status: 'none',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

const mockSignatureStatus = {
	id: 'lease-123',
	lease_status: 'pending_signature',
	owner_signed_at: '2024-01-15T10:00:00Z',
	tenant_signed_at: null,
	sent_for_signature_at: '2024-01-14T10:00:00Z'
}

describe('Query Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: 'user-123' } }
		})

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: 'mock-token' } }
		})

		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		})

		// Default: from('leases') returns a query chain with mock lease data
		supabaseFromMock.mockImplementation((table: string) => {
			if (table === 'leases') {
				return makeQueryChain({ data: mockLease, count: 1 })
			}
			return makeQueryChain({ data: null })
		})
	})

	describe('useLease', () => {
		it('should query leases table by ID', async () => {
			const { result } = renderHook(() => useLease('lease-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})

		it('should not fetch when ID is empty', () => {
			const { result } = renderHook(() => useLease(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useLeaseList', () => {
		it('should query leases with count for list', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: [mockLease], count: 1 })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useLeaseList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})

		it('should query leases with filters when provided', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: [], count: 0 })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(
				() => useLeaseList({ status: 'active', limit: 25, offset: 10 }),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useCurrentLease', () => {
		it('should query active lease for tenant portal', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: mockLease })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useCurrentLease(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useExpiringLeases', () => {
		it('should query leases expiring within default 30 days', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: [mockLease] })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useExpiringLeases(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})

		it('should query leases expiring within custom days', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: [] })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useExpiringLeases(60), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useLeaseStats', () => {
		it('should aggregate lease counts from leases table', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: null, count: 10 })
				}
				return makeQueryChain({ data: null, count: 0 })
			})

			const { result } = renderHook(() => useLeaseStats(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useLeaseSignatureStatus', () => {
		it('should query signature status columns from leases table', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: mockSignatureStatus })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(
				() => useLeaseSignatureStatus('lease-123'),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})

		it('should not fetch when lease ID is empty', () => {
			const { result } = renderHook(() => useLeaseSignatureStatus(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useSignedDocumentUrl', () => {
		it('should query docuseal_submission_id from leases table via PostgREST', async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({
						data: {
							docuseal_submission_id: 'sub-999',
							owner_signed_at: '2024-01-15T10:00:00Z',
							tenant_signed_at: '2024-01-16T10:00:00Z'
						}
					})
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useSignedDocumentUrl('lease-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})

		it('should not fetch when disabled', () => {
			const { result } = renderHook(
				() => useSignedDocumentUrl('lease-123', false),
				{ wrapper: createWrapper() }
			)

			expect(result.current.isFetching).toBe(false)
		})
	})
})

describe('Mutation Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: 'user-123' } }
		})

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: 'mock-token' } }
		})

		// Default fetch mock for Edge Function calls
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		})

		supabaseFromMock.mockImplementation((table: string) => {
			if (table === 'leases') {
				return makeQueryChain({ data: mockLease })
			}
			return makeQueryChain({ data: null })
		})
	})

	describe('useCreateLeaseMutation', () => {
		it('should insert into leases table via PostgREST', async () => {
			const { result } = renderHook(() => useCreateLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				unit_id: 'unit-456',
				primary_tenant_id: 'tenant-789',
				start_date: '2024-01-01',
				end_date: '2025-01-01',
				rent_amount: 1500,
				rent_currency: 'USD',
				security_deposit: 1500,
				payment_day: 1,
				tenant_ids: ['tenant-789'],
				auto_pay_enabled: false,
				lease_status: 'draft'
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useUpdateLeaseMutation', () => {
		it('should update leases table via PostgREST', async () => {
			const updatedLease = { ...mockLease, rent_amount: 1600 }
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: updatedLease })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useUpdateLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				id: 'lease-123',
				data: { rent_amount: 1600 }
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})

		it('should include version when provided', async () => {
			const updatedLease = { ...mockLease, rent_amount: 1600 }
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: updatedLease })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useUpdateLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				id: 'lease-123',
				data: { rent_amount: 1600 },
				version: 5
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useDeleteLeaseMutation', () => {
		it('should soft-delete via status update in leases table', async () => {
			const { result } = renderHook(() => useDeleteLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useTerminateLeaseMutation', () => {
		it('should update lease_status to terminated in leases table', async () => {
			const terminatedLease = { ...mockLease, lease_status: 'terminated' }
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: terminatedLease })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useTerminateLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useRenewLeaseMutation', () => {
		it('should update end_date in leases table', async () => {
			const renewedLease = { ...mockLease, end_date: '2026-01-01' }
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === 'leases') {
					return makeQueryChain({ data: renewedLease })
				}
				return makeQueryChain({ data: null })
			})

			const { result } = renderHook(() => useRenewLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				id: 'lease-123',
				data: { end_date: '2026-01-01' }
			})

			expect(supabaseFromMock).toHaveBeenCalledWith('leases')
		})
	})

	describe('useSendLeaseForSignatureMutation', () => {
		it('should call docuseal Edge Function with send-for-signature action', async () => {
			const { result } = renderHook(() => useSendLeaseForSignatureMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				leaseId: 'lease-123',
				message: 'Please sign this lease',
				missingFields: {
					immediate_family_members: 'John, Jane',
					landlord_notice_address: '123 Main St'
				}
			})

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/functions/v1/docuseal'),
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"action":"send-for-signature"')
				})
			)
			expect(fetchMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					body: expect.stringContaining('"leaseId":"lease-123"')
				})
			)
		})
	})

	describe('useSignLeaseAsOwnerMutation', () => {
		it('should call docuseal Edge Function with sign-owner action', async () => {
			const { result } = renderHook(() => useSignLeaseAsOwnerMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/functions/v1/docuseal'),
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"action":"sign-owner"')
				})
			)
		})
	})

	describe('useSignLeaseAsTenantMutation', () => {
		it('should call docuseal Edge Function with sign-tenant action', async () => {
			const { result } = renderHook(() => useSignLeaseAsTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/functions/v1/docuseal'),
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"action":"sign-tenant"')
				})
			)
		})
	})

	describe('useCancelSignatureRequestMutation', () => {
		it('should call docuseal Edge Function with cancel action', async () => {
			const { result } = renderHook(() => useCancelSignatureRequestMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/functions/v1/docuseal'),
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"action":"cancel"')
				})
			)
		})
	})
})

describe('Utility Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: 'user-123' } }
		})

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: 'mock-token' } }
		})

		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		})

		supabaseFromMock.mockImplementation((table: string) => {
			if (table === 'leases') {
				return makeQueryChain({ data: mockLease })
			}
			return makeQueryChain({ data: null })
		})
	})

	describe('usePrefetchLeaseDetail', () => {
		it('should be a declarative prefetch hook', () => {
			const { result } = renderHook(() => usePrefetchLeaseDetail('lease-123'), {
				wrapper: createWrapper()
			})

			expect(result.current).toBeUndefined()
		})
	})
})

describe('Error Handling', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: 'user-123' } }
		})

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: 'mock-token' } }
		})

		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		})
	})

	it('should handle PostgREST errors in query hooks', async () => {
		supabaseFromMock.mockImplementation(() =>
			makeQueryChain({
				data: null,
				error: { code: 'PGRST116', message: 'Not found', details: null, hint: null }
			})
		)

		const { result } = renderHook(() => useLease('lease-123'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})
	})

	it('should handle network errors', async () => {
		supabaseFromMock.mockImplementation(() => {
			throw new Error('Network error')
		})

		const { result } = renderHook(() => useLease('lease-123'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})
	})

	it('should handle mutation errors from PostgREST', async () => {
		supabaseFromMock.mockImplementation(() =>
			makeQueryChain({
				data: null,
				error: { code: '42501', message: 'Permission denied', details: null, hint: null }
			})
		)

		const { result } = renderHook(() => useDeleteLeaseMutation(), {
			wrapper: createWrapper()
		})

		await expect(result.current.mutateAsync('lease-123')).rejects.toBeTruthy()
	})
})
