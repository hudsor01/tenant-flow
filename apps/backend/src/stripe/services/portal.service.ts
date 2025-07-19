import { Injectable } from '@nestjs/common'
import Stripe from 'stripe'
import { StripeService } from './stripe.service'

@Injectable()
export class PortalService {
	constructor(private readonly stripeService: StripeService) {}

	async createPortalSession(
		customerId: string,
		returnUrl: string
	): Promise<Stripe.BillingPortal.Session> {
		const stripe = this.stripeService.getStripeInstance()
		return stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl
		})
	}

}