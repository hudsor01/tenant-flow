import { createClient } from '#lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { env } from '#env'

const stripe = new Stripe(env.STRIPE_SECRET_KEY)

export async function POST(request: Request) {
	try {
		const supabase = await createClient()
		const { data: { user }, error: authError } = await supabase.auth.getUser()

		if (authError || !user) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
		}

		const body = await request.json() as { payment_method_id?: unknown; set_as_default?: unknown }
		const paymentMethodId = typeof body.payment_method_id === 'string' ? body.payment_method_id : null

		if (!paymentMethodId) {
			return NextResponse.json({ success: false, error: 'payment_method_id is required' }, { status: 400 })
		}

		const { data: tenant, error: tenantError } = await supabase
			.from('tenants')
			.select('stripe_customer_id')
			.eq('user_id', user.id)
			.single()

		if (tenantError || !tenant?.stripe_customer_id) {
			return NextResponse.json(
				{ success: false, error: 'No Stripe customer found for this tenant' },
				{ status: 404 }
			)
		}

		const stripeCustomerId = tenant.stripe_customer_id

		await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId })

		await stripe.customers.update(stripeCustomerId, {
			invoice_settings: { default_payment_method: paymentMethodId }
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error'
		return NextResponse.json({ success: false, error: message }, { status: 500 })
	}
}
