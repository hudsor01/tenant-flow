import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { Prisma } from '@repo/database'

export interface SubscriptionEmailData {
  userId: string
  userEmail: string
  userName?: string
  subscriptionId: string
  planType: string
  trialEndDate?: Date
  billingAmount?: number
  billingInterval?: 'monthly' | 'annual'
}

@Injectable()
export class SubscriptionNotificationService {
  private readonly logger = new Logger(SubscriptionNotificationService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Send trial ending warning (3 days before trial ends)
   */
  async sendTrialEndingWarning(data: SubscriptionEmailData): Promise<void> {
    try {
      const daysLeft = data.trialEndDate ? 
        Math.ceil((data.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 3

      const emailContent = {
        to: data.userEmail,
        subject: `Your TenantFlow trial ends in ${daysLeft} days`,
        html: `
          <h2>Your trial ends in ${daysLeft} days</h2>
          <p>Hi ${data.userName || 'Valued Customer'},</p>
          <p>Your TenantFlow trial is ending soon. Add a payment method to continue using premium features:</p>
          <ul>
            <li>Export all your property data</li>
            <li>Generate detailed tenant reports</li>
            <li>Advanced analytics dashboard</li>
            <li>Bulk operations and automation</li>
            <li>Priority customer support</li>
          </ul>
          <a href="${this.getAppUrl()}/billing/add-payment-method" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Add Payment Method</a>
        `
      }

      await this.emailService.sendEmail(emailContent)
      
      // Log for tracking
      await this.logNotification({
        userId: data.userId,
        type: 'TRIAL_ENDING_WARNING',
        subscriptionId: data.subscriptionId,
        metadata: { daysLeft }
      })

      this.logger.log(`Trial ending warning sent to ${data.userEmail}`)
    } catch (error) {
      this.logger.error(`Failed to send trial ending warning to ${data.userEmail}:`, error)
    }
  }

  /**
   * Send payment method required notification (when trial ends without payment)
   */
  async sendPaymentMethodRequired(data: SubscriptionEmailData): Promise<void> {
    try {
      const blockedFeatures = [
        'Export property data',
        'Generate reports',
        'Advanced analytics',
        'Premium support'
      ]

      const emailContent = {
        to: data.userEmail,
        subject: 'Add a payment method to continue using TenantFlow',
        html: `
          <h2>Payment Method Required</h2>
          <p>Hi ${data.userName || 'Valued Customer'},</p>
          <p>Your trial has ended. Add a payment method to continue using TenantFlow.</p>
          <ul>${blockedFeatures.map((f: string) => `<li>${f}</li>`).join('')}</ul>
          <a href="${this.getAppUrl()}/billing/add-payment-method" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Add Payment Method</a>
        `,
        data: {
          userName: data.userName || 'Valued Customer',
          planType: data.planType,
          trialEndDate: data.trialEndDate?.toLocaleDateString(),
          addPaymentUrl: `${this.getAppUrl()}/billing/add-payment-method`,
          customerPortalUrl: `${this.getAppUrl()}/billing/portal`,
          loginUrl: `${this.getAppUrl()}/login`,
          blockedFeatures: [
            'Data export and backups',
            'Advanced reporting',
            'Bulk property operations',
            'API access',
            'Premium integrations'
          ],
          benefits: [
            'Instant access to all premium features',
            'Export and backup all your data',
            'Advanced analytics and insights',
            'Priority customer support',
            'Cancel anytime'
          ]
        }
      }

      await this.emailService.sendEmail(emailContent)
      
      await this.logNotification({
        userId: data.userId,
        type: 'PAYMENT_METHOD_REQUIRED',
        subscriptionId: data.subscriptionId,
        metadata: { trialEndDate: data.trialEndDate }
      })

      this.logger.log(`Payment method required email sent to ${data.userEmail}`)
    } catch (error) {
      this.logger.error(`Failed to send payment method required email to ${data.userEmail}:`, error)
    }
  }

  /**
   * Send subscription activated/reactivated email
   */
  async sendSubscriptionActivated(data: SubscriptionEmailData): Promise<void> {
    try {
      const isReactivation = await this.isReactivation(data.subscriptionId)
      const features = [
        'Full property management',
        'Advanced tenant portal',
        'Export capabilities',
        'Premium support'
      ]
      
      const emailContent = {
        to: data.userEmail,
        subject: isReactivation ? 
          'Welcome back! Your TenantFlow subscription is active' : 
          'Welcome to TenantFlow! Your subscription is active',
        html: `
          <h2>${isReactivation ? 'Subscription Reactivated' : 'Subscription Activated'}</h2>
          <p>Hi ${data.userName || 'Valued Customer'},</p>
          <p>Your ${data.planType} subscription is now active! You have full access to all premium features.</p>
          <ul>${features.map((f: string) => `<li>${f}</li>`).join('')}</ul>
          <a href="${this.getAppUrl()}/dashboard" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
        `,
        data: {
          userName: data.userName || 'Valued Customer',
          planType: data.planType,
          billingAmount: data.billingAmount,
          billingInterval: data.billingInterval,
          dashboardUrl: `${this.getAppUrl()}/dashboard`,
          billingPortalUrl: `${this.getAppUrl()}/billing/portal`,
          supportUrl: `${this.getAppUrl()}/support`,
          features: [
            'Export all your property and tenant data',
            'Generate comprehensive reports',
            'Advanced analytics and insights',
            'Bulk operations and automation',
            'API access for integrations',
            'Priority customer support'
          ],
          nextSteps: isReactivation ? [
            'Access your dashboard to view all your data',
            'Export any reports you need',
            'Contact support if you need assistance'
          ] : [
            'Complete your property portfolio setup',
            'Invite team members to collaborate',
            'Explore advanced features and integrations',
            'Schedule a demo with our team if needed'
          ]
        }
      }

      await this.emailService.sendEmail(emailContent)
      
      await this.logNotification({
        userId: data.userId,
        type: isReactivation ? 'SUBSCRIPTION_REACTIVATED' : 'SUBSCRIPTION_ACTIVATED',
        subscriptionId: data.subscriptionId,
        metadata: { 
          planType: data.planType,
          isReactivation 
        }
      })

      this.logger.log(`Subscription ${isReactivation ? 'reactivation' : 'activation'} email sent to ${data.userEmail}`)
    } catch (error) {
      this.logger.error(`Failed to send subscription activation email to ${data.userEmail}:`, error)
    }
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailed(data: SubscriptionEmailData & { 
    attemptCount: number,
    amountDue: number,
    currency: string,
    nextRetryDate?: Date 
  }): Promise<void> {
    try {
      const gracePeriodDays = 7 // Default grace period
      
      const emailContent = {
        to: data.userEmail,
        subject: 'Payment failed - Update your payment method',
        html: `
          <h2>Payment Failed - Attempt ${data.attemptCount}</h2>
          <p>Hi ${data.userName || 'Valued Customer'},</p>
          <p>We couldn't process your payment of ${data.amountDue} ${data.currency}. Please update your payment method to avoid service interruption.</p>
          <p>Grace period: ${gracePeriodDays} days remaining</p>
          <a href="${this.getAppUrl()}/billing" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Update Payment Method</a>
        `,
        data: {
          userName: data.userName || 'Valued Customer',
          planType: data.planType,
          amountDue: (data.amountDue / 100).toFixed(2), // Convert from cents
          currency: data.currency.toUpperCase(),
          attemptCount: data.attemptCount,
          nextRetryDate: data.nextRetryDate?.toLocaleDateString(),
          updatePaymentUrl: `${this.getAppUrl()}/billing/update-payment-method`,
          customerPortalUrl: `${this.getAppUrl()}/billing/portal`,
          loginUrl: `${this.getAppUrl()}/login`,
          gracePeriodDays: 7,
          consequences: [
            'Your subscription will be paused if payment continues to fail',
            'Access to premium features will be restricted',
            'Data export capabilities will be disabled',
            'Advanced analytics will be unavailable'
          ]
        }
      }

      await this.emailService.sendEmail(emailContent)
      
      await this.logNotification({
        userId: data.userId,
        type: 'PAYMENT_FAILED',
        subscriptionId: data.subscriptionId,
        metadata: { 
          attemptCount: data.attemptCount,
          amountDue: data.amountDue,
          currency: data.currency
        }
      })

      this.logger.log(`Payment failed email sent to ${data.userEmail}`)
    } catch (error) {
      this.logger.error(`Failed to send payment failed email to ${data.userEmail}:`, error)
    }
  }

  /**
   * Send upcoming invoice notification (7 days before renewal)
   */
  async sendUpcomingInvoice(data: SubscriptionEmailData & {
    invoiceAmount: number,
    currency: string,
    invoiceDate: Date
  }): Promise<void> {
    try {
      const emailContent = {
        to: data.userEmail,
        subject: 'Your TenantFlow subscription renews soon',
        html: `
          <h2>Upcoming Invoice</h2>
          <p>Hi ${data.userName || 'Valued Customer'},</p>
          <p>Your next invoice of ${data.invoiceAmount} ${data.currency} will be charged soon.</p>
          <p>Billing interval: ${data.billingInterval}</p>
          <a href="${this.getAppUrl()}/billing" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Manage Billing</a>
        `,
        data: {
          userName: data.userName || 'Valued Customer',
          planType: data.planType,
          invoiceAmount: (data.invoiceAmount / 100).toFixed(2),
          currency: data.currency.toUpperCase(),
          invoiceDate: data.invoiceDate.toLocaleDateString(),
          billingInterval: data.billingInterval,
          customerPortalUrl: `${this.getAppUrl()}/billing/portal`,
          loginUrl: `${this.getAppUrl()}/login`,
          usage: {
            propertiesManaged: await this.getUserPropertyCount(data.userId),
            tenantsActive: await this.getUserTenantCount(data.userId),
            reportsGenerated: await this.getUserReportCount(data.userId, 30) // Last 30 days
          }
        }
      }

      await this.emailService.sendEmail(emailContent)
      
      await this.logNotification({
        userId: data.userId,
        type: 'UPCOMING_INVOICE',
        subscriptionId: data.subscriptionId,
        metadata: { 
          invoiceAmount: data.invoiceAmount,
          invoiceDate: data.invoiceDate
        }
      })

      this.logger.log(`Upcoming invoice email sent to ${data.userEmail}`)
    } catch (error) {
      this.logger.error(`Failed to send upcoming invoice email to ${data.userEmail}:`, error)
    }
  }

  // Private helper methods
  private getAppUrl(): string {
    return this.configService.get('FRONTEND_URL') || 'https://tenantflow.app'
  }

  private async isReactivation(subscriptionId: string): Promise<boolean> {
    // Check if this subscription was previously active
    const history = await this.prismaService.notificationLog.findFirst({
      where: {
        subscriptionId,
        type: 'SUBSCRIPTION_ACTIVATED'
      }
    })
    
    return !!history
  }

  private async getUserPropertyCount(userId: string): Promise<number> {
    return await this.prismaService.property.count({
      where: { 
        User: { id: userId }
      }
    })
  }

  private async getUserTenantCount(userId: string): Promise<number> {
    return await this.prismaService.tenant.count({
      where: { 
        Lease: {
          some: {
            Unit: {
              Property: {
                User: { id: userId }
              }
            }
          }
        }
      }
    })
  }

  private async getUserReportCount(userId: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    // This would track report generation - implement based on your analytics
    return await this.prismaService.notificationLog.count({
      where: {
        userId,
        type: 'REPORT_GENERATED',
        createdAt: {
          gte: since
        }
      }
    })
  }

  private async logNotification(data: {
    userId: string
    type: string
    subscriptionId: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    try {
      await this.prismaService.notificationLog.create({
        data: {
          userId: data.userId,
          type: data.type,
          subscriptionId: data.subscriptionId,
          metadata: (data.metadata || {}) as Prisma.InputJsonValue,
          sentAt: new Date()
        }
      })
    } catch (error) {
      this.logger.error('Failed to log notification:', error)
    }
  }
}