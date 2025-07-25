import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface EmailOptions {
	to: string
	subject: string
	html: string
	text?: string
	from?: string
}

interface SendEmailResponse {
	success: boolean
	messageId?: string
	error?: string
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name)
	private readonly resendApiKey: string
	private readonly fromEmail: string

	constructor(@Optional() private configService: ConfigService) {
		this.resendApiKey =
			this.configService?.get<string>('RESEND_API_KEY') ||
			process.env.RESEND_API_KEY ||
			''
		this.fromEmail =
			this.configService?.get<string>('FROM_EMAIL') ||
			process.env.FROM_EMAIL ||
			'noreply@tenantflow.app'

		if (!this.resendApiKey) {
			this.logger.warn(
				'RESEND_API_KEY not configured - email functionality will be disabled'
			)
		}
	}

	private isConfigured(): boolean {
		return !!this.resendApiKey
	}

	async sendEmail(options: EmailOptions): Promise<SendEmailResponse> {
		if (!this.isConfigured()) {
			this.logger.warn(
				'Email service not configured - skipping email send',
				{
					to: options.to,
					subject: options.subject
				}
			)
			return {
				success: false,
				error: 'Email service not configured'
			}
		}

		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.resendApiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					from: options.from || this.fromEmail,
					to: [options.to],
					subject: options.subject,
					html: options.html,
					text: options.text
				})
			})

			const result = (await response.json()) as {
				id?: string
				message?: string
			}

			if (!response.ok) {
				this.logger.error('Failed to send email via Resend', {
					status: response.status,
					statusText: response.statusText,
					error: result,
					to: options.to,
					subject: options.subject
				})
				return {
					success: false,
					error: result.message || 'Failed to send email'
				}
			}

			this.logger.log('Email sent successfully', {
				messageId: result.id,
				to: options.to,
				subject: options.subject
			})

			return {
				success: true,
				messageId: result.id
			}
		} catch (error) {
			this.logger.error('Error sending email', {
				error: error instanceof Error ? error.message : 'Unknown error',
				to: options.to,
				subject: options.subject
			})
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	}

	async sendWelcomeEmail(
		email: string,
		name: string
	): Promise<SendEmailResponse> {
		const subject = 'Welcome to TenantFlow - Confirm Your Email'
		const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to TenantFlow</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to TenantFlow!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Property management made simple</p>
    </div>
    
    <div style="background: white; padding: 40px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin: 0 0 20px 0;">Hi ${name},</h2>
        
        <p>Thank you for signing up for TenantFlow! We're excited to help you streamline your property management.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 30px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">🎉 Your free trial has started!</h3>
            <p style="margin: 0;">You now have access to all TenantFlow features. Start by adding your first property and inviting tenants.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL') || 'http://tenantflow.app'}/dashboard" 
               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Get Started →
            </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px; margin: 0;">
            If you have any questions, just reply to this email. We're here to help!<br>
            <strong>The TenantFlow Team</strong>
        </p>
    </div>
</body>
</html>`

		const text = `
Welcome to TenantFlow, ${name}!

Thank you for signing up! Your free trial has started and you now have access to all TenantFlow features.

Get started by visiting: ${this.configService.get('FRONTEND_URL') || 'http://tenantflow.app'}/dashboard

If you have any questions, just reply to this email. We're here to help!

The TenantFlow Team
        `

		return this.sendEmail({
			to: email,
			subject,
			html,
			text
		})
	}

	async sendPasswordResetEmail(
		email: string,
		resetUrl: string
	): Promise<SendEmailResponse> {
		const subject = 'Reset Your TenantFlow Password'
		const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; padding: 40px; border-radius: 8px; border: 1px solid #e1e5e9;">
        <h1 style="color: #333; margin: 0 0 20px 0;">Reset Your Password</h1>
        
        <p>We received a request to reset your TenantFlow account password.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Reset Password
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; margin: 0;">
            If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
            <span style="word-break: break-all;">${resetUrl}</span>
        </p>
    </div>
</body>
</html>`

		const text = `
Reset Your TenantFlow Password

We received a request to reset your account password.

Click this link to reset your password: ${resetUrl}

This link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.
        `

		return this.sendEmail({
			to: email,
			subject,
			html,
			text
		})
	}
}
