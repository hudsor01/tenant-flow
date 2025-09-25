import {
	Injectable,
	InternalServerErrorException,
	Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'
import type { Config } from '../config/config.schema'

/**
 * Direct Email Service - Simplified Resend Integration
 *
 * Replaces the complex EmailService with direct Resend API calls
 * following DRY, KISS, No Abstractions principles
 */
@Injectable()
export class DirectEmailService {
	private readonly logger = new Logger(DirectEmailService.name)
	private readonly resend: Resend
	private readonly fromAddress: string

	constructor(private readonly configService: ConfigService<Config>) {
		const resendKey = this.configService.get('TEST_RESEND_API_KEY') as string
		if (!resendKey) {
			throw new InternalServerErrorException(
				'TEST_RESEND_API_KEY is required for email functionality'
			)
		}

		this.resend = new Resend(resendKey)
		this.fromAddress = 'TenantFlow <noreply@tenantflow.app>'

		this.logger.log(
			{
				email: {
					provider: 'resend',
					initialized: true,
					fromAddress: this.fromAddress
				}
			},
			'Direct email service initialized with Resend'
		)
	}

	/**
	 * Send maintenance request notification
	 * Replaces complex EmailService.sendMaintenanceNotificationEmail()
	 */
	async sendMaintenanceNotification(params: {
		to: string
		title: string
		propertyName: string
		unitNumber: string
		description: string
		priority: 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'
		actionUrl?: string
	}): Promise<void> {
		try {
			const { data, error } = await this.resend.emails.send({
				from: this.fromAddress,
				to: [params.to],
				subject: `${params.priority === 'EMERGENCY' ? 'URGENT: ' : ''}Maintenance Request: ${params.title} - ${params.propertyName}`,
				html: this.createMaintenanceRequestHTML({
					title: params.title,
					propertyName: params.propertyName,
					unitNumber: params.unitNumber,
					description: params.description,
					priority: params.priority,
					actionUrl: params.actionUrl
				})
			})

			if (error) {
				throw new InternalServerErrorException(`Resend error: ${error.message}`)
			}

			this.logger.log(
				{
					email: {
						type: 'maintenance_notification',
						messageId: data?.id,
						to: params.to,
						priority: params.priority,
						property: params.propertyName
					}
				},
				`Maintenance notification sent: ${data?.id}`
			)
		} catch (error) {
			this.logger.error(
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error),
						stack:
							process.env.NODE_ENV !== 'production' && error instanceof Error
								? error.stack
								: undefined
					},
					email: {
						type: 'maintenance_notification',
						to: params.to,
						priority: params.priority
					}
				},
				'Failed to send maintenance notification'
			)
			throw error
		}
	}

	/**
	 * Send simple HTML email (for basic notifications)
	 * Direct replacement for basic email needs
	 */
	async sendSimpleEmail(params: {
		to: string
		subject: string
		html: string
	}): Promise<void> {
		try {
			const { data, error } = await this.resend.emails.send({
				from: this.fromAddress,
				to: [params.to],
				subject: params.subject,
				html: params.html
			})

			if (error) {
				throw new InternalServerErrorException(`Resend error: ${error.message}`)
			}

			this.logger.log(`Simple email sent: ${data?.id}`)
		} catch (error) {
			this.logger.error(`Failed to send simple email: ${error}`)
			throw error
		}
	}

	/**
	 * Send welcome email for new users
	 * Simple HTML template for immediate use
	 */
	async sendWelcomeEmail(email: string, name: string): Promise<void> {
		const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2c3e50;">Welcome to TenantFlow!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for signing up for TenantFlow. Your account is ready and you can start managing your properties right away.</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Get Started
          </a>
        </p>
        <p>If you have any questions, feel free to reach out to us at support@tenantflow.app</p>
        <p>Best regards,<br>The TenantFlow Team</p>
      </div>
    `

		await this.sendSimpleEmail({
			to: email,
			subject: 'Welcome to TenantFlow!',
			html
		})
	}

	/**
	 * Create HTML template for maintenance request emails
	 */
	private createMaintenanceRequestHTML(params: {
		title: string
		propertyName: string
		unitNumber: string
		description: string
		priority: 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'
		actionUrl?: string
	}): string {
		const priorityColor = {
			EMERGENCY: '#dc2626',
			HIGH: '#ef4444',
			MEDIUM: '#f59e0b',
			LOW: '#22c55e'
		}[params.priority]

		return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maintenance Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: #1f2937; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { padding: 24px; }
    .priority-badge { display: inline-block; padding: 6px 12px; border-radius: 16px; color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .info-row { margin: 16px 0; }
    .label { font-weight: 600; color: #374151; margin-bottom: 4px; }
    .value { color: #6b7280; }
    .description { background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0; }
    .action-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .footer { background: #f3f4f6; padding: 16px 24px; border-radius: 0 0 8px 8px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Maintenance Request</h1>
    </div>
    <div class="content">
      <div class="info-row">
        <div class="label">Priority</div>
        <div class="value">
          <span class="priority-badge" style="background-color: ${priorityColor};">
            ${params.priority}
          </span>
        </div>
      </div>
      <div class="info-row">
        <div class="label">Title</div>
        <div class="value">${params.title}</div>
      </div>
      <div class="info-row">
        <div class="label">Property</div>
        <div class="value">${params.propertyName} - Unit ${params.unitNumber}</div>
      </div>
      <div class="info-row">
        <div class="label">Description</div>
        <div class="description">${params.description}</div>
      </div>
      ${
				params.actionUrl
					? `
      <div class="info-row">
        <a href="${params.actionUrl}" class="action-button">View Request</a>
      </div>
      `
					: ''
			}
    </div>
    <div class="footer">
      <p style="margin: 0;">This is an automated notification from TenantFlow.</p>
    </div>
  </div>
</body>
</html>`
	}
}
