#!/usr/bin/env tsx
/**
 * One-time backfill to ensure every app user/tenant has a Stripe customer.
 *
 * Preconditions:
 * - Migrations adding auth/public user sync + Stripe triggers have been applied.
 * - Environment variables set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY.
 *
 * Usage:
 *   pnpm --filter @repo/backend tsx apps/backend/scripts/backfill-stripe-customers.ts
 *
 * Safety:
 * - Uses per-user idempotency keys when creating customers to avoid duplicates.
 * - Writes via Supabase service role (no RLS issues); triggers keep tenants in sync.
 */

import 'dotenv/config'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'

const logger = new Logger('BackfillStripeCustomers')

const {
	SUPABASE_URL,
	SUPABASE_SECRET_KEY,
	SUPABASE_SERVICE_ROLE_KEY,
	SUPABASE_SERVICE_KEY,
	STRIPE_SECRET_KEY
} = process.env

const supabaseServiceKey =
	SUPABASE_SECRET_KEY || SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !supabaseServiceKey || !STRIPE_SECRET_KEY) {
	logger.error('Missing required env vars', {
		required: [
			'SUPABASE_URL',
			'STRIPE_SECRET_KEY',
			'SUPABASE_SECRET_KEY | SUPABASE_SERVICE_ROLE_KEY | SUPABASE_SERVICE_KEY'
		]
	})
	process.exit(1)
}

const BATCH_SIZE = 200
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
const supabase = createClient<Database>(SUPABASE_URL, supabaseServiceKey)

type UserRow = {
	id: string
	email: string | null
	full_name: string | null
	stripe_customer_id: string | null
}

async function ensureStripeCustomer(user: UserRow): Promise<string> {
	if (user.stripe_customer_id) return user.stripe_customer_id

	const idempotencyKey = `backfill-user-${user.id}`
	const customer = await stripe.customers.create(
		{
			email: user.email ?? undefined,
			name: user.full_name ?? undefined,
			metadata: { user_id: user.id }
		},
		{ idempotencyKey }
	)

	const { error } = await supabase
		.from('users')
		.update({ stripe_customer_id: customer.id })
		.eq('id', user.id)

	if (error) {
		logger.error('Failed to persist Stripe customer to users table', {
			userId: user.id,
			error
		})
	}

	return customer.id
}

async function backfillUsers(): Promise<number> {
	let page = 0
	let created = 0

	for (;;) {
		const start = page * BATCH_SIZE
		const end = start + BATCH_SIZE - 1
		const { data, error } = await supabase
			.from('users')
			.select('id,email,full_name,stripe_customer_id')
			.is('stripe_customer_id', null)
			.order('created_at', { ascending: true })
			.range(start, end)

		if (error) {
			logger.error('Error fetching users without Stripe ID', { error })
			break
		}

		if (!data || data.length === 0) break

		for (const user of data as UserRow[]) {
			try {
				await ensureStripeCustomer(user)
				created += 1
				logger.log('Backfilled Stripe customer for user', { userId: user.id })
			} catch (err) {
				logger.error('Failed to backfill user', { userId: user.id, error: err })
			}
		}

		if (data.length < BATCH_SIZE) break
		page += 1
	}

	return created
}

async function backfillTenants(): Promise<number> {
	let page = 0
	let updated = 0

	for (;;) {
		const start = page * BATCH_SIZE
		const end = start + BATCH_SIZE - 1

		const { data, error } = await supabase
			.from('tenants')
			.select('id,user_id,stripe_customer_id')
			.is('stripe_customer_id', null)
			.order('created_at', { ascending: true })
			.range(start, end)

		if (error) {
			logger.error('Error fetching tenants without Stripe ID', { error })
			break
		}

		if (!data || data.length === 0) break

		for (const tenant of data) {
			try {
				// Load the owning user to reuse its Stripe customer when available
				const { data: user, error: userError } = await supabase
					.from('users')
					.select('id,email,full_name,stripe_customer_id')
					.eq('id', tenant.user_id)
					.single()

				if (userError || !user) {
					logger.warn('Skipping tenant: user not found', {
						tenantId: tenant.id,
						userId: tenant.user_id
					})
					continue
				}

				const stripeId = await ensureStripeCustomer(user as UserRow)

				const { error: tenantUpdateError } = await supabase
					.from('tenants')
					.update({ stripe_customer_id: stripeId })
					.eq('id', tenant.id)

				if (tenantUpdateError) {
					logger.error('Failed to update tenant with Stripe ID', {
						tenantId: tenant.id,
						error: tenantUpdateError
					})
					continue
				}

				updated += 1
				logger.log('Linked tenant to Stripe customer', {
					tenantId: tenant.id,
					stripeCustomerId: stripeId
				})
			} catch (err) {
				logger.error('Failed to backfill tenant', { tenantId: tenant.id, error: err })
			}
		}

		if (data.length < BATCH_SIZE) break
		page += 1
	}

	return updated
}

async function main() {
	logger.log('Starting Stripe customer backfill')

	const userCreates = await backfillUsers()
	const tenantUpdates = await backfillTenants()

	logger.log('Backfill complete', {
		usersCreated: userCreates,
		tenantsUpdated: tenantUpdates
	})
}

main().catch(err => {
	logger.error('Backfill failed', { error: err })
	process.exit(1)
})
