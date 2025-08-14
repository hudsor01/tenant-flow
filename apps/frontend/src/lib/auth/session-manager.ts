import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { AuthUser } from '@/lib/supabase'
import { authCache } from '@/lib/auth/auth-cache'

export class SessionManager {
  private static instance: SessionManager
  private refreshPromise: Promise<void> | null = null
  private refreshTimeoutId: NodeJS.Timeout | null = null

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Initialize session monitoring
   * Sets up automatic token refresh and session validation
   */
  async initialize(): Promise<AuthUser | null> {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        logger.error('Session initialization error:', error, { component: 'SessionManager' })
        return null
      }

      if (session?.user) {
        // Schedule token refresh
        this.scheduleTokenRefresh(session.expires_at)
        
        // Return user data
        return {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.email!,
          avatar_url: session.user.user_metadata?.avatar_url,
        }
      }

      return null
    } catch (error) {
      logger.error('Session initialization failed:', error instanceof Error ? error : new Error(String(error)), {
        component: 'SessionManager'
      })
      return null
    }
  }

  /**
   * Refresh the current session
   * Handles token refresh with proper error handling and retry logic
   */
  async refreshSession(): Promise<AuthUser | null> {
    // Prevent multiple simultaneous refresh calls
    if (this.refreshPromise) {
      await this.refreshPromise
      return this.getCurrentUser()
    }

    this.refreshPromise = this.performRefresh()
    
    try {
      await this.refreshPromise
      return this.getCurrentUser()
    } finally {
      this.refreshPromise = null
    }
  }

  private async performRefresh(): Promise<void> {
    try {
      logger.debug('Starting session refresh', { component: 'SessionManager' })
      
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.refreshSession()

      if (error) {
        logger.error('Session refresh failed:', error, { component: 'SessionManager' })
        
        // If refresh fails, clear any scheduled refreshes
        this.clearRefreshTimeout()
        
        // Trigger sign out event to clear local state
        await supabase.auth.signOut()
        
        throw error
      }

      if (session) {
        logger.debug('Session refreshed successfully', { 
          component: 'SessionManager',
          expiresAt: session.expires_at 
        })
        
        // Schedule next refresh
        this.scheduleTokenRefresh(session.expires_at)
      }

    } catch (error) {
      logger.error('Session refresh error:', error instanceof Error ? error : new Error(String(error)), {
        component: 'SessionManager'
      })
      throw error
    }
  }

  /**
   * Get current user without triggering auth state changes
   * Uses caching to reduce redundant auth checks
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    return authCache.getAuthState(
      'current-user',
      async () => {
        try {
          const supabase = createClient()
          const { data: { user }, error } = await supabase.auth.getUser()

          if (error || !user) {
            return null
          }

          return {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.email!,
            avatar_url: user.user_metadata?.avatar_url,
          }
        } catch (error) {
          logger.error('Get current user failed:', error instanceof Error ? error : new Error(String(error)), {
            component: 'SessionManager'
          })
          return null
        }
      }
    )
  }

  /**
   * Schedule automatic token refresh
   * Refreshes tokens before they expire to prevent interruptions
   */
  private scheduleTokenRefresh(expiresAt?: number): void {
    this.clearRefreshTimeout()

    if (!expiresAt) return

    // Calculate refresh time (refresh 5 minutes before expiry)
    const expiryTime = expiresAt * 1000 // Convert to milliseconds
    const now = Date.now()
    const refreshTime = expiryTime - (5 * 60 * 1000) // 5 minutes before expiry
    const timeUntilRefresh = refreshTime - now

    // If token expires in less than 5 minutes, refresh immediately
    if (timeUntilRefresh <= 0) {
      logger.debug('Token expires soon, refreshing immediately', { component: 'SessionManager' })
      this.refreshSession().catch(error => {
        logger.error('Immediate token refresh failed:', error instanceof Error ? error : new Error(String(error)), {
          component: 'SessionManager'
        })
      })
      return
    }

    logger.debug('Scheduling token refresh', { 
      component: 'SessionManager',
      refreshIn: Math.floor(timeUntilRefresh / 1000 / 60), // minutes
    })

    this.refreshTimeoutId = setTimeout(() => {
      this.refreshSession().catch(error => {
        logger.error('Scheduled token refresh failed:', error instanceof Error ? error : new Error(String(error)), {
          component: 'SessionManager'
        })
      })
    }, timeUntilRefresh)
  }

  /**
   * Clear scheduled token refresh
   */
  private clearRefreshTimeout(): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId)
      this.refreshTimeoutId = null
    }
  }

  /**
   * Validate current session
   * Checks if the session is still valid and refreshes if needed
   */
  async validateSession(): Promise<boolean> {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        logger.debug('Session validation failed - no session', { component: 'SessionManager' })
        return false
      }

      // Check if session is expired
      const now = Date.now() / 1000
      if (session.expires_at && session.expires_at < now) {
        logger.debug('Session expired, attempting refresh', { component: 'SessionManager' })
        
        const refreshedUser = await this.refreshSession()
        return !!refreshedUser
      }

      logger.debug('Session is valid', { component: 'SessionManager' })
      return true

    } catch (error) {
      logger.error('Session validation error:', error instanceof Error ? error : new Error(String(error)), {
        component: 'SessionManager'
      })
      return false
    }
  }

  /**
   * Clean up session manager
   * Call this when the app is unmounting or user logs out
   */
  cleanup(): void {
    this.clearRefreshTimeout()
    this.refreshPromise = null
    authCache.invalidate('current-user') // Clear auth cache
    logger.debug('SessionManager cleaned up', { component: 'SessionManager' })
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()