import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'

interface EmailData {
	to: string
	userName?: string
}

interface PaymentMethodSavedEmailData extends EmailData {
	lastFour: string
	brand: string
}

interface SubscriptionCancelledEmailData extends EmailData {
	planName: string
	cancellationDate: Date
}

interface AccountSuspendedEmailData extends EmailData {
	suspensionReason: 'payment_failure' | 'subscription_cancelled'
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name)
	private resend: Resend | null = null
	private readonly fromEmail = 'TenantFlow <noreply@tenantflow.app>'

	constructor() {
		if (!process.env.TEST_RESEND_API_KEY) {
			this.logger.warn(
				'TEST_RESEND_API_KEY not provided - email service disabled'
			)
			return
		}

		this.resend = new Resend(process.env.TEST_RESEND_API_KEY)
	}

	private isEmailServiceAvailable(): boolean {
		return !!this.resend
	}

	async sendPaymentFailedEmail(data: {
		to: string
		userName?: string
		amount: number
		currency: string
		retryUrl: string
	}): Promise<void> {
		if (!this.isEmailServiceAvailable()) {
			this.logger.warn(
				'Email service not available - skipping payment failed email'
			)
			return
		}

		try {
			const formattedAmount = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: data.currency.toUpperCase()
			}).format(data.amount / 100)

			if (!this.resend) {
				this.logger.warn('Email service not available - skipping email')
				return
			}

			await this.resend.emails.send({
				from: this.fromEmail,
				to: data.to,
				subject: 'Payment Failed - Action Required',
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #dc2626;">Payment Failed</h2>
						<p>Hi ${data.userName || 'there'},</p>
						<p>We were unable to process your payment of <strong>${formattedAmount}</strong>.</p>
						<p>To continue your TenantFlow service without interruption, please update your payment method:</p>
						<a href="${data.retryUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
							Retry Payment
						</a>
						<p>If you have any questions, please contact our support team.</p>
						<p>Best regards,<br>The TenantFlow Team</p>
					</div>
				`
			})

			this.logger.log(`Payment failed email sent to ${data.to}`)
		} catch (error) {
			this.logger.error('Failed to send payment failed email', error)
			throw error
		}
	}

	async sendPaymentMethodSavedEmail(
		data: PaymentMethodSavedEmailData
	): Promise<void> {
		if (!this.isEmailServiceAvailable()) {
			this.logger.warn(
				'Email service not available - skipping payment method saved email'
			)
			return
		}

		try {
			if (!this.resend) {
				this.logger.warn('Email service not available - skipping email')
				return
			}

			await this.resend.emails.send({
				from: this.fromEmail,
				to: data.to,
				subject: 'Payment Method Successfully Added',
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #16a34a;">Payment Method Added</h2>
						<p>Hi ${data.userName || 'there'},</p>
						<p>We've successfully added your ${data.brand} ending in ${data.lastFour} to your TenantFlow account.</p>
						<p>Auto-billing has been enabled for your convenience. Future payments will be processed automatically.</p>
						<p>You can manage your payment methods anytime in your account settings.</p>
						<p>Best regards,<br>The TenantFlow Team</p>
					</div>
				`
			})

			this.logger.log(`Payment method saved email sent to ${data.to}`)
		} catch (error) {
			this.logger.error('Failed to send payment method saved email', error)
			throw error
		}
	}

	async sendSubscriptionCancelledEmail(
		data: SubscriptionCancelledEmailData
	): Promise<void> {
		if (!this.isEmailServiceAvailable()) {
			this.logger.warn(
				'Email service not available - skipping subscription cancelled email'
			)
			return
		}

		try {
			const formattedDate = data.cancellationDate.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})

			if (!this.resend) {
				this.logger.warn('Email service not available - skipping email')
				return
			}

			await this.resend.emails.send({
				from: this.fromEmail,
				to: data.to,
				subject: "Subscription Cancelled - We're Sorry to See You Go",
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #dc2626;">Subscription Cancelled</h2>
						<p>Hi ${data.userName || 'there'},</p>
						<p>Your ${data.planName} subscription has been cancelled as of ${formattedDate}.</p>
						<p>You'll continue to have access to your TenantFlow account until the end of your current billing period.</p>
						<p>We're sorry to see you go! If you have feedback on how we can improve, please let us know.</p>
						<p>You can reactivate your subscription anytime by visiting your account settings.</p>
						<p>Best regards,<br>The TenantFlow Team</p>
					</div>
				`
			})

			this.logger.log(`Subscription cancelled email sent to ${data.to}`)
		} catch (error) {
			this.logger.error('Failed to send subscription cancelled email', error)
			throw error
		}
	}

	async sendInvoiceReceiptEmail(data: {
		to: string
		userName?: string
		invoiceNumber: string | null
		amount: number
		currency: string
		invoiceUrl: string | null
	}): Promise<void> {
		if (!this.isEmailServiceAvailable()) {
			this.logger.warn(
				'Email service not available - skipping invoice receipt email'
			)
			return
		}

		try {
			const formattedAmount = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: data.currency.toUpperCase()
			}).format(data.amount / 100)

			if (!this.resend) {
				this.logger.warn('Email service not available - skipping email')
				return
			}

			await this.resend.emails.send({
				from: this.fromEmail,
				to: data.to,
				subject: `Receipt for ${data.invoiceNumber || 'Your Payment'}`,
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #16a34a;">Payment Received</h2>
						<p>Hi ${data.userName || 'there'},</p>
						<p>Thank you for your payment of <strong>${formattedAmount}</strong>!</p>
						${data.invoiceNumber ? `<p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>` : ''}
						<p>Your TenantFlow subscription has been successfully renewed.</p>
						${data.invoiceUrl ? `<p><a href="${data.invoiceUrl}" style="color: #2563eb;">Download your receipt</a></p>` : ''}
						<p>Thank you for choosing TenantFlow!</p>
						<p>Best regards,<br>The TenantFlow Team</p>
					</div>
				`
			})

			this.logger.log(`Invoice receipt email sent to ${data.to}`)
		} catch (error) {
			this.logger.error('Failed to send invoice receipt email', error)
			throw error
		}
	}

	async sendInvoicePaymentFailedEmail(data: {
		to: string
		userName?: string
		attemptNumber: number
		maxRetries: number
		nextRetryDate: Date | null
		updatePaymentMethodUrl: string
	}): Promise<void> {
		if (!this.isEmailServiceAvailable()) {
			this.logger.warn(
				'Email service not available - skipping invoice payment failed email'
			)
			return
		}

		try {
			const nextRetryText = data.nextRetryDate
				? `We'll automatically try again on ${data.nextRetryDate.toLocaleDateString('en-US')}.`
				: 'Please update your payment method to avoid service interruption.'

			if (!this.resend) {
				this.logger.warn('Email service not available - skipping email')
				return
			}

			await this.resend.emails.send({
				from: this.fromEmail,
				to: data.to,
				subject: 'Payment Failed - Update Payment Method',
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #dc2626;">Payment Failed (Attempt ${data.attemptNumber} of ${data.maxRetries})</h2>
						<p>Hi ${data.userName || 'there'},</p>
						<p>We were unable to process your subscription payment.</p>
						<p>${nextRetryText}</p>
						<a href="${data.updatePaymentMethodUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
							Update Payment Method
						</a>
						<p>If you continue to experience issues, please contact our support team.</p>
						<p>Best regards,<br>The TenantFlow Team</p>
					</div>
				`
			})

			this.logger.log(`Invoice payment failed email sent to ${data.to}`)
		} catch (error) {
			this.logger.error('Failed to send invoice payment failed email', error)
			throw error
		}
	}

	async sendAccountSuspendedEmail(
		data: AccountSuspendedEmailData
	): Promise<void> {
		if (!this.isEmailServiceAvailable()) {
			this.logger.warn(
				'Email service not available - skipping account suspended email'
			)
			return
		}

		try {
			const reason =
				data.suspensionReason === 'payment_failure'
					? 'due to repeated payment failures'
					: 'due to subscription cancellation'

			if (!this.resend) {
				this.logger.warn('Email service not available - skipping email')
				return
			}

			await this.resend.emails.send({
				from: this.fromEmail,
				to: data.to,
				subject: 'Account Access Suspended',
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #dc2626;">Account Suspended</h2>
						<p>Hi ${data.userName || 'there'},</p>
						<p>Your TenantFlow account has been suspended ${reason}.</p>
						<p>To restore access to your account, please update your payment information and contact our support team.</p>
						<p>We're here to help resolve this issue quickly.</p>
						<p>Best regards,<br>The TenantFlow Team</p>
					</div>
				`
			})

			this.logger.log(`Account suspended email sent to ${data.to}`)
		} catch (error) {
			this.logger.error('Failed to send account suspended email', error)
			throw error
		}
	}
}
