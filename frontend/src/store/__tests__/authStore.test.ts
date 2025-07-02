import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAuthStore } from '../authStore'
import { supabase } from '@/lib/supabase'
import { userCreationService } from '@/lib/user-creation-service'
import { toast } from 'sonner'

// Type definitions for test mocks
interface MockSupabaseQueryBuilder {
  select: () => MockSupabaseQueryBuilder
  eq: () => MockSupabaseQueryBuilder
  single: () => Promise<{ data: unknown; error: unknown }>
  update: () => MockSupabaseQueryBuilder
}


// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock('@/lib/user-creation-service', () => ({
  userCreationService: {
    ensureUserExists: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    authEvent: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  AuthError: class AuthError extends Error {
    constructor(message: string, public code?: string, public details?: unknown) {
      super(message)
      this.name = 'AuthError'
    }
  },
  withErrorHandling: vi.fn((fn) => fn()),
}))

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
  },
}))

vi.mock('@/lib/facebook-pixel', () => ({
  trackCompleteRegistration: vi.fn(),
  trackCustomEvent: vi.fn(),
}))

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useAuthStore.getState()
    store.setUser(null)
    store.setError(null)
    store.setLoading(false)
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('signIn', () => {
    it('should successfully sign in with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      }

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER',
        created_at: new Date().toISOString(),
      }

      // Mock successful authentication
      const mockSignIn = vi.mocked(supabase.auth.signInWithPassword)
      mockSignIn.mockResolvedValue({
        data: { user: mockUser, session: { user: mockUser } },
        error: null,
      } as MockSupabaseQueryBuilder)

      // Mock successful profile creation
      const mockEnsureUserExists = vi.mocked(userCreationService.ensureUserExists)
      mockEnsureUserExists.mockResolvedValue({
        success: true,
        userId: 'user-123',
        action: 'found_existing',
      })

      // Mock profile fetch
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      } as MockSupabaseQueryBuilder)

      const store = useAuthStore.getState()

      await act(async () => {
        await store.signIn('test@example.com', 'password123')
      })

      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(mockEnsureUserExists).toHaveBeenCalledWith(
        'user-123',
        {
          role: 'OWNER',
          name: 'Test User',
        }
      )

      expect(store.user).toEqual(mockProfile)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(toast.success).toHaveBeenCalledWith('Successfully signed in!')
    })

    it('should handle profile creation failure gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      }

      // Mock successful authentication
      const mockSignIn = vi.mocked(supabase.auth.signInWithPassword)
      mockSignIn.mockResolvedValue({
        data: { user: mockUser, session: { user: mockUser } },
        error: null,
      } as MockSupabaseQueryBuilder)

      // Mock failed profile creation
      const mockEnsureUserExists = vi.mocked(userCreationService.ensureUserExists)
      mockEnsureUserExists.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      })

      const store = useAuthStore.getState()

      await act(async () => {
        try {
          await store.signIn('test@example.com', 'password123')
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      })

      expect(mockEnsureUserExists).toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalled()
      expect(store.user).toBeNull()
    })

    it('should handle authentication errors', async () => {
      const mockSignIn = vi.mocked(supabase.auth.signIn)
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', code: 'invalid_credentials' },
      } as MockSupabaseQueryBuilder)

      const store = useAuthStore.getState()

      await act(async () => {
        try {
          await store.signIn('test@example.com', 'wrongpassword')
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      })

      expect(toast.error).toHaveBeenCalled()
      expect(store.user).toBeNull()
    })
  })

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker state', () => {
      const store = useAuthStore.getState()
      
      // Set an error state
      store.setError('Profile lookup temporarily disabled')
      expect(store.error).toBe('Profile lookup temporarily disabled')

      act(() => {
        store.resetCircuitBreaker()
      })

      expect(store.error).toBeNull()
      expect(toast.success).toHaveBeenCalledWith(
        'Authentication circuit breaker reset successfully!',
        expect.any(Object)
      )
    })
  })

  describe('checkSession', () => {
    it('should create missing profile during session check', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      }

      const mockSession = {
        user: mockUser,
        access_token: 'token123',
      }

      // Mock session exists
      const mockGetSession = vi.mocked(supabase.auth.getSession)
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as MockSupabaseQueryBuilder)

      // Mock profile not found initially
      const mockFrom = vi.mocked(supabase.from)
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Profile not found' },
          }),
        } as MockSupabaseQueryBuilder)
        // Then return success after profile creation
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              role: 'OWNER',
            },
            error: null,
          }),
        } as MockSupabaseQueryBuilder)

      // Mock successful profile creation
      const mockEnsureUserExists = vi.mocked(userCreationService.ensureUserExists)
      mockEnsureUserExists.mockResolvedValue({
        success: true,
        userId: 'user-123',
        action: 'created_new',
      })

      const store = useAuthStore.getState()

      await act(async () => {
        await store.checkSession()
      })

      expect(mockEnsureUserExists).toHaveBeenCalledWith(
        'user-123',
        {
          role: 'OWNER',
          name: 'Test User',
        }
      )

      expect(store.user).toBeTruthy()
      expect(store.user?.id).toBe('user-123')
      expect(store.error).toBeNull()
    })
  })

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      const mockSignOut = vi.mocked(supabase.auth.signOut)
      mockSignOut.mockResolvedValue({ error: null })

      const store = useAuthStore.getState()
      
      // Set initial user
      store.setUser({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER',
        created_at: new Date().toISOString(),
      } as MockSupabaseQueryBuilder)

      await act(async () => {
        await store.signOut()
      })

      expect(mockSignOut).toHaveBeenCalled()
      expect(store.user).toBeNull()
      expect(store.error).toBeNull()
      expect(toast.success).toHaveBeenCalledWith('Successfully signed out!')
    })
  })
})