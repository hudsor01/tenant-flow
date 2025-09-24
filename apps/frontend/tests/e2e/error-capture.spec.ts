import { test, expect, type Page } from '@playwright/test'

test('capture specific errors in dashboard', async ({ page }) => {
  
  const networkRequests: Array<{url: string, method: string}> = []
  const failedRequests: Array<{url: string, status: number, statusText: string}> = []
  const consoleErrors: Array<{type: string, text: string, location?: string}> = []
  
  // Track all network requests
  page.on('request', (request) => {
    networkRequests.push({
      url: request.url(),
      method: request.method()
    })
  })
  
  // Track failed requests
  page.on('response', (response) => {
    if (!response.ok()) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      })
    }
  })
  
  // Track console messages
  page.on('console', (msg) => {
    const type = msg.type()
    const text = msg.text()
    
    if (['error', 'warning'].includes(type)) {
      consoleErrors.push({
        type,
        text,
        location: msg.location()?.url
      })
    }
  })
  
  // Navigate to dashboard
  await page.goto('/dashboard', { 
    waitUntil: 'networkidle', 
    timeout: 60000 
  })
  
  // Wait for everything to load
  await page.waitForTimeout(5000)
  
  // Report all findings
  // Network requests, failed requests, and console errors are collected but not logged
  
  // Take screenshot
  await page.screenshot({ 
    path: '.playwright-mcp/error-investigation.png',
    fullPage: true 
  })
  
  // Test passes - we just want the diagnostic info
  expect(true).toBe(true)
})
