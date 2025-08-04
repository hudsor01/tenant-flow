import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { SubStatus, PlanType } from '@repo/database'

export interface UserFeatureAccess {
  canExportData: boolean
  canAccessAdvancedAnalytics: boolean
  canUseBulkOperations: boolean
  canAccessAPI: boolean
  canInviteTeamMembers: boolean
  maxProperties: number
  maxUnitsPerProperty: number
  maxStorageGB: number
  hasPrioritySupport: boolean
  canUsePremiumIntegrations: boolean
}

export interface FeatureAccessUpdate {
  userId: string
  subscriptionStatus: SubStatus
  planType: PlanType
  reason: 'SUBSCRIPTION_ACTIVATED' | 'SUBSCRIPTION_PAUSED' | 'SUBSCRIPTION_CANCELED' | 'TRIAL_ENDED' | 'PAYMENT_FAILED'
}

@Injectable()
export class FeatureAccessService {
  private readonly logger = new Logger(FeatureAccessService.name)

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Update user's feature access based on subscription status
   */
  async updateUserFeatureAccess(update: FeatureAccessUpdate): Promise<void> {
    try {
      const access = this.calculateFeatureAccess(update.subscriptionStatus, update.planType)
      
      // Update or create user feature access record
      await this.prismaService.userFeatureAccess.upsert({
        where: { userId: update.userId },
        create: {
          userId: update.userId,
          ...access,
          lastUpdated: new Date(),
          updateReason: update.reason
        },
        update: {
          ...access,
          lastUpdated: new Date(),
          updateReason: update.reason
        }
      })

      // Log the access change for audit purposes
      await this.logAccessChange(update, access)

      this.logger.log(`Feature access updated for user ${update.userId}: ${update.reason}`)
    } catch (error) {
      this.logger.error(`Failed to update feature access for user ${update.userId}:`, error)
    }
  }

  /**
   * Get current feature access for a user
   */
  async getUserFeatureAccess(userId: string): Promise<UserFeatureAccess> {
    try {
      const access = await this.prismaService.userFeatureAccess.findUnique({
        where: { userId }
      })

      if (!access) {
        // Return free tier access if no record exists
        return this.calculateFeatureAccess('CANCELED', 'FREE')
      }

      return {
        canExportData: access.canExportData,
        canAccessAdvancedAnalytics: access.canAccessAdvancedAnalytics,
        canUseBulkOperations: access.canUseBulkOperations,
        canAccessAPI: access.canAccessAPI,
        canInviteTeamMembers: access.canInviteTeamMembers,
        maxProperties: access.maxProperties,
        maxUnitsPerProperty: access.maxUnitsPerProperty,
        maxStorageGB: access.maxStorageGB,
        hasPrioritySupport: access.hasPrioritySupport,
        canUsePremiumIntegrations: access.canUsePremiumIntegrations
      }
    } catch (error) {
      this.logger.error(`Failed to get feature access for user ${userId}:`, error)
      // Return free tier access on error
      return this.calculateFeatureAccess('CANCELED', 'STARTER')
    }
  }

  /**
   * Check if user can access a specific feature
   */
  async canUserAccessFeature(userId: string, feature: string): Promise<{
    allowed: boolean
    reason?: string
    upgradeRequired?: boolean
  }> {
    const access = await this.getUserFeatureAccess(userId)

    switch (feature) {
      case 'data_export':
        return {
          allowed: access.canExportData,
          reason: access.canExportData ? undefined : 'Data export requires an active subscription',
          upgradeRequired: !access.canExportData
        }

      case 'advanced_analytics':
        return {
          allowed: access.canAccessAdvancedAnalytics,
          reason: access.canAccessAdvancedAnalytics ? undefined : 'Advanced analytics requires an active subscription',
          upgradeRequired: !access.canAccessAdvancedAnalytics
        }

      case 'bulk_operations':
        return {
          allowed: access.canUseBulkOperations,
          reason: access.canUseBulkOperations ? undefined : 'Bulk operations require an active subscription',
          upgradeRequired: !access.canUseBulkOperations
        }

      case 'api_access':
        return {
          allowed: access.canAccessAPI,
          reason: access.canAccessAPI ? undefined : 'API access requires an active subscription',
          upgradeRequired: !access.canAccessAPI
        }

      case 'team_collaboration':
        return {
          allowed: access.canInviteTeamMembers,
          reason: access.canInviteTeamMembers ? undefined : 'Team collaboration requires an active subscription',
          upgradeRequired: !access.canInviteTeamMembers
        }

      case 'premium_integrations':
        return {
          allowed: access.canUsePremiumIntegrations,
          reason: access.canUsePremiumIntegrations ? undefined : 'Premium integrations require an active subscription',
          upgradeRequired: !access.canUsePremiumIntegrations
        }

      default:
        return { allowed: true } // Allow unknown features by default
    }
  }

  /**
   * Enforce feature limits (properties, units, storage)
   */
  async enforceFeatureLimits(userId: string): Promise<{
    propertiesAtLimit: boolean
    storageAtLimit: boolean
    limitsEnforced: string[]
  }> {
    const access = await this.getUserFeatureAccess(userId)
    const limitsEnforced: string[] = []

    // Check property limit
    const propertyCount = await this.prismaService.property.count({
      where: { User: { id: userId } }
    })

    const propertiesAtLimit = propertyCount >= access.maxProperties
    if (propertiesAtLimit) {
      limitsEnforced.push(`Property limit reached (${access.maxProperties})`)
    }

    // Check storage limit (implement based on your file storage system)
    const storageUsedGB = await this.calculateUserStorageUsage(userId)
    const storageAtLimit = storageUsedGB >= access.maxStorageGB
    if (storageAtLimit) {
      limitsEnforced.push(`Storage limit reached (${access.maxStorageGB}GB)`)
    }

    return {
      propertiesAtLimit,
      storageAtLimit,
      limitsEnforced
    }
  }

