import { Test } from '@nestjs/testing'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import type Stripe from 'stripe'
import { StripeWebhookController } from './stripe-webhook.controller'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppConfigService } from '../../config/app-config.service'
import { WebhookProcessor } from './webhook-processor.service'
import { PrometheusService } from '../observability/prometheus.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'


describe('StripeWebhookController (replay protection)', () => {
  let controller: StripeWebhookController
  let supabaseClient: {
    rpc: jest.Mock
    from: jest.Mock
    update: jest.Mock
    eq: jest.Mock
    upsert: jest.Mock
    insert: jest.Mock
  }
  let supabaseService: { getAdminClient: jest.Mock }
  let processor: { processEvent: jest.Mock }
  let prometheus: {
    recordWebhookProcessing: jest.Mock
    recordWebhookFailure: jest.Mock
    recordIdempotencyHit: jest.Mock
  }
  let constructEvent: jest.Mock

  beforeEach(async () => {
    supabaseClient = {
      rpc: jest.fn(),
      from: jest.fn(),
      update: jest.fn(),
      eq: jest.fn(),
      upsert: jest.fn(),
      insert: jest.fn()
    }

    // Chainable Supabase client mocks
    supabaseClient.from.mockReturnValue(supabaseClient)
    supabaseClient.update.mockReturnValue(supabaseClient)
    supabaseClient.eq.mockResolvedValue({ error: null })
    supabaseClient.upsert.mockResolvedValue({ error: null })
    supabaseClient.insert.mockResolvedValue({ error: null })

    supabaseService = {
      getAdminClient: jest.fn().mockReturnValue(supabaseClient)
    }

    constructEvent = jest.fn()
    const stripeMock = {
      webhooks: { constructEvent }
    } as unknown as Stripe

    processor = {
      processEvent: jest.fn().mockResolvedValue(undefined)
    }

    prometheus = {
      recordWebhookProcessing: jest.fn(),
      recordWebhookFailure: jest.fn(),
      recordIdempotencyHit: jest.fn()
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        { provide: StripeConnectService, useValue: { getStripe: () => stripeMock } },
        { provide: SupabaseService, useValue: supabaseService },
        { provide: AppConfigService, useValue: { getStripeWebhookSecret: () => 'whsec_test' } },
        { provide: WebhookProcessor, useValue: processor },
        { provide: PrometheusService, useValue: prometheus },
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

  it('short-circuits replayed webhook events so the payload is processed only once', async () => {
    const event: Stripe.Event = {
      id: 'evt_replay_test',
      object: 'event',
      type: 'payment_intent.succeeded'
    } as Stripe.Event

    constructEvent.mockReturnValue(event)

    // First call acquires lock, second call sees duplicate
    supabaseClient.rpc
      .mockResolvedValueOnce({ data: [{ lock_acquired: true, webhook_event_id: 'evt-uuid-123' }], error: null })
      .mockResolvedValueOnce({ data: [{ lock_acquired: false, webhook_event_id: 'evt-uuid-123' }], error: null })

    const req1 = createRequest(Buffer.from('{}'))
    const req2 = createRequest(Buffer.from('{}'))

    const firstResponse = await controller.handleWebhook(req1, 'sig_test')
    const secondResponse = await controller.handleWebhook(req2, 'sig_test')

    expect(firstResponse).toEqual({ received: true })
    expect(secondResponse).toEqual({ received: true, duplicate: true })

    expect(processor.processEvent).toHaveBeenCalledTimes(1)
    expect(processor.processEvent).toHaveBeenCalledWith(event)
    // Only the first invocation should attempt to mark the event processed
    expect(supabaseClient.eq).toHaveBeenCalledTimes(1)
    expect(supabaseClient.rpc).toHaveBeenCalledTimes(2)
  })

  it('returns duplicate response and skips processing when lock is not acquired', async () => {
    const event: Stripe.Event = {
      id: 'evt_duplicate_short_circuit',
      object: 'event',
      type: 'customer.updated'
    } as Stripe.Event

    constructEvent.mockReturnValue(event)
    supabaseClient.rpc.mockResolvedValue({ data: [{ lock_acquired: false, webhook_event_id: 'evt-uuid-456' }], error: null })

    const response = await controller.handleWebhook(createRequest(Buffer.from('{}')), 'sig_test')

    expect(response).toEqual({ received: true, duplicate: true })
    expect(processor.processEvent).not.toHaveBeenCalled()
    expect(supabaseClient.from).not.toHaveBeenCalled()
  })
})
