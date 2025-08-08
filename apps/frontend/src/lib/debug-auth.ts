interface SupabaseSession {
  user?: {
    id: string;
    email?: string;
  };
  expires_at?: number;
}

interface SupabaseError {
  message?: string;
  status?: number;
  code?: string;
}

export const debugSupabaseAuth = {
  enabled: process.env.NODE_ENV === 'development',
  
  log: (message: string, data?: unknown) => {
    if (debugSupabaseAuth.enabled) {
      console.log(`[Supabase Auth] ${message}`, data || '')
    }
  },
  
  error: (message: string, error?: unknown) => {
    if (debugSupabaseAuth.enabled) {
      console.error(`[Supabase Auth Error] ${message}`, error || '')
    }
  },
  
  warn: (message: string, data?: unknown) => {
    if (debugSupabaseAuth.enabled) {
      console.warn(`[Supabase Auth Warning] ${message}`, data || '')
    }
  },
  
  info: (message: string, data?: unknown) => {
    if (debugSupabaseAuth.enabled) {
      console.info(`[Supabase Auth Info] ${message}`, data || '')
    }
  },
  
  // Helper to log session state
  logSession: (session: SupabaseSession | null) => {
    if (debugSupabaseAuth.enabled) {
      console.log('[Supabase Auth] Session State:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at,
      })
    }
  },
  
  // Helper to log auth errors
  logError: (error: SupabaseError | unknown) => {
    if (debugSupabaseAuth.enabled) {
      const authError = error as SupabaseError;
      console.error('[Supabase Auth] Auth Error:', {
        message: authError?.message,
        status: authError?.status,
        code: authError?.code,
        details: error,
      })
    }
  },
}