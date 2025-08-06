import React, { useEffect } from 'react'
import { supabase } from '@/lib/clients'
import { useAppStore } from '@/stores/app-store'
import { useMeStore } from '@/stores/meStore'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider syncs Supabase auth state with Zustand stores
 * This ensures React.Children and other React features work properly
 * by providing proper context at the app level
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setIsLoading } = useAppStore()
  const { setMe, clearMe } = useMeStore()

  useEffect(() => {
    let mounted = true

    // Initialize auth state
    async function initializeAuth() {
      try {
        setIsLoading(true)

        if (!supabase) {
          console.error('Supabase client not initialized')
          return
        }

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth initialization error:', error)
        } else if (session && mounted) {
          // Set user in app store
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || null,
            organizationId: session.user.user_metadata?.organizationId || null,
            createdAt: new Date(session.user.created_at || Date.now()),
            updatedAt: new Date(session.user.updated_at || Date.now()),
          })
          
          // Fetch and set me data
          if (session.user.user_metadata?.organizationId) {
            try {
              const response = await fetch('/api/users/me', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              })
              
              if (response.ok) {
                const meData = await response.json()
                setMe(meData.data)
              }
            } catch (err) {
              console.error('Failed to fetch me data:', err)
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.warn('Auth state changed:', event, session?.user?.email)
        
        switch (event) {
          case 'SIGNED_OUT':
            setUser(null)
            clearMe()
            break
            
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || null,
                organizationId: session.user.user_metadata?.organizationId || null,
                createdAt: new Date(session.user.created_at || Date.now()),
                updatedAt: new Date(session.user.updated_at || Date.now()),
              })
              
              // Fetch me data if we have an organization
              if (session.user.user_metadata?.organizationId) {
                try {
                  const response = await fetch('/api/users/me', {
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`
                    }
                  })
                  
                  if (response.ok) {
                    const meData = await response.json()
                    setMe(meData.data)
                  }
                } catch (err) {
                  console.error('Failed to fetch me data:', err)
                }
              }
            }
            break
            
          case 'USER_UPDATED':
            if (session) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || null,
                organizationId: session.user.user_metadata?.organizationId || null,
                createdAt: new Date(session.user.created_at || Date.now()),
                updatedAt: new Date(session.user.updated_at || Date.now()),
              })
            }
            break
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser, setIsLoading, setMe, clearMe])

  return <>{children}</>
}