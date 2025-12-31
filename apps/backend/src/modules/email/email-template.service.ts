import { Injectable } from '@nestjs/common'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import { AppConfigService } from '../../config/app-config.service'

/**
 * Email Template Service - Handles Email-Specific Logic and Data Preparation
 *
 * Composable: Prepares data for rendering and sending
 * Configurable: Uses AppConfigService for dynamic values
 * Validated: Ensures required fields are present
 */
@Injectable()
export class EmailTemplateService {
	constructor(private readonly config: AppConfigService) {}

	/**
	 * Prepare payment success email data
	 */
	preparePaymentSuccessEmail(data: {
		customerEmail: string
		amount: number
		currency: string
		invoiceUrl: string | null
		invoicePdf: string | null
	}) {
		return {
			from: this.config.getResendFromEmail(),
			to: [data.customerEmail],
			subject: 'Payment Successful - TenantFlow',
			templateData: data
		}
	}

	/**
	 * Prepare payment failed email data
	 */
	preparePaymentFailedEmail(data: {
		customerEmail: string
		amount: number
		currency: string
		attemptCount: number
		invoiceUrl: string | null
		isLastAttempt: boolean
	}) {
		return {
			from: this.config.getResendFromEmail(),
			to: [data.customerEmail],
			subject: 'Payment Failed - TenantFlow',
			templateData: data
		}
	}

	/**
	 * Prepare payment reminder email data
	 */
	preparePaymentReminderEmail(data: {
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
	}) {
		const formattedAmount = (data.amount / 100).toFixed(2)
		const locationDisplay = data.unitNumber
			? `${data.propertyName} - Unit ${data.unitNumber}`
			: data.propertyName

		const isUrgent = data.daysUntilDue <= 3
		const subject = isUrgent
			? `Reminder: Rent Due in ${data.daysUntilDue} Days - ${data.currency.toUpperCase()} $${formattedAmount}`
			: `Upcoming Rent Payment Reminder - ${locationDisplay}`

		return {
			from: this.config.getResendFromEmail(),
			to: [data.tenantEmail],
			subject,
			templateData: data
		}
	}

	/**
	 * Prepare subscription canceled email data
	 */
	prepareSubscriptionCanceledEmail(data: {
		customerEmail: string
		subscriptionId: string
		cancelAtPeriodEnd: boolean
		currentPeriodEnd: Date | null
	}) {
		return {
			from: this.config.getResendFromEmail(),
			to: [data.customerEmail],
			subject: 'Subscription Canceled - TenantFlow',
			templateData: data
		}
	}

	/**
	 * Prepare tenant invitation email data
	 */
	prepareTenantInvitationEmail(data: {
		tenantEmail: string
		invitationUrl: string
		propertyName?: string
		unitNumber?: string
		ownerName?: string
		expiresAt: string
	}) {
		const locationDisplay = data.propertyName
			? data.unitNumber
				? `${data.propertyName} - Unit ${data.unitNumber}`
				: data.propertyName
			: 'TenantFlow'

		return {
			from: this.config.getResendFromEmail(),
			to: [data.tenantEmail],
			subject: `You're Invited to Join TenantFlow (${locationDisplay})`,
			templateData: data
		}
	}

	/**
	 * Prepare lease sent for signature email data
	 */
	prepareLeaseSentForSignatureEmail(data: {
		tenantEmail: string
		tenantName: string
		propertyName?: string
		unitNumber?: string
		ownerName?: string
		message?: string
		signUrl: string
	}) {
		return {
			from: this.config.getResendFromEmail(),
			to: [data.tenantEmail],
			subject: 'Action Required: Your Lease Agreement is Ready for Signature',
			templateData: {
				tenantName: data.tenantName,
				...(data.propertyName !== undefined && {
					propertyName: data.propertyName
				}),
				...(data.unitNumber !== undefined && { unitNumber: data.unitNumber }),
				...(data.ownerName !== undefined && { ownerName: data.ownerName }),
				...(data.message !== undefined && { message: data.message }),
				signUrl: data.signUrl
			}
		}
	}

	/**
	 * Prepare owner signed email data
	 */
	prepareOwnerSignedEmail(data: {
		tenantEmail: string
		tenantName: string
		ownerName?: string
		propertyName?: string
		signedAt: string
		signUrl: string
		tenantHasSigned: boolean
	}) {
		return {
			from: this.config.getResendFromEmail(),
			to: [data.tenantEmail],
			subject: data.tenantHasSigned
				? 'Your Lease is Now Active!'
				: 'Your Landlord Has Signed - Your Signature Needed',
			templateData: {
				tenantName: data.tenantName,
				...(data.ownerName !== undefined && { ownerName: data.ownerName }),
				...(data.propertyName !== undefined && {
					propertyName: data.propertyName
				}),
				signedAt: data.signedAt,
				signUrl: data.signUrl,
				tenantHasSigned: data.tenantHasSigned
			}
		}
	}

	/**
	 * Prepare tenant signed email data
	 */
	prepareTenantSignedEmail(data: {
		ownerEmail: string
		ownerName: string
		tenantName: string
		propertyName?: string
		signedAt: string
		dashboardUrl: string
		ownerHasSigned: boolean
	}) {
		return {
			from: this.config.getResendFromEmail(),
			to: [data.ownerEmail],
			subject: data.ownerHasSigned
				? 'Lease Activated - Tenant Has Signed!'
				: 'Tenant Has Signed - Your Signature Needed',
			templateData: {
				ownerName: data.ownerName,
				tenantName: data.tenantName,
				...(data.propertyName !== undefined && {
					propertyName: data.propertyName
				}),
				signedAt: data.signedAt,
				dashboardUrl: data.dashboardUrl,
				ownerHasSigned: data.ownerHasSigned
			}
		}
	}

