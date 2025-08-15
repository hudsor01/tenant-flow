import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { EmailQueueService } from './email-queue.service'
import type { PropertyTipsData } from '../types/email-templates.types'

/**
 * High-level service for integrating email functionality into the application
 * Provides simple methods for sending emails via the queue system
 */
@Injectable()
export class EmailIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(EmailIntegrationService.name)

  constructor(private readonly queueService: EmailQueueService) {}

  async onModuleInit() {
    this.logger.log('Email integration service initialized')
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    options?: {
      companySize?: 'small' | 'medium' | 'large'
      source?: string
      userId?: string
      organizationId?: string
    }
  ) {
    return this.queueService.addImmediateEmail(
      email,
      'welcome',
      {
        name,
        companySize: options?.companySize || 'medium',
        source: options?.source || 'signup'
      },
      {
        userId: options?.userId,
        organizationId: options?.organizationId,
        trackingId: `welcome_${Date.now()}`
      }
    )
  }

  /**
   * Send tenant invitation
   */
  async sendTenantInvitation(
    email: string,
    tenantName: string,
    propertyAddress: string,
    invitationLink: string,
    landlordName: string,
    options?: {
      userId?: string
      organizationId?: string
      propertyId?: string
    }
  ) {
    return this.queueService.addImmediateEmail(
      email,
      'tenant-invitation',
      {
        tenantName,
        propertyAddress,
        invitationLink,
        landlordName
      },
      {
        userId: options?.userId,
        organizationId: options?.organizationId,
        trackingId: `invitation_${options?.propertyId}_${Date.now()}`
      }
    )
  }

  /**
   * Schedule payment reminder
   */
  async schedulePaymentReminder(
    email: string,
    tenantName: string,
    amountDue: number,
    dueDate: Date,
    propertyAddress: string,
    paymentLink: string,
    options?: {
      sendAt?: Date
      userId?: string
      organizationId?: string
      leaseId?: string
    }
  ) {
    const scheduleOptions = options?.sendAt 
      ? { at: options.sendAt }
      : { delay: 24 * 60 * 60 * 1000 } // 24 hours from now

    return this.queueService.addScheduledEmail(
      email,
      'payment-reminder',
      {
        tenantName,
        amountDue,
        dueDate,
        propertyAddress,
        paymentLink
      },
      scheduleOptions,
      {
        userId: options?.userId,
        organizationId: options?.organizationId,
        campaignId: `payment_reminder_${options?.leaseId}`
      }
    )
  }

  /**
   * Schedule lease expiration alert
   */
  async scheduleLeaseExpirationAlert(
    email: string,
    tenantName: string,
    propertyAddress: string,
    expirationDate: Date,
    renewalLink: string,
    options?: {
      daysBeforeExpiration?: number
      userId?: string
      organizationId?: string
      leaseId?: string
    }
  ) {
    const daysBeforeExpiration = options?.daysBeforeExpiration || 30
    const sendAt = new Date(expirationDate.getTime() - (daysBeforeExpiration * 24 * 60 * 60 * 1000))

    return this.queueService.addScheduledEmail(
      email,
      'lease-expiration',
      {
        tenantName,
        propertyAddress,
        expirationDate,
        renewalLink,
        leaseId: options?.leaseId
      },
      { at: sendAt },
      {
        userId: options?.userId,
        organizationId: options?.organizationId,
        campaignId: `lease_expiration_${options?.leaseId}`
      }
    )
  }

  /**
   * Send property management tips (bulk campaign)
   */
  async sendPropertyTipsCampaign(
    recipients: {
      email: string
      name: string
      userId?: string
    }[],
    tips: string[],
    options?: {
      organizationId?: string
      campaignId?: string
    }
  ) {
    const recipientsWithData = recipients.map(recipient => ({
      email: recipient.email,
      data: {
        landlordName: recipient.name,
        tips
      } as PropertyTipsData
    }))

    return this.queueService.addBulkCampaign(
      recipientsWithData,
      'property-tips',
      {
        organizationId: options?.organizationId,
        campaignId: options?.campaignId || `property_tips_${Date.now()}`
      }
    )
  }

  /**
   * Send feature announcement (bulk campaign)
   */
  async sendFeatureAnnouncement(
    recipients: {
      email: string
      name: string
      userId?: string
    }[],
    features: { title: string; description: string }[],
    actionUrl: string,
    options?: {
      organizationId?: string
      campaignId?: string
    }
  ) {
    const recipientsWithData = recipients.map(recipient => ({
      email: recipient.email,
      data: {
        userName: recipient.name,
        features,
        actionUrl
      }
    }))

    return this.queueService.addBulkCampaign(
      recipientsWithData,
      'feature-announcement',
      {
        organizationId: options?.organizationId,
        campaignId: options?.campaignId || `feature_announcement_${Date.now()}`
      }
    )
  }

  /**
   * Send re-engagement campaign
   */
  async sendReEngagementCampaign(
    recipients: {
      email: string
      name: string
      lastActive: string
      userId?: string
    }[],
    specialOffer?: string,
    options?: {
      organizationId?: string
      campaignId?: string
    }
  ) {
    const recipientsWithData = recipients.map(recipient => ({
      email: recipient.email,
      data: {
        firstName: recipient.name,
        lastActiveDate: recipient.lastActive,
        specialOffer: specialOffer ? {
          title: 'Welcome Back!',
          description: specialOffer,
          discount: '20%',
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        } : undefined
      }
    }))

    return this.queueService.addBulkCampaign(
      recipientsWithData,
      're-engagement',
      {
        organizationId: options?.organizationId,
        campaignId: options?.campaignId || `re_engagement_${Date.now()}`
      }
    )
  }

  /**
   * Schedule recurring payment reminders
   */
  async scheduleRecurringPaymentReminders(
    email: string,
    tenantName: string,
    amountDue: number,
    propertyAddress: string,
    paymentLink: string,
    options: {
      dueDay: number // Day of month (1-31)
      leaseId: string
      userId?: string
      organizationId?: string
      startDate?: Date
      endDate?: Date
    }
  ) {
    // Schedule monthly reminders 3 days before due date
    const reminderDay = options.dueDay - 3
    const cronExpression = `0 9 ${reminderDay} * *` // 9 AM on reminder day

    return this.queueService.addScheduledEmail(
      email,
      'payment-reminder',
      {
        tenantName,
        amountDue,
        dueDate: new Date(), // Will be calculated for each occurrence
        propertyAddress,
        paymentLink
      },
      { cron: cronExpression },
      {
        userId: options.userId,
        organizationId: options.organizationId,
        campaignId: `recurring_payment_${options.leaseId}`
      }
    )
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(campaignId: string) {
    // This would typically query the metrics service
    // Implementation depends on how metrics are stored and accessed
    this.logger.log(`Getting metrics for campaign: ${campaignId}`)
    
    return {
      campaignId,
      // Placeholder metrics - would be real data from metrics service
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0
    }
  }
}