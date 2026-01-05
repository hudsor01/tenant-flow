import { Test } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bullmq'
import type { RawBodyRequest } from '@nestjs/common'
import { BadRequestException } from '@nestjs/common'
import type { Request } from 'express'
import type Stripe from 'stripe'
import { StripeWebhookController } from './stripe-webhook.controller'
import { StripeConnectService } from './stripe-connect.service'
import { AppConfigService } from '../../config/app-config.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('StripeWebhookController', () => {
	let controller: StripeWebhookController
	let constructEvent: jest.Mock
	let webhookQueue: { add: jest.Mock }

	beforeEach(async () => {
		constructEvent = jest.fn()
		const stripeMock = {
			webhooks: { constructEvent }
		} as unknown as Stripe

		webhookQueue = {
			add: jest.fn().mockResolvedValue(undefined)
		}

		const moduleRef = await Test.createTestingModule({
			controllers: [StripeWebhookController],
			providers: [
				{
					provide: StripeConnectService,
					useValue: { getStripe: () => stripeMock }
				},
				{
					provide: AppConfigService,
					useValue: { getStripeWebhookSecret: () => 'whsec_test' }
				},
				{ provide: getQueueToken('stripe-webhooks'), useValue: webhookQueue },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		})
			.setLogger(new SilentLogger())
			.compile()
		controller = moduleRef.get(StripeWebhookController)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	const createRequest = (body: Buffer): RawBodyRequest<Request> =>
		({ rawBody: body }) as unknown as RawBodyRequest<Request>

	it('queues the webhook event and returns { received: true }', async () => {
		const event: Stripe.Event = {
			id: 'evt_replay_test',
			object: 'event',
			type: 'payment_intent.succeeded'
		} as Stripe.Event

		constructEvent.mockReturnValue(event)

		const response = await controller.handleWebhook(
			createRequest(Buffer.from('{}')),
			'sig_test'
		)

		expect(response).toEqual({ received: true })
		expect(webhookQueue.add).toHaveBeenCalledTimes(1)
		expect(webhookQueue.add).toHaveBeenCalledWith(
			event.type,
			{ eventId: event.id, eventType: event.type, stripeEvent: event },
			{ jobId: event.id }
		)
	})

	it('throws when stripe-signature header is missing', async () => {
		await expect(
			controller.handleWebhook(
				createRequest(Buffer.from('{}')),
				'' as unknown as string
			)
		).rejects.toBeInstanceOf(BadRequestException)
	})
})
