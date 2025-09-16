import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { Resend } from 'resend'
import type { Config } from '../config/config.schema'
import { MaintenanceRequestEmail } from './maintenance-request-email'

/**
 * Direct Email Service - Simplified Resend Integration
 * 
 * Replaces the complex EmailService with direct Resend API calls
 * following DRY, KISS, No Abstractions principles
 */
@Injectable()
export class DirectEmailService {
  private readonly resend: Resend
  private readonly fromAddress: string

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly logger: Logger
  ) {
    // Logger context handled automatically via app-level configuration
    const resendKey = this.configService.get('RESEND_API_KEY') as string
    if (!resendKey) {
      throw new InternalServerErrorException('RESEND_API_KEY is required for email functionality')
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
        react: MaintenanceRequestEmail({
          recipientEmail: params.to,
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
            stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
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
          <a href="${process.env.FRONTEND_URL}/dashboard" 
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
}