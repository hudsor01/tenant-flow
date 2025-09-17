'use client'

import React, { createContext, useContext, useRef, useEffect } from 'react'
import { type StoreApi } from 'zustand'
import { supabaseClient } from '@repo/shared/lib/supabase-client'

import type { AuthState } from './auth-store'
import { createAuthStore } from './auth-store'
import type { Session } from '@supabase/supabase-js'

const AuthStoreContext = createContext<StoreApi<AuthState> | null>(null)

export const AuthStoreProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const storeRef = useRef<StoreApi<AuthState> | null>(null)
  
  storeRef.current ??= createAuthStore({ isLoading: true })

  useEffect(() => {
    const store = storeRef.current!

    // Check for mock authentication first (development only)
    const checkMockAuth = () => {
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true') {
        // Check for mock auth cookies
        const mockToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('sb-access-token=') || row.startsWith('mock-user-id='))
        
        if (mockToken) {
          // Create mock session for auth store
          const mockSession = {
            access_token: 'mock-dev-token-123',
            refresh_token: 'mock-dev-refresh-token-123',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: {
              id: 'mock-user-dev-123',
              email: 'test@tenantflow.dev',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_sign_in_at: new Date().toISOString(),
              email_confirmed_at: new Date().toISOString(),
              phone: null,
              confirmed_at: new Date().toISOString(),
              recovery_sent_at: null,
              new_email: null,
              invited_at: null,
              action_link: null,
              email_change: null,
              email_change_sent_at: null,
              email_change_confirm_status: 0,
              banned_until: null,
              reauthentication_sent_at: null,
              is_anonymous: false,
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              role: 'authenticated'
            }
          } as unknown as Session
          
          store.getState().setSession(mockSession)
          store.getState().setLoading(false)
          return true
        }
      }
      return false
    }

    // Try mock auth first, fallback to real Supabase
    if (checkMockAuth()) {
      return // Early return for mock auth
    }
    
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      store.getState().setSession(session)
      store.getState().setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      store.getState().setSession(session)
      store.getState().setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthStoreContext.Provider value={storeRef.current}>
      {children}
    </AuthStoreContext.Provider>
  )
}

export const useAuthStore = <T,>(
  selector: (state: AuthState) => T
): T => {
  const store = useContext(AuthStoreContext)
  if (!store) throw new Error('Missing AuthStoreProvider')
  
  // Simple subscription pattern that works with SSR
  const [state, setState] = React.useState(() => selector(store.getState()))
  
  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState(selector(store.getState()))
    })
    return unsubscribe
  }, [store, selector])
  
  return state
}