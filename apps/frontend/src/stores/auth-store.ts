import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AuthUser as SharedAuthUser } from '@repo/shared'

// Use the shared AuthUser type directly - it has all the properties we need
export type AuthUser = SharedAuthUser

interface AuthState {
  // Core authentication state
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Session management
  sessionExpiry: number | null
  lastActivity: number
  
  // Organization context (consolidated from meStore)
  organizationId: string | null
  organizationName: string | null
  
  // Error handling
  error: string | null
}

interface AuthActions {
  // Authentication actions
  setUser: (user: AuthUser | null) => void
  updateUser: (updates: Partial<AuthUser>) => void
  clearAuth: () => void
  
  // Session management
  setSessionExpiry: (expiry: number | null) => void
  updateLastActivity: () => void
  isSessionActive: () => boolean
  
  // Organization context
  setOrganization: (orgId: string | null, orgName?: string | null) => void
  
  // Loading and error states
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Utility
  reset: () => void
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sessionExpiry: null,
  lastActivity: Date.now(),
  organizationId: null,
  organizationName: null,
  error: null,
}

// Session timeout duration (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // Authentication actions
          setUser: (user) => set((state) => {
            state.user = user
            state.isAuthenticated = !!user
            state.lastActivity = Date.now()
            state.error = null
            
            // Extract organization info if present
            if (user) {
              state.organizationId = user.organizationId
              state.organizationName = user.organizationName || null
            } else {
              state.organizationId = null
              state.organizationName = null
            }
          }, false, 'setUser'),
          
          updateUser: (updates) => set((state) => {
            if (state.user) {
              state.user = { ...state.user, ...updates }
              state.lastActivity = Date.now()
            }
          }, false, 'updateUser'),
          
          clearAuth: () => set((state) => {
            state.user = null
            state.isAuthenticated = false
            state.sessionExpiry = null
            state.organizationId = null
            state.organizationName = null
            state.error = null
          }, false, 'clearAuth'),
          
          // Session management
          setSessionExpiry: (expiry) => set((state) => {
            state.sessionExpiry = expiry
          }, false, 'setSessionExpiry'),
          
          updateLastActivity: () => set((state) => {
            state.lastActivity = Date.now()
          }, false, 'updateLastActivity'),
          
          isSessionActive: () => {
            const state = get()
            const now = Date.now()
            
            // Check if session is expired
            if (state.sessionExpiry && now > state.sessionExpiry) {
              return false
            }
            
            // Check for inactivity timeout
            if (now - state.lastActivity > SESSION_TIMEOUT) {
              return false
            }
            
            return state.isAuthenticated
          },
          
          // Organization context
          setOrganization: (orgId, orgName) => set((state) => {
            state.organizationId = orgId
            state.organizationName = orgName || null
          }, false, 'setOrganization'),
          
          // Loading and error states
          setIsLoading: (loading) => set((state) => {
            state.isLoading = loading
          }, false, 'setIsLoading'),
          
          setError: (error) => set((state) => {
            state.error = error
          }, false, 'setError'),
          
          reset: () => set(initialState, false, 'reset'),
        }))
      ),
      {
        name: 'tenantflow-auth-store',
        version: 1,
        // Only persist non-sensitive data
        partialize: (state) => ({
          organizationId: state.organizationId,
          organizationName: state.organizationName,
          lastActivity: state.lastActivity,
        }),
      }
    ),
    {
      name: 'TenantFlow Auth Store',
    }
  )
)

// Selectors
export const selectUser = (state: AuthState & AuthActions) => state.user
export const selectIsAuthenticated = (state: AuthState & AuthActions) => state.isAuthenticated
export const selectIsLoading = (state: AuthState & AuthActions) => state.isLoading
export const selectOrganization = (state: AuthState & AuthActions) => ({
  id: state.organizationId,
  name: state.organizationName,
})
export const selectSessionStatus = (state: AuthState & AuthActions) => ({
  isActive: state.isSessionActive(),
  expiry: state.sessionExpiry,
  lastActivity: state.lastActivity,
})
export const selectAuthError = (state: AuthState & AuthActions) => state.error

// Computed selectors
export const selectIsSessionExpired = (state: AuthState & AuthActions) => 
  state.sessionExpiry ? Date.now() > state.sessionExpiry : false

export const selectUserPermissions = (state: AuthState & AuthActions) =>
  state.user?.permissions || []

export const selectUserRole = (state: AuthState & AuthActions) =>
  state.user?.role || null

export const selectSubscriptionStatus = (state: AuthState & AuthActions) =>
  state.user?.subscription || null

// Hooks for specific use cases
export const useAuth = () => useAuthStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error,
  setUser: state.setUser,
  updateUser: state.updateUser,
  clearAuth: state.clearAuth,
  setIsLoading: state.setIsLoading,
}))

export const useUser = () => useAuthStore(selectUser)
export const useIsAuthenticated = () => useAuthStore(selectIsAuthenticated)
export const useAuthLoading = () => useAuthStore(selectIsLoading)
export const useOrganization = () => useAuthStore(selectOrganization)
export const useSessionStatus = () => useAuthStore(selectSessionStatus)

// Action hooks
export const useAuthActions = () => useAuthStore((state) => ({
  setUser: state.setUser,
  updateUser: state.updateUser,
  clearAuth: state.clearAuth,
  setSessionExpiry: state.setSessionExpiry,
  updateLastActivity: state.updateLastActivity,
  setOrganization: state.setOrganization,
  setIsLoading: state.setIsLoading,
  setError: state.setError,
}))