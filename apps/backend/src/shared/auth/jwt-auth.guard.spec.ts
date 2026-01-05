import { Test } from '@nestjs/testing'
import type { ExecutionContext } from '@nestjs/common'
import { UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtAuthGuard } from './jwt-auth.guard'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('JwtAuthGuard', () => {
	type SupabaseUser = Awaited<ReturnType<SupabaseService['getUser']>>

	let guard: JwtAuthGuard
	let reflector: Reflector
	let supabaseService: SupabaseService

	const mockUser: SupabaseUser = {
		id: 'user-123',
		email: 'test@example.com',
		app_metadata: { user_type: 'OWNER' }
	} as SupabaseUser

	const createMockContext = (hasAuthHeader = true): ExecutionContext => {
		const request = {
			headers: hasAuthHeader ? { authorization: 'Bearer mock-token' } : {},
			user: undefined
		}
		return {
			switchToHttp: () => ({
				getRequest: () => request
			}),
			getHandler: () => ({}),
			getClass: () => ({})
		} as unknown as ExecutionContext
	}

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			providers: [
				JwtAuthGuard,
				{
					provide: Reflector,
					useValue: {
						getAllAndOverride: jest.fn().mockReturnValue(false)
					}
				},
				{
					provide: SupabaseService,
					useValue: {
						getUser: jest.fn()
					}
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		guard = module.get<JwtAuthGuard>(JwtAuthGuard)
		reflector = module.get<Reflector>(Reflector)
		supabaseService = module.get<SupabaseService>(SupabaseService)
	})

	describe('canActivate', () => {
		it('should allow access for public routes', async () => {
			jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

			const result = await guard.canActivate(createMockContext())

			expect(result).toBe(true)
		})

		it('should allow access for authenticated users', async () => {
			jest.spyOn(supabaseService, 'getUser').mockResolvedValue(mockUser)

			const result = await guard.canActivate(createMockContext())

			expect(result).toBe(true)
		})

		it('should throw UnauthorizedException when user is not authenticated', async () => {
			jest.spyOn(supabaseService, 'getUser').mockResolvedValue(null)

			await expect(guard.canActivate(createMockContext())).rejects.toThrow(
				UnauthorizedException
			)
		})

		it('should attach user to request on successful auth', async () => {
			jest.spyOn(supabaseService, 'getUser').mockResolvedValue(mockUser)
			const context = createMockContext()

			await guard.canActivate(context)

			const request = context.switchToHttp().getRequest()
			expect(request.user).toEqual(mockUser)
		})
	})
})
