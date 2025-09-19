import { test, expect } from '@playwright/test'

test.describe('TenantFlow Health Check', () => {
  test('Frontend should be accessible', async ({ page }) => {
    await page.goto('/')
    
    // Check if page loads
    await expect(page).toHaveTitle(/TenantFlow/)
    
    // Check for main navigation
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('Backend API should respond', async ({ request }) => {
    const response = await request.get('/api/v1/health')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('status', 'healthy')
  })

  test('Supabase connection should work', async ({ page }) => {
    // This would test if Supabase is properly configured
    const response = await page.evaluate(async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        return { error: 'Missing Supabase credentials' }
      }
      
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        })
        
        return { status: res.status, ok: res.ok }
      } catch (error) {
        return { error: error.message }
      }
    })
    
    expect(response).toHaveProperty('ok', true)
  })
})
