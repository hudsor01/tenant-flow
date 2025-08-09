import { atom } from 'jotai'
import type { Property } from '@repo/shared'

// Analytics tracking types
export interface AnalyticsEvent {
  event: string
  properties?: Record<string, unknown>
  timestamp: number
}

export interface NotificationEvent {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

// Analytics queue atom
export const analyticsQueueAtom = atom<AnalyticsEvent[]>([])

// Notification queue atom  
export const notificationQueueAtom = atom<NotificationEvent[]>([])

// Property analytics tracking atom
export const trackPropertyActionAtom = atom(
  null,
  (get, set, action: { type: 'create' | 'update' | 'delete' | 'view', property: Property }) => {
    // Track the analytics event
    const event: AnalyticsEvent = {
      event: `property_${action.type}`,
      properties: {
        propertyId: action.property.id,
        propertyType: action.property.propertyType,
        city: action.property.city,
      },
      timestamp: Date.now(),
    }
    
    // Add to analytics queue
    const currentQueue = get(analyticsQueueAtom)
    set(analyticsQueueAtom, [...currentQueue, event])
    
    // Show notification for user actions
    if (action.type !== 'view') {
      const notification: NotificationEvent = {
        type: action.type === 'delete' ? 'info' : 'success',
        message: `Property ${action.type === 'create' ? 'created' : action.type === 'update' ? 'updated' : 'deleted'} successfully`,
        duration: 3000,
      }
      
      const currentNotifications = get(notificationQueueAtom)
      set(notificationQueueAtom, [...currentNotifications, notification])
    }
  }
)

// Error tracking atom
export const trackErrorAtom = atom(
  null,
  (get, set, error: { message: string, stack?: string, context?: Record<string, unknown> }) => {
    const errorEvent: AnalyticsEvent = {
      event: 'error_occurred',
      properties: {
        message: error.message,
        stack: error.stack,
        context: error.context,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      },
      timestamp: Date.now(),
    }
    
    // Add to analytics queue
    const currentQueue = get(analyticsQueueAtom)
    set(analyticsQueueAtom, [...currentQueue, errorEvent])
    
    // Show error notification
    const notification: NotificationEvent = {
      type: 'error',
      message: error.message,
      duration: 5000,
    }
    
    const currentNotifications = get(notificationQueueAtom)
    set(notificationQueueAtom, [...currentNotifications, notification])
  }
)

// Utility atoms for queue management
export const clearAnalyticsQueueAtom = atom(
  null,
  (get, set) => {
    set(analyticsQueueAtom, [])
  }
)

export const clearNotificationQueueAtom = atom(
  null,
  (get, set) => {
    set(notificationQueueAtom, [])
  }
)

export const removeNotificationFromQueueAtom = atom(
  null,
  (get, set, index: number) => {
    const currentQueue = get(notificationQueueAtom)
    set(notificationQueueAtom, currentQueue.filter((_, i) => i !== index))
  }
)

// Derived atom for unread notifications count
export const unreadNotificationsCountAtom = atom((get) => {
  const notifications = get(notificationQueueAtom)
  return notifications.length
})

// Derived atom for analytics queue size
export const analyticsQueueSizeAtom = atom((get) => {
  const queue = get(analyticsQueueAtom)
  return queue.length
})