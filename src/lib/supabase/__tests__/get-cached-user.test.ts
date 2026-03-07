import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────

const { mockGetUser } = vi.hoisted(() => ({
	mockGetUser: vi.fn(),
}))

const { mockCreateBrowserClient } = vi.hoisted(() => ({
	mockCreateBrowserClient: vi.fn(() => ({
		auth: { getUser: mockGetUser },
	})),
}))

// ── Module mocks ───────────────────────────────────────────

vi.mock('@supabase/ssr', () => ({
	createBrowserClient: mockCreateBrowserClient,
}))

vi.mock('#env', () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'mock-anon-key',
	},
}))

import { getCachedUser, setQueryClientRef } from '../get-cached-user'
import type { QueryClient } from '@tanstack/react-query'

// ── Tests ──────────────────────────────────────────────────

describe('getCachedUser', () => {
	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		app_metadata: {},
		user_metadata: {},
		aud: 'authenticated',
		created_at: '2024-01-01',
	}

	beforeEach(() => {
		vi.clearAllMocks()
		// Reset the module-level queryClientRef by setting it to null
		setQueryClientRef(null as unknown as QueryClient)

		mockGetUser.mockResolvedValue({
			data: { user: mockUser },
			error: null,
		})
	})

	it('returns user from supabase.auth.getUser() when no QueryClient is set', async () => {
		const user = await getCachedUser()

		expect(user).toEqual(mockUser)
		expect(mockGetUser).toHaveBeenCalledOnce()
	})

	it('uses getUser() and not getSession() for server-validated auth', async () => {
		await getCachedUser()

		// Verify getUser was called (security requirement per CLAUDE.md)
		expect(mockGetUser).toHaveBeenCalledOnce()
	})

	it('returns null when getUser() returns no user', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: null,
		})

		const user = await getCachedUser()

		expect(user).toBeNull()
	})

	it('returns null when getUser() returns an error', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: { message: 'invalid session' },
		})

		const user = await getCachedUser()

		expect(user).toBeNull()
	})

	it('returns cached user from QueryClient when available', async () => {
		const mockQueryClient = {
			getQueryData: vi.fn().mockReturnValue(mockUser),
		} as unknown as QueryClient

		setQueryClientRef(mockQueryClient)

		const user = await getCachedUser()

		expect(user).toEqual(mockUser)
		expect(mockQueryClient.getQueryData).toHaveBeenCalledWith([
			'auth',
			'user',
		])
		// Should NOT call supabase.auth.getUser() when cache hit
		expect(mockGetUser).not.toHaveBeenCalled()
	})

	it('falls back to getUser() when QueryClient cache returns null', async () => {
		const mockQueryClient = {
			getQueryData: vi.fn().mockReturnValue(null),
		} as unknown as QueryClient

		setQueryClientRef(mockQueryClient)

		const user = await getCachedUser()

		expect(user).toEqual(mockUser)
		expect(mockQueryClient.getQueryData).toHaveBeenCalledWith([
			'auth',
			'user',
		])
		expect(mockGetUser).toHaveBeenCalledOnce()
	})

	it('falls back to getUser() when QueryClient cache returns undefined', async () => {
		const mockQueryClient = {
			getQueryData: vi.fn().mockReturnValue(undefined),
		} as unknown as QueryClient

		setQueryClientRef(mockQueryClient)

		const user = await getCachedUser()

		expect(user).toEqual(mockUser)
		expect(mockGetUser).toHaveBeenCalledOnce()
	})
})

describe('setQueryClientRef', () => {
	it('sets the QueryClient reference used by getCachedUser', async () => {
		const mockQueryClient = {
			getQueryData: vi.fn().mockReturnValue({
				id: 'cached-user',
				email: 'cached@example.com',
			}),
		} as unknown as QueryClient

		setQueryClientRef(mockQueryClient)

		const user = await getCachedUser()

		expect(user).toEqual({
			id: 'cached-user',
			email: 'cached@example.com',
		})
	})
})
