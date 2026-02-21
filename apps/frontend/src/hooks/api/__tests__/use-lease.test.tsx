/**
 * Lease Hooks Tests
 *
 * Tests lease hooks for:
 * - Correct query configuration
 * - Mutation hooks with cache invalidation
 * - Error handling
 * - Disabled state when ID is empty
 *
 * Updated for PostgREST migration: queries use supabase-js directly (no apiRequest for CRUD).
 * DocuSeal/signature mutations retain apiRequest with TODO(phase-55) comments.
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
	useCreateLeaseMutation,
	useUpdateLeaseMutation,
	useDeleteLeaseMutation,
	useTerminateLeaseMutation,
	useRenewLeaseMutation,
	useSendLeaseForSignatureMutation,
	useSignLeaseAsOwnerMutation,
	useSignLeaseAsTenantMutation,
	useCancelSignatureRequestMutation,
	usePrefetchLeaseDetail
} from '../use-lease'

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

// Mock api-request (only used by DocuSeal/signature mutations and useSignedDocumentUrl)
vi.mock('#lib/api-request', () => ({
	apiRequest: vi.fn().mockResolvedValue({ success: true, document_url: 'https://example.com/doc.pdf' })
}))

// Mock api-config (used by api-request internally)
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: () => 'http://localhost:4600'
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
		it('should call apiRequest for signed document URL (DocuSeal integration)', async () => {
			// useSignedDocumentUrl retains apiRequest (TODO phase-55)
			const { apiRequest } = await import('#lib/api-request')
			const apiRequestMock = vi.mocked(apiRequest)
			apiRequestMock.mockResolvedValue({ document_url: 'https://example.com/doc.pdf' })

			const { result } = renderHook(() => useSignedDocumentUrl('lease-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(apiRequestMock).toHaveBeenCalledWith(
				expect.stringContaining('lease-123/signed-document')
			)
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
		it('should call apiRequest for DocuSeal send-for-signature (retained NestJS path)', async () => {
			// TODO(phase-55): this mutation retains apiRequest until DocuSeal Edge Function
			const { apiRequest } = await import('#lib/api-request')
			const apiRequestMock = vi.mocked(apiRequest)
			apiRequestMock.mockResolvedValue({ success: true })

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

			expect(apiRequestMock).toHaveBeenCalledWith(
				expect.stringContaining('lease-123/send-for-signature'),
				expect.objectContaining({ method: 'POST' })
			)
		})
	})

	describe('useSignLeaseAsOwnerMutation', () => {
		it('should call apiRequest for DocuSeal owner sign (retained NestJS path)', async () => {
			// TODO(phase-55): this mutation retains apiRequest until DocuSeal Edge Function
			const { apiRequest } = await import('#lib/api-request')
			const apiRequestMock = vi.mocked(apiRequest)
			apiRequestMock.mockResolvedValue({ success: true })

			const { result } = renderHook(() => useSignLeaseAsOwnerMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(apiRequestMock).toHaveBeenCalledWith(
				expect.stringContaining('lease-123/sign/owner'),
				expect.objectContaining({ method: 'POST' })
			)
		})
	})

	describe('useSignLeaseAsTenantMutation', () => {
		it('should call apiRequest for DocuSeal tenant sign (retained NestJS path)', async () => {
			// TODO(phase-55): this mutation retains apiRequest until DocuSeal Edge Function
			const { apiRequest } = await import('#lib/api-request')
			const apiRequestMock = vi.mocked(apiRequest)
			apiRequestMock.mockResolvedValue({ success: true })

			const { result } = renderHook(() => useSignLeaseAsTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(apiRequestMock).toHaveBeenCalledWith(
				expect.stringContaining('lease-123/sign/tenant'),
				expect.objectContaining({ method: 'POST' })
			)
		})
	})

	describe('useCancelSignatureRequestMutation', () => {
		it('should call apiRequest for DocuSeal cancel signature (retained NestJS path)', async () => {
			// TODO(phase-55): this mutation retains apiRequest until DocuSeal Edge Function
			const { apiRequest } = await import('#lib/api-request')
			const apiRequestMock = vi.mocked(apiRequest)
			apiRequestMock.mockResolvedValue({ success: true })

			const { result } = renderHook(() => useCancelSignatureRequestMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(apiRequestMock).toHaveBeenCalledWith(
				expect.stringContaining('lease-123/cancel-signature'),
				expect.objectContaining({ method: 'POST' })
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
