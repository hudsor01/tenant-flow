import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────

const { mockCreateServerClient } = vi.hoisted(() => ({
	mockCreateServerClient: vi.fn(() => ({
		auth: { getUser: vi.fn() },
		from: vi.fn(),
	})),
}))

const { mockCookieStore } = vi.hoisted(() => ({
	mockCookieStore: {
		getAll: vi.fn(() => [
			{ name: 'sb-token', value: 'test-cookie-value' },
		]),
		set: vi.fn(),
	},
}))

// ── Module mocks ───────────────────────────────────────────

vi.mock('@supabase/ssr', () => ({
	createServerClient: mockCreateServerClient,
}))

vi.mock('next/headers', () => ({
	cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

vi.mock('#env', () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'mock-anon-key',
	},
}))

import { createClient } from '../server'

// ── Type-safe mock call extraction ─────────────────────────

type MockCallArgs = [string, string, { cookies: Record<string, unknown> }]

function getCallArgs(): MockCallArgs {
	const call = mockCreateServerClient.mock.calls[0]
	if (!call || call.length < 3) throw new Error('Expected 3 arguments in mock call')
	return call as unknown as MockCallArgs
}

function getCallOptions(): { cookies: Record<string, unknown> } {
	return getCallArgs()[2]
}

// ── Tests ──────────────────────────────────────────────────

describe('createClient (server)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('creates a Supabase client with correct URL and key', async () => {
		await createClient()

		expect(mockCreateServerClient).toHaveBeenCalledOnce()
		const [url, key] = getCallArgs()
		expect(url).toBe('http://localhost:54321')
		expect(key).toBe('mock-anon-key')
	})

	it('returns a Supabase client object', async () => {
		const client = await createClient()

		expect(client).toBeDefined()
		expect(client.auth).toBeDefined()
	})

	it('provides cookie adapter with getAll method', async () => {
		await createClient()

		const options = getCallOptions()
		expect(options.cookies.getAll).toBeTypeOf('function')
	})

	it('provides cookie adapter with setAll method', async () => {
		await createClient()

		const options = getCallOptions()
		expect(options.cookies.setAll).toBeTypeOf('function')
	})

	it('does NOT provide get/set/remove cookie methods (CLAUDE.md: getAll/setAll only)', async () => {
		await createClient()

		const options = getCallOptions()
		// Per CLAUDE.md: "Use getAll/setAll cookie methods only. Never get/set/remove."
		expect(options.cookies['get']).toBeUndefined()
		expect(options.cookies['set']).toBeUndefined()
		expect(options.cookies['remove']).toBeUndefined()
	})

	it('getAll returns cookies from next/headers cookie store', async () => {
		await createClient()

		const options = getCallOptions()
		const getAllFn = options.cookies.getAll as () => Array<{ name: string; value: string }>
		const cookies = getAllFn()

		expect(cookies).toEqual([
			{ name: 'sb-token', value: 'test-cookie-value' },
		])
		expect(mockCookieStore.getAll).toHaveBeenCalled()
	})

	it('setAll writes cookies to the cookie store without throwing', async () => {
		await createClient()

		const options = getCallOptions()
		const setAllFn = options.cookies.setAll as (
			cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>
		) => void

		// setAll should not throw even in Server Component context
		expect(() =>
			setAllFn([
				{ name: 'sb-token', value: 'new-value', options: { path: '/' } },
			])
		).not.toThrow()

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			'sb-token',
			'new-value',
			{ path: '/' }
		)
	})

	it('setAll silently catches errors from Server Component context', async () => {
		// Simulate Server Component context where cookies.set throws
		mockCookieStore.set.mockImplementation(() => {
			throw new Error('Cookies can only be modified in a Server Action or Route Handler')
		})

		await createClient()

		const options = getCallOptions()
		const setAllFn = options.cookies.setAll as (
			cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>
		) => void

		// Should NOT throw -- the implementation catches this error
		expect(() =>
			setAllFn([
				{ name: 'sb-token', value: 'new-value', options: { path: '/' } },
			])
		).not.toThrow()
	})
})
