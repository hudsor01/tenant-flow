import { Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class RentPaymentsService {
	private readonly logger = new Logger(RentPaymentsService.name)
	private readonly stripe: Stripe

	constructor(private readonly supabase: SupabaseService) {
		this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2025-08-27' as Stripe.LatestApiVersion
		})
	}

	/**
	 * Calculate platform fee based on landlord's subscription tier
	 * STARTER: 3%, GROWTH: 2.5%, TENANTFLOW_MAX: 2%
	 */
	calculatePlatformFee(amount: number, landlordTier: string): number {
		const feePercent =
			{
				STARTER: 3,
				GROWTH: 2.5,
				TENANTFLOW_MAX: 2
			}[landlordTier] || 3

		return Math.round(amount * (feePercent / 100))
	}

	/**
	 * Calculate Stripe processing fee
	 * Card: 2.9% + $0.30, ACH: 0.8% capped at $5
	 */
	calculateStripeFee(amount: number, type: 'card' | 'ach'): number {
		if (type === 'card') {
			return Math.round(amount * 0.029 + 30) // 2.9% + $0.30
		}
		return Math.min(Math.round(amount * 0.008), 500) // 0.8% capped at $5
	}

	/**
	 * Calculate all fees for a payment
	 */
	calculateFees(
		amount: number,
		paymentType: 'card' | 'ach',
		landlordTier: string
	) {
		const platformFee = this.calculatePlatformFee(amount, landlordTier)
		const stripeFee = this.calculateStripeFee(amount, paymentType)

		return {
			platformFee,
			stripeFee,
			landlordReceives: amount - platformFee,
			total: amount
		}
	}
}
