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
	SetMetadata,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBody,
	ApiHeader,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { timingSafeEqual } from 'crypto'

// Bypass global JwtAuthGuard - N8N webhooks use secret-based auth
const Public = () => SetMetadata('isPublic', true)
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

@ApiTags('N8N Webhooks')
@Controller('webhooks/n8n/email')
@Public()
export class N8nEmailWebhookController {
	private readonly webhookSecret: string | undefined

	constructor(
		private readonly emailService: EmailService,
		private readonly logger: AppLogger
	) {
		this.webhookSecret = process.env.N8N_WEBHOOK_SECRET
	}

	private validateWebhookSecret(secret: string | undefined): void {
		// FAIL CLOSED - reject if secret not configured (security requirement)
		if (!this.webhookSecret) {
			this.logger.error(
				'N8N_WEBHOOK_SECRET not configured - rejecting webhook request'
			)
			throw new UnauthorizedException('Webhook authentication not configured')
		}

		if (!secret) {
			throw new UnauthorizedException('Missing x-n8n-webhook-secret header')
		}

		// Timing-safe comparison to prevent timing attacks
		const receivedBuffer = Buffer.from(secret)
		const expectedBuffer = Buffer.from(this.webhookSecret)
		const isValid =
			receivedBuffer.length === expectedBuffer.length &&
			timingSafeEqual(receivedBuffer, expectedBuffer)

		if (!isValid) {
			throw new UnauthorizedException('Invalid webhook secret')
		}
	}

	@ApiOperation({
		summary: 'Send payment success email',
		description:
			'N8N webhook to trigger payment success email. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiBody({
		description: 'Payment success details',
		schema: {
			type: 'object',
			required: ['customerEmail', 'amount', 'currency'],
			properties: {
				customerEmail: { type: 'string', format: 'email' },
				amount: { type: 'number' },
				currency: { type: 'string' },
				invoiceUrl: { type: 'string', nullable: true },
				invoicePdf: { type: 'string', nullable: true }
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Email sent successfully' })
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
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

	@ApiOperation({
		summary: 'Send payment failed email',
		description:
			'N8N webhook to trigger payment failed email. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiBody({
		description: 'Payment failed details',
		schema: {
			type: 'object',
			required: ['customerEmail', 'amount', 'currency', 'attemptCount', 'isLastAttempt'],
			properties: {
				customerEmail: { type: 'string', format: 'email' },
				amount: { type: 'number' },
				currency: { type: 'string' },
				attemptCount: { type: 'number' },
				invoiceUrl: { type: 'string', nullable: true },
				isLastAttempt: { type: 'boolean' }
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Email sent successfully' })
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
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

	@ApiOperation({
		summary: 'Send payment reminder email',
		description:
			'N8N webhook to trigger payment reminder email. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiBody({
		description: 'Payment reminder details',
		schema: {
			type: 'object',
			required: [
				'tenantName',
				'tenantEmail',
				'propertyName',
				'amount',
				'currency',
				'dueDate',
				'daysUntilDue',
				'paymentUrl',
				'autopayEnabled'
			],
			properties: {
				tenantName: { type: 'string' },
				tenantEmail: { type: 'string', format: 'email' },
				propertyName: { type: 'string' },
				unitNumber: { type: 'string' },
				amount: { type: 'number' },
				currency: { type: 'string' },
				dueDate: { type: 'string', format: 'date' },
				daysUntilDue: { type: 'number' },
				paymentUrl: { type: 'string' },
				autopayEnabled: { type: 'boolean' }
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Email sent successfully' })
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
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

	@ApiOperation({
		summary: 'Send subscription canceled email',
		description:
			'N8N webhook to trigger subscription canceled email. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiBody({
		description: 'Subscription canceled details',
		schema: {
			type: 'object',
			required: ['customerEmail', 'subscriptionId', 'cancelAtPeriodEnd'],
			properties: {
				customerEmail: { type: 'string', format: 'email' },
				subscriptionId: { type: 'string' },
				cancelAtPeriodEnd: { type: 'boolean' },
				currentPeriodEnd: { type: 'string', format: 'date-time', nullable: true }
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Email sent successfully' })
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
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

	@ApiOperation({
		summary: 'Send tenant invitation email',
		description:
			'N8N webhook to trigger tenant invitation email. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiBody({
		description: 'Tenant invitation details',
		schema: {
			type: 'object',
			required: ['tenantEmail', 'invitationUrl', 'expiresAt'],
			properties: {
				tenantEmail: { type: 'string', format: 'email' },
				invitationUrl: { type: 'string', format: 'uri' },
				propertyName: { type: 'string' },
				unitNumber: { type: 'string' },
				ownerName: { type: 'string' },
				expiresAt: { type: 'string', format: 'date-time' }
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Email sent successfully' })
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
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

	@ApiOperation({
		summary: 'Send lease signature request email',
		description:
			'N8N webhook to trigger lease signature request email. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiBody({
		description: 'Lease signature request details',
		schema: {
			type: 'object',
			required: ['tenantEmail', 'tenantName', 'signUrl'],
			properties: {
				tenantEmail: { type: 'string', format: 'email' },
				tenantName: { type: 'string' },
				propertyName: { type: 'string' },
				unitNumber: { type: 'string' },
				ownerName: { type: 'string' },
				message: { type: 'string' },
				signUrl: { type: 'string', format: 'uri' }
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Email sent successfully' })
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
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

	@ApiOperation({
		summary: 'Send contact form submission email',
		description:
			'N8N webhook to trigger contact form submission email. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiBody({
		description: 'Contact form submission data',
		schema: {
			type: 'object',
			required: ['contactFormData'],
			properties: {
				contactFormData: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						email: { type: 'string', format: 'email' },
						message: { type: 'string' },
						subject: { type: 'string' }
					}
				}
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Email sent successfully' })
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
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
