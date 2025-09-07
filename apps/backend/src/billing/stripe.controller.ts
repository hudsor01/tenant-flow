import type { RawBodyRequest } from '@nestjs/common'
import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Headers,
	InternalServerErrorException,
	NotFoundException,
	Optional,
	Post,
	Req,
	UseGuards
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { PinoLogger } from 'nestjs-pino'
import { SupabaseService } from '../database/supabase.service'
import {
	createCheckoutSchema,
	createPortalSchema,
	type CreateCheckoutRequest,
	type CreatePortalRequest
} from '../schemas/stripe.schemas'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { AuthGuard } from '../shared/guards/auth.guard'
import { StripeSyncService } from './stripe-sync.service'

// Use proper auth type from shared
import type { AuthUser } from '@repo/shared/types/auth'

@ApiTags('stripe')
@UseGuards(AuthGuard)
@Controller('stripe')
export class StripeController {
	constructor(
		private readonly stripeSyncService: StripeSyncService,
		private readonly supabaseService: SupabaseService,
		@Optional() private readonly logger?: PinoLogger
	) {
		this.logger?.setContext(StripeController.name)
	}

	@Get('subscription')
	@ApiOperation({ summary: 'Get current user subscription' })
	@ApiResponse({
		status: 200,
		description: 'Returns latest subscription for user'
	})
	@ApiResponse({ status: 404, description: 'Subscription not found' })
	@ApiBearerAuth()
	async getSubscription(@CurrentUser() user: AuthUser) {
		this.logger?.info({ userId: user.id }, 'Getting user subscription')

		// Ultra-native: Direct database query with RLS enforcement
		const client = this.supabaseService.getAdminClient()
		const { data: sub, error } = await client
			.from('Subscription')
			.select('*')
			.eq('userId', user.id)
			.order('updatedAt', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger?.error('Failed to fetch subscription', error)
			throw new InternalServerErrorException('Failed to fetch subscription')
		}

		if (!sub) {
			throw new NotFoundException('No subscription found')
		}

		return sub
	}

	@Post('setup-intent')
	@ApiOperation({ summary: 'Create Setup Intent for adding a payment method' })
	@ApiResponse({
		status: 200,
		description: 'Returns setup intent client secret'
	})
	@ApiBearerAuth()
	async createSetupIntent(@CurrentUser() user: AuthUser) {
		this.logger?.info({ userId: user.id }, 'Creating setup intent')

		try {
			// Ultra-native: Direct RPC call
			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc(
				'create_stripe_setup_intent' as any,
				{
					p_user_id: user.id
				}
			)

			if (error) {
				this.logger?.error('RPC call failed', error)
				throw new InternalServerErrorException(
					`Setup intent creation failed: ${error.message}`
				)
			}

			return data
		} catch (error) {
			this.logger?.error('Setup intent creation failed', error)
			throw new InternalServerErrorException('Failed to create setup intent')
		}
	}

