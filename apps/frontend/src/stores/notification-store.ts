import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'

export interface Notification {
  id: string
  message: string
  type: NotificationType
  title?: string
  description?: string
  timestamp: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
  onClose?: () => void
  duration?: number // milliseconds
  icon?: React.ReactNode
}

interface NotificationState {
  // Active notifications
  notifications: Notification[]
  
  // History (for notification center)
  history: Notification[]
  maxHistorySize: number
  
  // UI preferences
  position: NotificationPosition
  maxVisible: number
  defaultDuration: number
  
  // Status
  isPaused: boolean // Pause auto-dismiss when hovering
  soundEnabled: boolean
}

interface NotificationActions {
  // Core notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
  clearAll: () => void
  
  // Batch operations
  addMultipleNotifications: (notifications: Omit<Notification, 'id' | 'timestamp'>[]) => string[]
  removeMultipleNotifications: (ids: string[]) => void
  
  // History management
  clearHistory: () => void
  removeFromHistory: (id: string) => void
  
  // UI preferences
  setPosition: (position: NotificationPosition) => void
  setMaxVisible: (max: number) => void
  setDefaultDuration: (duration: number) => void
  setSoundEnabled: (enabled: boolean) => void
  
  // Pause/resume auto-dismiss
  pauseAutoDismiss: () => void
  resumeAutoDismiss: () => void
  
  // Utility methods
  showSuccess: (message: string, options?: Partial<Notification>) => string
  showError: (message: string, options?: Partial<Notification>) => string
  showWarning: (message: string, options?: Partial<Notification>) => string
  showInfo: (message: string, options?: Partial<Notification>) => string
}

const initialState: NotificationState = {
  notifications: [],
  history: [],
  maxHistorySize: 100,
  position: 'bottom-right',
  maxVisible: 5,
  defaultDuration: 5000,
  isPaused: false,
  soundEnabled: true,
}

// Generate unique notification ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

// Auto-dismiss timers storage
const autoDismissTimers = new Map<string, NodeJS.Timeout>()

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,
        
        // Core notification actions
        addNotification: (notification) => {
          const id = generateId()
          const newNotification: Notification = {
            ...notification,
            id,
            timestamp: Date.now(),
            duration: notification.duration ?? get().defaultDuration,
          }
          
          set((state) => {
            // Add to active notifications
            state.notifications.push(newNotification)
            
            // Limit visible notifications
            if (state.notifications.length > state.maxVisible) {
              const removed = state.notifications.shift()
              if (removed) {
                // Move to history
                state.history.unshift(removed)
                // Clear its timer if exists
                const timer = autoDismissTimers.get(removed.id)
                if (timer) {
                  clearTimeout(timer)
                  autoDismissTimers.delete(removed.id)
                }
              }
            }
            
            // Add to history
            state.history.unshift(newNotification)
            
            // Maintain history size limit
            if (state.history.length > state.maxHistorySize) {
              state.history = state.history.slice(0, state.maxHistorySize)
            }
          }, false, 'addNotification')
          
          // Set up auto-dismiss
          if (!notification.persistent && !get().isPaused) {
            const duration = notification.duration ?? get().defaultDuration
            const timer = setTimeout(() => {
              get().removeNotification(id)
            }, duration)
            autoDismissTimers.set(id, timer)
          }
          
          // Play sound if enabled
          if (get().soundEnabled && typeof window !== 'undefined') {
            // You can implement sound playing here
            // const audio = new Audio('/notification-sound.mp3')
            // audio.play().catch(() => {})
          }
          
          return id
        },
        
        removeNotification: (id) => {
          set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== id)
          }, false, 'removeNotification')
          
          // Clear timer if exists
          const timer = autoDismissTimers.get(id)
          if (timer) {
            clearTimeout(timer)
            autoDismissTimers.delete(id)
          }
          
          // Call onClose callback if exists
          const notification = get().notifications.find(n => n.id === id)
          if (notification?.onClose) {
            notification.onClose()
          }
        },
        
        clearNotifications: () => {
          set((state) => {
            state.notifications = []
          }, false, 'clearNotifications')
          
          // Clear all timers
          autoDismissTimers.forEach(timer => clearTimeout(timer))
          autoDismissTimers.clear()
        },
        
        clearAll: () => {
          set((state) => {
            state.notifications = []
            state.history = []
          }, false, 'clearAll')
          
          // Clear all timers
          autoDismissTimers.forEach(timer => clearTimeout(timer))
          autoDismissTimers.clear()
        },
        
        // Batch operations
        addMultipleNotifications: (notifications) => {
          const ids: string[] = []
          notifications.forEach(notification => {
            const id = get().addNotification(notification)
            ids.push(id)
          })
          return ids
        },
        
        removeMultipleNotifications: (ids) => {
          ids.forEach(id => get().removeNotification(id))
        },
        
        // History management
        clearHistory: () => set((state) => {
          state.history = []
        }, false, 'clearHistory'),
        
        removeFromHistory: (id) => set((state) => {
          state.history = state.history.filter(n => n.id !== id)
        }, false, 'removeFromHistory'),
        
        // UI preferences
        setPosition: (position) => set((state) => {
          state.position = position
        }, false, 'setPosition'),
        
        setMaxVisible: (max) => set((state) => {
          state.maxVisible = max
        }, false, 'setMaxVisible'),
        
        setDefaultDuration: (duration) => set((state) => {
          state.defaultDuration = duration
        }, false, 'setDefaultDuration'),
        
        setSoundEnabled: (enabled) => set((state) => {
          state.soundEnabled = enabled
        }, false, 'setSoundEnabled'),
        
        // Pause/resume auto-dismiss
        pauseAutoDismiss: () => {
          set((state) => {
            state.isPaused = true
          }, false, 'pauseAutoDismiss')
          
          // Pause all active timers
          autoDismissTimers.forEach((timer, _id) => {
            clearTimeout(timer)
          })
        },
        
        resumeAutoDismiss: () => {
          set((state) => {
            state.isPaused = false
          }, false, 'resumeAutoDismiss')
          
          // Resume auto-dismiss for non-persistent notifications
          const notifications = get().notifications
          notifications.forEach(notification => {
            if (!notification.persistent && autoDismissTimers.has(notification.id)) {
              // Calculate remaining time
              const elapsed = Date.now() - notification.timestamp
              const duration = notification.duration ?? get().defaultDuration
              const remaining = Math.max(0, duration - elapsed)
              
              if (remaining > 0) {
                const timer = setTimeout(() => {
                  get().removeNotification(notification.id)
                }, remaining)
                autoDismissTimers.set(notification.id, timer)
              } else {
                // Remove immediately if time has passed
                get().removeNotification(notification.id)
              }
            }
          })
        },
        
        // Utility methods
        showSuccess: (message, options) => {
          return get().addNotification({
            message,
            type: 'success',
            ...options,
          })
        },
        
        showError: (message, options) => {
          return get().addNotification({
            message,
            type: 'error',
            persistent: true, // Errors are persistent by default
            ...options,
          })
        },
        
        showWarning: (message, options) => {
          return get().addNotification({
            message,
            type: 'warning',
            duration: 7000, // Warnings last longer
            ...options,
          })
        },
        
        showInfo: (message, options) => {
          return get().addNotification({
            message,
            type: 'info',
            ...options,
          })
        },
      }))
    ),
    {
      name: 'TenantFlow Notification Store',
    }
  )
)

