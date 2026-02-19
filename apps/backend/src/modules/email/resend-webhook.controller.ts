import {
	Controller,
	Post,
	Body,
	Headers,
	RawBodyRequest,
	Req,
	HttpCode,
	HttpStatus,
	UnauthorizedException
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger'
import type { Request } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Resend webhook event types
 * @see https://resend.com/docs/dashboard/webhooks/event-types
 */
export type ResendEventType =
	| 'email.sent'
	| 'email.delivered'
	| 'email.delivery_delayed'
	| 'email.complained'
	| 'email.bounced'
	| 'email.opened'
	| 'email.clicked'

/**
 * Base webhook event payload
 */
export interface ResendWebhookEvent {
	type: ResendEventType
	created_at: string
	data: {
		email_id: string
		from: string
		to: string[]
		subject: string
		created_at: string
		// Additional fields based on event type
		click?: {
			ipAddress: string
			link: string
			timestamp: string
			userAgent: string
		}
		open?: {
			ipAddress: string
			timestamp: string
			userAgent: string
		}
		bounce?: {
			message: string
		}
	}
}

/**
 * Processed webhook result for analytics/storage
 */
export interface ProcessedEmailEvent {
	emailId: string
	eventType: ResendEventType
	timestamp: Date
	recipient: string[]
	subject: string
	metadata: Record<string, unknown> | undefined
}

/**
 * Resend Webhook Controller
 *
 * Handles incoming webhooks from Resend for email tracking:
 * - Delivery confirmation
 * - Bounce/complaint handling
 * - Open/click tracking
 *
 * Security:
 * - Signature verification using Svix
 * - Timing-safe comparison to prevent timing attacks
 */
@ApiTags('Email Webhooks')
@Controller('webhooks/resend')
export class ResendWebhookController {
	private readonly webhookSecret: string | undefined

	constructor(
		private readonly logger: AppLogger,
		private readonly supabaseService: SupabaseService
	) {
		// Webhook secret is set when creating webhook in Resend dashboard
		this.webhookSecret = process.env.RESEND_WEBHOOK_SECRET
		if (!this.webhookSecret) {
			this.logger.warn(
				'RESEND_WEBHOOK_SECRET not configured - webhook signature verification will be skipped'
			)
		}
	}

	/**
	 * Handle incoming Resend webhook events
	 *
	 * Events are signed using Svix and must be verified before processing.
	 */
	@Post()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Resend webhook endpoint',
		description: 'Receives email tracking events from Resend'
	})
	@ApiResponse({ status: 200, description: 'Webhook processed successfully' })
	@ApiResponse({ status: 401, description: 'Invalid webhook signature' })
	@ApiExcludeEndpoint() // Hide from public API docs
	async handleWebhook(
		@Req() req: RawBodyRequest<Request>,
		@Headers('svix-id') svixId: string,
		@Headers('svix-timestamp') svixTimestamp: string,
		@Headers('svix-signature') svixSignature: string,
		@Body() payload: ResendWebhookEvent
	): Promise<{ received: boolean }> {
		// Verify webhook signature if secret is configured
		if (this.webhookSecret) {
			const isValid = this.verifyWebhookSignature(
				req.rawBody?.toString() ?? JSON.stringify(payload),
				svixId,
				svixTimestamp,
				svixSignature
			)

			if (!isValid) {
				this.logger.warn('Invalid Resend webhook signature', {
					svixId,
					eventType: payload.type
				})
				throw new UnauthorizedException('Invalid webhook signature')
			}
		}

		// Process the event
		const processedEvent = this.processEvent(payload)

		this.logger.log('Resend webhook received', {
			eventType: payload.type,
			emailId: processedEvent.emailId,
			recipient: processedEvent.recipient
		})

		// Handle specific event types
		await this.handleEventType(processedEvent, payload)

		return { received: true }
	}

	/**
	 * Verify Svix webhook signature
	 *
	 * Uses timing-safe comparison to prevent timing attacks.
	 */
	private verifyWebhookSignature(
		payload: string,
		svixId: string,
		svixTimestamp: string,
		svixSignature: string
	): boolean {
		if (!this.webhookSecret) {
			return true // Skip verification if no secret configured
		}

		try {
			// Check timestamp to prevent replay attacks (5 minute window)
			const timestamp = parseInt(svixTimestamp, 10)
			const now = Math.floor(Date.now() / 1000)
			if (Math.abs(now - timestamp) > 300) {
				this.logger.warn('Webhook timestamp outside acceptable range', {
					timestamp,
					now
				})
				return false
			}

			// Construct the signed payload
			const signedPayload = `${svixId}.${svixTimestamp}.${payload}`

			// Extract the base64 secret (remove 'whsec_' prefix if present)
			const secretKey = this.webhookSecret.startsWith('whsec_')
				? this.webhookSecret.slice(6)
				: this.webhookSecret

			// Compute expected signature
			const secretBytes = Buffer.from(secretKey, 'base64')
			const expectedSignature = createHmac('sha256', secretBytes)
				.update(signedPayload)
				.digest('base64')

			// Parse the signature header (may contain multiple signatures with version prefixes)
			const signatures = svixSignature.split(' ')
			for (const sig of signatures) {
				const [version, signature] = sig.split(',')
				if (version === 'v1' && signature) {
					// Timing-safe comparison
					const expected = Buffer.from(expectedSignature)
					const actual = Buffer.from(signature)
					if (
						expected.length === actual.length &&
						timingSafeEqual(expected, actual)
					) {
						return true
					}
				}
			}

			return false
		} catch (error) {
			this.logger.error('Error verifying webhook signature', {
				error: error instanceof Error ? error.message : String(error)
			})
			return false
		}
	}

	/**
	 * Process webhook event into standardized format
	 */
	private processEvent(event: ResendWebhookEvent): ProcessedEmailEvent {
		return {
			emailId: event.data.email_id,
			eventType: event.type,
			timestamp: new Date(event.created_at),
			recipient: event.data.to,
			subject: event.data.subject,
			metadata: this.extractEventMetadata(event)
		}
	}

	/**
	 * Extract event-specific metadata
	 */
	private extractEventMetadata(
		event: ResendWebhookEvent
	): Record<string, unknown> | undefined {
		switch (event.type) {
			case 'email.clicked':
				return event.data.click
					? {
							link: event.data.click.link,
							ipAddress: event.data.click.ipAddress,
							userAgent: event.data.click.userAgent
						}
					: undefined

			case 'email.opened':
				return event.data.open
					? {
							ipAddress: event.data.open.ipAddress,
							userAgent: event.data.open.userAgent
						}
					: undefined

			case 'email.bounced':
				return event.data.bounce
					? { bounceMessage: event.data.bounce.message }
					: undefined

			default:
				return undefined
		}
	}

	/**
	 * Handle specific event types with appropriate actions
	 */
	private async handleEventType(
		processedEvent: ProcessedEmailEvent,
		_rawEvent: ResendWebhookEvent
	): Promise<void> {
		switch (processedEvent.eventType) {
			case 'email.sent':
				this.logger.debug('Email sent', {
					emailId: processedEvent.emailId,
					recipient: processedEvent.recipient
				})
				break

			case 'email.delivered':
				this.logger.debug('Email delivered', {
					emailId: processedEvent.emailId,
					recipient: processedEvent.recipient
				})
				// TODO: Update email status in database
				break

			case 'email.bounced':
				this.logger.warn('Email bounced', {
					emailId: processedEvent.emailId,
					recipient: processedEvent.recipient,
					metadata: processedEvent.metadata
				})
				// Record suppression so this address is excluded from future sends
				for (const email of processedEvent.recipient) {
					await this.recordEmailSuppression(email, 'bounced')
				}
				break

			case 'email.complained':
				this.logger.warn('Email marked as spam', {
					emailId: processedEvent.emailId,
					recipient: processedEvent.recipient
				})
				// Record suppression so this address is excluded from future sends
				for (const email of processedEvent.recipient) {
					await this.recordEmailSuppression(email, 'complained')
				}
				break

			case 'email.opened':
				this.logger.debug('Email opened', {
					emailId: processedEvent.emailId,
					recipient: processedEvent.recipient,
					metadata: processedEvent.metadata
				})
				// TODO: Track open for analytics
				break

			case 'email.clicked':
				this.logger.debug('Email link clicked', {
					emailId: processedEvent.emailId,
					recipient: processedEvent.recipient,
					metadata: processedEvent.metadata
				})
				// TODO: Track click for analytics
				break

			case 'email.delivery_delayed':
				this.logger.warn('Email delivery delayed', {
					emailId: processedEvent.emailId,
					recipient: processedEvent.recipient
				})
				break

			default:
				this.logger.debug('Unknown email event', {
					eventType: processedEvent.eventType,
					emailId: processedEvent.emailId
				})
		}
	}

	/**
	 * Record an email address in the suppression list so it is excluded from future sends.
	 * Errors are caught and logged — webhook processing must not fail due to a DB write error.
	 */
	private async recordEmailSuppression(
		email: string,
		reason: 'bounced' | 'complained'
	): Promise<void> {
		try {
			const adminClient = this.supabaseService.getAdminClient()
			const { error } = await adminClient
				.from('email_suppressions')
				.upsert(
					{ email, reason, suppressed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
					{ onConflict: 'email' }
				)
			if (error) {
				this.logger.error('Failed to record email suppression', { email, reason, error })
			}
		} catch (err) {
			this.logger.error('Unexpected error recording email suppression', {
				email,
				reason,
				error: err instanceof Error ? err.message : String(err)
			})
		}
	}
}
