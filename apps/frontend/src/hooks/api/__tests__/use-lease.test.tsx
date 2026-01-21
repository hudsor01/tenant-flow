/**
 * Lease Hooks Tests
 *
 * Tests lease hooks for:
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

// Mock useUser hook
vi.mock('#hooks/api/use-auth', () => ({
	useUser: () => ({
		data: { id: 'user-123', email: 'owner@example.com' }
	})
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

// Sample lease data
const mockLease = {
	id: 'lease-123',
	unit_id: 'unit-456',
	primary_tenant_id: 'tenant-789',
	start_date: '2024-01-01',
	end_date: '2025-01-01',
	rent_amount: 1500,
	rent_currency: 'USD',
	security_deposit: 1500,
	payment_day: 1,
	lease_status: 'active',
	auto_pay_enabled: false,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

const mockSignatureStatus = {
	lease_id: 'lease-123',
	status: 'pending_signature',
	owner_signed: true,
	owner_signed_at: '2024-01-15T10:00:00Z',
	tenant_signed: false,
	tenant_signed_at: null,
	sent_for_signature_at: '2024-01-14T10:00:00Z',
	both_signed: false
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
			json: () => Promise.resolve(mockLease),
			text: () => Promise.resolve(JSON.stringify(mockLease))
		})
	})

	describe('useLease', () => {
		it('should fetch lease by ID', async () => {
			const { result } = renderHook(() => useLease('lease-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123',
				expect.anything()
			)
		})

		it('should not fetch when ID is empty', () => {
			const { result } = renderHook(() => useLease(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useLeaseList', () => {
		it('should fetch lease list with default params', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: [mockLease], total: 1 }),
				text: () =>
					Promise.resolve(JSON.stringify({ data: [mockLease], total: 1 }))
			})

			const { result } = renderHook(() => useLeaseList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases?limit=50',
				expect.anything()
			)
		})

		it('should include filter params when provided', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: [], total: 0 }),
				text: () => Promise.resolve(JSON.stringify({ data: [], total: 0 }))
			})

			const { result } = renderHook(
				() =>
					useLeaseList({
						status: 'active',
						search: 'test',
						limit: 25,
						offset: 10
					}),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases?status=active&search=test&limit=25&offset=10',
				expect.anything()
			)
		})
	})

	describe('useCurrentLease', () => {
		it('should fetch tenant portal active lease', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockLease),
				text: () => Promise.resolve(JSON.stringify(mockLease))
			})

			const { result } = renderHook(() => useCurrentLease(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenant-portal/leases',
				expect.anything()
			)
		})
	})

	describe('useExpiringLeases', () => {
		it('should fetch expiring leases with default 30 days', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockLease]),
				text: () => Promise.resolve(JSON.stringify([mockLease]))
			})

			const { result } = renderHook(() => useExpiringLeases(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/expiring?days=30',
				expect.anything()
			)
		})

		it('should fetch expiring leases with custom days', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([]),
				text: () => Promise.resolve('[]')
			})

			const { result } = renderHook(() => useExpiringLeases(60), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/expiring?days=60',
				expect.anything()
			)
		})
	})

	describe('useLeaseStats', () => {
		it('should fetch lease stats', async () => {
			const mockStats = { total: 100, active: 80, ended: 15, terminated: 5 }
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockStats),
				text: () => Promise.resolve(JSON.stringify(mockStats))
			})

			const { result } = renderHook(() => useLeaseStats(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/stats',
				expect.anything()
			)
		})
	})

	describe('useLeaseSignatureStatus', () => {
		it('should fetch signature status for a lease', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockSignatureStatus),
				text: () => Promise.resolve(JSON.stringify(mockSignatureStatus))
			})

			const { result } = renderHook(
				() => useLeaseSignatureStatus('lease-123'),
				{
					wrapper: createWrapper()
				}
			)

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/signature-status',
				expect.anything()
			)
		})

		it('should not fetch when lease ID is empty', () => {
			const { result } = renderHook(() => useLeaseSignatureStatus(''), {
				wrapper: createWrapper()
			})

			expect(result.current.isFetching).toBe(false)
		})
	})

	describe('useSignedDocumentUrl', () => {
		it('should fetch signed document URL', async () => {
			const mockResponse = { document_url: 'https://example.com/doc.pdf' }
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
				text: () => Promise.resolve(JSON.stringify(mockResponse))
			})

			const { result } = renderHook(() => useSignedDocumentUrl('lease-123'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true)
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/signed-document',
				expect.anything()
			)
		})

		it('should not fetch when disabled', () => {
			const { result } = renderHook(
				() => useSignedDocumentUrl('lease-123', false),
				{
					wrapper: createWrapper()
				}
			)

			expect(result.current.isFetching).toBe(false)
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
			json: () => Promise.resolve(mockLease),
			text: () => Promise.resolve(JSON.stringify(mockLease))
		})
	})

	describe('useCreateLeaseMutation', () => {
		it('should call API with correct endpoint and data', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockLease),
				text: () => Promise.resolve(JSON.stringify(mockLease))
			})

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

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('unit-456')
				})
			)
		})
	})

	describe('useUpdateLeaseMutation', () => {
		it('should call API with correct endpoint and data', async () => {
			const updatedLease = { ...mockLease, rent_amount: 1600 }
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(updatedLease),
				text: () => Promise.resolve(JSON.stringify(updatedLease))
			})

			const { result } = renderHook(() => useUpdateLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				id: 'lease-123',
				data: { rent_amount: 1600 }
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123',
				expect.objectContaining({
					method: 'PUT',
					body: expect.stringContaining('1600')
				})
			)
		})

		it('should include version for optimistic locking', async () => {
			const updatedLease = { ...mockLease, rent_amount: 1600 }
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(updatedLease),
				text: () => Promise.resolve(JSON.stringify(updatedLease))
			})

			const { result } = renderHook(() => useUpdateLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				id: 'lease-123',
				data: { rent_amount: 1600 },
				version: 5
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123',
				expect.objectContaining({
					method: 'PUT',
					body: expect.stringContaining('version')
				})
			)
		})
	})

	describe('useDeleteLeaseMutation', () => {
		it('should call API with DELETE method', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
				text: () => Promise.resolve('{}')
			})

			const { result } = renderHook(() => useDeleteLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123',
				expect.objectContaining({
					method: 'DELETE'
				})
			)
		})
	})

	describe('useTerminateLeaseMutation', () => {
		it('should call terminate endpoint', async () => {
			const terminatedLease = { ...mockLease, lease_status: 'terminated' }
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(terminatedLease),
				text: () => Promise.resolve(JSON.stringify(terminatedLease))
			})

			const { result } = renderHook(() => useTerminateLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/terminate',
				expect.objectContaining({
					method: 'POST'
				})
			)
		})
	})

	describe('useRenewLeaseMutation', () => {
		it('should call renew endpoint with new end date', async () => {
			const renewedLease = { ...mockLease, end_date: '2026-01-01' }
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(renewedLease),
				text: () => Promise.resolve(JSON.stringify(renewedLease))
			})

			const { result } = renderHook(() => useRenewLeaseMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				id: 'lease-123',
				data: { end_date: '2026-01-01' }
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/renew',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('2026-01-01')
				})
			)
		})
	})

	describe('useSendLeaseForSignatureMutation', () => {
		it('should send lease for signature', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ success: true }),
				text: () => Promise.resolve(JSON.stringify({ success: true }))
			})

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

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/send-for-signature',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('Please sign this lease')
				})
			)
		})
	})

	describe('useSignLeaseAsOwnerMutation', () => {
		it('should call owner sign endpoint', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ success: true }),
				text: () => Promise.resolve(JSON.stringify({ success: true }))
			})

			const { result } = renderHook(() => useSignLeaseAsOwnerMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/sign/owner',
				expect.objectContaining({
					method: 'POST'
				})
			)
		})
	})

	describe('useSignLeaseAsTenantMutation', () => {
		it('should call tenant sign endpoint', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ success: true }),
				text: () => Promise.resolve(JSON.stringify({ success: true }))
			})

			const { result } = renderHook(() => useSignLeaseAsTenantMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/sign/tenant',
				expect.objectContaining({
					method: 'POST'
				})
			)
		})
	})

	describe('useCancelSignatureRequestMutation', () => {
		it('should cancel signature request', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ success: true }),
				text: () => Promise.resolve(JSON.stringify({ success: true }))
			})

			const { result } = renderHook(() => useCancelSignatureRequestMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync('lease-123')

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/cancel-signature',
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

		const { result } = renderHook(() => useLease('lease-123'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})
	})

	it('should handle network errors', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'))

		const { result } = renderHook(() => useLease('lease-123'), {
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

		const { result } = renderHook(() => useDeleteLeaseMutation(), {
			wrapper: createWrapper()
		})

		await expect(result.current.mutateAsync('lease-123')).rejects.toThrow()
	})
})
