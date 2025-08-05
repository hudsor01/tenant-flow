import { Injectable } from '@nestjs/common'
import { MaintenanceRequest, Prisma } from '@repo/database'
import { MaintenanceRequestRepository } from './maintenance-request.repository'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { BaseCrudService, BaseStats } from '../common/services/base-crud.service'
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto, MaintenanceRequestQueryDto } from './dto'
import { SupabaseService } from '../common/supabase.service'
import { PrismaService } from '../prisma/prisma.service'

// Types for notification
interface NotificationData {
  type: 'new_request' | 'status_update' | 'emergency_alert'
  maintenanceRequestId: string
  recipientEmail: string
  recipientName: string
  recipientRole: 'owner' | 'tenant' | 'manager'
  actionUrl?: string
}

@Injectable()
export class MaintenanceService extends BaseCrudService<
  MaintenanceRequest,
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  MaintenanceRequestQueryDto,
  Prisma.MaintenanceRequestCreateInput,
  Prisma.MaintenanceRequestUpdateInput,
  Prisma.MaintenanceRequestWhereInput
> {
  protected readonly entityName = 'maintenance-request'
  protected readonly repository: MaintenanceRequestRepository

  constructor(
    private readonly maintenanceRequestRepository: MaintenanceRequestRepository,
    errorHandler: ErrorHandlerService,
    private readonly supabaseService: SupabaseService,
    private readonly prismaService: PrismaService
  ) {
    super(errorHandler)
    this.repository = maintenanceRequestRepository
  }

  // ========================================
  // BaseCrudService Implementation
  // ========================================

  protected async findByIdAndOwner(id: string, ownerId: string): Promise<MaintenanceRequest | null> {
    return await this.maintenanceRequestRepository.findByIdAndOwner(id, ownerId)
  }

  protected async calculateStats(ownerId: string): Promise<BaseStats> {
    return await this.maintenanceRequestRepository.getStatsByOwner(ownerId)
  }

  protected prepareCreateData(data: CreateMaintenanceRequestDto, _ownerId: string): Prisma.MaintenanceRequestCreateInput {
    const { unitId, ...restData } = data
    
    return {
      ...restData,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
      Unit: {
        connect: { id: unitId }
      }
    }
  }

  protected prepareUpdateData(data: UpdateMaintenanceRequestDto): Prisma.MaintenanceRequestUpdateInput {
    const updateData: Prisma.MaintenanceRequestUpdateInput = {
      ...data,
      updatedAt: new Date()
    }
    
    if (data.preferredDate && typeof data.preferredDate === 'string') {
      updateData.preferredDate = new Date(data.preferredDate)
    }
    
    if ('completedAt' in data && data.completedAt && typeof data.completedAt === 'string') {
      updateData.completedAt = new Date(data.completedAt)
    }

    return updateData
  }

  protected createOwnerWhereClause(id: string, ownerId: string): Prisma.MaintenanceRequestWhereInput {
    return {
      id,
      Unit: {
        Property: {
          ownerId
        }
      }
    }
  }

  // ========================================
  // Maintenance-Specific Methods (using repository)
  // ========================================

  /**
   * Find maintenance requests by unit - uses repository-specific implementation
   */
  async getByUnit(unitId: string, ownerId: string, query?: MaintenanceRequestQueryDto): Promise<MaintenanceRequest[]> {
    if (!unitId || !ownerId) {
      throw new Error('Unit ID and Owner ID are required')
    }
    
    try {
      return await this.maintenanceRequestRepository.findByUnit(unitId, ownerId, query) as MaintenanceRequest[]
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByUnit',
        resource: this.entityName,
        metadata: { unitId, ownerId }
      })
    }
  }

  async sendNotification(notificationData: NotificationData, userId: string) {
    try {
      // Find the maintenance request with related data
      const maintenanceRequest = await this.prismaService.maintenanceRequest.findUnique({
        where: { id: notificationData.maintenanceRequestId },
        include: {
          Unit: {
            include: {
              Property: true
            }
          }
        }
      })

      if (!maintenanceRequest) {
        throw this.errorHandler.createNotFoundError(
          'Maintenance request',
          notificationData.maintenanceRequestId,
          { operation: 'sendNotificationEmail', resource: 'maintenance' }
        )
      }

      // Set default action URL if not provided
      const actionUrl = notificationData.actionUrl || 
        `https://app.tenantflow.com/maintenance/${notificationData.maintenanceRequestId}`

      // Prepare email data based on notification type
      let subject = ''
      let isEmergency = false

      const unitNumber = maintenanceRequest.Unit?.unitNumber || ''
      const propertyName = maintenanceRequest.Unit?.Property?.name || ''

      switch (notificationData.type) {
        case 'new_request':
          subject = `New Maintenance Request: ${maintenanceRequest.title} - Unit ${unitNumber}`
          break
        case 'emergency_alert':
          subject = `🚨 EMERGENCY: ${maintenanceRequest.title} - Unit ${unitNumber}, ${propertyName}`
          isEmergency = true
          break
        case 'status_update':
          subject = `Maintenance Update: ${maintenanceRequest.title} - ${maintenanceRequest.status}`
          break
      }

      const emailData = {
        to: notificationData.recipientEmail,
        subject,
        template: 'maintenance-notification',
        data: {
          recipientName: notificationData.recipientName,
          notificationType: notificationData.type,
          maintenanceRequest: {
            id: maintenanceRequest.id,
            title: maintenanceRequest.title,
            description: maintenanceRequest.description,
            priority: maintenanceRequest.priority,
            status: maintenanceRequest.status,
            createdAt: maintenanceRequest.createdAt.toISOString()
          },
          actionUrl,
          propertyName: propertyName || '',
          unitNumber: unitNumber || '',
          isEmergency
        }
      }

      // Send notification via Supabase Edge Function
      const supabaseClient = this.supabaseService.getClient()
      const { data, error } = await supabaseClient.functions.invoke(
        'send-maintenance-notification',
        { body: emailData }
      )

      if (error) {
        throw this.errorHandler.createBusinessError(
          ErrorCode.EMAIL_ERROR,
          'Failed to send notification email',
          {
            operation: 'sendNotificationEmail',
            resource: 'maintenance',
            metadata: { error: error.message }
          }
        )
      }

      this.logger.log(`Notification sent successfully for maintenance request: ${notificationData.maintenanceRequestId}`)
      
      return {
        emailId: data?.id || 'email-123',
        sentAt: new Date().toISOString(),
        type: notificationData.type
      }
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'sendNotification',
        resource: 'maintenance-request',
        metadata: { 
          notificationType: notificationData.type,
          maintenanceRequestId: notificationData.maintenanceRequestId,
          recipientEmail: notificationData.recipientEmail,
          recipientRole: notificationData.recipientRole,
          userId
        }
      })
    }
  }

  async logNotification(logData: Record<string, unknown>, userId: string) {
    try {
      // Generate a mock log ID
      const logId = `log-${Date.now()}`
      
      const result = {
        id: logId,
        type: logData.type,
        recipientEmail: logData.recipientEmail,
        recipientName: logData.recipientName,
        subject: logData.subject,
        maintenanceRequestId: logData.maintenanceRequestId,
        notificationType: logData.notificationType,
        sentAt: new Date().toISOString(),
        status: logData.status
      }

      this.logger.log(`Notification logged: ${logId} for maintenance request: ${logData.maintenanceRequestId}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'logNotification',
        resource: 'maintenance-request',
        metadata: { 
          logType: String(logData.type || ''),
          maintenanceRequestId: String(logData.maintenanceRequestId || ''),
          userId
        }
      })
    }
  }

}
