import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNotifications, useCreateNotification } from './useNotifications'

export function useWelcomeNotification() {
  const { user } = useAuthStore()
  const { data: notifications } = useNotifications()
  const createNotification = useCreateNotification()

  useEffect(() => {
    if (!user?.id || !notifications) return

    // Check if user already has a welcome notification
    const hasWelcomeNotification = notifications.some(
      notification => notification.type === 'SYSTEM' && notification.title === 'Welcome to TenantFlow!'
    )

    // If no welcome notification and user was recently created (within last hour)
    if (!hasWelcomeNotification && user.createdAt) {
      const userCreatedTime = new Date(user.createdAt).getTime()
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      
      if (userCreatedTime > oneHourAgo) {
        // Create welcome notification
        const welcomeData = {
          title: 'Welcome to TenantFlow!',
          message: 'Welcome to TenantFlow! Your account has been successfully created. Start by adding your first property to get the most out of your property management experience.',
          type: 'SYSTEM' as const,
          priority: 'MEDIUM' as const,
          userId: user.id
        }
        createNotification.mutate(welcomeData)
      }
    }
  }, [user, notifications, createNotification])
}