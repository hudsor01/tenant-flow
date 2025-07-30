import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from './app-store'

// Mock localStorage for persist middleware
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('AppStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAppStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      lastActivity: Date.now(),
      sidebarOpen: true,
      theme: 'system',
      notifications: [],
      isOnline: true,
      modals: {
        propertyForm: false,
        unitForm: false,
        leaseForm: false,
        maintenanceForm: false,
        editProperty: false,
        editUnit: false,
        editLease: false,
        editMaintenance: false,
        inviteTenant: false,
        subscriptionCheckout: false,
        subscriptionSuccess: false,
      },
      features: {
        darkMode: false,
        betaFeatures: false,
        analyticsEnabled: true,
      },
    })
    vi.clearAllMocks()
  })

  describe('Authentication State', () => {
    it('should set user and authentication state', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      }

      useAppStore.getState().setUser(mockUser as any)

      const state = useAppStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
    })

    it('should clear user by setting null', () => {
      // First set a user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      useAppStore.getState().setUser(mockUser as any)
      
      // Then clear user
      useAppStore.getState().setUser(null)

      const state = useAppStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('should update last activity on user actions', async () => {
      const initialActivity = useAppStore.getState().lastActivity
      
      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1))
      useAppStore.getState().updateLastActivity()
      
      const newActivity = useAppStore.getState().lastActivity
      expect(newActivity).toBeGreaterThan(initialActivity)
    })
  })

  describe('Theme Management', () => {
    it('should toggle theme between light and dark', () => {
      useAppStore.getState().setTheme('light')
      expect(useAppStore.getState().theme).toBe('light')

      useAppStore.getState().setTheme('dark')
      expect(useAppStore.getState().theme).toBe('dark')
    })

    it('should enable dark mode feature flag', () => {
      useAppStore.getState().toggleFeature('darkMode')
      expect(useAppStore.getState().features.darkMode).toBe(true)

      useAppStore.getState().toggleFeature('darkMode')
      expect(useAppStore.getState().features.darkMode).toBe(false)
    })
  })

  describe('Modal Management', () => {
    it('should open and close property form modal', () => {
      useAppStore.getState().openModal('propertyForm')
      expect(useAppStore.getState().modals.propertyForm).toBe(true)

      useAppStore.getState().closeModal('propertyForm')
      expect(useAppStore.getState().modals.propertyForm).toBe(false)
    })

    it('should close all modals at once', () => {
      // Open multiple modals
      useAppStore.getState().openModal('propertyForm')
      useAppStore.getState().openModal('unitForm')
      useAppStore.getState().openModal('leaseForm')

      expect(useAppStore.getState().modals.propertyForm).toBe(true)
      expect(useAppStore.getState().modals.unitForm).toBe(true)
      expect(useAppStore.getState().modals.leaseForm).toBe(true)

      // Close all
      useAppStore.getState().closeAllModals()

      const modals = useAppStore.getState().modals
      Object.values(modals).forEach(isOpen => {
        expect(isOpen).toBe(false)
      })
    })
  })

  describe('Notification System', () => {
    it('should add success notification', () => {
      useAppStore.getState().addNotification({ message: 'Task completed!', type: 'success' })

      const notifications = useAppStore.getState().notifications
      expect(notifications).toHaveLength(1)
      expect(notifications[0].message).toBe('Task completed!')
      expect(notifications[0].type).toBe('success')
      expect(notifications[0].id).toBeDefined()
      expect(notifications[0].timestamp).toBeDefined()
    })

    it('should add error notification', () => {
      useAppStore.getState().addNotification({ message: 'Something went wrong', type: 'error' })

      const notifications = useAppStore.getState().notifications
      expect(notifications[0].type).toBe('error')
      expect(notifications[0].message).toBe('Something went wrong')
    })

    it('should remove notification by id', () => {
      useAppStore.getState().addNotification({ message: 'Test message', type: 'info' })
      const notification = useAppStore.getState().notifications[0]

      useAppStore.getState().removeNotification(notification.id)

      expect(useAppStore.getState().notifications).toHaveLength(0)
    })

    it('should clear all notifications', () => {
      useAppStore.getState().addNotification({ message: 'Message 1', type: 'info' })
      useAppStore.getState().addNotification({ message: 'Message 2', type: 'success' })
      useAppStore.getState().addNotification({ message: 'Message 3', type: 'warning' })

      expect(useAppStore.getState().notifications).toHaveLength(3)

      useAppStore.getState().clearNotifications()

      expect(useAppStore.getState().notifications).toHaveLength(0)
    })

    it('should allow unlimited notifications (no artificial limit)', () => {
      // Add 10 notifications - there shouldn't be an artificial limit
      for (let i = 0; i < 10; i++) {
        useAppStore.getState().addNotification({ message: `Message ${i}`, type: 'info' })
      }

      const notifications = useAppStore.getState().notifications
      expect(notifications.length).toBe(10)
      
      // Should keep all notifications
      expect(notifications[9].message).toBe('Message 9')
    })
  })

  describe('Loading States', () => {
    it('should set and clear loading state', () => {
      useAppStore.getState().setIsLoading(true)
      expect(useAppStore.getState().isLoading).toBe(true)

      useAppStore.getState().setIsLoading(false)
      expect(useAppStore.getState().isLoading).toBe(false)
    })
  })

  describe('Network State', () => {
    it('should handle online/offline state', () => {
      useAppStore.getState().setOnlineStatus(false)
      expect(useAppStore.getState().isOnline).toBe(false)

      useAppStore.getState().setOnlineStatus(true)
      expect(useAppStore.getState().isOnline).toBe(true)
    })
  })

  describe('Sidebar State', () => {
    it('should toggle sidebar', () => {
      const initialState = useAppStore.getState().sidebarOpen
      
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(!initialState)

      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(initialState)
    })
  })

  describe('Feature Flags', () => {
    it('should toggle beta features', () => {
      expect(useAppStore.getState().features.betaFeatures).toBe(false)

      useAppStore.getState().toggleFeature('betaFeatures')
      expect(useAppStore.getState().features.betaFeatures).toBe(true)
    })

    it('should toggle analytics', () => {
      expect(useAppStore.getState().features.analyticsEnabled).toBe(true)

      useAppStore.getState().toggleFeature('analyticsEnabled')
      expect(useAppStore.getState().features.analyticsEnabled).toBe(false)
    })
  })

  describe('State Reset', () => {
    it('should reset all state to initial values', () => {
      // Change some state
      useAppStore.getState().setUser({ id: 'test', email: 'test@example.com' } as any)
      useAppStore.getState().setTheme('dark')
      useAppStore.getState().openModal('propertyForm')
      useAppStore.getState().addNotification({ message: 'test', type: 'info' })

      // Reset
      useAppStore.getState().reset()

      const state = useAppStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.modals.propertyForm).toBe(false)
      expect(state.notifications).toHaveLength(0)
    })
  })
})