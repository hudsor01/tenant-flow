/**
 * Test to verify environment variables are accessible 
 * Following CLAUDE.md: NO ABSTRACTIONS, simple direct checks
 */

describe('Environment Variables Access', () => {
  it('should access SUPABASE_URL from environment', () => {
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
    
    // Direct environment variable check - no abstractions
    expect(process.env.SUPABASE_URL).toBeDefined()
    expect(process.env.SUPABASE_URL).toMatch(/^https?:\/\//)
  })

  it('should access SUPABASE_SERVICE_ROLE_KEY from environment', () => {
    console.log('SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('First 20 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20))
    
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
    
    // Should be a JWT token or demo value
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toMatch(/^(eyJ|demo-service-key)/)
  })

  it('should check SUPABASE_ANON_KEY availability', () => {
    console.log('SUPABASE_ANON_KEY available:', !!process.env.SUPABASE_ANON_KEY)
    
    // SUPABASE_ANON_KEY may not be in all environments - that's OK
    if (process.env.SUPABASE_ANON_KEY) {
      // Accept both JWT format and demo keys for testing
      const isValidFormat = process.env.SUPABASE_ANON_KEY.match(/^eyJ/) || process.env.SUPABASE_ANON_KEY.includes('demo')
      expect(isValidFormat).toBeTruthy()
      console.log('SUPABASE_ANON_KEY is properly formatted (JWT or demo key)')
    } else {
      console.log('SUPABASE_ANON_KEY not set - using fallback in tests')
    }
  })

  it('should show environment status', () => {
    console.log('\n=== ENVIRONMENT STATUS ===')
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
    console.log('SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY)
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('STRIPE_SECRET_KEY:', !!process.env.STRIPE_SECRET_KEY, '(optional)')
    console.log('DATABASE_URL:', !!process.env.DATABASE_URL, '(optional)')
  })
})