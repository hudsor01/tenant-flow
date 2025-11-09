import {
	Injectable,
	InternalServerErrorException,
	Logger,
	Inject
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { Resend } from 'resend'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import emailConfig from 'src/config/email.config'
import { EmailService } from '../email/email.service'

@Injectable()
export class ContactService {
	private readonly logger = new Logger(ContactService.name)
	private readonly resend: Resend | null

	constructor(
		@Inject(emailConfig.KEY)
		private emailOptions: ConfigType<typeof emailConfig>,
		private readonly emailService: EmailService
	) {
		const apiKey = this.emailOptions.resendApiKey
		if (!apiKey) {
			this.logger.warn(
				'RESEND_API_KEY not configured in emailOptions - email functionality will be disabled'
			)
			this.resend = null
		} else {
			this.resend = new Resend(apiKey)
		}
	}

	async processContactForm(dto: ContactFormRequest) {
		try {
			// Attempt to send emails only if Resend is configured
			if (this.resend) {
				// Use the EmailService to generate HTML content
				const teamEmailHtml =
					this.emailService.generateTeamNotificationHtml(dto)
				const userConfirmationHtml =
					this.emailService.generateUserConfirmationHtml(dto)

				// Attempt to send both emails concurrently, collect potential errors
				const [teamEmailError, confirmationEmailError] =
					await Promise.allSettled([
						this.sendEmailToTeam(teamEmailHtml, dto),
						this.sendEmailToUser(userConfirmationHtml, dto)
					])

				// Log errors if they occurred, but don't stop the process
				if (teamEmailError.status === 'rejected') {
					this.logger.error(
						`Failed to send team notification for ${dto.email}: ${teamEmailError.reason}`,
						teamEmailError.reason?.stack, // Log stack trace if available
						'ContactService'
					)
				}
				if (confirmationEmailError.status === 'rejected') {
					this.logger.error(
						`Failed to send user confirmation to ${dto.email}: ${confirmationEmailError.reason}`,
						confirmationEmailError.reason?.stack,
						'ContactService'
					)
				}
			}

			// Log the successful submission attempt regardless of email status
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
				`Contact form submission processed from ${dto.email}`
			)

			return {
				success: true,
				message:
					'Thank you for reaching out! Our team will review your message and get back to you within 4 hours.'
			}
		} catch (error) {
			// This catch block handles unexpected errors *before* attempting to send emails
			// Errors during email sending are handled by Promise.allSettled
			this.logger.error(
				{
					error: error instanceof Error ? error.message : String(error),
					email: dto.email
				},
				'Unexpected error during contact form processing',
				'ContactService'
			)
			throw new InternalServerErrorException(
				'Contact submission failed [CONTACT-001]'
			)
		}
	}

	private async sendEmailToTeam(htmlContent: string, dto: ContactFormRequest) {
		// This method assumes this.resend is not null (checked in processContactForm)
		const supportEmail =
			this.emailOptions.supportEmail || 'support@tenantflow.app'

		await this.resend!.emails.send({
			from: this.emailOptions.fromAddress || 'noreply@tenantflow.app', // Use config for from address too
			to: [supportEmail],
			subject: `Contact Form: ${dto.subject} - ${dto.name}`,
			html: htmlContent
		})
	}

	private async sendEmailToUser(htmlContent: string, dto: ContactFormRequest) {
		// This method assumes this.resend is not null (checked in processContactForm)
		await this.resend!.emails.send({
			from: this.emailOptions.fromAddress || 'noreply@tenantflow.app',
			to: [dto.email],
			subject: 'Thank you for contacting TenantFlow',
			html: htmlContent
		})
	}
}
