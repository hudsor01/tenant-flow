import { Test } from '@nestjs/testing'
import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { StripeConnectController } from './stripe-connect.controller'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

// Note: validateLimit tests moved to shared/utils/pagination.utils.spec.ts

/** Mock Supabase single query result */
interface MockQueryResult {
	data: { stripe_account_id: string | null } | null
	error: { message: string; code: string } | null
}

/** Mock Supabase query builder chain */
interface MockSupabaseQueryChain {
	from: jest.Mock<{
		select: jest.Mock<{
			eq: jest.Mock<{
				single: jest.Mock<Promise<MockQueryResult>>
			}>
		}>
	}>
}

describe('StripeConnectController', () => {
	let controller: StripeConnectController
	let supabaseService: { getAdminClient: jest.Mock }

	const buildModule = async (mockData: {
		propertyOwner?: { stripe_account_id: string | null } | null
		error?: { message: string; code: string } | null
	}) => {
		const supabaseClient: MockSupabaseQueryChain = {
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
				{ provide: SupabaseService, useValue: supabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		moduleRef.useLogger(false)
		controller = moduleRef.get(StripeConnectController)
	}

	describe('getStripeAccountId', () => {
		it('returns stripe_account_id when found', async () => {
			await buildModule({ propertyOwner: { stripe_account_id: 'acct_123456' } })


			const result = await controller.getStripeAccountId('user_123')

			expect(result).toBe('acct_123456')
		})

		it('throws InternalServerErrorException on database error', async () => {
			await buildModule({
				propertyOwner: null,
				error: { message: 'Connection failed', code: 'PGRST301' }
			})


			await expect(controller.getStripeAccountId('user_123')).rejects.toThrow(
				InternalServerErrorException
			)


			await expect(controller.getStripeAccountId('user_123')).rejects.toThrow(
				'Failed to retrieve payment account'
			)
		})

		it('throws BadRequestException when no stripe_account_id', async () => {
			await buildModule({ propertyOwner: { stripe_account_id: null } })


			await expect(controller.getStripeAccountId('user_123')).rejects.toMatchObject({
				name: 'BadRequestException',
				message: 'No Stripe Connect account found. Please complete onboarding first.'
			})
		})

		it('throws BadRequestException when property owner not found', async () => {
			await buildModule({ propertyOwner: null })


			await expect(controller.getStripeAccountId('user_123')).rejects.toThrow(
				BadRequestException
			)
		})
	})
})
