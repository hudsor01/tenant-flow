import { Injectable } from '@nestjs/common'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import { AppLogger } from '../../logger/app-logger.service'
import { EmailRendererService } from './email-renderer.service'
import { EmailSenderService } from './email-sender.service'
import { EmailTemplateService } from './email-template.service'

/**
 * Email Service - Facade for Email Operations
 *
 * Coordinates template preparation, HTML rendering, and delivery.
 */
@Injectable()
export class EmailService {
	constructor(
		private readonly renderer: EmailRendererService,
		private readonly sender: EmailSenderService,
		private readonly template: EmailTemplateService,
		private readonly logger: AppLogger
	) {}

	async sendPaymentSuccessEmail(data: {
		customerEmail: string
		amount: number
		currency: string
		invoiceUrl: string | null
		invoicePdf: string | null
	}): Promise<void> {
		try {
			const emailData = this.template.preparePaymentSuccessEmail(data)
			const html = await this.renderer.renderPaymentSuccessEmail(
				emailData.templateData
			)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html
			})
		} catch (error) {
			this.logger.error('Failed to send payment success email', {
				error: error instanceof Error ? error.message : String(error),
				customerEmail: data.customerEmail
			})
			throw error
		}
	}

	async sendPaymentFailedEmail(data: {
		customerEmail: string
		amount: number
		currency: string
		attemptCount: number
		invoiceUrl: string | null
		isLastAttempt: boolean
	}): Promise<void> {
		try {
			const emailData = this.template.preparePaymentFailedEmail(data)
			const html = await this.renderer.renderPaymentFailedEmail(
				emailData.templateData
			)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html
			})
		} catch (error) {
			this.logger.error('Failed to send payment failed email', {
				error: error instanceof Error ? error.message : String(error),
				customerEmail: data.customerEmail
			})
			throw error
		}
	}

	async sendSubscriptionCanceledEmail(data: {
		customerEmail: string
		subscriptionId: string
		cancelAtPeriodEnd: boolean
		currentPeriodEnd: Date | null
	}): Promise<void> {
		try {
			const emailData = this.template.prepareSubscriptionCanceledEmail(data)
			const html = await this.renderer.renderSubscriptionCanceledEmail(
				emailData.templateData
			)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html
			})
		} catch (error) {
			this.logger.error('Failed to send subscription canceled email', {
				error: error instanceof Error ? error.message : String(error),
				customerEmail: data.customerEmail
			})
			throw error
		}
	}

	async sendTenantInvitationEmail(data: {
		tenantEmail: string
		invitationUrl: string
		propertyName?: string
		unitNumber?: string
		ownerName?: string
		expiresAt: string
	}): Promise<void> {
		try {
			const emailData = this.template.prepareTenantInvitationEmail(data)
			const html = await this.renderer.renderTenantInvitationEmail(
				emailData.templateData
			)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html
			})
		} catch (error) {
			this.logger.error('Failed to send tenant invitation email', {
				error: error instanceof Error ? error.message : String(error),
				tenantEmail: data.tenantEmail
			})
			throw error
		}
	}

	async sendLeaseSentForSignatureEmail(data: {
		tenantEmail: string
		tenantName: string
		propertyName?: string
		unitNumber?: string
		ownerName?: string
		message?: string
		signUrl: string
	}): Promise<void> {
		try {
			const emailData = this.template.prepareLeaseSentForSignatureEmail(data)
			const html = await this.renderer.renderLeaseSentForSignatureEmail(
				emailData.templateData
			)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html
			})
		} catch (error) {
			this.logger.error('Failed to send lease sent for signature email', {
				error: error instanceof Error ? error.message : String(error),
				tenantEmail: data.tenantEmail
			})
			throw error
		}
	}

	async sendOwnerSignedEmail(data: {
		tenantEmail: string
		tenantName: string
		ownerName?: string
		propertyName?: string
		signedAt: string
		signUrl: string
		tenantHasSigned: boolean
	}): Promise<void> {
		try {
			const emailData = this.template.prepareOwnerSignedEmail(data)
			const html = await this.renderer.renderOwnerSignedEmail(
				emailData.templateData
			)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html
			})
		} catch (error) {
			this.logger.error('Failed to send owner signed email', {
				error: error instanceof Error ? error.message : String(error),
				tenantEmail: data.tenantEmail
			})
			throw error
		}
	}

	async sendTenantSignedEmail(data: {
		ownerEmail: string
		ownerName: string
		tenantName: string
		propertyName?: string
		signedAt: string
		dashboardUrl: string
		ownerHasSigned: boolean
	}): Promise<void> {
		try {
			const emailData = this.template.prepareTenantSignedEmail(data)
			const html = await this.renderer.renderTenantSignedEmail(
				emailData.templateData
			)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html
			})
		} catch (error) {
			this.logger.error('Failed to send tenant signed email', {
				error: error instanceof Error ? error.message : String(error),
				ownerEmail: data.ownerEmail
			})
			throw error
		}
	}

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
		try {
			const emailData = this.template.prepareLeaseActivatedEmail(data)
			const html = await this.renderer.renderLeaseActivatedEmail(
				emailData.templateData
			)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html
			})
		} catch (error) {
			this.logger.error('Failed to send lease activated email', {
				error: error instanceof Error ? error.message : String(error),
				recipientEmail: data.recipientEmail
			})
			throw error
		}
	}

	async sendSubscriptionFailureAlertEmail(data: {
		recipientEmail: string
		recipientName: string
		leaseId: string
		propertyName: string
		unitNumber?: string
		tenantName: string
		rentAmount: number
		failureReason: string
		retryCount: number
		dashboardUrl: string
	}): Promise<void> {
		try {
			const emailData = this.template.prepareSubscriptionFailureAlertEmail(data)

			await this.sender.sendEmail({
				from: emailData.from,
				to: emailData.to,
				subject: emailData.subject,
				html: emailData.html
			})
		} catch (error) {
			this.logger.error('Failed to send subscription failure alert email', {
				error: error instanceof Error ? error.message : String(error),
				recipientEmail: data.recipientEmail,
				leaseId: data.leaseId
			})
			throw error
		}
	}

	async sendContactFormEmail(dto: ContactFormRequest): Promise<void> {
		try {
			const emailData = this.template.prepareContactFormEmail(dto)

			const teamHtml = this.template.generateTeamNotificationHtml(dto)
			await this.sender.sendEmail({
				from: emailData.teamEmail.from,
				to: emailData.teamEmail.to,
				subject: emailData.teamEmail.subject,
				html: teamHtml
			})

			const userHtml = this.template.generateUserConfirmationHtml(dto)
			await this.sender.sendEmail({
				from: emailData.userEmail.from,
				to: emailData.userEmail.to,
				subject: emailData.userEmail.subject,
				html: userHtml
			})

			this.logger.log('Contact form emails sent successfully', {
				userEmail: dto.email
			})
		} catch (error) {
			this.logger.error('Failed to send contact form emails', {
				error: error instanceof Error ? error.message : String(error),
				userEmail: dto.email
			})
			throw error
		}
	}
}
