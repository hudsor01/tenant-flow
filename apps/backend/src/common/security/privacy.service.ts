import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { SecurityAuditService } from './audit.service'
// import { EncryptionService } from './encryption.service'
import { SecurityEventType } from '@tenantflow/shared'

/**
 * Data Privacy and Retention Service
 * 
 * MVP implementation for GDPR/CCPA compliance:
 * 1. Right to delete (data erasure)
 * 2. Data retention policies
 * 3. Data anonymization
 */
@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name)

  // Default retention periods (in days)
  private readonly RETENTION_PERIODS = {
    tenants: 2555, // 7 years for financial records
    properties: 3650, // 10 years for property records
    leases: 2555, // 7 years for legal documents
    maintenance: 1095, // 3 years for maintenance records
    audit_logs: 2555, // 7 years for audit compliance
    user_sessions: 90 // 90 days for session data
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: SecurityAuditService,
    // private readonly encryptionService: EncryptionService
  ) {}

  /**
   * Process right-to-delete request (GDPR Article 17)
   */
  async processDataDeletion(
    userId: string, 
    requestedBy: string, 
    reason = 'user_request'
  ): Promise<{ success: boolean; itemsDeleted: number; errors: string[] }> {
    const errors: string[] = []
    let itemsDeleted = 0

    try {
      // Log the deletion request
      await this.auditService.logSecurityEvent({
        eventType: SecurityEventType.DATA_EXPORT,
        userId: requestedBy,
        resource: 'user_data',
        action: 'deletion_requested',
        details: JSON.stringify({
          targetUserId: userId,
          reason,
          compliance: 'gdpr_article_17'
        })
      })

      // Delete user's tenant records
      try {
        const deletedTenants = await this.prisma.tenant.deleteMany({
          where: { 
            Lease: {
              some: {
                Unit: {
                  Property: {
                    ownerId: userId
                  }
                }
              }
            }
          }
        })
        itemsDeleted += deletedTenants.count
      } catch (error) {
        errors.push(`Failed to delete tenant records: ${(error as Error).message}`)
      }

      // Anonymize rather than delete certain records (for legal compliance)
      try {
        const anonymizedProperties = await this.anonymizeUserData(userId, 'properties')
        itemsDeleted += anonymizedProperties
      } catch (error) {
        errors.push(`Failed to anonymize property records: ${(error as Error).message}`)
      }

      // Delete user account last
      try {
        await this.prisma.user.delete({
          where: { id: userId }
        })
        itemsDeleted += 1
      } catch (error) {
        errors.push(`Failed to delete user account: ${(error as Error).message}`)
      }

      // Log completion
      await this.auditService.logSecurityEvent({
        eventType: SecurityEventType.DATA_EXPORT,
        userId: requestedBy,
        resource: 'user_data',
        action: 'deletion_completed',
        details: JSON.stringify({
          targetUserId: userId,
          itemsDeleted,
          errors: errors.length,
          compliance: 'gdpr_article_17'
        })
      })

      return {
        success: errors.length === 0,
        itemsDeleted,
        errors
      }

    } catch (error) {
      this.logger.error('Data deletion failed', error)
      return {
        success: false,
        itemsDeleted: 0,
        errors: [`Critical error: ${(error as Error).message}`]
      }
    }
  }

  /**
   * Anonymize user data instead of deleting (for legal/business requirements)
   */
  async anonymizeUserData(userId: string, dataType: string): Promise<number> {
    let itemsAnonymized = 0

    try {
      switch (dataType) {
        case 'properties': {
          const properties = await this.prisma.property.findMany({
            where: { ownerId: userId }
          })

          for (const property of properties) {
            await this.prisma.property.update({
              where: { id: property.id },
              data: {
                name: `[ANONYMIZED-${property.id.substring(0, 8)}]`,
                address: '[ADDRESS REMOVED]',
                description: '[DESCRIPTION REMOVED]'
                // notes: '[NOTES REMOVED]' // Field doesn't exist in schema
              }
            })
          }
          itemsAnonymized = properties.length
          break
        }

        default:
          this.logger.warn(`Unknown data type for anonymization: ${dataType}`)
      }

      return itemsAnonymized
    } catch (error) {
      this.logger.error(`Anonymization failed for ${dataType}`, error)
      throw error
    }
  }

  /**
   * Enforce data retention policies
   */
  async enforceRetentionPolicies(): Promise<{
    totalProcessed: number
    deletedItems: Record<string, number>
    errors: string[]
  }> {
    const deletedItems: Record<string, number> = {}
    const errors: string[] = []
    let totalProcessed = 0

    try {
      // Clean up old audit logs
      try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_PERIODS.audit_logs)

        const result = await this.prisma.securityAuditLog.deleteMany({
          where: {
            timestamp: { lt: cutoffDate },
            severity: { not: 'CRITICAL' } // Keep critical events longer
          }
        })

        deletedItems['audit_logs'] = result.count
        totalProcessed += result.count
      } catch (error) {
        errors.push(`Audit log cleanup failed: ${(error as Error).message}`)
      }

      // Add other retention policy enforcement here
      // - Old maintenance requests
      // - Expired lease documents
      // - Old user sessions

      // Log retention policy execution
      await this.auditService.logSecurityEvent({
        eventType: SecurityEventType.DATA_EXPORT,
        userId: 'system',
        resource: 'data_retention',
        action: 'retention_policy_executed',
        details: JSON.stringify({
          totalProcessed,
          deletedItems,
          errors: errors.length,
          compliance: 'data_retention_policy'
        })
      })

      return { totalProcessed, deletedItems, errors }

    } catch (error) {
      this.logger.error('Retention policy enforcement failed', error)
      return {
        totalProcessed: 0,
        deletedItems: {},
        errors: [`Critical error: ${(error as Error).message}`]
      }
    }
  }

  /**
   * Generate data privacy report for compliance
   */
  async generatePrivacyReport(organizationId: string): Promise<{
    dataTypes: { type: string; count: number; encrypted: boolean }[]
    retentionStatus: { dataType: string; oldestRecord: Date; policy: string }[]
    recommendations: string[]
  }> {
    try {
      const dataTypes = [
        { 
          type: 'tenants', 
          count: await this.prisma.tenant.count({
            where: { Lease: { some: { Unit: { Property: { ownerId: organizationId } } } } }
          }),
          encrypted: true 
        },
        { 
          type: 'properties', 
          count: await this.prisma.property.count({ where: { ownerId: organizationId } }),
          encrypted: false 
        },
        { 
          type: 'leases', 
          count: await this.prisma.lease.count({
            where: { Unit: { Property: { ownerId: organizationId } } }
          }),
          encrypted: false 
        }
      ]

      const retentionStatus = [
        {
          dataType: 'audit_logs',
          oldestRecord: new Date(Date.now() - (this.RETENTION_PERIODS.audit_logs * 24 * 60 * 60 * 1000)),
          policy: `${this.RETENTION_PERIODS.audit_logs} days`
        }
      ]

      const recommendations = [
        'Implement automatic data retention policy enforcement',
        'Enable field-level encryption for all PII data',
        'Regular privacy impact assessments recommended',
        'Document data processing activities per GDPR Article 30'
      ]

      return { dataTypes, retentionStatus, recommendations }

    } catch (error) {
      this.logger.error('Privacy report generation failed', error)
      return {
        dataTypes: [],
        retentionStatus: [],
        recommendations: ['Unable to generate report due to system error']
      }
    }
  }
}