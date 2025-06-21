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

// Create Supabase client - fail fast if environment variables are missing
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)')
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
