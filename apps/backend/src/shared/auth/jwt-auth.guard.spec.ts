import { Test } from '@nestjs/testing'
import { JwtAuthGuard } from './jwt-auth.guard'

// Import the function directly for testing
import './supabase.strategy'

describe('JwtAuthGuard', () => {
	let guard: JwtAuthGuard

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			providers: [JwtAuthGuard]
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
