import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Validate that we have real Supabase credentials (not placeholders)
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration is missing')
  }
  
  if (supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
    console.warn('Using placeholder Supabase credentials - authentication will not work')
  }
  
  return createBrowserClient(supabaseUrl, supabaseKey)
}