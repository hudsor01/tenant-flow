import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { User } from '@supabase/supabase-js'

interface UserCreationResult {
  success: boolean
  userId?: string
  error?: string
  action?: string
  details?: Record<string, unknown>
}

interface UserCreationOptions {
  role?: 'OWNER' | 'TENANT'
  name?: string
  maxRetries?: number
  retryDelayMs?: number
}

/**
 * Bulletproof User Creation Service
 * 
 * This service ensures that User records are created reliably regardless of
 * whether Supabase auth triggers fire properly. It provides multiple fallback
 * mechanisms and comprehensive error handling.
 */
export class UserCreationService {
  private static instance: UserCreationService
  
  static getInstance(): UserCreationService {
    if (!UserCreationService.instance) {
      UserCreationService.instance = new UserCreationService()
    }
    return UserCreationService.instance
  }

  /**
   * Ensures a User record exists for the given auth user.
   * This is the main entry point that handles all scenarios.
   */
  async ensureUserExists(
    authUser: User,
    options: UserCreationOptions = {}
  ): Promise<UserCreationResult> {
    const {
      role = 'OWNER',
      name,
      maxRetries = 3,
      retryDelayMs = 1000
    } = options

    // Ensuring user exists (removed PII from logs)

    try {
      // Step 1: Check if user already exists
      const existingUser = await this.checkUserExists(authUser.id)
      if (existingUser) {
        // User already exists (removed PII from logs)
        return {
          success: true,
          userId: authUser.id,
          action: 'already_exists'
        }
      }

      // Step 2: User doesn't exist, create via stored procedure with retries
      let lastError: Error | null = null
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Creating user (attempt ${attempt}/${maxRetries}) - removed PII from logs
          
          const result = await this.createUserViaStoredProcedure(authUser, {
            role,
            name: name || authUser.user_metadata?.name || authUser.user_metadata?.full_name
          })

          if (result.success) {
            // User created successfully (removed PII from logs)
            return result
          } else {
            lastError = result.error
            logger.warn('User creation failed', { 
          attempt, 
          maxRetries, 
          error: result.error,
          service: 'UserCreationService'
        })
          }

        } catch (error) {
          lastError = error
          logger.warn('User creation attempt failed', { 
          attempt, 
          maxRetries, 
          error: error instanceof Error ? error.message : String(error),
          service: 'UserCreationService'
        })
          
          // Don't retry on certain types of errors
          if (this.isNonRetryableError(error)) {
            break
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = retryDelayMs * Math.pow(2, attempt - 1)
          // Waiting before retry...
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      return {
        success: false,
        error: `Failed to create user after ${maxRetries} attempts`,
        details: lastError
      }

    } catch (error) {
      logger.error('Unexpected error in ensureUserExists', error as Error, { 
        service: 'UserCreationService'
      })
      return {
        success: false,
        error: 'Unexpected error during user creation',
        details: error
      }
    }
  }

  /**
   * Check if a User record exists in the database
   */
  private async checkUserExists(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('User')
        .select('id')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        logger.warn('Error checking user existence', undefined, { 
        error: error.message || String(error),
        code: error.code,
        service: 'UserCreationService'
      })
        return false
      }

      return !!data
    } catch (error) {
      logger.warn('Error in checkUserExists', undefined, { 
        error: error instanceof Error ? error.message : String(error),
        service: 'UserCreationService'
      })
      return false
    }
  }

  /**
   * Create user via the bulletproof stored procedure
   */
  private async createUserViaStoredProcedure(
    authUser: User,
    options: { role: string; name?: string }
  ): Promise<UserCreationResult> {
    try {
      const { data, error } = await supabase.rpc('create_user_profile', {
        user_id: authUser.id,
        user_email: authUser.email!,
        user_role: options.role,
        user_name: options.name || undefined
      })

      if (error) {
        logger.error('Stored procedure error', error as Error, { 
          service: 'UserCreationService'
        })
        return {
          success: false,
          error: error.message,
          details: error
        }
      }

      // The stored procedure returns JSON with success/error information
      const result = data as { success: boolean; action?: string; error?: string }
      
      if (result.success) {
        return {
          success: true,
          userId: authUser.id,
          action: result.action,
          details: result
        }
      } else {
        return {
          success: false,
          error: result.error,
          details: result
        }
      }

    } catch (error) {
      logger.error('Error calling stored procedure', error as Error, { 
        service: 'UserCreationService'
      })
      return {
        success: false,
        error: 'Failed to call user creation procedure',
        details: error
      }
    }
  }

  /**
   * Determine if an error should not be retried
   */
  private isNonRetryableError(error: Error | unknown): boolean {
    if (!error) return false

    const message = (error as Error)?.message?.toLowerCase() || ''
    
    // Don't retry on validation errors, constraint violations, etc.
    return (
      message.includes('unique constraint') ||
      message.includes('invalid input') ||
      message.includes('permission denied') ||
      message.includes('already exists') ||
      error.code === '23505' // PostgreSQL unique violation
    )
  }

  /**
   * Verify that user creation was successful
   */
  async verifyUserCreation(userId: string): Promise<boolean> {
    try {
      // Wait a moment for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const userExists = await this.checkUserExists(userId)
      // User verification completed (removed PII from logs)
      
      return userExists
    } catch (error) {
      logger.error('Error verifying user creation', error as Error, { 
        service: 'UserCreationService'
      })
      return false
    }
  }
}

// Export singleton instance
export const userCreationService = UserCreationService.getInstance()