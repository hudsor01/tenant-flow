/**
 * Page Object Models for Media Stack Services
 * Provides reusable page interactions for each service
 */

import { Page, Locator, expect } from '@playwright/test'
import { MediaStackService } from './media-stack-config'

export class MediaStackBasePage {
  protected page: Page
  protected service: MediaStackService
  protected baseUrl: string

  constructor(page: Page, service: MediaStackService, host: string) {
    this.page = page
    this.service = service
    this.baseUrl = `http://${host}:${service.port}${service.path}`
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.baseUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
  }

  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${this.service.name.toLowerCase()}-${name}-${timestamp}.png`
    const path = `./tests/e2e/media-stack-test/${filename}`
    
    await this.page.screenshot({ 
      path,
      fullPage: true
    })
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for the page to be considered loaded
    await this.page.waitForLoadState('domcontentloaded')
    
    // Wait for any of the health check selectors to be visible
    if (this.service.healthCheckSelector) {
      const selectors = this.service.healthCheckSelector.split(', ')
      let found = false
      
      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector.trim(), { 
            timeout: 5000,
            state: 'visible'
          })
          found = true
          break
        } catch {
          // Try next selector
        }
      }
      
      if (!found) {
        // Fallback: just wait for body to be visible
        await this.page.waitForSelector('body', { 
          timeout: 10000,
          state: 'visible' 
        })
      }
    }
  }

  async checkForErrors(): Promise<string[]> {
    const errors: string[] = []
    
    // Check for common error indicators
    const errorSelectors = [
      '.error', '.alert-danger', '.alert-error',
      '[role="alert"]', '.notification-error',
      '.error-message', '.error-content'
    ]
    
    for (const selector of errorSelectors) {
      try {
        const errorElements = await this.page.locator(selector).all()
        for (const element of errorElements) {
          if (await element.isVisible()) {
            const text = await element.textContent()
            if (text && text.trim()) {
              errors.push(`Error found with selector "${selector}": ${text.trim()}`)
            }
          }
        }
      } catch {
        // Selector not found, continue
      }
    }
    
    return errors
  }

  async verifyTitle(): Promise<void> {
    const title = await this.page.title()
    expect(title).toContain(this.service.expectedTitle)
  }

  async verifyHeading(): Promise<void> {
    if (this.service.expectedHeading) {
      const headingFound = await this.page.getByText(this.service.expectedHeading).first().isVisible().catch(() => false)
      if (!headingFound) {
        // Try to find it in common heading selectors
        const headingSelectors = ['h1', 'h2', 'h3', '.title', '.heading', '.page-title']
        let found = false
        
        for (const selector of headingSelectors) {
          try {
            const headings = await this.page.locator(selector).all()
            for (const heading of headings) {
              const text = await heading.textContent()
              if (text && text.includes(this.service.expectedHeading)) {
                found = true
                break
              }
            }
            if (found) break
          } catch {
            // Continue to next selector
          }
        }
        
        if (!found) {
          console.warn(`Expected heading "${this.service.expectedHeading}" not found for ${this.service.name}`)
        }
      }
    }
  }

  async authenticate(): Promise<boolean> {
    if (!this.service.requiresAuth || !this.service.authCredentials) {
      return true
    }

    try {
      // Wait for login form to appear
      if (this.service.loginFormSelector) {
        await this.page.waitForSelector(this.service.loginFormSelector, { timeout: 5000 })
      }

      // Fill username
      if (this.service.usernameSelector && this.service.authCredentials.username) {
        await this.page.fill(this.service.usernameSelector, this.service.authCredentials.username)
      }

      // Fill password
      if (this.service.passwordSelector && this.service.authCredentials.password) {
        await this.page.fill(this.service.passwordSelector, this.service.authCredentials.password)
      }

      // Click login button
      if (this.service.loginButtonSelector) {
        await this.page.click(this.service.loginButtonSelector)
      }

      // Wait for navigation after login
      await this.page.waitForLoadState('domcontentloaded')
      await this.waitForPageLoad()

      return true
    } catch (error) {
      console.error(`Authentication failed for ${this.service.name}:`, error)
      return false
    }
  }

  async checkServiceHealth(): Promise<{
    accessible: boolean
    authenticated: boolean
    errors: string[]
    title: string
    url: string
  }> {
    const result = {
      accessible: false,
      authenticated: false,
      errors: [] as string[],
      title: '',
      url: this.baseUrl
    }

    try {
      // Navigate to service
      await this.navigate()
      result.accessible = true

      // Wait for page to load
      await this.waitForPageLoad()

      // Get page title
      result.title = await this.page.title()

      // Check for errors
      result.errors = await this.checkForErrors()

      // Attempt authentication if required
      if (this.service.requiresAuth) {
        result.authenticated = await this.authenticate()
      } else {
        result.authenticated = true // No auth required
      }

      // Verify title and heading
      try {
        await this.verifyTitle()
        await this.verifyHeading()
      } catch (error) {
        result.errors.push(`Verification failed: ${error}`)
      }

    } catch (error) {
      result.errors.push(`Service not accessible: ${error}`)
    }

    return result
  }
}

// Specialized page classes for each service
export class RadarrPage extends MediaStackBasePage {}

export class SonarrPage extends MediaStackBasePage {}

export class QBittorrentPage extends MediaStackBasePage {
  async authenticate(): Promise<boolean> {
    try {
      // qBittorrent has a specific login flow
      await this.page.waitForSelector('#loginform, form', { timeout: 10000 })
      
      if (this.service.authCredentials) {
        await this.page.fill('#username', this.service.authCredentials.username)
        await this.page.fill('#password', this.service.authCredentials.password)
        await this.page.click('#login')
        
        // Wait for dashboard to load
        await this.page.waitForLoadState('domcontentloaded')
        await this.page.waitForSelector('#torrentsTable, .main-content', { timeout: 10000 })
      }
      
      return true
    } catch (error) {
      console.error('qBittorrent authentication failed:', error)
      return false
    }
  }
}

export class JellyseerrPage extends MediaStackBasePage {}

export class ProwlarrPage extends MediaStackBasePage {}
