import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'

export type NotificationType = 
  | 'maintenance_request_created'
  | 'maintenance_request_created_emergency'
  | 'maintenance_request_created_high'
  | 'maintenance_request_created_medium'
  | 'maintenance_request_created_low'
  | 'maintenance_update'
  | 'maintenance_update_emergency'
  | 'maintenance_update_high'
  | 'maintenance_update_medium'
  | 'maintenance_update_low'
  | 'lease_expiring'
  | 'payment_received'
  | 'payment_overdue'
  | 'tenant_added'
  | 'property_added'

export interface MaintenanceNotificationData {
  recipientId: string
  title: string
  message: string
  type: NotificationType
  priority: Priority
  actionUrl?: string
  maintenanceId?: string
  data?: {
    propertyName: string
    unitNumber: string
    description: string
    requestTitle: string
  }
}

export class CreateNotificationDto {
  @IsString()
  declare recipientId: string

  @IsString()
  declare title: string

  @IsString()
  declare message: string

  @IsString()
  declare type: NotificationType

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'])
  declare priority: Priority

  @IsOptional()
  @IsString()
  declare actionUrl?: string

  @IsOptional()
  @IsObject()
  declare data?: Record<string, unknown>
}

export class MarkAsReadDto {
  @IsString()
  declare notificationId: string
}

export class GetNotificationsDto {
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'])
  priority?: Priority
}
