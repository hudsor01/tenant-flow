'use client'

import React, { createContext, useContext, useRef, useEffect } from 'react'
import { type StoreApi } from 'zustand'
import { supabaseClient } from '@repo/shared/lib/supabase-client'

import type { AuthState } from './auth-store'
import { createAuthStore } from './auth-store'

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