  /**
   * Restore access when subscription is reactivated
   */
  async restoreUserAccess(userId: string, planType: PlanType): Promise<void> {
    await this.updateUserFeatureAccess({
      userId,
      subscriptionStatus: 'ACTIVE',
      planType,
      reason: 'SUBSCRIPTION_ACTIVATED'
    })

    this.logger.log(`Access restored for user ${userId} on ${planType} plan`)
  }

  /**
   * Restrict access when subscription is paused/canceled
   */
  async restrictUserAccess(userId: string, reason: 'SUBSCRIPTION_PAUSED' | 'SUBSCRIPTION_CANCELED' | 'TRIAL_ENDED' | 'PAYMENT_FAILED'): Promise<void> {
    const restrictedStatus: SubStatus = reason === 'SUBSCRIPTION_CANCELED' ? 'CANCELED' : 'INCOMPLETE'
    
    await this.updateUserFeatureAccess({
      userId,
      subscriptionStatus: restrictedStatus,
      planType: 'FREE', // Default to free plan limits
      reason
    })

    this.logger.log(`Access restricted for user ${userId}: ${reason}`)
  }

  // Private helper methods
  private calculateFeatureAccess(status: SubStatus, planType: PlanType): UserFeatureAccess {
    // Define plan-based feature access
    const planFeatures = this.getPlanFeatures(planType)
    
    // Override based on subscription status
    const isActiveSubscription = ['ACTIVE', 'TRIALING'].includes(status)
    
    if (!isActiveSubscription) {
      // Restricted access for paused/canceled/failed subscriptions
      return {
        canExportData: false,
        canAccessAdvancedAnalytics: false,
        canUseBulkOperations: false,
        canAccessAPI: false,
        canInviteTeamMembers: false,
        maxProperties: 1, // Allow 1 property for free users
        maxUnitsPerProperty: 5, // Allow 5 units per property
        maxStorageGB: 0.1, // 100MB for free users
        hasPrioritySupport: false,
        canUsePremiumIntegrations: false
      }
    }

    return planFeatures
  }

  private getPlanFeatures(planType: PlanType): UserFeatureAccess {
    switch (planType) {
      case 'FREE':
        return {
          canExportData: false,
          canAccessAdvancedAnalytics: false,
          canUseBulkOperations: false,
          canAccessAPI: false,
          canInviteTeamMembers: false,
          maxProperties: 1,
          maxUnitsPerProperty: 5,
          maxStorageGB: 0.1,
          hasPrioritySupport: false,
          canUsePremiumIntegrations: false
        }

      case 'STARTER':
        return {
          canExportData: true,
          canAccessAdvancedAnalytics: true,
          canUseBulkOperations: true,
          canAccessAPI: false,
          canInviteTeamMembers: false,
          maxProperties: 10,
          maxUnitsPerProperty: 50,
          maxStorageGB: 5,
          hasPrioritySupport: false,
          canUsePremiumIntegrations: false
        }

      case 'GROWTH':
        return {
          canExportData: true,
          canAccessAdvancedAnalytics: true,
          canUseBulkOperations: true,
          canAccessAPI: true,
          canInviteTeamMembers: true,
          maxProperties: 50,
          maxUnitsPerProperty: 200,
          maxStorageGB: 20,
          hasPrioritySupport: false,
          canUsePremiumIntegrations: true
        }

      case 'ENTERPRISE':
        return {
          canExportData: true,
          canAccessAdvancedAnalytics: true,
          canUseBulkOperations: true,
          canAccessAPI: true,
          canInviteTeamMembers: true,
          maxProperties: 999999, // Unlimited
          maxUnitsPerProperty: 999999, // Unlimited
          maxStorageGB: 100,
          hasPrioritySupport: true,
          canUsePremiumIntegrations: true
        }

      default:
        return this.getPlanFeatures('FREE')
    }
  }

  private async logAccessChange(update: FeatureAccessUpdate, access: UserFeatureAccess): Promise<void> {
    try {
      await this.prismaService.userAccessLog.create({
        data: {
          userId: update.userId,
          subscriptionStatus: update.subscriptionStatus,
          planType: update.planType,
          reason: update.reason,
          accessGranted: JSON.parse(JSON.stringify(access)),
          timestamp: new Date()
        }
      })
    } catch (error) {
      this.logger.error('Failed to log access change:', error)
    }
  }

  private async calculateUserStorageUsage(userId: string): Promise<number> {
    // This would integrate with your file storage system
    // For now, return a placeholder calculation
    try {
      // Example: Sum up file sizes from property images, documents, etc.
      const fileRecords = await this.prismaService.document.findMany({
        where: {
          Property: { User: { id: userId } }
        },
        select: { fileSizeBytes: true }
      })

      const totalBytes = fileRecords.reduce((sum: number, file: { fileSizeBytes: bigint | null }) => sum + Number(file.fileSizeBytes || 0n), 0)
      return totalBytes / (1024 * 1024 * 1024) // Convert to GB
    } catch (error) {
      this.logger.error(`Failed to calculate storage usage for user ${userId}:`, error)
      return 0
    }
  }
}