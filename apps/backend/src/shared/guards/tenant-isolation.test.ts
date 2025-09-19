import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
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
			(
				guard as unknown as {
					validateTenantIsolation: typeof guard.validateTenantIsolation
				}
			).validateTenantIsolation.bind(guard)
		const _getExtractOrganizationId = () =>
			(
				guard as unknown as {
					extractOrganizationId: typeof guard.extractOrganizationId
				}
			).extractOrganizationId.bind(guard)

		it('should allow users to access their own organization resources', () => {
			const user = { id: 'user-123', organizationId: 'user-123', role: 'OWNER' }
			const request = { params: { userId: 'user-123' }, headers: {} }

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).not.toThrow()
		})

		it('should block cross-tenant access attempts', () => {
			const user = { id: 'user-123', organizationId: 'user-123', role: 'OWNER' }
			const request = { params: { userId: 'user-456' }, headers: {} }

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).toThrow(ForbiddenException)
		})

		it('should allow admin access to any tenant', () => {
			const admin = {
				id: 'admin-789',
				organizationId: 'admin-789',
				role: 'ADMIN'
			}
			const request = { params: { userId: 'user-123' }, headers: {} }

			expect(() => {
				getValidateTenantIsolation()(request, admin)
			}).not.toThrow()
		})

		it('should fix the original vulnerability (null organizationId)', () => {
			const vulnerableUser = {
				id: 'user-999',
				organizationId: null,
				role: 'OWNER'
			}
			const request = { params: { userId: 'user-123' }, headers: {} }

			expect(() => {
				getValidateTenantIsolation()(request, vulnerableUser)
			}).toThrow(ForbiddenException)
		})

		it('should allow requests with no organization context', () => {
			const user = { id: 'user-123', organizationId: 'user-123', role: 'OWNER' }
			const request = { params: {}, query: {}, body: {}, headers: {} }

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).not.toThrow()
		})

		it('should block access via query parameters', () => {
			const user = { id: 'user-123', organizationId: 'user-123', role: 'OWNER' }
			const request = { query: { organizationId: 'user-456' }, headers: {} }

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).toThrow(ForbiddenException)
		})

		it('should block access via request body', () => {
			const user = { id: 'user-123', organizationId: 'user-123', role: 'OWNER' }
			const request = { body: { userId: 'user-789' }, headers: {} }

			expect(() => {
				getValidateTenantIsolation()(request, user)
			}).toThrow(ForbiddenException)
		})
	})

	describe('extractOrganizationId', () => {
		const getExtractOrganizationId = () =>
			(
				guard as unknown as {
					extractOrganizationId: typeof guard.extractOrganizationId
				}
			).extractOrganizationId.bind(guard)

		it('should extract organizationId from params', () => {
			const request = { params: { organizationId: 'org-123' }, headers: {} }
			expect(getExtractOrganizationId()(request)).toBe('org-123')
		})

		it('should extract userId from params as organization context', () => {
			const request = { params: { userId: 'user-456' }, headers: {} }
			expect(getExtractOrganizationId()(request)).toBe('user-456')
		})

		it('should extract organizationId from query', () => {
			const request = { query: { organizationId: 'org-789' }, headers: {} }
			expect(getExtractOrganizationId()(request)).toBe('org-789')
		})

		it('should extract userId from query', () => {
			const request = { query: { userId: 'user-999' }, headers: {} }
			expect(getExtractOrganizationId()(request)).toBe('user-999')
		})

		it('should extract organizationId from body', () => {
			const request = { body: { organizationId: 'org-888' }, headers: {} }
			expect(getExtractOrganizationId()(request)).toBe('org-888')
		})

		it('should extract userId from body', () => {
			const request = { body: { userId: 'user-777' }, headers: {} }
			expect(getExtractOrganizationId()(request)).toBe('user-777')
		})

		it('should return null when no organization context found', () => {
			const request = { params: {}, query: {}, body: {}, headers: {} }
			expect(getExtractOrganizationId()(request)).toBeNull()
		})

		it('should prioritize params over query over body', () => {
			const request = {
				params: { organizationId: 'params-org' },
				query: { organizationId: 'query-org' },
				body: { organizationId: 'body-org' },
				headers: {}
			}
			expect(getExtractOrganizationId()(request)).toBe('params-org')
		})
	})
})