	@Post('checkout')
	@ApiOperation({
		summary: 'Create Stripe checkout session',
		description: 'Creates a secure checkout session for subscription purchase'
	})
	@ApiResponse({
		status: 200,
		description: 'Checkout session created successfully'
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiBearerAuth()
	async createCheckout(
		@Body() dto: CreateCheckoutRequest,
		@CurrentUser() user: AuthUser
	) {
		// Ultra-native: Zod validation
		const validatedDto = createCheckoutSchema.parse(dto)

		this.logger?.info(
			{ userId: user.id, planId: validatedDto.planId },
			'Creating checkout session'
		)

		try {
			// Ultra-native: Direct RPC call
			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc(
				'create_stripe_checkout_session' as any,
				{
					p_user_id: user.id,
					p_plan_id: validatedDto.planId,
					p_interval: validatedDto.interval,
					p_success_url: validatedDto.successUrl,
					p_cancel_url: validatedDto.cancelUrl
				}
			)

			if (error) {
				this.logger?.error('RPC call failed', error)
				throw new InternalServerErrorException(
					`Checkout creation failed: ${error.message}`
				)
			}

			return data
		} catch (error) {
			this.logger?.error('Checkout creation failed', error)
			throw new InternalServerErrorException(
				'Failed to create checkout session'
			)
		}
	}

	@Post('portal')
	@ApiOperation({
		summary: 'Create customer portal session',
		description:
			'Creates a secure customer portal session for subscription management'
	})
	@ApiResponse({
		status: 200,
		description: 'Portal session created successfully'
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiBearerAuth()
	async createPortal(
		@Body() dto: CreatePortalRequest,
		@CurrentUser() user: AuthUser
	) {
		// Ultra-native: Zod validation
		const validatedDto = createPortalSchema.parse(dto)

		this.logger?.info({ userId: user.id }, 'Creating portal session')

		try {
			// Ultra-native: Direct RPC call
			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc(
				'create_stripe_portal_session' as any,
				{
					p_user_id: user.id,
					p_return_url: validatedDto.returnUrl
				}
			)

			if (error) {
				this.logger?.error('RPC call failed', error)
				throw new InternalServerErrorException(
					`Portal creation failed: ${error.message}`
				)
			}

			return data
		} catch (error) {
			this.logger?.error('Portal creation failed', error)
			throw new InternalServerErrorException('Failed to create portal session')
		}
	}

	@Post('webhook')
	@ApiOperation({
		summary: 'Stripe webhook endpoint',
		description: 'Handles Stripe webhook events with signature verification'
	})
	@ApiResponse({ status: 200, description: 'Webhook processed successfully' })
	@ApiResponse({ status: 400, description: 'Invalid webhook signature' })
	@Public()
	async handleWebhook(
		@Req() req: RawBodyRequest<FastifyRequest>,
		@Headers('stripe-signature') signature: string
	) {
		const startTime = Date.now()
		this.logger?.info('Received Stripe webhook')

		try {
			if (!req.rawBody) {
				throw new BadRequestException('No raw body found in request')
			}
			if (!signature) {
				throw new BadRequestException('No stripe signature found in headers')
			}

			// Ultra-native: Direct RPC call for webhook verification
			const client = this.supabaseService.getAdminClient()
			const { data: eventData, error } = await client.rpc(
				'verify_stripe_webhook' as any,
				{
					p_payload: req.rawBody.toString(),
					p_signature: signature
				}
			)

			if (error) {
				this.logger?.error('Webhook verification failed', error)
				throw new BadRequestException(
					`Webhook verification failed: ${error.message}`
				)
			}

			// Parse the verified event
			const event = eventData as any

			this.logger?.info(
				{
					eventType: event?.type,
					eventId: event?.id,
					livemode: event?.livemode
				},
				`Processing webhook event: ${event?.type}`
			)

			// Process asynchronously to return 200 quickly (Stripe best practice)
			setImmediate(async () => {
				const processingStartTime = Date.now()

				try {
					// Step 1: Auto-sync data using Stripe Sync Engine (Ultra-native)
					await this.stripeSyncService.processWebhook(req.rawBody!, signature)

					const totalTime = Date.now() - processingStartTime
					this.logger?.info('Webhook processed successfully', {
						eventType: event?.type,
						eventId: event?.id,
						processingTime: `${totalTime}ms`
					})
				} catch (error) {
					// Log error but don't fail the webhook (already returned 200)
					this.logger?.error('Async webhook processing failed', {
						eventType: event?.type,
						eventId: event?.id,
						error: error instanceof Error ? error.message : 'Unknown error',
						processingTime: `${Date.now() - processingStartTime}ms`,
						stack: error instanceof Error ? error.stack : undefined
					})
				}
			})

			const responseTime = Date.now() - startTime
			this.logger?.info(`Webhook response sent in ${responseTime}ms`)

			return { received: true }
		} catch (error) {
			this.logger?.error(
				{
					error: {
						message: error instanceof Error ? error.message : String(error),
						stack:
							process.env.NODE_ENV !== 'production' && error instanceof Error
								? error.stack
								: undefined
					},
					webhook: {
						hasRawBody: !!req.rawBody,
						hasSignature: !!signature
					}
				},
				'Webhook processing failed'
			)
			throw new InternalServerErrorException(
				`Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}
}
