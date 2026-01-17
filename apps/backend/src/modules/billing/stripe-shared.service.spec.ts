import { Test } from '@nestjs/testing'
import {
	BadRequestException,
	InternalServerErrorException,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeSharedService } from './stripe-shared.service'
import { AppConfigService } from '../../config/app-config.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('StripeSharedService', () => {
	let service: StripeSharedService
	let mockConfigService: jest.Mocked<AppConfigService>

	beforeEach(async () => {
		mockConfigService = {
			getIdempotencyKeySecret: jest.fn().mockReturnValue('test-secret-key-123')
		} as unknown as jest.Mocked<AppConfigService>

		const module = await Test.createTestingModule({
			providers: [
				StripeSharedService,
				{ provide: AppConfigService, useValue: mockConfigService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<StripeSharedService>(StripeSharedService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('generateIdempotencyKey', () => {
		it('returns deterministic key for same inputs', () => {
			const key1 = service.generateIdempotencyKey('pi', 'user-123', 'ctx-456')
			const key2 = service.generateIdempotencyKey('pi', 'user-123', 'ctx-456')

			expect(key1).toBe(key2)
		})

		it('produces different keys for different operations', () => {
			const key1 = service.generateIdempotencyKey('pi', 'user-123')
			const key2 = service.generateIdempotencyKey('sub', 'user-123')

			expect(key1).not.toBe(key2)
		})

		it('produces different keys for different user IDs', () => {
			const key1 = service.generateIdempotencyKey('pi', 'user-123')
			const key2 = service.generateIdempotencyKey('pi', 'user-456')

			expect(key1).not.toBe(key2)
		})

		it('produces different keys for different additional context', () => {
			const key1 = service.generateIdempotencyKey('pi', 'user-123', 'ctx-1')
			const key2 = service.generateIdempotencyKey('pi', 'user-123', 'ctx-2')

			expect(key1).not.toBe(key2)
		})

		it('handles operation without additional context', () => {
			const key = service.generateIdempotencyKey('cus', 'user-789')

			expect(key).toBeDefined()
			expect(key).toMatch(/^cus_[a-f0-9]{32}$/)
		})

		it('handles operation with additional context', () => {
			const key = service.generateIdempotencyKey(
				'pi_connected',
				'user-123',
				'acct_456_1000'
			)

			expect(key).toBeDefined()
			expect(key).toMatch(/^pi_connected_[a-f0-9]{32}$/)
		})

		it('key format is valid alphanumeric with underscore prefix', () => {
			const key = service.generateIdempotencyKey('test_op', 'user-id', 'context')

			// Format: operation_hash (alphanumeric hash)
			expect(key).toMatch(/^[a-z_]+_[a-f0-9]+$/)
			// Should not exceed Stripe's 255 char limit
			expect(key.length).toBeLessThanOrEqual(255)
		})

		it('throws error when idempotency secret is missing', () => {
			mockConfigService.getIdempotencyKeySecret.mockReturnValue('')

			expect(() =>
				service.generateIdempotencyKey('pi', 'user-123')
			).toThrow(/Missing IDEMPOTENCY_KEY_SECRET/)
		})

		it('throws error when idempotency secret is undefined', () => {
			mockConfigService.getIdempotencyKeySecret.mockReturnValue(
				undefined as unknown as string
			)

			expect(() =>
				service.generateIdempotencyKey('pi', 'user-123')
			).toThrow(/Missing IDEMPOTENCY_KEY_SECRET/)
		})
	})

	describe('handleStripeError', () => {
		const createStripeError = (type: string, message?: string) =>
			({
				type,
				message: message || `Test ${type} error`
			}) as Stripe.errors.StripeError

		it('maps StripeCardError to BadRequestException', () => {
			const error = createStripeError('StripeCardError', 'Card declined')

			expect(() => service.handleStripeError(error)).toThrow(BadRequestException)
			expect(() => service.handleStripeError(error)).toThrow('Card declined')
		})

		it('maps StripeInvalidRequestError to BadRequestException', () => {
			const error = createStripeError(
				'StripeInvalidRequestError',
				'Invalid parameter'
			)

			expect(() => service.handleStripeError(error)).toThrow(BadRequestException)
			expect(() => service.handleStripeError(error)).toThrow('Invalid parameter')
		})

		it('maps StripeAPIError to InternalServerErrorException', () => {
			const error = createStripeError('StripeAPIError')

			expect(() => service.handleStripeError(error)).toThrow(
				InternalServerErrorException
			)
			expect(() => service.handleStripeError(error)).toThrow(
				'Stripe API error. Please try again later.'
			)
		})

		it('maps StripeAuthenticationError to InternalServerErrorException', () => {
			const error = createStripeError('StripeAuthenticationError')

			expect(() => service.handleStripeError(error)).toThrow(
				InternalServerErrorException
			)
			expect(() => service.handleStripeError(error)).toThrow(
				'Stripe authentication failed'
			)
		})

		it('maps StripeRateLimitError to HttpException with 429', () => {
			const error = createStripeError('StripeRateLimitError')

			try {
				service.handleStripeError(error)
				fail('Expected error to be thrown')
			} catch (err) {
				expect(err).toBeInstanceOf(HttpException)
				expect((err as HttpException).getStatus()).toBe(
					HttpStatus.TOO_MANY_REQUESTS
				)
				expect((err as HttpException).message).toContain(
					'Too many requests'
				)
			}
		})

		it('maps StripeConnectionError to InternalServerErrorException', () => {
			const error = createStripeError('StripeConnectionError')

			expect(() => service.handleStripeError(error)).toThrow(
				InternalServerErrorException
			)
			expect(() => service.handleStripeError(error)).toThrow(
				'Connection error. Please check your internet connection and try again.'
			)
		})

		it('maps StripePermissionError to InternalServerErrorException', () => {
			const error = createStripeError('StripePermissionError')

			expect(() => service.handleStripeError(error)).toThrow(
				InternalServerErrorException
			)
			expect(() => service.handleStripeError(error)).toThrow(
				'Insufficient permissions for this operation'
			)
		})

		it('maps StripeIdempotencyError to BadRequestException', () => {
			const error = createStripeError('StripeIdempotencyError')

			expect(() => service.handleStripeError(error)).toThrow(BadRequestException)
			expect(() => service.handleStripeError(error)).toThrow(
				'Request with the same idempotency key already processed'
			)
		})

		it('maps unknown error type to InternalServerErrorException with original message', () => {
			const error = createStripeError(
				'StripeUnknownFutureError' as string,
				'Unknown error message'
			)

			expect(() => service.handleStripeError(error)).toThrow(
				InternalServerErrorException
			)
			expect(() => service.handleStripeError(error)).toThrow(
				'Unknown error message'
			)
		})

		it('uses fallback message when error message is empty', () => {
			const error = { type: 'StripeCardError', message: '' } as Stripe.errors.StripeError

			expect(() => service.handleStripeError(error)).toThrow(BadRequestException)
			expect(() => service.handleStripeError(error)).toThrow('Card error')
		})

		it('uses fallback message for unknown error without message', () => {
			const error = { type: 'Unknown', message: '' } as Stripe.errors.StripeError

			expect(() => service.handleStripeError(error)).toThrow(
				InternalServerErrorException
			)
			expect(() => service.handleStripeError(error)).toThrow(
				'An error occurred processing your payment'
			)
		})
	})
})
