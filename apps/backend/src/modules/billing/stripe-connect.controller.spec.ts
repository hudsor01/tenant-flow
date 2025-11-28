import { Test } from '@nestjs/testing'
import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { StripeConnectController } from './stripe-connect.controller'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'

describe('StripeConnectController', () => {
	let controller: StripeConnectController
	let supabaseService: { getAdminClient: jest.Mock }

	const buildModule = async (mockData: {
		propertyOwner?: { stripe_account_id: string | null } | null
		error?: { message: string; code: string } | null
	}) => {
		const supabaseClient: any = {
			from: jest.fn(() => ({
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						single: jest.fn(async () => ({
							data: mockData.propertyOwner ?? null,
							error: mockData.error ?? null
						}))
					}))
				}))
			}))
		}

		supabaseService = {
			getAdminClient: jest.fn(() => supabaseClient)
		}

		const moduleRef = await Test.createTestingModule({
			controllers: [StripeConnectController],
			providers: [
				{ provide: StripeConnectService, useValue: {} },
				{ provide: SupabaseService, useValue: supabaseService }
			]
		}).compile()

		moduleRef.useLogger(false)
		controller = moduleRef.get(StripeConnectController)
	}

	describe('validateLimit', () => {
		beforeEach(async () => {
			await buildModule({ propertyOwner: { stripe_account_id: 'acct_test' } })
		})

		it('returns default when limit is undefined', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit(undefined)).toBe(10)
		})

		it('returns default when limit is empty string', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('')).toBe(10)
		})

		it('parses valid numeric string', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('50')).toBe(50)
		})

		it('clamps limit to MAX_PAGINATION_LIMIT (100)', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('500')).toBe(100)
		})

		it('returns default for non-numeric string', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('abc')).toBe(10)
		})

		it('returns default for negative number string', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('-5')).toBe(10)
		})

		it('returns default for decimal string', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('10.5')).toBe(10)
		})

		it('returns default for string with spaces', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit(' 50 ')).toBe(10)
		})

		it('returns 1 for zero', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('0')).toBe(1)
		})

		it('handles boundary value of 1', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('1')).toBe(1)
		})

		it('handles boundary value of 100', () => {
			// @ts-expect-error accessing private for targeted test
			expect(controller.validateLimit('100')).toBe(100)
		})
	})

	describe('getStripeAccountId', () => {
		it('returns stripe_account_id when found', async () => {
			await buildModule({ propertyOwner: { stripe_account_id: 'acct_123456' } })

			// @ts-expect-error accessing private for targeted test
			const result = await controller.getStripeAccountId('user_123')

			expect(result).toBe('acct_123456')
		})

		it('throws InternalServerErrorException on database error', async () => {
			await buildModule({
				propertyOwner: null,
				error: { message: 'Connection failed', code: 'PGRST301' }
			})

			// @ts-expect-error accessing private for targeted test
			await expect(controller.getStripeAccountId('user_123')).rejects.toThrow(
				InternalServerErrorException
			)

			// @ts-expect-error accessing private for targeted test
			await expect(controller.getStripeAccountId('user_123')).rejects.toThrow(
				'Failed to retrieve payment account'
			)
		})

		it('throws BadRequestException when no stripe_account_id', async () => {
			await buildModule({ propertyOwner: { stripe_account_id: null } })

			// @ts-expect-error accessing private for targeted test
			await expect(controller.getStripeAccountId('user_123')).rejects.toThrow(
				BadRequestException
			)

			// @ts-expect-error accessing private for targeted test
			await expect(controller.getStripeAccountId('user_123')).rejects.toThrow(
				'No Stripe Connect account found'
			)
		})

		it('throws BadRequestException when property owner not found', async () => {
			await buildModule({ propertyOwner: null })

			// @ts-expect-error accessing private for targeted test
			await expect(controller.getStripeAccountId('user_123')).rejects.toThrow(
				BadRequestException
			)
		})
	})
})
