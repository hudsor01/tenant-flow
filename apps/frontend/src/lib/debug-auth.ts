/**
 * Debug helper to understand Supabase auth flow
 */

export async function debugSupabaseAuth() {
  console.warn('=== SUPABASE AUTH DEBUG ===')
  
  // Check current URL
  console.warn('Current URL:', window.location.href)
  console.warn('Hash:', window.location.hash)
  console.warn('Search params:', window.location.search)
  
  // Parse hash params
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  console.warn('Hash params:', Object.fromEntries(hashParams))
  
  // Parse search params
  const searchParams = new URLSearchParams(window.location.search)
  console.warn('Search params:', Object.fromEntries(searchParams))
  
  // Check for Supabase auth tokens
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const type = hashParams.get('type')
  
  console.warn('Auth tokens found:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    type: type
  })
  
  // Check localStorage for Supabase session
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('auth')
  )
  console.warn('Auth-related localStorage keys:', localStorageKeys)
  
  localStorageKeys.forEach(key => {
    console.warn(`${key}:`, localStorage.getItem(key))
  })
  
  console.warn('=== END DEBUG ===')
}

// Auto-run on auth callback pages
if (window.location.pathname === '/auth/callback') {
  void debugSupabaseAuth()
}