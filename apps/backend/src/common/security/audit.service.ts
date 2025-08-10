import { Injectable } from '@nestjs/common'
import { LoggerService } from '../services/logger.service'
import { SecurityEventType } from '@repo/shared'

interface SecurityEvent {
  eventType: SecurityEventType
  userId?: string
  ipAddress?: string
  resource?: string
  action?: string
  details?: string
  organizationId?: string
}

/**
 * Security Audit Service
 * 
 * Provides security event logging using the LoggerService.
 * This is a compatibility layer for services expecting SecurityAuditService.
 */
@Injectable()
export class SecurityAuditService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('SecurityAudit')
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const details = typeof event.details === 'string' 
      ? JSON.parse(event.details) 
      : event.details

    this.logger.logSecurity(
      event.eventType,
      event.userId,
      {
        ipAddress: event.ipAddress,
        resource: event.resource,
        action: event.action,
        organizationId: event.organizationId,
        ...details
      }
    )
  }

  async getSecurityEvents(filters?: unknown): Promise<unknown[]> {
    // This would typically query from a database
    // For now, return empty array for compatibility
    this.logger.debug('Security events requested with filters:', String(filters))
    return []
  }
}