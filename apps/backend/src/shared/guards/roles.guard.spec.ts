import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { createMockUser } from '../../test-utils/mocks'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { RolesGuard } from './roles.guard'

describe('RolesGuard', () => {
	const createMockReflector = (requiredRoles?: string[]) => {
		return {
			getAllAndOverride: jest.fn().mockReturnValue(requiredRoles)
		} as unknown as Reflector
	}

	const createContext = (
		request: Partial<AuthenticatedRequest>
	): ExecutionContext => {
		return {
			switchToHttp: () => ({
				getRequest: () =>
					({
						user: request.user
					}) as AuthenticatedRequest
			}),
			getHandler: () => ({}),
			getClass: () => ({})
		} as ExecutionContext
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('when no roles are required', () => {
		it('allows access', () => {
			const reflector = createMockReflector(undefined)
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'user-1',
					email: 'user@example.com',
					app_metadata: { user_type: 'OWNER' }
				})
			})

			const result = guard.canActivate(context)

			expect(result).toBe(true)
		})
	})

	describe('when roles are required', () => {
		it('allows access when user has exact matching role (uppercase)', () => {
			const reflector = createMockReflector(['OWNER'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'owner-1',
					email: 'owner@example.com',
					app_metadata: { user_type: 'OWNER' }
				})
			})

			const result = guard.canActivate(context)

			expect(result).toBe(true)
		})

		it('allows access when user has exact matching role (lowercase)', () => {
			const reflector = createMockReflector(['OWNER'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'owner-1',
					email: 'owner@example.com',
					app_metadata: { user_type: 'owner' }
				})
			})

			const result = guard.canActivate(context)

			expect(result).toBe(true)
		})

		it('allows access when user has exact matching role (mixed case)', () => {
			const reflector = createMockReflector(['OWNER'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'owner-1',
					email: 'owner@example.com',
					app_metadata: { user_type: 'Owner' }
				})
			})

			const result = guard.canActivate(context)

			expect(result).toBe(true)
		})

		it('allows access when user role matches one of multiple required roles', () => {
			const reflector = createMockReflector(['OWNER', 'MANAGER', 'ADMIN'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'manager-1',
					email: 'manager@example.com',
					app_metadata: { user_type: 'MANAGER' }
				})
			})

			const result = guard.canActivate(context)

			expect(result).toBe(true)
		})

		it('throws ForbiddenException when user has no user_type', () => {
			const reflector = createMockReflector(['OWNER'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'user-1',
					email: 'user@example.com',
					app_metadata: {}
				})
			})

			expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
			expect(() => guard.canActivate(context)).toThrow('Insufficient permissions')
		})

		it('throws ForbiddenException when user role does not match required roles', () => {
			const reflector = createMockReflector(['OWNER'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'tenant-1',
					email: 'tenant@example.com',
					app_metadata: { user_type: 'TENANT' }
				})
			})

			expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
			expect(() => guard.canActivate(context)).toThrow('Insufficient permissions')
		})

		it('throws ForbiddenException when user role does not match any of multiple required roles', () => {
			const reflector = createMockReflector(['OWNER', 'MANAGER', 'ADMIN'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'tenant-1',
					email: 'tenant@example.com',
					app_metadata: { user_type: 'TENANT' }
				})
			})

			expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
			expect(() => guard.canActivate(context)).toThrow('Insufficient permissions')
		})
	})

	describe('case-insensitive role comparison', () => {
		it.each([
			['Owner', 'OWNER'],
			['owner', 'OWNER'],
			['OWNER', 'owner'],
			['tenant', 'TENANT'],
			['TENANT', 'tenant'],
			['Manager', 'MANAGER'],
			['manager', 'MANAGER'],
			['admin', 'ADMIN'],
			['ADMIN', 'admin']
		])(
			'allows access when user_type is "%s" and required role is "%s"',
			(userType, requiredRole) => {
				const reflector = createMockReflector([requiredRole])
				const guard = new RolesGuard(reflector)
				const context = createContext({
					user: createMockUser({
						id: 'user-1',
						email: 'user@example.com',
						app_metadata: { user_type: userType }
					})
				})

				const result = guard.canActivate(context)

				expect(result).toBe(true)
			}
		)
	})

	describe('legacy user_type mapping', () => {
		it('allows access when user_type is "property_owner" and required role is "OWNER"', () => {
			const reflector = createMockReflector(['OWNER'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'owner-1',
					email: 'owner@example.com',
					app_metadata: { user_type: 'property_owner' }
				})
			})

			const result = guard.canActivate(context)

			expect(result).toBe(true)
		})

		it('allows access when user_type is "PROPERTY_OWNER" and required role is "OWNER"', () => {
			const reflector = createMockReflector(['OWNER'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'owner-1',
					email: 'owner@example.com',
					app_metadata: { user_type: 'PROPERTY_OWNER' }
				})
			})

			const result = guard.canActivate(context)

			expect(result).toBe(true)
		})

		it('allows access when user_type is "Property_Owner" and required role is "OWNER"', () => {
			const reflector = createMockReflector(['OWNER'])
			const guard = new RolesGuard(reflector)
			const context = createContext({
				user: createMockUser({
					id: 'owner-1',
					email: 'owner@example.com',
					app_metadata: { user_type: 'Property_Owner' }
				})
			})

			const result = guard.canActivate(context)

			expect(result).toBe(true)
		})
	})
})
