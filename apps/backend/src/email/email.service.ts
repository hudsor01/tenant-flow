import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface EmailOptions {
	to: string
	subject: string
	text?: string
	html?: string
	template?: string
	templateData?: Record<string, unknown>
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name)

	constructor(private readonly configService: ConfigService) {
		// TODO: Initialize email configuration from configService
		const emailEnabled = this.configService.get<boolean>(
			'EMAIL_ENABLED',
			false
		)
		this.logger.log(`Email service initialized (enabled: ${emailEnabled})`)
	}

	async sendEmail(options: EmailOptions): Promise<void> {
		this.logger.log(
			`Sending email to ${options.to} with subject: ${options.subject}`
		)

		// TODO: Implement actual email sending logic
		// For now, just log the email details
		this.logger.debug('Email details:', {
			to: options.to,
			subject: options.subject,
			hasText: !!options.text,
			hasHtml: !!options.html,
			template: options.template
		})

		// Simulate email sending
		await new Promise(resolve => setTimeout(resolve, 100))
	}

	async sendWelcomeEmail(to: string, name: string): Promise<void> {
		await this.sendEmail({
			to,
			subject: 'Welcome to TenantFlow',
			html: `<h1>Welcome ${name}!</h1><p>Thank you for joining TenantFlow.</p>`
		})
	}

	async sendPasswordResetEmail(
		to: string,
		resetToken: string
	): Promise<void> {
		await this.sendEmail({
			to,
			subject: 'Password Reset Request',
			html: `<p>Click here to reset your password: <a href="/reset?token=${resetToken}">Reset Password</a></p>`
		})
	}
}
