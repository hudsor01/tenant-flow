import { Test } from '@nestjs/testing'
import { JwtAuthGuard } from './jwt-auth.guard'
import { JwtVerificationService } from './jwt-verification.service'
import { AuthUserValidationService } from './supabase.strategy'
import { SupabaseService } from '../../database/supabase.service'
import { UtilityService } from '../services/utility.service'
import { AppConfigService } from '../../config/app-config.service'
import { Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'

// Mock jose module for testing
jest.mock('jose', () => ({
	jwtVerify: jest.fn(),
	createRemoteJWKSet: jest.fn()
}))

describe('JwtAuthGuard', () => {
	let guard: JwtAuthGuard

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			providers: [
				JwtAuthGuard,
				{
					provide: JwtVerificationService,
					useValue: { verify: jest.fn() }
				},
				{
					provide: AuthUserValidationService,
					useValue: { validateJwtPayload: jest.fn() }
				},
				{
					provide: SupabaseService,
					useValue: {}
				},
				{
					provide: UtilityService,
					useValue: {}
				},
				{
					provide: AppConfigService,
					useValue: {}
				},
				{
					provide: Reflector,
					useValue: { get: jest.fn(), getAllAndOverride: jest.fn() }
				},
				{
					provide: ConfigService,
					useValue: { get: jest.fn() }
				}
			]
		}).compile()

		guard = module.get<JwtAuthGuard>(JwtAuthGuard)
	})

	describe('isAuthenticationError', () => {
		it('treats config/asymmetric key errors as system errors (return 500)', () => {
			const error = new Error('secretOrPublicKey must be an asymmetric key when using ES256')
			const result = (guard as any).isAuthenticationError(error, null)
			expect(result).toBe(false)
		})

		it('treats invalid asymmetric key as system error', () => {
			const error = new Error('Invalid asymmetric key provided')
			const result = (guard as any).isAuthenticationError(error, null)
			expect(result).toBe(false)
		})

		it('should classify database errors as system errors', () => {
			const error = new Error('Database connection failed')
			const result = (guard as any).isAuthenticationError(error, null)
			expect(result).toBe(false)
		})

		it('should classify JWT expired as auth error', () => {
			const error = new Error('jwt expired')
			const result = (guard as any).isAuthenticationError(error, null)
			expect(result).toBe(true)
		})
	})
})
