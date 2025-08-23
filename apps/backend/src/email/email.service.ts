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
  private readonly resend: Resend | null

  constructor() {
    if (!APP_CONFIG.EMAIL.RESEND_API_KEY) {
      this.logger.warn('RESEND_API_KEY not configured - email functionality disabled')
      this.resend = null
      return
    }
    
    this.resend = new Resend(APP_CONFIG.EMAIL.RESEND_API_KEY)
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured - skipping email send')
      return
    }

    try {
      const result = await this.resend.emails.send({
        from: emailData.from || APP_CONFIG.EMAIL.FROM_ADDRESS,
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html
      })

      if (!result) {
        throw new Error('Email send failed: No result returned')
      }

      const { data, error } = result

      if (error) {
        this.logger.error('Failed to send email:', error)
        throw new Error(`Email send failed: ${error.message}`)
      }

      this.logger.log(`Email sent successfully: ${data?.id}`)
    } catch (error) {
      this.logger.error('Email service error:', error)
      throw error
    }
  }

  async sendMaintenanceNotificationEmail(
    recipientEmail: string,
    title: string,
    propertyName: string,
    unitNumber: string,
    description: string,
    priority: string,
    actionUrl?: string
  ): Promise<void> {
    const priorityColor = this.getPriorityColor(priority)
    const urgencyText = priority === 'EMERGENCY' ? 'URGENT: ' : ''
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Maintenance Request Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0 0 10px 0;">TenantFlow</h1>
            <div style="background-color: ${priorityColor}; color: white; padding: 8px 12px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 14px;">
              ${urgencyText}${priority} Priority
            </div>
          </div>
          
          <h2 style="color: #2c3e50; margin-bottom: 20px;">New Maintenance Request</h2>
          
          <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #495057;">${title}</h3>
            
            <div style="margin-bottom: 15px;">
              <strong>Property:</strong> ${propertyName}<br>
              <strong>Unit:</strong> ${unitNumber}<br>
              <strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${priority}</span>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <strong>Description:</strong><br>
              ${description}
            </div>
          </div>
          
          ${actionUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              View Request Details
            </a>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d;">
            <p>This notification was sent from your TenantFlow property management system.</p>
            <p>If you have any questions, please contact support at ${APP_CONFIG.EMAIL.SUPPORT_EMAIL}</p>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to: recipientEmail,
      subject: `${urgencyText}Maintenance Request: ${title} - ${propertyName}`,
      html
    })
  }

  async sendPaymentFailedEmail(
    recipientEmail: string,
    subscriptionId: string,
    amount: number,
    currency: string,
    attemptCount: number,
    failureReason?: string,
    invoiceUrl?: string | null
  ): Promise<void> {
    const formattedAmount = (amount / 100).toFixed(2)
    const isLastAttempt = attemptCount >= 3
    const urgencyColor = isLastAttempt ? '#dc3545' : '#fd7e14' // Red for final, Orange for warning
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Failed - Action Required</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0 0 10px 0;">TenantFlow</h1>
            <div style="background-color: ${urgencyColor}; color: white; padding: 8px 12px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 14px;">
              ${isLastAttempt ? 'URGENT: Final Payment Attempt Failed' : 'Payment Failed'}
            </div>
          </div>
          
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Payment Processing Failed</h2>
          
          <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin-top: 0;">We were unable to process your payment for your TenantFlow subscription.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <strong>Payment Details:</strong><br>
              <div style="margin-top: 10px;">
                Amount: <strong>${currency.toUpperCase()} ${formattedAmount}</strong><br>
                Subscription ID: ${subscriptionId}<br>
                Attempt: ${attemptCount} of 3<br>
                ${failureReason ? `Reason: ${failureReason}<br>` : ''}
              </div>
            </div>
            
            ${isLastAttempt ? `
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <strong style="color: #856404;">⚠️ Important Notice:</strong>
              <p style="margin: 10px 0 0 0; color: #856404;">
                This was your final payment attempt. Your subscription will be canceled if payment is not received within 24 hours.
                Please update your payment method immediately to avoid service interruption.
              </p>
            </div>
            ` : `
            <p>We will automatically retry the payment in 24 hours. Please ensure your payment method is up to date to avoid service interruption.</p>
            `}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_CONFIG.FRONTEND_URL}/billing" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              Update Payment Method
            </a>
          </div>
          
          ${invoiceUrl ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${invoiceUrl}" style="color: #007bff; text-decoration: none; font-size: 14px;">View Invoice Details →</a>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d;">
            <p>If you believe this is an error or need assistance, please contact support at ${APP_CONFIG.EMAIL.SUPPORT_EMAIL}</p>
            <p>Thank you for using TenantFlow.</p>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to: recipientEmail,
      subject: isLastAttempt ? 'URGENT: Final Payment Attempt Failed - Action Required' : 'Payment Failed - Please Update Payment Method',
      html
    })
  }

  async sendPaymentSuccessEmail(
    recipientEmail: string,
    subscriptionId: string,
    amount: number,
    currency: string,
    invoiceUrl?: string | null,
    invoicePdf?: string | null
  ): Promise<void> {
    const formattedAmount = (amount / 100).toFixed(2)
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0 0 10px 0;">TenantFlow</h1>
            <div style="background-color: #28a745; color: white; padding: 8px 12px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 14px;">
              Payment Successful
            </div>
          </div>
          
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Thank You for Your Payment</h2>
          
          <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin-top: 0;">Your payment has been successfully processed.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <strong>Payment Details:</strong><br>
              <div style="margin-top: 10px;">
                Amount Paid: <strong>${currency.toUpperCase()} ${formattedAmount}</strong><br>
                Subscription ID: ${subscriptionId}<br>
                Date: ${new Date().toLocaleDateString()}<br>
              </div>
            </div>
            
            <p>Your subscription is active and all features are available for use.</p>
          </div>
          
          ${invoiceUrl || invoicePdf ? `
          <div style="text-align: center; margin: 30px 0;">
            ${invoiceUrl ? `
            <a href="${invoiceUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 0 5px;">
              View Invoice
            </a>
            ` : ''}
            ${invoicePdf ? `
            <a href="${invoicePdf}" style="background-color: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 0 5px;">
              Download PDF
            </a>
            ` : ''}
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d;">
            <p>This receipt is for your records. No action is required.</p>
            <p>If you have any questions about your subscription, please visit your <a href="${APP_CONFIG.FRONTEND_URL}/billing" style="color: #007bff;">billing dashboard</a> or contact support at ${APP_CONFIG.EMAIL.SUPPORT_EMAIL}</p>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to: recipientEmail,
      subject: `Payment Receipt - ${currency.toUpperCase()} ${formattedAmount}`,
      html
    })
  }

  async sendSubscriptionCanceledEmail(
    recipientEmail: string,
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
    currentPeriodEnd?: Date
  ): Promise<void> {
    const endDateFormatted = currentPeriodEnd ? currentPeriodEnd.toLocaleDateString() : 'immediately'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Canceled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0 0 10px 0;">TenantFlow</h1>
            <div style="background-color: #6c757d; color: white; padding: 8px 12px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 14px;">
              Subscription Canceled
            </div>
          </div>
          
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Your Subscription Has Been Canceled</h2>
          
          <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin-top: 0;">We're sorry to see you go. Your TenantFlow subscription has been canceled.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <strong>Cancellation Details:</strong><br>
              <div style="margin-top: 10px;">
                Subscription ID: ${subscriptionId}<br>
                ${cancelAtPeriodEnd ? `
                Access Until: <strong>${endDateFormatted}</strong><br>
                <small style="color: #6c757d;">You will continue to have full access until this date.</small>
                ` : `
                Status: <strong>Immediately Canceled</strong><br>
                <small style="color: #6c757d;">Your access has been terminated.</small>
                `}
              </div>
            </div>
            
            ${cancelAtPeriodEnd ? `
            <p>You can continue using all TenantFlow features until ${endDateFormatted}. After this date, your account will be downgraded to the free plan.</p>
            ` : ''}
            
            <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <strong>Want to Come Back?</strong>
              <p style="margin: 10px 0 0 0;">You can reactivate your subscription at any time from your billing dashboard. All your data has been preserved.</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_CONFIG.FRONTEND_URL}/billing" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              Manage Subscription
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d;">
            <p>We'd love to hear your feedback about why you're leaving. Please reply to this email or contact us at ${APP_CONFIG.EMAIL.SUPPORT_EMAIL}</p>
            <p>Thank you for being a TenantFlow customer.</p>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to: recipientEmail,
      subject: 'Your TenantFlow Subscription Has Been Canceled',
      html
    })
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'EMERGENCY':
        return '#dc3545' // Red
      case 'HIGH':
        return '#fd7e14' // Orange
      case 'MEDIUM':
        return '#ffc107' // Yellow
      case 'LOW':
        return '#28a745' // Green
      default:
        return '#6c757d' // Gray
    }
  }
}
