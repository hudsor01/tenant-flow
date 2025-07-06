import { createClient } from '@supabase/supabase-js'

/**
 * Create Supabase client following 2025 best practices
 * @see https://supabase.com/docs/guides/auth/quickstarts/react
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)