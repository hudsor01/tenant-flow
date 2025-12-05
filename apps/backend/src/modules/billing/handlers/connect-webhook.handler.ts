/**
 * Connect Webhook Handler
 *
 * Handles Stripe Connect events:
 * - account.updated
 */

import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'

@Injectable()
export class ConnectWebhookHandler {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	async handleAccountUpdated(account: Stripe.Account): Promise<void> {
		try {
			this.logger.log('Connect account updated', {
				accountId: account.id,
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled,
				detailsSubmitted: account.details_submitted
			})

			const client = this.supabase.getAdminClient()

			// Determine onboarding status based on Stripe account state while respecting DB constraint
			let onboardingStatus: 'not_started' | 'in_progress' | 'completed' = 'in_progress'
			if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
				onboardingStatus = 'completed'
			} else if (!account.details_submitted) {
				onboardingStatus = 'not_started'
			}

			// Combine currently_due and eventually_due requirements
			const requirementsDue = [
				...(account.requirements?.currently_due || []),
				...(account.requirements?.eventually_due || [])
			]

			const { error } = await client
				.from('property_owners')
				.update({
					charges_enabled: account.charges_enabled,
					payouts_enabled: account.payouts_enabled,
					onboarding_status: onboardingStatus,
					requirements_due: requirementsDue,
					onboarding_completed_at: onboardingStatus === 'completed' ? new Date().toISOString() : null,
					updated_at: new Date().toISOString()
				})
				.eq('stripe_account_id', account.id)

			if (error) {
				this.logger.error('Failed to update property owner', {
					error: error.message,
					accountId: account.id
				})
				throw new Error(`Failed to update property owner: ${error.message}`)
			}

			this.logger.log('Property owner updated successfully', {
				accountId: account.id,
				onboardingStatus,
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled
			})
		} catch (error) {
			this.logger.error('Failed to handle account.updated', {
				error: error instanceof Error ? error.message : String(error),
				accountId: account.id
			})
			throw error
		}
	}
}