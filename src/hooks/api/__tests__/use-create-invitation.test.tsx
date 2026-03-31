/**
 * useCreateInvitation Hook Tests
 *
 * Tests the unified invitation creation hook covering:
 * - Type derivation (INV-02): lease_signing vs platform_access
 * - Duplicate detection (INV-04): pre-check + 23505 race condition
 * - DB insert with correct fields (INV-01)
 * - Cache invalidation (INV-03)
 * - URL construction (INV-05): uses INVITATION_ACCEPT_PATH constant
 * - Error handling
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Hoisted mocks (per Vitest convention in CLAUDE.md)
const mockSendInvitationEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockHandlePostgrestError = vi.hoisted(() => vi.fn())
const mockHandleMutationError = vi.hoisted(() => vi.fn())
const mockGetCachedUser = vi.hoisted(() =>
	vi.fn().mockResolvedValue({ id: 'owner-123', email: 'owner@test.com' })
)
const mockRandomUUID = vi.hoisted(() => vi.fn().mockReturnValue('test-uuid-1234'))

// Mock modules
vi.mock('#hooks/api/query-keys/tenant-invite-mutation-options', () => ({
	sendInvitationEmail: mockSendInvitationEmail
}))

vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: mockGetCachedUser
}))

vi.mock('#lib/postgrest-error-handler', () => ({
	handlePostgrestError: mockHandlePostgrestError
}))

vi.mock('#lib/mutation-error-handler', () => ({
	handleMutationError: mockHandleMutationError
}))

vi.mock('#lib/frontend-logger', () => ({
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

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}))

vi.mock('@sentry/nextjs', () => ({
	captureException: vi.fn()
}))

// Supabase mock setup
const mockFrom = vi.fn()

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		from: mockFrom
	})
}))

// Stub crypto.randomUUID
vi.stubGlobal('crypto', { randomUUID: mockRandomUUID })

// Import the hook under test AFTER mocks
import { useCreateInvitation } from '../use-create-invitation'

// Helper: build a chainable select mock for duplicate pre-check
function buildDuplicateCheckChain(result: { data: unknown[]; error?: unknown }) {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {}
	chain.select = vi.fn(() => chain)
	chain.eq = vi.fn(() => chain)
	chain.in = vi.fn(() => chain)
	chain.limit = vi.fn(() =>
		Promise.resolve({ data: result.data, error: result.error ?? null })
	)
	return chain
}

// Helper: build a chainable insert mock
function buildInsertChain(result: { data: unknown; error?: unknown }) {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {}
	chain.insert = vi.fn(() => chain)
	chain.select = vi.fn(() => chain)
	chain.single = vi.fn(() =>
		Promise.resolve({ data: result.data, error: result.error ?? null })
	)
	return chain
}

// Test wrapper
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})
	const spy = vi.spyOn(queryClient, 'invalidateQueries')

	return {
		wrapper: function Wrapper({ children }: { children: ReactNode }) {
			return (
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			)
		},
		queryClient,
		invalidateSpy: spy
	}
}

describe('useCreateInvitation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'owner-123', email: 'owner@test.com' })
		mockRandomUUID.mockReturnValue('test-uuid-1234')
		mockHandlePostgrestError.mockImplementation((error: unknown) => {
			throw error
		})
	})

	it('should derive type as lease_signing when lease_id is provided (INV-02)', async () => {
		// Pre-check returns no duplicates
		const preCheckChain = buildDuplicateCheckChain({ data: [] })
		// Insert returns success
		const insertChain = buildInsertChain({
			data: {
				id: 'new-inv-1',
				email: 'tenant@test.com',
				status: 'sent',
				created_at: '2024-01-01',
				expires_at: '2024-01-08',
				invitation_url: 'http://localhost:3050/accept-invite?code=test-uuid-1234'
			}
		})

		let callCount = 0
		mockFrom.mockImplementation((table: string) => {
			if (table === 'tenant_invitations') {
				callCount++
				if (callCount === 1) return preCheckChain
				return insertChain
			}
			return {}
		})

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		await result.current.mutateAsync({
			email: 'tenant@test.com',
			lease_id: 'lease-1'
		})

		expect(insertChain.insert).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'lease_signing' })
		)
	})

	it('should derive type as platform_access when no lease_id (INV-02)', async () => {
		const preCheckChain = buildDuplicateCheckChain({ data: [] })
		const insertChain = buildInsertChain({
			data: {
				id: 'new-inv-2',
				email: 'tenant@test.com',
				status: 'sent',
				created_at: '2024-01-01',
				expires_at: '2024-01-08',
				invitation_url: 'http://localhost:3050/accept-invite?code=test-uuid-1234'
			}
		})

		let callCount = 0
		mockFrom.mockImplementation((table: string) => {
			if (table === 'tenant_invitations') {
				callCount++
				if (callCount === 1) return preCheckChain
				return insertChain
			}
			return {}
		})

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		await result.current.mutateAsync({ email: 'tenant@test.com' })

		expect(insertChain.insert).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'platform_access' })
		)
	})

	it('should return duplicate status when pending invitation exists (INV-04)', async () => {
		const existingInvitation = {
			id: 'existing-1',
			email: 'tenant@test.com',
			status: 'sent',
			created_at: '2024-01-01',
			expires_at: '2024-01-08',
			invitation_url: 'http://localhost:3050/accept-invite?code=old-code'
		}

		const preCheckChain = buildDuplicateCheckChain({
			data: [existingInvitation]
		})

		mockFrom.mockImplementation((table: string) => {
			if (table === 'tenant_invitations') return preCheckChain
			return {}
		})

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		const mutationResult = await result.current.mutateAsync({
			email: 'tenant@test.com'
		})

		expect(mutationResult).toEqual({
			status: 'duplicate',
			existing: existingInvitation
		})

		// Should NOT have called insert or sendInvitationEmail
		expect(mockSendInvitationEmail).not.toHaveBeenCalled()
	})

	it('should create invitation and send email when no duplicate exists (INV-01)', async () => {
		const newInvitation = {
			id: 'new-inv-1',
			email: 'tenant@test.com',
			status: 'sent',
			created_at: '2024-01-01',
			expires_at: '2024-01-08',
			invitation_url: 'http://localhost:3050/accept-invite?code=test-uuid-1234'
		}

		const preCheckChain = buildDuplicateCheckChain({ data: [] })
		const insertChain = buildInsertChain({ data: newInvitation })

		let callCount = 0
		mockFrom.mockImplementation((table: string) => {
			if (table === 'tenant_invitations') {
				callCount++
				if (callCount === 1) return preCheckChain
				return insertChain
			}
			return {}
		})

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		const mutationResult = await result.current.mutateAsync({
			email: 'tenant@test.com'
		})

		expect(mutationResult).toEqual({
			status: 'created',
			invitation: newInvitation
		})
		expect(mockSendInvitationEmail).toHaveBeenCalledWith('new-inv-1')
	})

	it('should invalidate tenant, invitation, and dashboard queries on success (INV-03)', async () => {
		const preCheckChain = buildDuplicateCheckChain({ data: [] })
		const insertChain = buildInsertChain({
			data: {
				id: 'new-inv-1',
				email: 'tenant@test.com',
				status: 'sent',
				created_at: '2024-01-01',
				expires_at: '2024-01-08',
				invitation_url: 'http://localhost:3050/accept-invite?code=test-uuid-1234'
			}
		})

		let callCount = 0
		mockFrom.mockImplementation((table: string) => {
			if (table === 'tenant_invitations') {
				callCount++
				if (callCount === 1) return preCheckChain
				return insertChain
			}
			return {}
		})

		const { wrapper, invalidateSpy } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		await result.current.mutateAsync({ email: 'tenant@test.com' })

		await waitFor(() => {
			expect(invalidateSpy).toHaveBeenCalledWith(
				expect.objectContaining({ queryKey: ['tenants'] })
			)
			expect(invalidateSpy).toHaveBeenCalledWith(
				expect.objectContaining({ queryKey: ['tenants', 'invitations'] })
			)
			expect(invalidateSpy).toHaveBeenCalledWith(
				expect.objectContaining({ queryKey: ['owner-dashboard'] })
			)
		})
	})

	it('should construct invitation_url with INVITATION_ACCEPT_PATH (INV-05)', async () => {
		const preCheckChain = buildDuplicateCheckChain({ data: [] })
		const insertChain = buildInsertChain({
			data: {
				id: 'new-inv-1',
				email: 'tenant@test.com',
				status: 'sent',
				created_at: '2024-01-01',
				expires_at: '2024-01-08',
				invitation_url: 'http://localhost:3050/accept-invite?code=test-uuid-1234'
			}
		})

		let callCount = 0
		mockFrom.mockImplementation((table: string) => {
			if (table === 'tenant_invitations') {
				callCount++
				if (callCount === 1) return preCheckChain
				return insertChain
			}
			return {}
		})

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		await result.current.mutateAsync({ email: 'tenant@test.com' })

		expect(insertChain.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				invitation_url: expect.stringContaining('/accept-invite?code=test-uuid-1234')
			})
		)
	})

	it('should handle 23505 race condition by re-querying for existing invitation', async () => {
		const existingInvitation = {
			id: 'race-existing-1',
			email: 'tenant@test.com',
			status: 'sent',
			created_at: '2024-01-01',
			expires_at: '2024-01-08',
			invitation_url: 'http://localhost:3050/accept-invite?code=old-code'
		}

		// First call: pre-check returns empty (no duplicate)
		const preCheckChain = buildDuplicateCheckChain({ data: [] })
		// Second call: insert fails with 23505
		const insertChain = buildInsertChain({
			data: null,
			error: { code: '23505', message: 'duplicate key', details: null, hint: null }
		})
		// Third call: re-query returns the existing invitation
		const reQueryChain = buildDuplicateCheckChain({
			data: [existingInvitation]
		})

		let callCount = 0
		mockFrom.mockImplementation((table: string) => {
			if (table === 'tenant_invitations') {
				callCount++
				if (callCount === 1) return preCheckChain
				if (callCount === 2) return insertChain
				return reQueryChain
			}
			return {}
		})

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		const mutationResult = await result.current.mutateAsync({
			email: 'tenant@test.com'
		})

		expect(mutationResult).toEqual({
			status: 'duplicate',
			existing: existingInvitation
		})
		// Should NOT have called sendInvitationEmail for a duplicate
		expect(mockSendInvitationEmail).not.toHaveBeenCalled()
	})

	it('should call handlePostgrestError for non-23505 insert errors', async () => {
		const preCheckChain = buildDuplicateCheckChain({ data: [] })
		const insertError = { code: '42000', message: 'some other error', details: null, hint: null }
		const insertChain = buildInsertChain({
			data: null,
			error: insertError
		})

		let callCount = 0
		mockFrom.mockImplementation((table: string) => {
			if (table === 'tenant_invitations') {
				callCount++
				if (callCount === 1) return preCheckChain
				return insertChain
			}
			return {}
		})

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		await expect(
			result.current.mutateAsync({ email: 'tenant@test.com' })
		).rejects.toBeTruthy()

		expect(mockHandlePostgrestError).toHaveBeenCalledWith(
			insertError,
			'tenant_invitations'
		)
	})

	it('should throw when user is not authenticated', async () => {
		mockGetCachedUser.mockResolvedValue(null)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreateInvitation(), { wrapper })

		await expect(
			result.current.mutateAsync({ email: 'tenant@test.com' })
		).rejects.toMatchObject({
			message: expect.stringContaining('Not authenticated')
		})
	})
})
