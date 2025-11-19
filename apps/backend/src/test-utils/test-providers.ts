import { UnauthorizedException } from '@nestjs/common'
import type { SupabaseService } from '../database/supabase.service'
import { CurrentUserProvider } from '../shared/providers/current-user.provider'

/**
 * Create a provider object that can be used in Test.createTestingModule
 * to satisfy controllers depending on CurrentUserProvider.
 * It delegates to the provided supabaseMock.getUser() so tests can control
 * authentication by stubbing that method.
 */
export function createMockCurrentUserProvider(
	supabaseMock: Partial<SupabaseService>
) {
	const provider = {
		provide: CurrentUserProvider,
		useValue: {
			getUser: jest.fn(async () => {
				if (typeof supabaseMock.getUser === 'function') {
					return await (supabaseMock.getUser as jest.Mock)()
				}
				return null
			}),
			getuser_id: jest.fn(async () => {
				if (typeof supabaseMock.getUser === 'function') {
					const user = await (supabaseMock.getUser as jest.Mock)()
					if (!user) throw new UnauthorizedException()
					return user.id
				}
				throw new UnauthorizedException()
			}),
			getUserEmail: jest.fn(async () => {
				if (typeof supabaseMock.getUser === 'function') {
					const user = await (supabaseMock.getUser as jest.Mock)()
					return user?.email
				}
				return undefined
			}),
			isAuthenticated: jest.fn(async () => {
				if (typeof supabaseMock.getUser === 'function') {
					return !!(await (supabaseMock.getUser as jest.Mock)())
				}
				return false
			}),
			getUserOrNull: jest.fn(async () => {
				if (typeof supabaseMock.getUser === 'function') {
					return await (supabaseMock.getUser as jest.Mock)()
				}
				return null
			})
		} as Partial<CurrentUserProvider>
	}

	return provider
}
