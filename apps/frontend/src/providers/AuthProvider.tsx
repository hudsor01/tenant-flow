import React, { useEffect } from 'react'
import { supabase } from '@/lib/clients'
import { useAuthStore, initializeStores } from '@/stores'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider syncs Supabase auth state with Zustand stores
 * This ensures React.Children and other React features work properly
 * by providing proper context at the app level
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setIsLoading, updateUser, clearAuth, setOrganization } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Initialize all stores on first mount
    initializeStores()

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
          // Set user in auth store with all available data
          const userData = {
            id: session.user.id,
            supabaseId: session.user.id,
            stripeCustomerId: null,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || null,
            phone: null,
            bio: null,
            avatarUrl: session.user.user_metadata?.avatar_url || null,
            role: 'OWNER' as const, // Default role, will be updated from API
            organizationId: session.user.user_metadata?.organizationId || null,
            createdAt: new Date(session.user.created_at || Date.now()),
            updatedAt: new Date(session.user.updated_at || Date.now()),
            emailVerified: !!session.user.email_confirmed_at,
          }
          
          setUser(userData)
          
          // Fetch and merge additional user data
          if (session.user.user_metadata?.organizationId) {
            try {
              const response = await fetch('/api/users/me', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              })
              
              if (response.ok) {
                const { data: meData } = await response.json()
                // Update user with additional data from API
                updateUser({
                  organizationName: meData.organizationName,
                  role: meData.role,
                  permissions: meData.permissions,
                  subscription: meData.subscription,
                })
                // Also set organization data separately
                setOrganization(meData.organizationId, meData.organizationName)
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
    const authStateData = supabase?.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.warn('Auth state changed:', event, session?.user?.email)
        
        switch (event) {
          case 'SIGNED_OUT':
            clearAuth()
            break
            
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session) {
              const userData = {
                id: session.user.id,
                supabaseId: session.user.id,
                stripeCustomerId: null,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || null,
                phone: null,
                bio: null,
                avatarUrl: session.user.user_metadata?.avatar_url || null,
                role: 'OWNER' as const, // Default role, will be updated from API
                organizationId: session.user.user_metadata?.organizationId || null,
                createdAt: new Date(session.user.created_at || Date.now()),
                updatedAt: new Date(session.user.updated_at || Date.now()),
                emailVerified: !!session.user.email_confirmed_at,
              }
              
              setUser(userData)
              
              // Fetch additional user data if we have an organization
              if (session.user.user_metadata?.organizationId) {
                try {
                  const response = await fetch('/api/users/me', {
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`
                    }
                  })
                  
                  if (response.ok) {
                    const { data: meData } = await response.json()
                    updateUser({
                      organizationName: meData.organizationName,
                      role: meData.role,
                      permissions: meData.permissions,
                      subscription: meData.subscription,
                    })
                    setOrganization(meData.organizationId, meData.organizationName)
                  }
                } catch (err) {
                  console.error('Failed to fetch me data:', err)
                }
              }
            }
            break
            
          case 'USER_UPDATED':
            if (session) {
              updateUser({
                name: session.user.user_metadata?.name || null,
                avatarUrl: session.user.user_metadata?.avatar_url || null,
                organizationId: session.user.user_metadata?.organizationId || null,
                updatedAt: new Date(session.user.updated_at || Date.now()),
                emailVerified: !!session.user.email_confirmed_at,
              })
            }
            break
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      authStateData?.data.subscription.unsubscribe()
    }
  }, [setUser, setIsLoading, updateUser, clearAuth, setOrganization])

  return <>{children}</>
}