	/**
	 * Prepare lease activated email data
	 */
	prepareLeaseActivatedEmail(data: {
		recipientEmail: string
		recipientName: string
		isOwner: boolean
		propertyName?: string
		rentAmount: number
		rentCurrency: string
		startDate: string
		portalUrl: string
	}) {
		return {
			from: this.config.getResendFromEmail(),
			to: [data.recipientEmail],
			subject: `Your Lease for ${data.propertyName || 'Your Property'} is Now Active`,
			templateData: {
				recipientName: data.recipientName,
				isOwner: data.isOwner,
				...(data.propertyName !== undefined && {
					propertyName: data.propertyName
				}),
				rentAmount: data.rentAmount,
				rentCurrency: data.rentCurrency,
				startDate: data.startDate,
				portalUrl: data.portalUrl
			}
		}
	}

	/**
	 * Prepare subscription failure alert email data
	 */
	prepareSubscriptionFailureAlertEmail(data: {
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
	}) {
		const unitDisplay = data.unitNumber
			? ` - Unit ${this.escapeHtml(data.unitNumber)}`
			: ''
		const rentFormatted = (data.rentAmount / 100).toFixed(2)
		const subject = `Action Required: Subscription Setup Failed for ${data.propertyName}`

		const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
		.content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
		.field { margin-bottom: 15px; }
		.label { font-weight: bold; color: #6B7280; font-size: 12px; text-transform: uppercase; }
		.value { margin-top: 5px; }
		.error-box { background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 6px; margin: 15px 0; }
		.action-btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h2>Action Required: Subscription Setup Failed</h2>
		</div>
		<div class="content">
			<p>Hi ${this.escapeHtml(data.recipientName)},</p>
			<p>We were unable to set up billing after ${data.retryCount} attempts for:</p>

			<div class="field">
				<div class="label">Property</div>
				<div class="value">${this.escapeHtml(data.propertyName)}${unitDisplay}</div>
			</div>

			<div class="field">
				<div class="label">Tenant</div>
				<div class="value">${this.escapeHtml(data.tenantName)}</div>
			</div>

			<div class="field">
				<div class="label">Monthly Rent</div>
				<div class="value">$${rentFormatted}</div>
			</div>

			<div class="error-box">
				<div class="label">Error Details</div>
				<div class="value">${this.escapeHtml(data.failureReason)}</div>
			</div>

			<a href="${this.escapeHtml(data.dashboardUrl)}" class="action-btn">View Lease Details</a>

			<p style="margin-top: 20px; color: #6B7280; font-size: 12px;">
				Lease ID: ${this.escapeHtml(data.leaseId)}
			</p>
		</div>
	</div>
</body>
</html>
		`.trim()

		return {
			from: this.config.getResendFromEmail(),
			to: [data.recipientEmail],
			subject,
			html
		}
	}

	/**
	 * Prepare contact form email data
	 */
	prepareContactFormEmail(dto: ContactFormRequest) {
		const teamEmail = this.config.getSupportEmail()
		const userEmail = dto.email

		return {
			teamEmail: {
				from: this.config.getResendFromEmail(),
				to: [teamEmail],
				subject: `New Contact Form: ${dto.subject}`,
				templateData: dto
			},
			userEmail: {
				from: this.config.getResendFromEmail(),
				to: [userEmail],
				subject: 'Thank you for contacting TenantFlow',
				templateData: dto
			}
		}
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
		const supportPhone = this.config.getSupportPhone()
		const phoneSection = supportPhone
			? `<p class="message">If you need immediate assistance, please call us at ${this.escapeHtml(supportPhone)}.</p>`
			: ''

		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
		.container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
		.header { text-align: center; margin-bottom: 30px; }
		.logo { font-size: 24px; font-weight: bold; color: #4F46E5; margin-bottom: 10px; }
		.title { font-size: 20px; color: #333; margin: 20px 0; }
		.message { color: #666; line-height: 1.8; margin: 20px 0; }
		.footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #999; text-align: center; }
		.highlight { background-color: #f0f8ff; padding: 15px; border-radius: 5px; border-left: 4px solid #4F46E5; margin: 20px 0; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo">TenantFlow</div>
			<h1 class="title">Thank You for Contacting Us</h1>
		</div>

		<div class="highlight">
			<p class="message"><strong>Hi ${name},</strong></p>
			<p class="message">Thank you for reaching out to TenantFlow. We've received your message regarding "${subject}" and our team will get back to you within 24 hours.</p>
		</div>

		<p class="message">Your inquiry is important to us, and we're committed to providing you with the best possible assistance for your property management needs.</p>

		${phoneSection}

		<div class="footer">
			<p>Best regards,<br>The TenantFlow Team</p>
			<p style="margin-top: 10px; font-size: 12px;">This is an automated response. Please do not reply to this email.</p>
		</div>
	</div>
</body>
</html>
		`.trim()
	}

	/**
	 * Escape HTML characters for safe display
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
	}
}
