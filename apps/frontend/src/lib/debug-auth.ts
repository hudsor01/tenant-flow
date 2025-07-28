/**
 * Debug helper to understand Supabase auth flow
 */

export async function debugSupabaseAuth() {
  console.log('=== SUPABASE AUTH DEBUG ===')
  
  // Check current URL
  console.log('Current URL:', window.location.href)
  console.log('Hash:', window.location.hash)
  console.log('Search params:', window.location.search)
  
  // Parse hash params
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  console.log('Hash params:', Object.fromEntries(hashParams))
  
  // Parse search params
  const searchParams = new URLSearchParams(window.location.search)
  console.log('Search params:', Object.fromEntries(searchParams))
  
  // Check for Supabase auth tokens
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const type = hashParams.get('type')
  
  console.log('Auth tokens found:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    type: type
  })
  
  // Check localStorage for Supabase session
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('auth')
  )
  console.log('Auth-related localStorage keys:', localStorageKeys)
  
  localStorageKeys.forEach(key => {
    console.log(`${key}:`, localStorage.getItem(key))
  })
  
  console.log('=== END DEBUG ===')
}

// Auto-run on auth callback pages
if (window.location.pathname === '/auth/callback') {
  debugSupabaseAuth()
}