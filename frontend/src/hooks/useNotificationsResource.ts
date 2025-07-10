// Purpose: Typed resource hook for notifications.
// Assumptions: Uses correct DTO for create.

import { useResource } from './useResource'
import type { NotificationWithDetails, CreateNotificationDto } from '@/types/api'
import type { ResourceConfig, UseResourceResult } from '@/types/resource'

export function useNotificationsResource(
    config: ResourceConfig<NotificationWithDetails> = {}
): UseResourceResult<NotificationWithDetails, CreateNotificationDto> {
    return useResource<NotificationWithDetails, CreateNotificationDto>('notifications', config)
}
