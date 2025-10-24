import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'

export interface TenantInvitationEmailData {
	tenantEmail: string
	tenantFirstName: string | null
	invitationToken: string
	invitationLink: string
	propertyName?: string | undefined
	unitNumber?: string | undefined
}

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
	 * Send tenant invitation email
	 * Direct Resend API call, no abstractions
	 */
	async sendTenantInvitation(data: TenantInvitationEmailData): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping invitation email', {
				tenantEmail: data.tenantEmail
			})
			return
		}

		const tenantName = data.tenantFirstName || 'Tenant'
		const locationInfo = data.propertyName && data.unitNumber
			? `${data.propertyName} - Unit ${data.unitNumber}`
			: data.propertyName || 'your new property'

		const emailHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
					<h1 style="color: #0066cc; margin: 0 0 20px 0; font-size: 28px;">Welcome to TenantFlow!</h1>
					<p style="font-size: 16px; margin-bottom: 20px;">Hello ${tenantName},</p>
					<p style="font-size: 16px; margin-bottom: 20px;">You've been invited to access your tenant portal for <strong>${locationInfo}</strong>.</p>
					<p style="font-size: 16px; margin-bottom: 30px;">Click the button below to accept your invitation and create your account:</p>
					<div style="text-align: center; margin: 30px 0;">
						<a href="${data.invitationLink}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">Accept Invitation</a>
					</div>
					<p style="font-size: 14px; color: #666; margin-top: 30px;">Or copy and paste this link in your browser:</p>
					<p style="font-size: 14px; color: #0066cc; word-break: break-all;">${data.invitationLink}</p>
					<p style="font-size: 14px; color: #666; margin-top: 20px;"><strong>Note:</strong> This invitation will expire in 7 days.</p>
				</div>
				<div style="font-size: 14px; color: #666; text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
					<p>With your tenant portal, you can:</p>
					<ul style="list-style: none; padding: 0; margin: 10px 0;">
						<li>✓ View and pay rent online</li>
						<li>✓ Submit maintenance requests</li>
						<li>✓ Access your lease documents</li>
						<li>✓ Communicate with your property manager</li>
					</ul>
					<p style="margin-top: 20px;">Best regards,<br><strong>The TenantFlow Team</strong></p>
				</div>
			</body>
			</html>
		`

		try {
			const result = await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.tenantEmail],
				subject: 'Your Tenant Portal Invitation - TenantFlow',
				html: emailHtml
			})

			this.logger.log('Tenant invitation email sent successfully', {
				tenantEmail: data.tenantEmail,
				emailId: result.data?.id
			})
		} catch (error) {
			this.logger.error('Failed to send tenant invitation email', {
				error: error instanceof Error ? error.message : String(error),
				tenantEmail: data.tenantEmail
			})
			// Don't throw - email failure shouldn't block tenant creation
		}
	}

	/**
	 * Send invitation reminder email
	 * For tenants who haven't accepted after 3 days
	 */
	async sendInvitationReminder(data: TenantInvitationEmailData): Promise<void> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping reminder email')
			return
		}

		const tenantName = data.tenantFirstName || 'Tenant'

		const emailHtml = `
			<!DOCTYPE html>
			<html>
			<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #0066cc;">Reminder: Your TenantFlow Invitation is Waiting</h2>
				<p>Hello ${tenantName},</p>
				<p>We noticed you haven't accepted your tenant portal invitation yet.</p>
				<p>Your invitation will expire soon! Click below to get started:</p>
				<div style="text-align: center; margin: 30px 0;">
					<a href="${data.invitationLink}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Accept Invitation Now</a>
				</div>
				<p style="font-size: 14px; color: #666;">Best regards,<br>The TenantFlow Team</p>
			</body>
			</html>
		`

		try {
			await this.resend.emails.send({
				from: 'TenantFlow <noreply@tenantflow.app>',
				to: [data.tenantEmail],
				subject: 'Reminder: Accept Your Tenant Portal Invitation',
				html: emailHtml
			})

			this.logger.log('Invitation reminder sent', { tenantEmail: data.tenantEmail })
		} catch (error) {
			this.logger.error('Failed to send invitation reminder', {
				error: error instanceof Error ? error.message : String(error),
				tenantEmail: data.tenantEmail
			})
		}
	}
}
