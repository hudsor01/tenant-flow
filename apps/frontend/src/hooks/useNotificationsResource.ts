// Purpose: Typed resource hook for notifications using tRPC.
// Assumptions: Uses correct DTO for create.

import { trpc } from '@/lib/trpcClient'
import type { NotificationWithDetails, CreateNotificationDto } from '@/types/api'
import type { ResourceConfig, UseResourceResult } from '@/types/resource'

/**
 * tRPC-based notifications resource hook.
 * Provides CRUD operations for notifications using tRPC.
 */
export function useNotificationsResource(
    config: ResourceConfig<NotificationWithDetails> = {}
): UseResourceResult<NotificationWithDetails, CreateNotificationDto> {
    // Example implementation using tRPC queries/mutations directly.
    // You may want to adapt this to your app's resource abstraction.
    // For now, just return the main tRPC hooks for notifications.

    // List all notifications
    const list = trpc.notifications.getAll.useQuery(undefined, {
        ...config.queryOptions
    })

    // Create notification
    const create = trpc.notifications.create.useMutation(config.mutationOptions)

    // Update notification (if supported)
    const update = trpc.notifications.update
        ? trpc.notifications.update.useMutation(config.mutationOptions)
        : undefined

    // Delete notification
    const remove = trpc.notifications.delete.useMutation(config.mutationOptions)

    return {
        list,
        create,
        update,
        remove
    } as unknown as UseResourceResult<NotificationWithDetails, CreateNotificationDto>
}
