import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { ValidatedUser } from '@repo/shared'
import { SilentLogger } from '../../__test__/silent-logger'
import { AuthGuard } from './auth.guard'

// Mock Supabase
const mockSupabaseClient = {
	auth: { getUser: jest.fn() },
	from: jest.fn().mockReturnValue({
		select: jest.fn().mockReturnValue({
			eq: jest.fn().mockReturnValue({
				single: jest.fn()
			})
		})
	})
}

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => mockSupabaseClient)
}))

describe('AuthGuard - Tenant Isolation Security Tests', () => {
	let guard: AuthGuard
	let logger: SilentLogger

	beforeEach(async () => {
		logger = new SilentLogger()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthGuard,
				{ provide: 'Logger', useValue: logger },
				{ provide: Reflector, useValue: { getAllAndOverride: jest.fn() } }
			]
		}).compile()

		guard = module.get<AuthGuard>(AuthGuard)
	})

	describe('validateTenantIsolation', () => {
		// Access private methods for testing
	const getValidateTenantIsolation = () =>
			guard['validateTenantIsolation'].bind(guard)

		it('should allow users to access their own organization resources', () => {
			const user: ValidatedUser = {
				id: 'user-123',
				organizationId: 'user-123',
				role: 'OWNER',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'sub-123',
				stripeCustomerId: null
			}
			const request = {
				params: { userId: 'user-123' },
				headers: {},
				user
			} as any

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).not.toThrow()
		})

		it('should block cross-tenant access attempts', () => {
			const user: ValidatedUser = {
				id: 'user-123',
				organizationId: 'user-123',
				role: 'OWNER',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'sub-123',
				stripeCustomerId: null
			}
			const request = {
				params: { userId: 'user-456' },
				headers: {},
				user
			} as any

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).toThrow(ForbiddenException)
		})

			it('should allow admin access to any tenant', () => {
			const admin: ValidatedUser = {
				id: 'admin-789',
				organizationId: 'admin-789',
				role: 'ADMIN',
				email: 'admin@example.com',
				name: 'Admin User',
				phone: null,
				bio: null,
				avatarUrl: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'sub-admin',
				stripeCustomerId: null
			}
			const request = {
				params: { userId: 'user-123' },
				headers: {},
				user: admin
			} as any

			expect(() => {
				getValidateTenantIsolation()(request, admin)
			}).not.toThrow()
		})

		it('should fix the original vulnerability (null organizationId)', () => {
			const vulnerableUser: ValidatedUser = {
				id: 'user-999',
				organizationId: null,
				role: 'OWNER',
				email: 'vulnerable@example.com',
				name: 'Vulnerable User',
				phone: null,
				bio: null,
				avatarUrl: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'sub-vulnerable',
				stripeCustomerId: null
			}
			const request = {
				params: { userId: 'user-123' },
				headers: {},
				user: vulnerableUser
			} as any

			expect(() => {
				getValidateTenantIsolation()(request, vulnerableUser)
			}).toThrow(ForbiddenException)
		})

		it('should allow requests with no organization context', () => {
			const user: ValidatedUser = {
				id: 'user-123',
				organizationId: 'user-123',
				role: 'OWNER',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'sub-123',
				stripeCustomerId: null
			}
			const request = {
				params: {},
				query: {},
				body: {},
				headers: {},
				user
			} as any

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).not.toThrow()
		})

		it('should block access via query parameters', () => {
			const user: ValidatedUser = {
				id: 'user-123',
				organizationId: 'user-123',
				role: 'OWNER',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'sub-123',
				stripeCustomerId: null
			}
			const request = {
				query: { organizationId: 'user-456' },
				headers: {},
				user
			} as any

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).toThrow(ForbiddenException)
		})

		it('should block access via request body', () => {
			const user: ValidatedUser = {
				id: 'user-123',
				organizationId: 'user-123',
				role: 'OWNER',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'sub-123',
				stripeCustomerId: null
			}
			const request = {
				body: { userId: 'user-789' },
				headers: {},
				user
			} as any

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).toThrow(ForbiddenException)
		})
	})

	describe('extractOrganizationId', () => {
		const getExtractOrganizationId = () =>
			guard['extractOrganizationId'].bind(guard)

		it('should extract organizationId from params', () => {
			const user = {
				id: 'test-user',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'OWNER',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'test-supabase-id',
				stripeCustomerId: null,
				organizationId: 'test-org'
			}
			const request = {
				params: { organizationId: 'org-123' },
				headers: {},
				user
			} as any
			expect(getExtractOrganizationId()(request)).toBe('org-123')
		})

		it('should extract userId from params as organization context', () => {
			const user = {
				id: 'test-user',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'OWNER',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'test-supabase-id',
				stripeCustomerId: null,
				organizationId: 'test-org'
			}
			const request = {
				params: { userId: 'user-456' },
				headers: {},
				user
			} as any
			expect(getExtractOrganizationId()(request)).toBe('user-456')
		})

		it('should extract organizationId from query', () => {
			const user = {
				id: 'test-user',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'OWNER',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'test-supabase-id',
				stripeCustomerId: null,
				organizationId: 'test-org'
			}
			const request = {
				query: { organizationId: 'org-789' },
				headers: {},
				user
			} as any
			expect(getExtractOrganizationId()(request)).toBe('org-789')
		})

		it('should extract userId from query', () => {
			const user = {
				id: 'test-user',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'OWNER',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'test-supabase-id',
				stripeCustomerId: null,
				organizationId: 'test-org'
			}
			const request = {
				query: { userId: 'user-999' },
				headers: {},
				user
			} as any
			expect(getExtractOrganizationId()(request)).toBe('user-999')
		})

		it('should extract organizationId from body', () => {
			const user = {
				id: 'test-user',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'OWNER',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'test-supabase-id',
				stripeCustomerId: null,
				organizationId: 'test-org'
			}
			const request = {
				body: { organizationId: 'org-888' },
				headers: {},
				user
			} as any
			expect(getExtractOrganizationId()(request)).toBe('org-888')
		})

		it('should extract userId from body', () => {
			const user = {
				id: 'test-user',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'OWNER',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'test-supabase-id',
				stripeCustomerId: null,
				organizationId: 'test-org'
			}
			const request = {
				body: { userId: 'user-777' },
				headers: {},
				user
			} as any
			expect(getExtractOrganizationId()(request)).toBe('user-777')
		})

		it('should return null when no organization context found', () => {
			const user = {
				id: 'test-user',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'OWNER',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'test-supabase-id',
				stripeCustomerId: null,
				organizationId: 'test-org'
			}
			const request = {
				params: {},
				query: {},
				body: {},
				headers: {},
				user
			} as any
			expect(getExtractOrganizationId()(request)).toBeNull()
		})

		it('should prioritize params over query over body', () => {
			const user = {
				id: 'test-user',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'OWNER',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'test-supabase-id',
				stripeCustomerId: null,
				organizationId: 'test-org'
			}
			const request = {
				params: { organizationId: 'params-org' },
				query: { organizationId: 'query-org' },
				body: { organizationId: 'body-org' },
				headers: {},
				user
			} as any
			expect(getExtractOrganizationId()(request)).toBe('params-org')
		})
	})
})
