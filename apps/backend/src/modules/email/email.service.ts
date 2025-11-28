import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { AppConfigService } from '../../config/app-config.service'
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
	private readonly resend: InstanceType<typeof Resend> | null

	constructor(private readonly config: AppConfigService) {
		const apiKey = this.config.getResendApiKey()
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
	 * Send tenant invitation email using React template
	 */
	async sendTenantInvitationEmail(data: {
		tenantEmail: string
		invitationUrl: string
		propertyName?: string
		unitNumber?: string
		ownerName?: string
		expiresAt: string
	}): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping tenant invitation email')
			return
		}

		try {
			// Dynamic import to avoid circular dependency issues
			const { TenantInvitationEmail } = await import('../../emails/tenant-invitation-email')
			const emailHtml = await render(TenantInvitationEmail(data))

			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.tenantEmail],
				subject: 'You\'ve Been Invited to TenantFlow - Accept Your Invitation',
				html: emailHtml
			})

			this.logger.log('Tenant invitation email sent successfully', {
				emailId: result.data?.id,
				tenantEmail: data.tenantEmail
			})
		} catch (error) {
			this.logger.error('Failed to send tenant invitation email', {
				error: error instanceof Error ? error.message : String(error),
				tenantEmail: data.tenantEmail
			})
		}
	}

	/**
	 * Send lease sent for signature email (tenant receives)
	 */
	async sendLeaseSentForSignatureEmail(data: {
		tenantEmail: string
		tenantName: string
		propertyName?: string
		unitNumber?: string
		ownerName?: string
		message?: string
		signUrl: string
	}): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping lease signature email')
			return
		}

		try {
			const { LeaseSentForSignatureEmail } = await import('../../emails/lease-signature-email')
			// Build props conditionally to satisfy exactOptionalPropertyTypes
			const emailProps: {
				tenantName: string
				signUrl: string
				propertyName?: string
				unitNumber?: string
				ownerName?: string
				message?: string
			} = {
				tenantName: data.tenantName,
				signUrl: data.signUrl
			}
			if (data.propertyName) emailProps.propertyName = data.propertyName
			if (data.unitNumber) emailProps.unitNumber = data.unitNumber
			if (data.ownerName) emailProps.ownerName = data.ownerName
			if (data.message) emailProps.message = data.message

			const emailHtml = await render(LeaseSentForSignatureEmail(emailProps))

			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.tenantEmail],
				subject: 'Action Required: Your Lease Agreement is Ready for Signature',
				html: emailHtml
			})

			this.logger.log('Lease sent for signature email sent', { emailId: result.data?.id })
		} catch (error) {
			this.logger.error('Failed to send lease signature email', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Send owner signed notification (tenant receives)
	 */
	async sendOwnerSignedEmail(data: {
		tenantEmail: string
		tenantName: string
		ownerName?: string
		propertyName?: string
		signedAt: string
		signUrl: string
		tenantHasSigned: boolean
	}): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping owner signed email')
			return
		}

		try {
			const { LeaseOwnerSignedEmail } = await import('../../emails/lease-signature-email')
			const emailHtml = await render(LeaseOwnerSignedEmail(data))

			const subject = data.tenantHasSigned
				? 'Your Lease is Now Active!'
				: 'Your Landlord Has Signed - Your Signature Needed'

			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.tenantEmail],
				subject,
				html: emailHtml
			})

			this.logger.log('Owner signed email sent', { emailId: result.data?.id })
		} catch (error) {
			this.logger.error('Failed to send owner signed email', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Send tenant signed notification (owner receives)
	 */
	async sendTenantSignedEmail(data: {
		ownerEmail: string
		ownerName: string
		tenantName: string
		propertyName?: string
		signedAt: string
		dashboardUrl: string
		ownerHasSigned: boolean
	}): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping tenant signed email')
			return
		}

		try {
			const { LeaseTenantSignedEmail } = await import('../../emails/lease-signature-email')
			const emailHtml = await render(LeaseTenantSignedEmail(data))

			const subject = data.ownerHasSigned
				? 'Lease Activated - Tenant Has Signed!'
				: 'Tenant Has Signed - Your Signature Needed'

			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.ownerEmail],
				subject,
				html: emailHtml
			})

			this.logger.log('Tenant signed email sent', { emailId: result.data?.id })
		} catch (error) {
			this.logger.error('Failed to send tenant signed email', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Send lease activated email (both parties receive)
	 */
	async sendLeaseActivatedEmail(data: {
		recipientEmail: string
		recipientName: string
		isOwner: boolean
		propertyName?: string
		rentAmount: number
		rentCurrency: string
		startDate: string
		portalUrl: string
	}): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping lease activated email')
			return
		}

		try {
			const { LeaseActivatedEmail } = await import('../../emails/lease-signature-email')
			const emailHtml = await render(LeaseActivatedEmail(data))

			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.recipientEmail],
				subject: `Your Lease for ${data.propertyName || 'Your Property'} is Now Active`,
				html: emailHtml
			})

			this.logger.log('Lease activated email sent', { emailId: result.data?.id })
		} catch (error) {
			this.logger.error('Failed to send lease activated email', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Escape HTML special characters to prevent XSS
	 * Replaces: & < > " ' / with their HTML entity equivalents
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')   // Must be first to avoid double-escaping
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')
			.replace(/\//g, '&#x2F;')
	}

	/**
	 * Generate team notification HTML for contact form submissions
	 */
	generateTeamNotificationHtml(dto: ContactFormRequest): string {
		const name = this.escapeHtml(dto.name)
		const email = this.escapeHtml(dto.email)
		const company = dto.company ? this.escapeHtml(dto.company) : null
		const phone = dto.phone ? this.escapeHtml(dto.phone) : null
		const urgency = dto.urgency ? this.escapeHtml(dto.urgency) : null
		const subject = this.escapeHtml(dto.subject)
		const type = this.escapeHtml(dto.type)
		const message = this.escapeHtml(dto.message)

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
				<div class="value">${name} (${email})</div>
			</div>
			${company ? `<div class="field"><div class="label">Company:</div><div class="value">${company}</div></div>` : ''}
			${phone ? `<div class="field"><div class="label">Phone:</div><div class="value">${phone}</div></div>` : ''}
			<div class="field">
				<div class="label">Subject:</div>
				<div class="value">${subject}</div>
			</div>
			<div class="field">
				<div class="label">Type:</div>
				<div class="value">${type}</div>
			</div>
			${urgency ? `<div class="field"><div class="label">Urgency:</div><div class="value">${urgency}</div></div>` : ''}
			<div class="field">
				<div class="label">Message:</div>
				<div class="value">${message}</div>
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
		const name = this.escapeHtml(dto.name)
		const subject = this.escapeHtml(dto.subject)
		const supportPhone = this.escapeHtml(this.config.getSupportPhone())

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
			<p class="message">Hi ${name},</p>
			<p class="message">Thank you for reaching out to us. We've received your message regarding "${subject}" and our team will review it shortly.</p>
			<p class="message">We typically respond within 4 hours during business hours (9 AM - 5 PM EST, Monday-Friday).</p>
			<p class="message">If you need immediate assistance, please call us at ${supportPhone}.</p>
			<p class="message">Best regards,<br>The TenantFlow Team</p>
		</div>
	</div>
</body>
</html>
		`.trim()
	}
}
