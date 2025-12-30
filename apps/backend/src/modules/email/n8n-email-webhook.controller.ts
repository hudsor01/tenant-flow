/**
 * N8N Email Webhook Controller
 *
 * Provides HTTP endpoints for n8n workflows to trigger emails directly,
 * bypassing BullMQ queue processing. This allows n8n to handle:
 * - Retry logic with configurable backoff
 * - Workflow orchestration
 * - Logging and monitoring
 * - Error notifications
 *
 * Security: Protected by a shared secret in the x-n8n-webhook-secret header.
 */

import {
	Body,
	Controller,
	Headers,
	HttpCode,
	HttpStatus,
	Post,
	UnauthorizedException
} from '@nestjs/common'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import { AppLogger } from '../../logger/app-logger.service'
import { EmailService } from './email.service'

// DTOs for n8n webhook payloads
interface PaymentSuccessPayload {
	customerEmail: string
	amount: number
	currency: string
	invoiceUrl: string | null
	invoicePdf: string | null
}

interface PaymentFailedPayload {
	customerEmail: string
	amount: number
	currency: string
	attemptCount: number
	invoiceUrl: string | null
	isLastAttempt: boolean
}

interface PaymentReminderPayload {
	tenantName: string
	tenantEmail: string
	propertyName: string
	unitNumber?: string
	amount: number
	currency: string
	dueDate: string
	daysUntilDue: number
	paymentUrl: string
	autopayEnabled: boolean
}

interface SubscriptionCanceledPayload {
	customerEmail: string
	subscriptionId: string
	cancelAtPeriodEnd: boolean
	currentPeriodEnd: string | null
}

interface TenantInvitationPayload {
	tenantEmail: string
	invitationUrl: string
	propertyName?: string
	unitNumber?: string
	ownerName?: string
	expiresAt: string
}

interface LeaseSignaturePayload {
	tenantEmail: string
	tenantName: string
	propertyName?: string
	unitNumber?: string
	ownerName?: string
	message?: string
	signUrl: string
}

interface ContactFormPayload {
	contactFormData: ContactFormRequest
}

@Controller('webhooks/n8n/email')
export class N8nEmailWebhookController {
	private readonly webhookSecret: string | undefined

	constructor(
		private readonly emailService: EmailService,
		private readonly logger: AppLogger
	) {
		this.webhookSecret = process.env.N8N_WEBHOOK_SECRET
	}

	private validateWebhookSecret(secret: string | undefined): void {
		// Skip validation if no secret is configured (development mode)
		if (!this.webhookSecret) {
			this.logger.warn(
				'N8N_WEBHOOK_SECRET not configured - webhook authentication disabled'
			)
			return
		}

		if (secret !== this.webhookSecret) {
			throw new UnauthorizedException('Invalid webhook secret')
		}
	}

	@Post('payment-success')
	@HttpCode(HttpStatus.OK)
	async handlePaymentSuccess(
		@Body() payload: PaymentSuccessPayload,
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<{ success: boolean; message: string }> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Webhook] Received payment-success email request', {
			customerEmail: payload.customerEmail
		})

		try {
			await this.emailService.sendPaymentSuccessEmail(payload)
			return { success: true, message: 'Payment success email sent' }
		} catch (error) {
			this.logger.error('[N8N Webhook] Failed to send payment-success email', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	@Post('payment-failed')
	@HttpCode(HttpStatus.OK)
	async handlePaymentFailed(
		@Body() payload: PaymentFailedPayload,
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<{ success: boolean; message: string }> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Webhook] Received payment-failed email request', {
			customerEmail: payload.customerEmail
		})

		try {
			await this.emailService.sendPaymentFailedEmail(payload)
			return { success: true, message: 'Payment failed email sent' }
		} catch (error) {
			this.logger.error('[N8N Webhook] Failed to send payment-failed email', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	@Post('payment-reminder')
	@HttpCode(HttpStatus.OK)
	async handlePaymentReminder(
		@Body() payload: PaymentReminderPayload,
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<{ success: boolean; message: string }> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Webhook] Received payment-reminder email request', {
			tenantEmail: payload.tenantEmail
		})

		try {
			await this.emailService.sendPaymentReminderEmail(payload)
			return { success: true, message: 'Payment reminder email sent' }
		} catch (error) {
			this.logger.error(
				'[N8N Webhook] Failed to send payment-reminder email',
				{
					error: error instanceof Error ? error.message : String(error)
				}
			)
			throw error
		}
	}

	@Post('subscription-canceled')
	@HttpCode(HttpStatus.OK)
	async handleSubscriptionCanceled(
		@Body() payload: SubscriptionCanceledPayload,
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<{ success: boolean; message: string }> {
		this.validateWebhookSecret(secret)

		this.logger.log(
			'[N8N Webhook] Received subscription-canceled email request',
			{
				customerEmail: payload.customerEmail
			}
		)

		try {
			await this.emailService.sendSubscriptionCanceledEmail({
				...payload,
				currentPeriodEnd: payload.currentPeriodEnd
					? new Date(payload.currentPeriodEnd)
					: null
			})
			return { success: true, message: 'Subscription canceled email sent' }
		} catch (error) {
			this.logger.error(
				'[N8N Webhook] Failed to send subscription-canceled email',
				{
					error: error instanceof Error ? error.message : String(error)
				}
			)
			throw error
		}
	}

	@Post('tenant-invitation')
	@HttpCode(HttpStatus.OK)
	async handleTenantInvitation(
		@Body() payload: TenantInvitationPayload,
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<{ success: boolean; message: string }> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Webhook] Received tenant-invitation email request', {
			tenantEmail: payload.tenantEmail
		})

		try {
			await this.emailService.sendTenantInvitationEmail(payload)
			return { success: true, message: 'Tenant invitation email sent' }
		} catch (error) {
			this.logger.error(
				'[N8N Webhook] Failed to send tenant-invitation email',
				{
					error: error instanceof Error ? error.message : String(error)
				}
			)
			throw error
		}
	}

	@Post('lease-signature')
	@HttpCode(HttpStatus.OK)
	async handleLeaseSignature(
		@Body() payload: LeaseSignaturePayload,
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<{ success: boolean; message: string }> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Webhook] Received lease-signature email request', {
			tenantEmail: payload.tenantEmail
		})

		try {
			await this.emailService.sendLeaseSentForSignatureEmail(payload)
			return { success: true, message: 'Lease signature email sent' }
		} catch (error) {
			this.logger.error(
				'[N8N Webhook] Failed to send lease-signature email',
				{
					error: error instanceof Error ? error.message : String(error)
				}
			)
			throw error
		}
	}

	@Post('contact-form')
	@HttpCode(HttpStatus.OK)
	async handleContactForm(
		@Body() payload: ContactFormPayload,
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<{ success: boolean; message: string }> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Webhook] Received contact-form email request', {
			email: payload.contactFormData.email
		})

		try {
			await this.emailService.sendContactFormEmail(payload.contactFormData)
			return { success: true, message: 'Contact form email sent' }
		} catch (error) {
			this.logger.error('[N8N Webhook] Failed to send contact-form email', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}
}
