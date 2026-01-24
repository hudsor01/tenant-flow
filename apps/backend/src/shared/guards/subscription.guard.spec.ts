import { Test } from '@nestjs/testing'
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createMockUser } from '../../test-utils/mocks'
import type { AuthenticatedRequest } from '../types/express-request.types'
import {
	SubscriptionGuard,
	SKIP_SUBSCRIPTION_CHECK_KEY
} from './subscription.guard'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('SubscriptionGuard', () => {
	let guard: SubscriptionGuard
	let reflector: Reflector
	let supabaseService: jest.Mocked<SupabaseService>

	beforeEach(async () => {
		const mockReflector = {
			getAllAndOverride: jest.fn()
		}

		const mockSupabaseService = {
			rpc: jest.fn()
		}

		const module = await Test.createTestingModule({
			providers: [
				SubscriptionGuard,
				{ provide: Reflector, useValue: mockReflector },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		guard = module.get<SubscriptionGuard>(SubscriptionGuard)
		reflector = module.get<Reflector>(Reflector)
		supabaseService = module.get(
			SupabaseService
		) as jest.Mocked<SupabaseService>
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	const mockMetadata = (options?: { isPublic?: boolean; skip?: boolean }) => {
		;(reflector.getAllAndOverride as jest.Mock).mockImplementation(
			(key: string) => {
				if (key === 'isPublic') return options?.isPublic ?? false
				if (key === SKIP_SUBSCRIPTION_CHECK_KEY) return options?.skip ?? false
				return false
			}
		)
	}

	const createContext = (
		request: Partial<AuthenticatedRequest>
	): ExecutionContext => {
		return {
			switchToHttp: () => ({
				getRequest: () =>
					({
						user: request.user,
						url: request.url || '/api/v1/properties'
					}) as AuthenticatedRequest
			}),
			getHandler: () => ({}),
			getClass: () => ({})
		} as ExecutionContext
	}

	it('allows tenant user_type regardless of subscription state', async () => {
		mockMetadata()
		supabaseService.rpc.mockResolvedValue({
			data: false,
			error: null
		})

		const result = await guard.canActivate(
			createContext({
				user: createMockUser({
					id: 'tenant-1',
					email: 'tenant@example.com',
					app_metadata: { user_type: 'TENANT' }
				})
			})
		)

		expect(result).toBe(true)
		expect(supabaseService.rpc).not.toHaveBeenCalled()
	})

	it('allows owner access when feature access RPC returns true', async () => {
		mockMetadata()
		supabaseService.rpc.mockResolvedValue({
			data: true,
			error: null
		})

		const result = await guard.canActivate(
			createContext({
				user: createMockUser({
					id: 'owner-1',
					email: 'owner@example.com',
					app_metadata: { user_type: 'OWNER' }
				})
			})
		)

		expect(result).toBe(true)
		expect(supabaseService.rpc).toHaveBeenCalledWith(
			'check_user_feature_access',
			{ p_user_id: 'owner-1', p_feature: 'basic_properties' },
			{ maxAttempts: 2 }
		)
	})

	it('bypasses guard when SkipSubscriptionCheck metadata is present', async () => {
		mockMetadata({ skip: true })

		const result = await guard.canActivate(
			createContext({
				user: createMockUser({
					id: 'owner-2',
					email: 'owner@example.com',
					app_metadata: { user_type: 'OWNER' }
				})
			})
		)

		expect(result).toBe(true)
		expect(supabaseService.rpc).not.toHaveBeenCalled()
	})

	test.each([
		'/api/v1/properties',
		'/api/v1/tenants',
		'/api/v1/leases',
		'/api/v1/documents'
	])('blocks unpaid owners from %s', async path => {
		mockMetadata()
		supabaseService.rpc.mockResolvedValue({
			data: false,
			error: null
		})

		await expect(
			guard.canActivate(
				createContext({
					user: createMockUser({
						id: 'owner-3',
						email: 'owner@example.com',
						app_metadata: { user_type: 'OWNER' }
					}),
					url: path
				})
			)
		).rejects.toThrow(ForbiddenException)

		expect(supabaseService.rpc).toHaveBeenCalledWith(
			'check_user_feature_access',
			{ p_user_id: 'owner-3', p_feature: 'basic_properties' },
			{ maxAttempts: 2 }
		)
	})

	it('throws ServiceUnavailableException when RPC fails', async () => {
		mockMetadata()
		supabaseService.rpc.mockResolvedValue({
			data: null,
			error: { message: 'Database connection failed' }
		})

		await expect(
			guard.canActivate(
				createContext({
					user: createMockUser({
						id: 'owner-4',
						email: 'owner@example.com',
						app_metadata: { user_type: 'OWNER' }
					})
				})
			)
		).rejects.toThrow(ServiceUnavailableException)
	})

	it('allows access for public routes', async () => {
		mockMetadata({ isPublic: true })

		const result = await guard.canActivate(
			createContext({
				user: createMockUser({
					id: 'owner-5',
					email: 'owner@example.com',
					app_metadata: { user_type: 'OWNER' }
				})
			})
		)

		expect(result).toBe(true)
		expect(supabaseService.rpc).not.toHaveBeenCalled()
	})

	it('handles null/undefined RPC response gracefully', async () => {
		mockMetadata()
		supabaseService.rpc.mockResolvedValue({
			data: null,
			error: null
		})

		// When RPC returns null without error, should deny access (not crash)
		await expect(
			guard.canActivate(
				createContext({
					user: createMockUser({
						id: 'owner-6',
						email: 'owner@example.com',
						app_metadata: { user_type: 'OWNER' }
					})
				})
			)
		).rejects.toThrow(ForbiddenException)
	})

	it('handles undefined RPC data gracefully', async () => {
		mockMetadata()
		supabaseService.rpc.mockResolvedValue({
			data: undefined,
			error: null
		})

		// When RPC returns undefined, should deny access (not crash)
		await expect(
			guard.canActivate(
				createContext({
					user: createMockUser({
						id: 'owner-7',
						email: 'owner@example.com',
						app_metadata: { user_type: 'OWNER' }
					})
				})
			)
		).rejects.toThrow(ForbiddenException)
	})
})
