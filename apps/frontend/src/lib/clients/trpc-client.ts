/**
 * TRPC Client Configuration
 * 
 * Single source of truth for TRPC client setup.
 * Following TRPC v11 documentation.
 */

import { httpBatchLink, createTRPCClient } from '@trpc/client'
import superjson from 'superjson'
import { logger } from '../logger'
import { supabase } from './supabase-client'

import type { AppRouter } from '@tenantflow/trpc-types'

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://tenantflow.app'

// Validate required environment variables
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is required')
}

// Create vanilla TRPC client for non-React contexts  
export const trpcClient: ReturnType<typeof createTRPCClient<AppRouter>> = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/trpc`,
      transformer: superjson,
      async headers() {
        // Get auth token from Supabase if available
        if (!supabase) return {}
        
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) return {}
          
          return {
            authorization: `Bearer ${session.access_token}`
          }
        } catch (error) {
          logger.error('Failed to get auth token', error instanceof Error ? error : new Error(String(error)))
          return {}
        }
      },
      fetch(url, options) {
        // Add timeout to prevent hanging requests
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal
        }).finally(() => clearTimeout(timeout))
      }
    })
  ]
})

// TRPC client configuration factory for React Query integration
export function getTRPCClientConfig() {
  return {
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/trpc`,
        transformer: superjson,
        async headers() {
          // Get auth token from Supabase if available
          if (!supabase) return {}
          
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return {}
            
            return {
              authorization: `Bearer ${session.access_token}`
            }
          } catch (error) {
            logger.error('Failed to get auth token', error instanceof Error ? error : new Error(String(error)))
            return {}
          }
        },
        fetch(url, options) {
          // Add timeout to prevent hanging requests
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout
          
          return fetch(url, {
            ...options,
            signal: controller.signal
          }).finally(() => clearTimeout(timeout))
        }
      })
    ]
  }
}

// Network monitoring utilities
export function setupNetworkMonitoring() {
  if (typeof window === 'undefined') return

  // Monitor online/offline status
  window.addEventListener('online', () => {
    logger.info('Network connection restored')
  })

  window.addEventListener('offline', () => {
    logger.warn('Network connection lost')
  })
}