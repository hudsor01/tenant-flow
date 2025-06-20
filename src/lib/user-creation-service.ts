import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserCreationResult {
  success: boolean
  userId?: string
  error?: string
  action?: string
  details?: any
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

    console.log(`[UserCreationService] Ensuring user exists: ${authUser.id}`)

    try {
      // Step 1: Check if user already exists
      const existingUser = await this.checkUserExists(authUser.id)
      if (existingUser) {
        console.log(`[UserCreationService] User already exists: ${authUser.id}`)
        return {
          success: true,
          userId: authUser.id,
          action: 'already_exists'
        }
      }

      // Step 2: User doesn't exist, create via stored procedure with retries
      let lastError: any
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[UserCreationService] Creating user (attempt ${attempt}/${maxRetries}): ${authUser.id}`)
          
          const result = await this.createUserViaStoredProcedure(authUser, {
            role,
            name: name || authUser.user_metadata?.name || authUser.user_metadata?.full_name
          })

          if (result.success) {
            console.log(`[UserCreationService] User created successfully: ${authUser.id}`)
            return result
          } else {
            lastError = result.error
            console.warn(`[UserCreationService] User creation failed (attempt ${attempt}): ${result.error}`)
          }

        } catch (error) {
          lastError = error
          console.warn(`[UserCreationService] User creation attempt ${attempt} failed:`, error)
          
          // Don't retry on certain types of errors
          if (this.isNonRetryableError(error)) {
            break
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = retryDelayMs * Math.pow(2, attempt - 1)
          console.log(`[UserCreationService] Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      return {
        success: false,
        error: `Failed to create user after ${maxRetries} attempts`,
        details: lastError
      }

    } catch (error) {
      console.error('[UserCreationService] Unexpected error in ensureUserExists:', error)
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
        console.warn('[UserCreationService] Error checking user existence:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.warn('[UserCreationService] Error in checkUserExists:', error)
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
        console.error('[UserCreationService] Stored procedure error:', error)
        return {
          success: false,
          error: error.message,
          details: error
        }
      }

      // The stored procedure returns JSON with success/error information
      const result = data as any
      
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
      console.error('[UserCreationService] Error calling stored procedure:', error)
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
  private isNonRetryableError(error: any): boolean {
    if (!error) return false

    const message = error.message?.toLowerCase() || ''
    
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
      console.log(`[UserCreationService] User verification for ${userId}: ${userExists ? 'EXISTS' : 'NOT FOUND'}`)
      
      return userExists
    } catch (error) {
      console.error('[UserCreationService] Error verifying user creation:', error)
      return false
    }
  }
}

// Export singleton instance
export const userCreationService = UserCreationService.getInstance()