import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { mockSupabase, createMockSupabaseUser, createMockSession, renderWithProviders, mockPerformanceNow } from '@/test/setup'
import SupabaseAuthProcessor from './SupabaseAuthProcessor'

// Mock navigate function
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate
}))

describe('SupabaseAuthProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    
    // Reset window location
    window.location.href = 'http://tenantflow.app/auth/callback'
    window.location.hash = ''
    window.location.search = ''
    window.location.pathname = '/auth/callback'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Email confirmation flow', () => {
    it('should process email confirmation tokens successfully', async () => {
      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)
      
      // Set up URL hash with tokens
      window.location.hash = '#access_token=mock-token&refresh_token=mock-refresh&type=signup'
      
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      // Should show confirming email message
      expect(screen.getByText('Confirming your email...')).toBeInTheDocument()
      expect(screen.getByText('Setting up your session')).toBeInTheDocument()

      await waitFor(() => {
        expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
          access_token: 'mock-token',
          refresh_token: 'mock-refresh'
        })
      })

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('Email confirmed!')).toBeInTheDocument()
        expect(screen.getByText('Welcome to TenantFlow!')).toBeInTheDocument()
      })

      // Should navigate to dashboard after timeout
      vi.advanceTimersByTime(500)
      expect(window.location.href).toBe('/dashboard')
    })

    it('should handle signin type tokens', async () => {
      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)
      
      window.location.hash = '#access_token=mock-token&refresh_token=mock-refresh&type=signin'
      
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Completing sign in...')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('Authentication successful!')).toBeInTheDocument()
      })
    })

    it('should handle setSession errors', async () => {
      window.location.hash = '#access_token=invalid-token&refresh_token=invalid-refresh&type=signup'
      
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token' }
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeInTheDocument()
        expect(screen.getByText('Invalid token')).toBeInTheDocument()
      })

      vi.advanceTimersByTime(2000)
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login', replace: true })
    })
  })

  describe('OAuth code exchange flow', () => {
    it('should exchange OAuth code for session successfully', async () => {
      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)
      
      window.location.search = '?code=oauth-code-123'
      
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Completing sign in...')).toBeInTheDocument()
        expect(screen.getByText('Exchanging authentication code')).toBeInTheDocument()
      })

      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code-123')

      await waitFor(() => {
        expect(screen.getByText('Authentication successful!')).toBeInTheDocument()
        expect(screen.getByText('Welcome back!')).toBeInTheDocument()
      })

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard', replace: true })
    })

    it('should handle PKCE cross-browser errors gracefully', async () => {
      window.location.search = '?code=oauth-code-123'
      
      const pkceError = new Error('code verifier mismatch')
      mockSupabase.auth.exchangeCodeForSession.mockRejectedValue(pkceError)

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeInTheDocument()
        expect(screen.getByText('Please sign in again or use the same browser you signed up with')).toBeInTheDocument()
      })

      vi.advanceTimersByTime(3000)
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login', replace: true })
    })

    it('should handle general OAuth exchange errors', async () => {
      window.location.search = '?code=invalid-code'
      
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid authorization code' }
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeInTheDocument()
        expect(screen.getByText('Invalid authorization code')).toBeInTheDocument()
      })
    })
  })

  describe('Existing session flow', () => {
    it('should handle existing valid session', async () => {
      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication successful!')).toBeInTheDocument()
        expect(screen.getByText('Welcome back!')).toBeInTheDocument()
      })

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard', replace: true })
    })

    it('should redirect to login when no session found', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication required')).toBeInTheDocument()
        expect(screen.getByText('Please sign in to continue')).toBeInTheDocument()
      })

      vi.advanceTimersByTime(2000)
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login', replace: true })
    })

    it('should handle session check errors', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Network error' }
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      vi.advanceTimersByTime(2000)
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login', replace: true })
    })
  })

  describe('Error scenarios', () => {
    it('should handle timeout scenarios', async () => {
      // Mock a slow response
      mockSupabase.auth.getSession.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { session: null }, error: null }), 35000))
      )

      renderWithProviders(<SupabaseAuthProcessor />)

      // Fast-forward to timeout
      vi.advanceTimersByTime(30000)

      await waitFor(() => {
        expect(screen.getByText('Authentication timeout')).toBeInTheDocument()
        expect(screen.getByText('Taking too long, please try again')).toBeInTheDocument()
      })

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login', replace: true })
    })

    it('should handle network failures', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'))

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should handle invalid tokens gracefully', async () => {
      window.location.hash = '#access_token=&refresh_token=&type=signup'
      
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token format' }
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeInTheDocument()
        expect(screen.getByText('Invalid token format')).toBeInTheDocument()
      })
    })
  })

  describe('Performance tracking', () => {
    it('should log performance metrics', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1200) // Session check time
        .mockReturnValueOnce(1300) // End time

      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Auth] Total auth time: 300ms'))
      })

      consoleSpy.mockRestore()
    })

    it('should warn about slow session setup', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      window.location.hash = '#access_token=mock-token&refresh_token=mock-refresh&type=signup'
      
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Process start
        .mockReturnValueOnce(2000) // Session start  
        .mockReturnValueOnce(8000) // Session end (6 seconds)

      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)
      
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Auth] Session setup is taking unusually long!'),
          expect.any(Number)
        )
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Component lifecycle', () => {
    it('should handle component unmounting during auth process', async () => {
      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)
      
      // Mock a delayed response
      mockSupabase.auth.getSession.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { session: mockSession }, error: null }), 100)
        )
      )

      const { unmount } = renderWithProviders(<SupabaseAuthProcessor />)
      
      // Unmount before auth completes
      unmount()
      
      // Advance timers to complete the auth process
      vi.advanceTimersByTime(200)
      
      // Navigate should not be called since component unmounted
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should clean up timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      const { unmount } = renderWithProviders(<SupabaseAuthProcessor />)
      unmount()
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('URL handling', () => {
    it('should clear hash from URL after processing tokens', async () => {
      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)
      
      window.location.hash = '#access_token=mock-token&refresh_token=mock-refresh&type=signup'
      
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(window.history.replaceState).toHaveBeenCalledWith(
          null,
          '',
          window.location.pathname + window.location.search
        )
      })
    })

    it('should handle missing Supabase client', async () => {
      // Temporarily mock supabase as undefined
      vi.doMock('@/lib/clients', () => ({
        supabase: undefined
      }))

      renderWithProviders(<SupabaseAuthProcessor />)

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeInTheDocument()
        expect(screen.getByText('Authentication service not available')).toBeInTheDocument()
      })
    })
  })
})