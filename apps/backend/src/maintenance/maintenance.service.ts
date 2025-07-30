import { Injectable, Logger } from '@nestjs/common'
import { MaintenanceRequestRepository } from './maintenance-request.repository'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import {
  MaintenanceRequestNotFoundException
} from '../common/exceptions/maintenance-request.exceptions'
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
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name)

  constructor(
    private readonly maintenanceRequestRepository: MaintenanceRequestRepository,
    private readonly errorHandler: ErrorHandlerService,
    private readonly supabaseService: SupabaseService,
    private readonly prismaService: PrismaService
  ) {}

  async create(data: CreateMaintenanceRequestDto, ownerId: string) {
    try {
      const result = await this.maintenanceRequestRepository.create({
        data: {
          ...data,
          preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined
        }
      })
      
      this.logger.log(`Maintenance request created: ${(result as { id: string }).id} for unit ${data.unitId}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'create',
        resource: 'maintenance-request',
        metadata: { ownerId }
      })
    }
  }

  async getByOwner(ownerId: string, query?: MaintenanceRequestQueryDto) {
    try {
      return await this.maintenanceRequestRepository.findByOwner(ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByOwner',
        resource: 'maintenance-request',
        metadata: { ownerId }
      })
    }
  }

  async getStats(ownerId: string) {
    try {
      return await this.maintenanceRequestRepository.getStatsByOwner(ownerId)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getStats',
        resource: 'maintenance-request',
        metadata: { ownerId }
      })
    }
  }

  async getByIdOrThrow(id: string, ownerId: string) {
    try {
      const maintenanceRequest = await this.maintenanceRequestRepository.findByIdAndOwner(id, ownerId)
      
      if (!maintenanceRequest) {
        throw new MaintenanceRequestNotFoundException(id)
      }
      
      return maintenanceRequest
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByIdOrThrow',
        resource: 'maintenance-request',
        metadata: { id, ownerId }
      })
    }
  }

  async update(id: string, data: UpdateMaintenanceRequestDto, ownerId: string) {
    try {
      // Verify ownership first
      const exists = await this.maintenanceRequestRepository.prismaClient.maintenanceRequest.findFirst({
        where: {
          id,
          Unit: {
            Property: {
              ownerId
            }
          }
        }
      })
      
      if (!exists) {
        throw new MaintenanceRequestNotFoundException(id)
      }

      const updateData = { ...data } as Record<string, unknown>
      
      if (data.preferredDate) {
        updateData.preferredDate = new Date(data.preferredDate)
      }
      
      if ('completedAt' in data && data.completedAt) {
        updateData.completedAt = new Date(data.completedAt as string)
      }

      const result = await this.maintenanceRequestRepository.update({
        where: { id },
        data: updateData
      })
      
      this.logger.log(`Maintenance request updated: ${id}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'update',
        resource: 'maintenance-request',
        metadata: { id, ownerId }
      })
    }
  }

  async delete(id: string, ownerId: string) {
    try {
      // Verify ownership first
      const exists = await this.maintenanceRequestRepository.prismaClient.maintenanceRequest.findFirst({
        where: {
          id,
          Unit: {
            Property: {
              ownerId
            }
          }
        }
      })
      
      if (!exists) {
        throw new MaintenanceRequestNotFoundException(id)
      }

      const result = await this.maintenanceRequestRepository.deleteById(id)
      this.logger.log(`Maintenance request deleted: ${id}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'delete',
        resource: 'maintenance-request',
        metadata: { id, ownerId }
      })
    }
  }

  async getByUnit(unitId: string, ownerId: string, query?: MaintenanceRequestQueryDto) {
    try {
      return await this.maintenanceRequestRepository.findByUnit(unitId, ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByUnit',
        resource: 'maintenance-request',
        metadata: { unitId, ownerId }
      })
    }
  }

  async findAll(query: Record<string, unknown> = {}) {
    try {
      const { limit = 10, offset = 0, ...whereFilters } = query
      
      return await this.prismaService.maintenanceRequest.findMany({
        where: whereFilters,
        skip: Number(offset),
        take: Number(limit),
        include: {
          Unit: {
            include: {
              Property: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'findAll',
        resource: 'maintenance-request',
        metadata: { 
          limit: String(query.limit || 10),
          offset: String(query.offset || 0)
        }
      })
    }
  }

  async findOne(id: string) {
    try {
      return await this.prismaService.maintenanceRequest.findUnique({
        where: { id },
        include: {
          Unit: {
            include: {
              Property: true
            }
          }
        }
      })
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'findOne',
        resource: 'maintenance-request',
        metadata: { id }
      })
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.maintenanceRequest.delete({
        where: { id }
      })
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'remove',
        resource: 'maintenance-request',
        metadata: { id }
      })
    }
  }

  async findAllByOwner(ownerId: string, query: Record<string, unknown> = {}) {
    try {
      return await this.findAll(query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'findAllByOwner',
        resource: 'maintenance-request',
        metadata: { 
          ownerId,
          limit: String(query.limit || 10),
          offset: String(query.offset || 0)
        }
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
