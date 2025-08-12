import { test, expect } from '@playwright/test'

test.describe('Signup Form Debug', () => {
  test('should debug signup form submission issue', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[Browser ${msg.type()}]:`, msg.text())
      }
    })

    // Navigate to signup page
    await page.goto('/auth/signup')
    
    // Wait for the form to be visible
    await page.waitForSelector('form', { timeout: 5000 })
    
    // Fill in the form fields
    await page.fill('input[name="fullName"]', 'Test User')
    await page.fill('input[name="email"]', 'testuser@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    
    // Check the terms checkbox - now using native checkbox
    const termsCheckbox = page.locator('input#terms')
    await termsCheckbox.check()
    
    // Verify checkbox is checked
    const isChecked = await termsCheckbox.isChecked()
    console.log('Terms checkbox checked:', isChecked)
    
    // Get the submit button
    const submitButton = page.locator('button[type="submit"]')
    
    // Check if button is enabled
    const isDisabled = await submitButton.isDisabled()
    console.log('Submit button disabled:', isDisabled)
    
    // Get button text
    const buttonText = await submitButton.textContent()
    console.log('Button text:', buttonText)
    
    // Intercept the form submission
    let formDataCaptured = false
    await page.route('**/auth/signup', async route => {
      const request = route.request()
      console.log('Form submission intercepted!')
      console.log('Method:', request.method())
      console.log('Headers:', request.headers())
      
      if (request.method() === 'POST') {
        const postData = request.postData()
        console.log('POST data:', postData)
        formDataCaptured = true
      }
      
      await route.continue()
    })
    
    // Try to submit the form
    console.log('Attempting to click submit button...')
    await submitButton.click()
    
    // Wait a bit to see what happens
    await page.waitForTimeout(2000)
    
    // Check if we're still on the same page
    const currentUrl = page.url()
    console.log('Current URL after click:', currentUrl)
    
    // Check for any error messages
    const errorMessages = await page.locator('.text-red-600, .text-red-800, [role="alert"]').allTextContents()
    if (errorMessages.length > 0) {
      console.log('Error messages found:', errorMessages)
    }
    
    // Check if form was actually submitted
    console.log('Form data captured:', formDataCaptured)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'signup-form-debug.png', fullPage: true })
    console.log('Screenshot saved as signup-form-debug.png')
    
    // Check the network tab for any failed requests
    const failedRequests: string[] = []
    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`)
    })
    
    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests)
    }
    
    // Try to get form validation state
    const formValidationState = await page.evaluate(() => {
      const form = document.querySelector('form')
      if (!form) return null
      
      const inputs = form.querySelectorAll('input')
      const validationState: Record<string, any> = {}
      
      inputs.forEach(input => {
        validationState[input.name || input.id] = {
          value: input.value,
          valid: input.checkValidity(),
          validationMessage: input.validationMessage,
          required: input.required,
          type: input.type,
          checked: input.type === 'checkbox' ? input.checked : undefined
        }
      })
      
      return validationState
    })
    
    console.log('Form validation state:', JSON.stringify(formValidationState, null, 2))
    
    // Check if the button actually triggers form submission
    const formSubmitted = await page.evaluate(() => {
      return new Promise((resolve) => {
        const form = document.querySelector('form')
        if (!form) {
          resolve(false)
          return
        }
        
        let submitted = false
        form.addEventListener('submit', (e) => {
          submitted = true
          console.log('Form submit event triggered!')
        })
        
        const button = document.querySelector('button[type="submit"]') as HTMLButtonElement
        if (button) {
          button.click()
        }
        
        setTimeout(() => resolve(submitted), 1000)
      })
    })
    
    console.log('Form submit event triggered:', formSubmitted)
  })
})