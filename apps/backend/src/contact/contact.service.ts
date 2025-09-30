import {
	Injectable,
	InternalServerErrorException,
	Logger
} from '@nestjs/common'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import { Resend } from 'resend'

@Injectable()
export class ContactService {
	private readonly logger = new Logger(ContactService.name)
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

	async processContactForm(dto: ContactFormRequest) {
		try {
			// Send notification email to support team
			if (process.env.RESEND_API_KEY) {
				await this.sendNotificationToTeam(dto)
				await this.sendConfirmationToUser(dto)
			}

			// Log the submission
			this.logger.log(
				{
					contactForm: {
						name: dto.name,
						email: dto.email,
						company: dto.company,
						subject: dto.subject,
						type: dto.type,
						messageLength: dto.message.length
					}
				},
				`Contact form submission from ${dto.email}`
			)

			return {
				success: true,
				message:
					'Thank you for reaching out! Our team will review your message and get back to you within 4 hours.'
			}
		} catch (error) {
			this.logger.error(
				{
					error: error instanceof Error ? error.message : String(error),
					email: dto.email
				},
				'Failed to process contact form'
			)
			throw new InternalServerErrorException(
				'Contact submission failed [CONTACT-001]'
			)
		}
	}

	private async sendNotificationToTeam(dto: ContactFormRequest) {
		if (!this.resend) return

		const supportEmail = process.env.SUPPORT_EMAIL || 'support@tenantflow.app'

		const emailHtml = `
			<h2>New Contact Form Submission</h2>
			<p><strong>From:</strong> ${dto.name} (${dto.email})</p>
			${dto.company ? `<p><strong>Company:</strong> ${dto.company}</p>` : ''}
			${dto.phone ? `<p><strong>Phone:</strong> ${dto.phone}</p>` : ''}
			<p><strong>Interest:</strong> ${dto.subject}</p>
			<p><strong>How they heard about us:</strong> ${dto.type}</p>
			<hr>
			<h3>Message:</h3>
			<p>${dto.message.replace(/\n/g, '<br>')}</p>
		`

		try {
			await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [supportEmail],
				subject: `Contact Form: ${dto.subject} - ${dto.name}`,
				html: emailHtml
			})
		} catch (error) {
			this.logger.error('Failed to send team notification', error)
		}
	}

	private async sendConfirmationToUser(dto: ContactFormRequest) {
		if (!this.resend) return

		const emailHtml = `
			<h2>Thank you for contacting TenantFlow!</h2>
			<p>Hi ${dto.name},</p>
			<p>We've received your message and appreciate your interest in TenantFlow. Our team will review your inquiry and get back to you within 4 hours during business hours.</p>
			<p>Here's a summary of what you submitted:</p>
			<ul>
				<li><strong>Interest:</strong> ${dto.subject}</li>
				<li><strong>Message:</strong> ${dto.message}</li>
			</ul>
			<p>In the meantime, feel free to:</p>
			<ul>
				<li>Visit our <a href="https://tenantflow.app">website</a> to learn more</li>
				<li>Check out our <a href="https://tenantflow.app/pricing">pricing plans</a></li>
				<li>Read our <a href="https://tenantflow.app/features">features overview</a></li>
			</ul>
			<p>Best regards,<br>The TenantFlow Team</p>
		`

		try {
			await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [dto.email],
				subject: 'Thank you for contacting TenantFlow',
				html: emailHtml
			})
		} catch (error) {
			this.logger.error('Failed to send user confirmation', error)
		}
	}
}
