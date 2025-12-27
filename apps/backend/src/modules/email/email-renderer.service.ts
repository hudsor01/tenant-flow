import { Injectable } from '@nestjs/common'
import { render, pretty } from '@react-email/render'
import { PaymentFailedEmail } from '../../emails/payment-failed-email'
import { PaymentSuccessEmail } from '../../emails/payment-success-email'
import { PaymentReminderEmail } from '../../emails/payment-reminder-email'
import { SubscriptionCanceledEmail } from '../../emails/subscription-canceled-email'
import { TenantInvitationEmail } from '../../emails/tenant-invitation-email'
import {
	LeaseActivatedEmail,
	LeaseOwnerSignedEmail,
	LeaseSentForSignatureEmail,
	LeaseTenantSignedEmail
} from '../../emails/lease-signature-email'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Email Renderer Service - React Email Template Rendering
 *
 * Uses @react-email/render to produce HTML suitable for Resend.
 */
@Injectable()
export class EmailRendererService {
	constructor(private readonly logger: AppLogger) {}

	async renderPaymentSuccessEmail(data: {
		customerEmail: string
		amount: number
		currency: string
		invoiceUrl: string | null
		invoicePdf: string | null
	}): Promise<string> {
		try {
			const html = await render(PaymentSuccessEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render payment success email', {
				error: error instanceof Error ? error.message : String(error),
				customerEmail: data.customerEmail
			})
			throw error
		}
	}

	async renderPaymentFailedEmail(data: {
		customerEmail: string
		amount: number
		currency: string
		attemptCount: number
		invoiceUrl: string | null
		isLastAttempt: boolean
	}): Promise<string> {
		try {
			const html = await render(PaymentFailedEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render payment failed email', {
				error: error instanceof Error ? error.message : String(error),
				customerEmail: data.customerEmail
			})
			throw error
		}
	}

	async renderPaymentReminderEmail(data: {
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
	}): Promise<string> {
		try {
			const html = await render(PaymentReminderEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render payment reminder email', {
				error: error instanceof Error ? error.message : String(error),
				tenantEmail: data.tenantEmail
			})
			throw error
		}
	}

	async renderSubscriptionCanceledEmail(data: {
		customerEmail: string
		subscriptionId: string
		cancelAtPeriodEnd: boolean
		currentPeriodEnd: Date | null
	}): Promise<string> {
		try {
			const html = await render(SubscriptionCanceledEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render subscription canceled email', {
				error: error instanceof Error ? error.message : String(error),
				customerEmail: data.customerEmail
			})
			throw error
		}
	}

	async renderTenantInvitationEmail(data: {
		tenantEmail: string
		invitationUrl: string
		propertyName?: string
		unitNumber?: string
		ownerName?: string
		expiresAt: string
	}): Promise<string> {
		try {
			const html = await render(TenantInvitationEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render tenant invitation email', {
				error: error instanceof Error ? error.message : String(error),
				tenantEmail: data.tenantEmail
			})
			throw error
		}
	}

	async renderLeaseSentForSignatureEmail(data: {
		tenantName: string
		propertyName?: string
		unitNumber?: string
		ownerName?: string
		message?: string
		signUrl: string
	}): Promise<string> {
		try {
			const html = await render(LeaseSentForSignatureEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render lease sent for signature email', {
				error: error instanceof Error ? error.message : String(error),
				tenantName: data.tenantName
			})
			throw error
		}
	}

	async renderOwnerSignedEmail(data: {
		tenantName: string
		ownerName?: string
		propertyName?: string
		signedAt: string
		signUrl: string
		tenantHasSigned: boolean
	}): Promise<string> {
		try {
			const html = await render(LeaseOwnerSignedEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render owner signed email', {
				error: error instanceof Error ? error.message : String(error),
				tenantName: data.tenantName
			})
			throw error
		}
	}

	async renderTenantSignedEmail(data: {
		ownerName: string
		tenantName: string
		propertyName?: string
		signedAt: string
		dashboardUrl: string
		ownerHasSigned: boolean
	}): Promise<string> {
		try {
			const html = await render(LeaseTenantSignedEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render tenant signed email', {
				error: error instanceof Error ? error.message : String(error),
				ownerName: data.ownerName
			})
			throw error
		}
	}

	async renderLeaseActivatedEmail(data: {
		recipientName: string
		isOwner: boolean
		propertyName?: string
		rentAmount: number
		rentCurrency: string
		startDate: string
		portalUrl: string
	}): Promise<string> {
		try {
			const html = await render(LeaseActivatedEmail(data))
			return pretty(html)
		} catch (error) {
			this.logger.error('Failed to render lease activated email', {
				error: error instanceof Error ? error.message : String(error),
				recipientName: data.recipientName,
				isOwner: data.isOwner
			})
			throw error
		}
	}
}
