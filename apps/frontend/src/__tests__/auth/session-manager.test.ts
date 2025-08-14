import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { sessionManager } from '@/lib/auth/session-manager'
import type { AuthUser } from '@/lib/supabase'

// Mock Supabase client
const mockGetSession = vi.fn()
const mockGetUser = vi.fn()
const mockRefreshSession = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      refreshSession: mockRefreshSession,
      signOut: mockSignOut
    }
  }))
}))

// Mock auth cache
vi.mock('@/lib/auth/auth-cache', () => ({
  authCache: {
    getAuthState: vi.fn((key, fetcher) => fetcher()),
    invalidate: vi.fn(),
    update: vi.fn()
  }
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}))

describe('SessionManager', () => {
  const _mockUser: AuthUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: null
  }

  const mockSession = {
    user: {
      id: '123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User'
      }
    },
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    sessionManager.cleanup()
    vi.useRealTimers()
  })

  describe('initialize', () => {
    it('should initialize with existing session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const user = await sessionManager.initialize()

      expect(user).toEqual({
        id: mockSession.user.id,
        email: mockSession.user.email,
        name: mockSession.user.user_metadata.full_name,
        avatar_url: undefined
      })
      expect(mockGetSession).toHaveBeenCalled()
    })

    it('should return null when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const user = await sessionManager.initialize()

      expect(user).toBeNull()
    })

    it('should handle initialization errors gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Network error')
      })

      const user = await sessionManager.initialize()

      expect(user).toBeNull()
    })

    it('should schedule token refresh for valid session', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      await sessionManager.initialize()

      // Should schedule refresh 5 minutes before expiry
      expect(setTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('refreshSession', () => {
    it('should refresh expired session', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { 
          session: {
            ...mockSession,
            expires_at: Math.floor(Date.now() / 1000) + 7200 // 2 hours from now
          }
        },
        error: null
      })

      mockGetUser.mockResolvedValue({
        data: { user: mockSession.user },
        error: null
      })

      const user = await sessionManager.refreshSession()

      expect(mockRefreshSession).toHaveBeenCalled()
      expect(user).toBeTruthy()
    })

    it('should handle refresh errors', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Refresh failed')
      })

      await expect(sessionManager.refreshSession()).rejects.toThrow('Refresh failed')
    })

    it('should prevent concurrent refresh calls', async () => {
      mockRefreshSession.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: { session: mockSession },
              error: null
            })
          }, 100)
        })
      )

      mockGetUser.mockResolvedValue({
        data: { user: mockSession.user },
        error: null
      })

      // Make multiple concurrent refresh calls
      const promises = [
        sessionManager.refreshSession(),
        sessionManager.refreshSession(),
        sessionManager.refreshSession()
      ]

      await Promise.all(promises)

      // Should only call refresh once
      expect(mockRefreshSession).toHaveBeenCalledTimes(1)
    })

    it('should sign out on refresh failure', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Token expired')
      })

      try {
        await sessionManager.refreshSession()
      } catch {
        // Expected to throw
      }

      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: {
            id: '123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' }
          }
        },
        error: null
      })

      const user = await sessionManager.getCurrentUser()

      expect(user).toEqual({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: undefined
      })
    })

    it('should return null when no user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const user = await sessionManager.getCurrentUser()

      expect(user).toBeNull()
    })
  })

  describe('validateSession', () => {
    it('should validate valid session', async () => {
      mockGetSession.mockResolvedValue({
        data: { 
          session: {
            ...mockSession,
            expires_at: Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
          }
        },
        error: null
      })

      const isValid = await sessionManager.validateSession()

      expect(isValid).toBe(true)
    })

    it('should refresh expired session', async () => {
      mockGetSession.mockResolvedValue({
        data: { 
          session: {
            ...mockSession,
            expires_at: Math.floor(Date.now() / 1000) - 100 // Expired
          }
        },
        error: null
      })

      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockGetUser.mockResolvedValue({
        data: { user: mockSession.user },
        error: null
      })

      const isValid = await sessionManager.validateSession()

      expect(mockRefreshSession).toHaveBeenCalled()
      expect(isValid).toBe(true)
    })

    it('should return false for invalid session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('No session')
      })

      const isValid = await sessionManager.validateSession()

      expect(isValid).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should clear timers and cache on cleanup', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      // Initialize to set up timers
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      await sessionManager.initialize()

      // Cleanup
      sessionManager.cleanup()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('token refresh scheduling', () => {
    it('should refresh immediately if token expires in less than 5 minutes', async () => {
      mockGetSession.mockResolvedValue({
        data: { 
          session: {
            ...mockSession,
            expires_at: Math.floor(Date.now() / 1000) + 120 // 2 minutes from now
          }
        },
        error: null
      })

      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockGetUser.mockResolvedValue({
        data: { user: mockSession.user },
        error: null
      })

      await sessionManager.initialize()

      // Should trigger immediate refresh
      await vi.runAllTimersAsync()

      expect(mockRefreshSession).toHaveBeenCalled()
    })

    it('should schedule refresh 5 minutes before expiry', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      const expiresIn = 30 * 60 // 30 minutes
      
      mockGetSession.mockResolvedValue({
        data: { 
          session: {
            ...mockSession,
            expires_at: Math.floor(Date.now() / 1000) + expiresIn
          }
        },
        error: null
      })

      await sessionManager.initialize()

      // Check that setTimeout was called with correct delay
      // Should refresh 5 minutes before expiry = 25 minutes
      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        (expiresIn - 5 * 60) * 1000
      )
    })
  })
})