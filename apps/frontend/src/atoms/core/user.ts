import { atom } from 'jotai'
import type { User, AuthError } from '../../types/auth'

// Core user atom
export const userAtom = atom<User | null>(null)

// Derived authentication state
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null)

// Auth loading state
export const authLoadingAtom = atom<boolean>(true)

// Session management
export const sessionExpiryAtom = atom<number | null>(null)
export const lastActivityAtom = atom<number>(Date.now())

// Organization context
export const organizationAtom = atom((get) => {
  const user = get(userAtom)
  return {
    id: user?.organizationId || null,
    name: user?.organizationId || null, // Updated to match User type
  }
})

// Auth error state
export const authErrorAtom = atom<AuthError | null>(null)

// Computed selectors
export const isSessionActiveAtom = atom((get) => {
  const user = get(userAtom)
  const lastActivity = get(lastActivityAtom)
  const sessionExpiry = get(sessionExpiryAtom)
  const now = Date.now()
  
  if (!user) return false
  
  // Check if session is expired
  if (sessionExpiry && now > sessionExpiry) {
    return false
  }
  
  // Check for inactivity timeout (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000
  if (now - lastActivity > SESSION_TIMEOUT) {
    return false
  }
  
  return true
})

// User role
export const userRoleAtom = atom((get) => get(userAtom)?.role || null)

// User subscription (from stripeCustomerId)
export const hasStripeAccountAtom = atom((get) => !!get(userAtom)?.stripeCustomerId)

// User permissions - derived from role
export const userPermissionsAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return []
  
  // Basic permissions based on role
  switch (user.role) {
    case 'OWNER':
      return ['read', 'write', 'delete', 'admin']
    case 'MANAGER':
      return ['read', 'write', 'delete']
    case 'TENANT':
      return ['read']
    default:
      return ['read']
  }
})

// Subscription status - derived from user data
export const subscriptionStatusAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return 'inactive'
  
  // Return subscription status from user profile
  return user.stripeCustomerId ? 'active' : 'inactive'
})

// Actions
export const setUserAtom = atom(
  null,
  (get, set, user: User | null) => {
    set(userAtom, user)
    set(lastActivityAtom, Date.now())
    set(authErrorAtom, null)
    set(authLoadingAtom, false)
  }
)

export const updateUserAtom = atom(
  null,
  (get, set, updates: Partial<User>) => {
    const currentUser = get(userAtom)
    if (currentUser) {
      set(userAtom, { ...currentUser, ...updates })
      set(lastActivityAtom, Date.now())
    }
  }
)

export const clearAuthAtom = atom(
  null,
  (get, set) => {
    set(userAtom, null)
    set(sessionExpiryAtom, null)
    set(authErrorAtom, null)
    set(authLoadingAtom, false)
  }
)

export const updateLastActivityAtom = atom(
  null,
  (get, set) => {
    set(lastActivityAtom, Date.now())
  }
)