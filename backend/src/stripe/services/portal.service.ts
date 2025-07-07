import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StripeService } from './stripe.service'
import { SupabaseService } from './supabase.service'

@Injectable()
export class PortalService {
	private readonly logger = new Logger(PortalService.name)

	constructor(
		private stripeService: StripeService,
		private supabaseService: SupabaseService,
		private configService: ConfigService,
	) {}

	async createPortalSession(userId: string) {
		const stripe = this.stripeService.getStripeInstance()

		try {
			// Get user's Stripe customer ID from Subscription table (NOT User table - bug fix!)
			const stripeCustomerId = await this.getStripeCustomerByUserId(userId)

			this.logger.log(`Creating portal session for customer ${stripeCustomerId}`)

			// Create billing portal session
			const session = await stripe.billingPortal.sessions.create({
				customer: stripeCustomerId,
				return_url: `${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/billing`,
				locale: 'en',
			})

			return {
				url: session.url,
				sessionId: session.id,
			}
		} catch (error: any) {
			this.logger.error('Portal session creation failed:', error)

			// Return appropriate error messages
			if (error.type === 'StripeInvalidRequestError') {
				throw new Error('Invalid request to Stripe')
			} else if (error.message?.includes('User not found')) {
				throw new Error('User not found')
			} else if (error.message?.includes('does not have a Stripe customer ID')) {
				throw new Error('User has no billing account. Please subscribe to a plan first.')
			} else {
				throw new Error('Failed to create portal session')
			}
		}
	}

	private async getStripeCustomerByUserId(userId: string): Promise<string> {
		// BUG FIX: Look up stripeCustomerId from Subscription table, NOT User table
		// The original serverless function tried to read User.stripeCustomerId which doesn't exist!
		const subscription = await this.supabaseService.getSubscriptionByUserId(userId)

		if (!subscription?.stripeCustomerId) {
			throw new Error('User does not have a Stripe customer ID')
		}

		return subscription.stripeCustomerId
	}
}