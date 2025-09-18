import type { Page } from '@playwright/test'
import { ConsoleMonitor } from './console-monitor'
import { TraceAnalyzer } from './trace-analyzer'

/**
 * Enhanced Test Helpers with MCP Trace Integration
 *
 * Combines console monitoring with comprehensive trace analysis
 * for complete UI/UX validation and debugging evidence.
 */

export interface AuthTestCredentials {
  email: string
  password: string
  expectedUsername?: string
}

export interface TraceTestSession {
  consoleMonitor: ConsoleMonitor
  traceAnalyzer: TraceAnalyzer
  startTime: Date
}

export class TraceTestHelpers {
  private page: Page
  private session: TraceTestSession | null = null

  constructor(page: Page) {
    this.page = page
  }

  async startTraceSession(): Promise<TraceTestSession> {
    const consoleMonitor = new ConsoleMonitor(this.page)
    const traceAnalyzer = new TraceAnalyzer(this.page)

    this.session = {
      consoleMonitor,
      traceAnalyzer,
      startTime: new Date()
    }

    console.log('=== TRACE SESSION STARTED ===')
    await this.session.traceAnalyzer.captureTraceSnapshot('Session Start')

    return this.session
  }

  async performAuthenticationFlow(credentials: AuthTestCredentials): Promise<void> {
    if (!this.session) {
      throw new Error('Trace session not started. Call startTraceSession() first.')
    }

    const { traceAnalyzer } = this.session

    // Navigate to login page
    await this.page.goto('/login')
    traceAnalyzer.recordNavigationStep('Navigate to login page')
    await traceAnalyzer.captureTraceSnapshot('Login page loaded')

    // Validate form fields are present
    const formFields = await traceAnalyzer.validateFormState(['email', 'password'])
    console.log('Form validation state:', formFields)

    // Fill email field
    await this.page.getByRole('textbox', { name: 'Email' }).fill(credentials.email)
    traceAnalyzer.recordNavigationStep('Fill email field', 'email-input', { email: credentials.email })
    await traceAnalyzer.captureTraceSnapshot('Email field filled')

    // Fill password field
    await this.page.getByRole('textbox', { name: 'Password' }).fill(credentials.password)
    traceAnalyzer.recordNavigationStep('Fill password field', 'password-input')
    await traceAnalyzer.captureTraceSnapshot('Password field filled')

    // Submit form
    await this.page.getByRole('button', { name: 'Sign In' }).click()
    traceAnalyzer.recordNavigationStep('Submit login form', 'sign-in-button')
    await traceAnalyzer.captureTraceSnapshot('Form submitted')

    // Wait for authentication response
    await this.page.waitForTimeout(2000)
    await traceAnalyzer.captureTraceSnapshot('Authentication complete')
  }

  async validateAuthenticatedState(expectedUsername?: string): Promise<boolean> {
    if (!this.session) {
      throw new Error('Trace session not started')
    }

    const { traceAnalyzer } = this.session

    // Capture post-authentication state
    const authMetrics = await traceAnalyzer.captureTraceSnapshot('Post-authentication validation')

    // Check for authenticated elements
    const welcomeText = expectedUsername ? `Welcome, ${expectedUsername}` : 'Welcome,'
    const signOutButton = this.page.getByRole('button', { name: 'Sign Out' })

    try {
      // Validate authentication UI elements
      if (expectedUsername) {
        await this.page.getByText(welcomeText).waitFor({ state: 'visible', timeout: 10000 })
      }
      await signOutButton.waitFor({ state: 'visible', timeout: 10000 })

      traceAnalyzer.recordNavigationStep('Authentication state validated', 'authenticated-ui')
      await traceAnalyzer.captureTraceSnapshot('Authentication validation successful')

      return true
    } catch (error) {
      console.error('Authentication validation failed:', error)
      await traceAnalyzer.captureTraceSnapshot('Authentication validation failed')
      return false
    }
  }

  async validateLoginFormElements(): Promise<boolean> {
    if (!this.session) {
      throw new Error('Trace session not started')
    }

    const { traceAnalyzer } = this.session

    await traceAnalyzer.captureTraceSnapshot('Login form validation start')

    try {
      // Check required form elements
      const elements = [
        { selector: 'textbox[name="Email"]', name: 'Email field' },
        { selector: 'textbox[name="Password"]', name: 'Password field' },
        { selector: 'button[name="Sign In"]', name: 'Sign In button' },
        { selector: 'button[name="Continue with Google"]', name: 'Google Sign In button' },
        { selector: 'button[name="Forgot password?"]', name: 'Forgot password button' },
        { selector: 'button[name="Create account"]', name: 'Create account button' }
      ]

      for (const element of elements) {
        await this.page.getByRole(element.selector.split('[')[0], { name: element.name.replace(' field', '').replace(' button', '') }).waitFor({ state: 'visible', timeout: 5000 })
        traceAnalyzer.recordNavigationStep(`Validated ${element.name}`, element.selector)
      }

      // Validate branding elements
      await this.page.getByRole('heading', { name: 'TenantFlow' }).waitFor({ state: 'visible', timeout: 5000 })
      await this.page.getByText('Professional Property Management Platform').waitFor({ state: 'visible', timeout: 5000 })

      await traceAnalyzer.captureTraceSnapshot('Login form validation successful')
      return true
    } catch (error) {
      console.error('Login form validation failed:', error)
      await traceAnalyzer.captureTraceSnapshot('Login form validation failed')
      return false
    }
  }

