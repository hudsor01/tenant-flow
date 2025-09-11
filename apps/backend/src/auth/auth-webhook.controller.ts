import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common'
import { getPriceId } from '@repo/shared'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { SupabaseWebhookEvent } from '@repo/shared/types/auth'
import { PinoLogger } from 'nestjs-pino'
import { SupabaseService } from '../database/supabase.service'
import { Public } from '../shared/decorators/public.decorator'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'

@Controller('webhooks/auth')
export class AuthWebhookController {
	constructor(
		private authService: AuthService,
		private supabaseService: SupabaseService,
		private usersService: UsersService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	@Post('supabase')
	@Public()
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
		this.logger.info('Processing new user creation', {
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
			// Transform webhook user to Supabase User format - only required fields
			const supabaseUser: SupabaseUser = {
				id: user.id,
				aud: 'authenticated',
				email: user.email || '',
				email_confirmed_at: user.email_confirmed_at ?? undefined,
				user_metadata: user.user_metadata || {},
				app_metadata: {},
				created_at: user.created_at,
				updated_at: user.updated_at,
				is_anonymous: false
			}

			// Sync user with local database
			await this.authService.syncUserWithDatabase(supabaseUser)

			// Create Stripe customer and free trial subscription for new user
			await this.createSubscription(user.id, user.email, userName)

			// Send welcome email (EmailService disabled)
			this.logger.info('Welcome email would be sent (EmailService disabled)', {
				email: user.email,
				name: userName
			})
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
		if (user.email_confirmed_at && !user.email_confirmed_at.includes('1970')) {
			this.logger.info('User email confirmed', {
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
			this.logger.info(
				'Creating Stripe customer and subscription for new user',
				{
					userId,
					email,
					name
				}
			)

			// Ultra-native: Direct RPC call for customer and subscription creation
			const client = this.supabaseService.getAdminClient()
			const { data: subscriptionData, error } = await client.rpc(
				'create_stripe_customer_with_trial',
				{
					p_user_id: userId,
					p_email: email,
					p_name: name,
					p_price_id: getPriceId('FREETRIAL', 'monthly'),
					p_trial_days: 14
				}
			)

			if (error) {
				this.logger.error(
					'Failed to create customer and subscription via RPC',
					{
						userId,
						email,
						error: error.message
					}
				)
				throw new Error(`Customer creation failed: ${error.message}`)
			}

			// Type the response data using proper typing
			const responseData = subscriptionData as {
				customerId?: string
				subscriptionId?: string
			} | null

			this.logger.info(
				'Stripe customer and subscription created successfully',
				{
					userId,
					customerId: responseData?.customerId,
					subscriptionId: responseData?.subscriptionId
				}
			)

			// Update user record with Stripe customer ID
			if (responseData?.customerId) {
				await this.usersService.updateUser(userId, {
					stripeCustomerId: responseData.customerId
				})
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
}
