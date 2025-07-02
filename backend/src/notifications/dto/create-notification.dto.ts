import { NotificationType, NotificationPriority } from '@prisma/client';

export class CreateNotificationDto {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  userId: string;
  propertyId?: string;
  tenantId?: string;
  leaseId?: string;
  paymentId?: string;
  maintenanceId?: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
}

export class UpdateNotificationDto {
  read?: boolean;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: NotificationType;
}