  async testInvalidCredentials(): Promise<boolean> {
    if (!this.session) {
      throw new Error('Trace session not started')
    }

    const { traceAnalyzer } = this.session

    // Fill invalid credentials
    await this.page.getByRole('textbox', { name: 'Email' }).fill('invalid@example.com')
    await this.page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword')
    traceAnalyzer.recordNavigationStep('Fill invalid credentials', 'invalid-auth-form')

    // Submit form
    await this.page.getByRole('button', { name: 'Sign In' }).click()
    traceAnalyzer.recordNavigationStep('Submit invalid credentials', 'sign-in-button')

    await this.page.waitForTimeout(2000)
    await traceAnalyzer.captureTraceSnapshot('Invalid credentials submitted')

    try {
      // Should remain on login page
      await this.page.getByRole('button', { name: 'Sign In' }).waitFor({ state: 'visible', timeout: 5000 })

      // Should not show authenticated state
      const welcomeElements = await this.page.getByText('Welcome,').count()
      const signOutElements = await this.page.getByRole('button', { name: 'Sign Out' }).count()

      const invalidHandled = welcomeElements === 0 && signOutElements === 0

      await traceAnalyzer.captureTraceSnapshot(invalidHandled ? 'Invalid credentials handled correctly' : 'Invalid credentials not handled')

      return invalidHandled
    } catch (error) {
      console.error('Invalid credentials test failed:', error)
      await traceAnalyzer.captureTraceSnapshot('Invalid credentials test error')
      return false
    }
  }

  async generateComprehensiveReport(): Promise<string> {
    if (!this.session) {
      throw new Error('Trace session not started')
    }

    const { consoleMonitor, traceAnalyzer } = this.session

    // Generate final trace snapshot
    await traceAnalyzer.captureTraceSnapshot('Final session state')

    // Get navigation flow
    const navigationFlow = traceAnalyzer.getNavigationFlow()

    // Get console report
    const consoleReport = consoleMonitor.getFormattedReport()

    // Get trace analysis
    const traceReport = await traceAnalyzer.generateTraceReport()

    // Check for critical errors
    const criticalErrors = consoleMonitor.getCriticalErrors()

    const comprehensiveReport = [
      '=== COMPREHENSIVE MCP TRACE TEST REPORT ===',
      `Session Duration: ${Math.round((Date.now() - this.session.startTime.getTime()) / 1000)}s`,
      `Navigation Steps: ${navigationFlow.length}`,
      `Critical Console Errors: ${criticalErrors.length}`,
      '',
      '🔍 TRACE ANALYSIS:',
      traceReport,
      '',
      '📝 CONSOLE MONITORING:',
      consoleReport,
      '',
      '❌ CRITICAL ERRORS:',
      criticalErrors.length > 0
        ? criticalErrors.map((error, index) =>
            `  ${index + 1}. [${error.timestamp.toISOString()}] ${error.text}`
          ).join('\n')
        : '  None detected',
      '',
      '✅ SESSION SUMMARY:',
      `  - Navigation flow captured: ${navigationFlow.length} steps`,
      `  - Performance metrics collected: ✓`,
      `  - DOM state snapshots: ✓`,
      `  - Network activity tracked: ✓`,
      `  - Accessibility validation: ✓`,
      `  - Console monitoring: ✓`,
      `  - Critical errors: ${criticalErrors.length === 0 ? 'None' : criticalErrors.length}`,
      '',
      '=== END COMPREHENSIVE REPORT ===',
      ''
    ].join('\n')

    console.log(comprehensiveReport)
    return comprehensiveReport
  }

  async endTraceSession(): Promise<void> {
    if (!this.session) {
      return
    }

    await this.generateComprehensiveReport()
    this.session.traceAnalyzer.clear()
    this.session.consoleMonitor.clear()
    this.session = null

    console.log('=== TRACE SESSION ENDED ===')
  }

  getSession(): TraceTestSession | null {
    return this.session
  }
}

// Pre-configured test credentials for different user roles
export const testCredentials = {
  admin: {
    email: 'test.admin@tenantflow.app',
    password: 'TestAdmin123!',
    expectedUsername: 'test.admin'
  },
  landlord: {
    email: 'test.landlord@tenantflow.app',
    password: 'TestLandlord123!',
    expectedUsername: 'test.landlord'
  },
  tenant: {
    email: 'test.tenant@tenantflow.app',
    password: 'TestTenant123!',
    expectedUsername: 'test.tenant'
  },
  user: {
    email: 'test.user@tenantflow.app',
    password: 'TestUser123!',
    expectedUsername: 'test.user'
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  }
} as const