// Selectors
export const selectNotifications = (state: NotificationState & NotificationActions) => state.notifications
export const selectNotificationHistory = (state: NotificationState & NotificationActions) => state.history
export const selectNotificationPosition = (state: NotificationState & NotificationActions) => state.position
export const selectNotificationPreferences = (state: NotificationState & NotificationActions) => ({
  position: state.position,
  maxVisible: state.maxVisible,
  defaultDuration: state.defaultDuration,
  soundEnabled: state.soundEnabled,
})

// Computed selectors
export const selectUnreadNotifications = (state: NotificationState & NotificationActions) =>
  state.notifications.filter(n => n.type === 'error' || n.type === 'warning')

export const selectNotificationCount = (state: NotificationState & NotificationActions) =>
  state.notifications.length

export const selectHasNotifications = (state: NotificationState & NotificationActions) =>
  state.notifications.length > 0

// Hooks
export const useNotifications = () => useNotificationStore((state) => ({
  notifications: state.notifications,
  add: state.addNotification,
  remove: state.removeNotification,
  clear: state.clearNotifications,
  showSuccess: state.showSuccess,
  showError: state.showError,
  showWarning: state.showWarning,
  showInfo: state.showInfo,
}))

export const useNotificationHistory = () => useNotificationStore((state) => ({
  history: state.history,
  clearHistory: state.clearHistory,
  removeFromHistory: state.removeFromHistory,
}))

export const useNotificationPreferences = () => useNotificationStore((state) => ({
  position: state.position,
  maxVisible: state.maxVisible,
  defaultDuration: state.defaultDuration,
  soundEnabled: state.soundEnabled,
  setPosition: state.setPosition,
  setMaxVisible: state.setMaxVisible,
  setDefaultDuration: state.setDefaultDuration,
  setSoundEnabled: state.setSoundEnabled,
}))

// Quick access hooks
export const useNotify = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotificationStore()
  return {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
  }
}