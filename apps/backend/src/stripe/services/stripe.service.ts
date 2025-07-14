import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeService {
	private readonly stripe: Stripe

	constructor(private configService: ConfigService) {
		const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
		if (!secretKey) {
			throw new Error('STRIPE_SECRET_KEY is required')
		}

		this.stripe = new Stripe(secretKey, {
			apiVersion: '2025-06-30.basil',
		})
	}

	getStripeInstance(): Stripe {
		return this.stripe
	}

	// Price ID mapping from environment variables
	getPriceId(planId: 'freeTrial' | 'starter' | 'growth' | 'enterprise', billingPeriod: 'monthly' | 'annual'): string {
		const priceIdMap = {
			freeTrial: {
				monthly: this.configService.get<string>('VITE_STRIPE_FREE_TRIAL'),
				annual: this.configService.get<string>('VITE_STRIPE_FREE_TRIAL'),
			},
			starter: {
				monthly: this.configService.get<string>('VITE_STRIPE_STARTER_MONTHLY'),
				annual: this.configService.get<string>('VITE_STRIPE_STARTER_ANNUAL'),
			},
			growth: {
				monthly: this.configService.get<string>('VITE_STRIPE_GROWTH_MONTHLY'),
				annual: this.configService.get<string>('VITE_STRIPE_GROWTH_ANNUAL'),
			},
			enterprise: {
				monthly: this.configService.get<string>('VITE_STRIPE_ENTERPRISE_MONTHLY'),
				annual: this.configService.get<string>('VITE_STRIPE_ENTERPRISE_ANNUAL'),
			},
		}

		const priceId = priceIdMap[planId]?.[billingPeriod]
		if (!priceId) {
			throw new Error(`Price ID not found for plan: ${planId}, period: ${billingPeriod}`)
		}

		return priceId
	}
}