import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { PaymentSuccessEmail } from '../../emails/payment-success-email'
import { PaymentFailedEmail } from '../../emails/payment-failed-email'
import { SubscriptionCanceledEmail } from '../../emails/subscription-canceled-email'

/**
 * Email Service - Direct Resend Integration
 *
 * Ultra-Native: Uses Resend SDK directly, no abstractions
 * KISS: Simple email methods, no builders or factories
 */
@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name)
	private readonly resend: Resend | null

	constructor() {
		const apiKey = process.env.RESEND_API_KEY
		if (!apiKey) {
			this.logger.warn(
				'RESEND_API_KEY not configured - email functionality will be disabled'
			)
			this.resend = null
		} else {
			this.resend = new Resend(apiKey)
		}
	}

	/**
	 * Send payment success email using React template
	 */
	async sendPaymentSuccessEmail(data: {
		customerEmail: string
		amount: number
		currency: string
		invoiceUrl: string | null
		invoicePdf: string | null
	}): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping payment success email')
			return
		}

		try {
			const emailHtml = await render(PaymentSuccessEmail(data))

			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.customerEmail],
				subject: `Payment Receipt - ${data.currency.toUpperCase()} ${(data.amount / 100).toFixed(2)}`,
				html: emailHtml
			})

			this.logger.log('Payment success email sent successfully', {
				emailId: result.data?.id
			})
		} catch (error) {
			this.logger.error('Failed to send payment success email', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Send payment failed email using React template
	 */
	async sendPaymentFailedEmail(data: {
		customerEmail: string
		amount: number
		currency: string
		attemptCount: number
		invoiceUrl: string | null
		isLastAttempt: boolean
	}): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping payment failed email')
			return
		}

		try {
			const emailHtml = await render(PaymentFailedEmail(data))

			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.customerEmail],
				subject: `Payment Failed - Action Required`,
				html: emailHtml
			})

			this.logger.log('Payment failed email sent successfully', {
				emailId: result.data?.id
			})
		} catch (error) {
			this.logger.error('Failed to send payment failed email', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Send subscription canceled email using React template
	 */
	async sendSubscriptionCanceledEmail(data: {
		customerEmail: string
		subscriptionId: string
		cancelAtPeriodEnd: boolean
		currentPeriodEnd: Date | null
	}): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping subscription canceled email')
			return
		}

		try {
			const emailHtml = await render(SubscriptionCanceledEmail(data))

			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.customerEmail],
				subject: 'Subscription Canceled - TenantFlow',
				html: emailHtml
			})

			this.logger.log('Subscription canceled email sent successfully', {
				emailId: result.data?.id
			})
		} catch (error) {
			this.logger.error('Failed to send subscription canceled email', {
			error: error instanceof Error ? error.message : String(error)
		})
		}
	}
}
