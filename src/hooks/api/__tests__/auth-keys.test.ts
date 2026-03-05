import { describe, expect, it } from 'vitest'
import { authKeys } from '../use-auth'

describe('authKeys structure', () => {
	it('authKeys.all equals ["auth"]', () => {
		expect(authKeys.all).toEqual(['auth'])
	})

	it('authKeys.session() returns ["auth", "session"]', () => {
		expect(authKeys.session()).toEqual(['auth', 'session'])
	})

	it('authKeys.user() returns ["auth", "user"]', () => {
		expect(authKeys.user()).toEqual(['auth', 'user'])
	})

	it('authKeys.me is a function returning an array', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const me = authKeys.me as any as () => readonly string[]
		expect(typeof me).toBe('function')
		expect(me()).toEqual(['user', 'me'])
	})

	it('authKeys.supabase.all equals ["supabase-auth"]', () => {
		expect(authKeys.supabase.all).toEqual(['supabase-auth'])
	})

	it('authKeys.supabase.user() returns ["supabase-auth", "user"]', () => {
		expect(authKeys.supabase.user()).toEqual(['supabase-auth', 'user'])
	})

	it('authKeys.supabase.session() returns ["supabase-auth", "session"]', () => {
		expect(authKeys.supabase.session()).toEqual(['supabase-auth', 'session'])
	})
})
