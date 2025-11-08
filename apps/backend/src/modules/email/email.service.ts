import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { PaymentSuccessEmail } from '../../emails/payment-success-email'
import { PaymentFailedEmail } from '../../emails/payment-failed-email'
import { SubscriptionCanceledEmail } from '../../emails/subscription-canceled-email'
import type { ContactFormRequest } from '@repo/shared/types/domain'

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
			this.logger.warn(
				'Resend not configured, skipping subscription canceled email'
			)
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

	/**
	 * Generate team notification HTML for contact form submissions
	 */
	generateTeamNotificationHtml(dto: ContactFormRequest): string {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
		.content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
		.field { margin-bottom: 15px; }
		.label { font-weight: bold; color: #6B7280; }
		.value { margin-top: 5px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h2>New Contact Form Submission</h2>
		</div>
		<div class="content">
			<div class="field">
				<div class="label">From:</div>
				<div class="value">${dto.name} (${dto.email})</div>
			</div>
			${dto.company ? `<div class="field"><div class="label">Company:</div><div class="value">${dto.company}</div></div>` : ''}
			<div class="field">
				<div class="label">Subject:</div>
				<div class="value">${dto.subject}</div>
			</div>
			<div class="field">
				<div class="label">Type:</div>
				<div class="value">${dto.type || 'General Inquiry'}</div>
			</div>
			<div class="field">
				<div class="label">Message:</div>
				<div class="value">${dto.message}</div>
			</div>
		</div>
	</div>
</body>
</html>
		`.trim()
	}

	/**
	 * Generate user confirmation HTML for contact form submissions
	 */
	generateUserConfirmationHtml(dto: ContactFormRequest): string {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
		.content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
		.message { margin-bottom: 20px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h2>Thank You for Contacting TenantFlow</h2>
		</div>
		<div class="content">
			<p class="message">Hi ${dto.name},</p>
			<p class="message">Thank you for reaching out to us. We've received your message regarding "${dto.subject}" and our team will review it shortly.</p>
			<p class="message">We typically respond within 4 hours during business hours (9 AM - 5 PM EST, Monday-Friday).</p>
			<p class="message">If you need immediate assistance, please call us at (555) 123-4567.</p>
			<p class="message">Best regards,<br>The TenantFlow Team</p>
		</div>
	</div>
</body>
</html>
		`.trim()
	}
}
