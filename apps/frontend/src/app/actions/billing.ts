/**
 * Server Actions for Billing and Stripe Integration
 * Direct API integration without abstraction
 */

'use server'

import { post } from '@repo/shared'
import { redirect } from 'next/navigation'

// Define local interface - no shared type needed for this simple case
interface CreateCheckoutRequest {
  priceId: string
  successUrl?: string
  cancelUrl?: string
  trialPeriodDays?: number
  couponId?: string
}

export interface BillingFormState {
	success: boolean
	error?: string
	errors?: { _form?: string[]; [key: string]: string[] | undefined }
	clientSecret?: string
	sessionUrl?: string
}

export async function createCheckoutSession(
	state: BillingFormState,
	payload: FormData
): Promise<BillingFormState> {
	try {
		const priceId = payload.get('priceId') as string
		const successUrl = payload.get('successUrl') as string
		const cancelUrl = payload.get('cancelUrl') as string
		const trialPeriodDays = payload.get('trialPeriodDays')
		const couponId = payload.get('couponId')

		if (!priceId) {
			return {
				success: false,
				errors: {
					_form: ['Price ID is required']
				}
			}
		}

		const requestBody: CreateCheckoutRequest = {
			priceId,
			successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
			trialPeriodDays: trialPeriodDays ? parseInt(trialPeriodDays as string, 10) : undefined,
			couponId: couponId as string | undefined
		}

		const response = await post<{
			sessionId: string
			sessionUrl: string
		}>('/api/stripe/create-checkout-session', requestBody)

		if (response.sessionUrl) {
			redirect(response.sessionUrl)
		}

		return {
			success: true,
			sessionUrl: response.sessionUrl
		}
	} catch (error) {
		return {
			success: false,
			errors: {
				_form: [error instanceof Error ? error.message : 'Failed to create checkout session']
			}
		}
	}
}

export async function createPaymentIntent(
	amount: number,
	currency = 'usd'
): Promise<BillingFormState> {
	try {
		const response = await post<{
			clientSecret: string
		}>('/api/stripe/create-payment-intent', {
			amount,
			currency
		})

		return {
			success: true,
			clientSecret: response.clientSecret
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to create payment intent'
		}
	}
}

export async function createPortalSession(): Promise<BillingFormState> {
	try {
		const response = await post<{
			url: string
		}>('/api/stripe/create-portal-session', {
			returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
		})

		if (response.url) {
			redirect(response.url)
		}

		return {
			success: true,
			sessionUrl: response.url
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to create portal session'
		}
	}
}

export async function handleCheckoutReturn(sessionId: string) {
	try {
		const response = await post<{
			session: unknown
		}>('/api/stripe/checkout-session', {
			sessionId
		})

		return {
			success: true,
			session: response.session
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to retrieve session'
		}
	}
}

export type { BillingFormState as CheckoutFormState }
