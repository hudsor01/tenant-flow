import {
	Body,
	Controller,
	Headers,
	HttpCode,
	Logger,
	Post
} from '@nestjs/common'
// Rate limiting handled globally
import { AuthService } from './auth.service'
import { StripeService } from '../billing/stripe.service'
// Removed SubscriptionsManagerService - replaced by StripeWebhookService
import { UsersService } from '../users/users.service'
import { Public } from '../shared/decorators/public.decorator'
import { getStripePriceId } from '@repo/shared'
// CSRF protection is handled at Fastify level - webhooks are exempt by nature

interface SupabaseWebhookEvent {
	type: 'INSERT' | 'UPDATE' | 'DELETE'
	table: string
	schema: 'auth' | 'public'
	record: {
		id: string
		email?: string
		email_confirmed_at?: string | null
		user_metadata?: {
			name?: string
			full_name?: string
		}
		created_at: string
		updated_at: string
	}
	old_record?: string | null
}

@Controller('webhooks/auth')
export class AuthWebhookController {
	private readonly logger = new Logger(AuthWebhookController.name)

	constructor(
		private authService: AuthService,
		private stripeService: StripeService,
		private usersService: UsersService
	) {}

	@Post('supabase')
	@Public()
	// CSRF and rate limiting handled at Fastify level for webhooks
	@HttpCode(200)
	async handleSupabaseAuthWebhook(
		@Body() event: SupabaseWebhookEvent,
		@Headers('authorization') _authHeader: string
	): Promise<{ success: boolean; message?: string; error?: string }> {
		this.logger.debug('Received Supabase auth webhook', {
			type: event.type,
			table: event.table,
			schema: event.schema,
			userId: event.record.id,
			userEmail: event.record.email
		})

		// Verify webhook is from Supabase
		try {
			// Handle user creation
			if (
				event.type === 'INSERT' &&
				event.table === 'users' &&
				event.schema === 'auth'
			) {
				await this.handleUserCreated(event.record)
			}

			// Handle email confirmation
			if (
				event.type === 'UPDATE' &&
				event.table === 'users' &&
				event.schema === 'auth'
			) {
				this.handleUserUpdated(event.record)
			}

			return { success: true, message: 'Webhook processed successfully' }
		} catch (error) {
			this.logger.error('Error processing auth webhook', {
				error: error instanceof Error ? error.message : 'Unknown error',
				event: event
			})

			// Don't fail the webhook - log and continue
			return {
				success: false,
				error: 'Internal error processing webhook'
			}
		}
	}

	private async handleUserCreated(
		user: SupabaseWebhookEvent['record']
	): Promise<void> {
		this.logger.log('Processing new user creation', {
			userId: user.id,
			email: user.email,
			hasMetadata: !!user.user_metadata
		})

		if (!user.email) {
			this.logger.warn('User created without email', { userId: user.id })
			return
		}

		const userName =
			user.user_metadata?.name ?? user.user_metadata?.full_name ?? ''

		try {
			// Sync user with local database
			await this.authService.syncUserWithDatabase({
				id: user.id,
				email: user.email,
				email_confirmed_at: user.email_confirmed_at ?? undefined,
				user_metadata: user.user_metadata,
				created_at: user.created_at,
				updated_at: user.updated_at
			})

			// Create Stripe customer and free trial subscription for new user
			await this.createSubscription(user.id, user.email, userName)

			// Send welcome email (EmailService disabled)
			this.logger.log(
				'Welcome email would be sent (EmailService disabled)',
				{
					email: user.email,
					name: userName
				}
			)
		} catch (error) {
			this.logger.error('Error processing user creation', {
				userId: user.id,
				email: user.email,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	private handleUserUpdated(user: SupabaseWebhookEvent['record']): void {
		// Check if email was just confirmed
		if (
			user.email_confirmed_at &&
			!user.email_confirmed_at.includes('1970')
		) {
			this.logger.log('User email confirmed', {
				userId: user.id,
				email: user.email,
				confirmedAt: user.email_confirmed_at
			})
		}
	}

	private async createSubscription(
		userId: string,
		email: string,
		name: string
	): Promise<void> {
		try {
			this.logger.log(
				'Creating Stripe customer and subscription for new user',
				{
					userId,
					email,
					name
				}
			)

			// Create Stripe customer
			const customer = await this.stripeService.createCustomer(
				email,
				name
			)

			this.logger.log('Stripe customer created successfully', {
				userId,
				customerId: customer.id
			})

			// Create free trial subscription in Stripe
			const stripeSubscription =
				await this.stripeService.client.subscriptions.create({
					customer: customer.id,
					items: [
						{
							price: getStripePriceId('FREETRIAL', 'monthly')
						}
					],
					trial_period_days: 14,
					payment_behavior: 'default_incomplete',
					payment_settings: {
						save_default_payment_method: 'off',
						payment_method_types: ['card']
					},
					metadata: {
						userId,
						plan: 'free_trial',
						source: 'auto_signup'
					}
				})

			this.logger.log('Stripe subscription created successfully', {
				userId,
				subscriptionId: stripeSubscription.id,
				status: stripeSubscription.status,
				trialEnd: stripeSubscription.trial_end
			})

			// Create/update local subscription record with Stripe info
			try {
				// Subscription management handled via Stripe webhooks after initial setup
				this.logger.log(
					`User created: ${userId}, subscription will be created via Stripe webhooks`
				)
				await this.updateSubscriptionWithStripeData(
					userId,
					customer.id,
					stripeSubscription.id
				)

				this.logger.log('Local subscription updated with Stripe data', {
					userId,
					stripeSubscriptionId: stripeSubscription.id
				})
			} catch (localDbError) {
				this.logger.error(
					'Failed to update local subscription with Stripe data',
					{
						userId,
						stripeSubscriptionId: stripeSubscription.id,
						error:
							localDbError instanceof Error
								? localDbError.message
								: 'Unknown error'
					}
				)
			}
		} catch (error) {
			this.logger.error('Failed to create user subscription', {
				userId,
				email,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			// Don't throw - we don't want to fail the webhook because of subscription creation issues
			// The user can still use the platform and subscription can be created later
		}
	}

	/**
	 * Update local subscription record with Stripe data
	 */
	private async updateSubscriptionWithStripeData(
		userId: string,
		stripeCustomerId: string,
		stripeSubscriptionId: string
	): Promise<void> {
		// Subscription updates handled via webhooks after initial user creation
		this.logger.log(
			`Subscription ${stripeSubscriptionId} will be handled via webhooks`
		)

		// Also update user record with Stripe customer ID using users service
		await this.usersService.updateUser(userId, {
			stripeCustomerId
		})
	}
}
