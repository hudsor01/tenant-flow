import { test, expect } from '@playwright/test'

test.describe('Debug Button State', () => {
  test('Check why signup button is disabled', async ({ page }) => {
    // Add console listeners first
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text())
    })
    
    // Go to signup page
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // Fill form completely
    console.log('📝 Filling form...')
    
    await page.fill('input#fullName', 'Test User')
    await page.fill('input#email', 'test@example.com') 
    await page.fill('input#password', 'TestPassword123!')
    await page.fill('input#confirmPassword', 'TestPassword123!')
    await page.check('input#terms')
    
    // Wait a moment for validation
    await page.waitForTimeout(1000)
    
    // Check button state
    const submitButton = page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()
    const buttonText = await submitButton.textContent()
    
    console.log('\n📊 BUTTON STATE:')
    console.log('Button text:', buttonText)
    console.log('Button disabled?', isDisabled)
    
    // Get form values to verify they're set
    const formValues = {
      fullName: await page.inputValue('input#fullName'),
      email: await page.inputValue('input#email'),
      password: await page.inputValue('input#password'),
      confirmPassword: await page.inputValue('input#confirmPassword'),
      terms: await page.isChecked('input#terms')
    }
    
    console.log('\n📝 FORM VALUES:')
    console.log(formValues)
    
    // Check for validation errors
    const errorElements = await page.locator('.text-red-600, .text-destructive, [role="alert"]').allTextContents()
    if (errorElements.length > 0) {
      console.log('\n❌ VALIDATION ERRORS:', errorElements)
    }
    
    // Check the actual disabled attribute and computed styles
    const disabledAttribute = await submitButton.getAttribute('disabled')
    const computedStyle = await page.evaluate((button) => {
      const el = document.querySelector('button[type="submit"]')
      if (!el) return null
      const style = window.getComputedStyle(el)
      return {
        pointerEvents: style.pointerEvents,
        opacity: style.opacity,
        cursor: style.cursor
      }
    })
    
    console.log('\n🔍 TECHNICAL DETAILS:')
    console.log('Disabled attribute:', disabledAttribute)
    console.log('Computed styles:', computedStyle)
    
    // Try to get React state if possible
    const reactState = await page.evaluate(() => {
      // Try to access any global debug info
      return (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.reactDevtoolsAgent ? 'React DevTools available' : 'No React DevTools'
    })
    
    console.log('React state:', reactState)
    
    // The test should pass if we can determine why the button is disabled
    expect(true).toBe(true) // Always pass, this is just for debugging
  })
  
  test('Try to enable button by manipulating DOM', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Fill form
    await page.fill('input#fullName', 'Test User')
    await page.fill('input#email', 'test@example.com')
    await page.fill('input#password', 'TestPassword123!')
    await page.fill('input#confirmPassword', 'TestPassword123!')
    await page.check('input#terms')
    
    await page.waitForTimeout(1000)
    
    // Try to force enable the button
    const result = await page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (!button) return 'No button found'
      
      console.log('Original disabled state:', button.disabled)
      
      // Try to enable it
      button.disabled = false
      button.removeAttribute('disabled')
      
      console.log('After manipulation:', button.disabled)
      
      return {
        originalDisabled: button.disabled,
        canClick: !button.disabled
      }
    })
    
    console.log('Button manipulation result:', result)
    
    // Try clicking now
    const submitButton = page.locator('button[type="submit"]')
    
    try {
      await submitButton.click({ timeout: 5000 })
      console.log('✅ Click succeeded!')
    } catch (error) {
      console.log('❌ Click failed:', error.message)
    }
    
    await page.waitForTimeout(2000)
    console.log('Final URL:', page.url())
  })
})