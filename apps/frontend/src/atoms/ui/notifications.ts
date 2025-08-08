import { atom } from 'jotai'

export interface NotificationState {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  id: string
  timestamp: number
}

// Notifications atom
export const notificationsAtom = atom<NotificationState[]>([])

// Generate unique ID for notifications
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

// Actions
export const addNotificationAtom = atom(
  null,
  (get, set, notification: Omit<NotificationState, 'id' | 'timestamp'>) => {
    const newNotification: NotificationState = {
      ...notification,
      id: generateId(),
      timestamp: Date.now(),
    }
    
    const currentNotifications = get(notificationsAtom)
    set(notificationsAtom, [...currentNotifications, newNotification])
    
    // Auto-remove after 5 seconds for success/info notifications
    if (notification.type === 'success' || notification.type === 'info') {
      setTimeout(() => {
        const updatedNotifications = get(notificationsAtom)
        set(notificationsAtom, updatedNotifications.filter(n => n.id !== newNotification.id))
      }, 5000)
    }
  }
)

export const removeNotificationAtom = atom(
  null,
  (get, set, id: string) => {
    const currentNotifications = get(notificationsAtom)
    set(notificationsAtom, currentNotifications.filter(n => n.id !== id))
  }
)

export const clearNotificationsAtom = atom(
  null,
  (get, set) => {
    set(notificationsAtom, [])
  }
)

// Computed selectors
export const unreadNotificationsAtom = atom((get) => 
  get(notificationsAtom).filter(n => n.type === 'error' || n.type === 'warning')
)