/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
// Fallback to legacy anon key for backward compatibility
const supabaseAnonKey = supabasePublishableKey || import.meta.env?.VITE_SUPABASE_ANON_KEY

// Only log in development mode
if (import.meta.env?.DEV) {
  console.log('DEBUG: Environment check', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyStart: supabaseAnonKey?.substring(0, 10),
    allEnv: import.meta.env ? Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')) : []
  })
}

// Create a default/mock client if environment variables are missing (for testing)
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Missing Supabase environment variables - using mock client')
    
    // Return a mock client for testing environments
    return createClient(
      'https://mock.supabase.co', 
      'mock-anon-key-for-testing-only',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          }
        }
      }
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storage: typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      },
      storageKey: 'tenant-flow-auth'
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey,
      }
    }
  })
}

export const supabase = createSupabaseClient()
