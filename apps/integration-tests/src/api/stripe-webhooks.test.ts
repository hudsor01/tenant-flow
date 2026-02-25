import Stripe from 'stripe'
import { createServiceClient, isFunctionDeployed } from '../setup/edge-function-client'
import { checkEnv } from '../setup/env-check'
import type { SupabaseClient } from '@supabase/supabase-js'

const env = checkEnv()
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const SUPABASE_KEY = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ?? ''
const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'] ?? ''
const WEBHOOK_SECRET = process.env['STRIPE_WEBHOOK_SECRET'] ?? ''

let stripe: Stripe
let serviceClient: SupabaseClient | null = null

function buildWebhookPayload(eventType: string, dataObject: Record<string, unknown> = {}) {
	const eventId = `evt_test_${crypto.randomUUID().replace(/-/g, '')}`
	const payload = JSON.stringify({
		id: eventId,
		type: eventType,
		livemode: false,
		data: { object: dataObject },
		created: Math.floor(Date.now() / 1000),
		api_version: '2024-06-20',
		object: 'event',
		pending_webhooks: 0,
		request: { id: null, idempotency_key: null },
	})
	return { eventId, payload }
}

function signPayload(payload: string) {
	const timestamp = Math.floor(Date.now() / 1000)
	return stripe.webhooks.generateTestHeaderString({
		payload,
		secret: WEBHOOK_SECRET,
		timestamp,
	})
}

async function callWebhook(payload: string, headers: Record<string, string> = {}) {
	return fetch(`${SUPABASE_URL}/functions/v1/stripe-webhooks`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			apikey: SUPABASE_KEY,
			...headers,
		},
		body: payload,
	})
}

const hasStripeKeys = Boolean(STRIPE_SECRET_KEY && WEBHOOK_SECRET)

describe.skipIf(!env.supabaseConfigured || !hasStripeKeys)('Stripe Webhooks Edge Function', () => {
	const createdEventIds: string[] = []
	let deployed = true

	beforeAll(async () => {
		stripe = new Stripe(STRIPE_SECRET_KEY)
		if (env.stripeConfigured) {
			serviceClient = createServiceClient()
		}
		deployed = await isFunctionDeployed('stripe-webhooks')
		if (!deployed) console.warn('stripe-webhooks not deployed — skipping')
	})

	afterAll(async () => {
		if (!serviceClient) return
		for (const id of createdEventIds) {
			await serviceClient.from('stripe_webhook_events').delete().eq('id', id)
		}
	})

	describe('signature verification', () => {
		it('returns 400 when stripe-signature header is missing', async () => {
			if (!deployed) return
			const { payload } = buildWebhookPayload('test.event')
			const response = await callWebhook(payload)
			expect(response.status).toBe(400)
		})

		it('returns 400 when stripe-signature is invalid', async () => {
			if (!deployed) return
			const { payload } = buildWebhookPayload('test.event')
			const response = await callWebhook(payload, {
				'stripe-signature': 't=1234567890,v1=invalidsignature',
			})
			expect(response.status).toBe(400)
			const body = (await response.json()) as Record<string, unknown>
			expect(body.error).toContain('Webhook signature verification failed')
		})
	})

	describe('idempotency', () => {
		it('returns duplicate: true when same event is sent twice', async () => {
			if (!deployed) return
			const { eventId, payload } = buildWebhookPayload('customer.created', {
				id: 'cus_test_idempotency',
			})
			createdEventIds.push(eventId)

			const signature = signPayload(payload)
			const first = await callWebhook(payload, { 'stripe-signature': signature })
			expect(first.status).toBe(200)
			const firstBody = (await first.json()) as Record<string, unknown>
			expect(firstBody.received).toBe(true)

			const sig2 = signPayload(payload)
			const second = await callWebhook(payload, { 'stripe-signature': sig2 })
			expect(second.status).toBe(200)
			const secondBody = (await second.json()) as Record<string, unknown>
			expect(secondBody.received).toBe(true)
			expect(secondBody.duplicate).toBe(true)
		})
	})

	describe('event processing', () => {
		it('returns 200 for unhandled event types', async () => {
			if (!deployed) return
			const { eventId, payload } = buildWebhookPayload('coupon.created', {
				id: 'coupon_test_unhandled',
			})
			createdEventIds.push(eventId)

			const signature = signPayload(payload)
			const response = await callWebhook(payload, { 'stripe-signature': signature })
			expect(response.status).toBe(200)
			const body = (await response.json()) as Record<string, unknown>
			expect(body.received).toBe(true)
		})

		it('records event in stripe_webhook_events table', async () => {
			if (!deployed || !serviceClient) return
			const { eventId, payload } = buildWebhookPayload('invoice.created', {
				id: 'inv_test_recorded',
			})
			createdEventIds.push(eventId)

			const signature = signPayload(payload)
			const response = await callWebhook(payload, { 'stripe-signature': signature })
			expect(response.status).toBe(200)

			const { data, error } = await serviceClient
				.from('stripe_webhook_events')
				.select('id, event_type')
				.eq('id', eventId)
				.single()

			expect(error).toBeNull()
			expect(data).not.toBeNull()
			expect(data!.event_type).toBe('invoice.created')
		})
	})
})
