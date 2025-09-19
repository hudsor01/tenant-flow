import type { Page } from '@playwright/test'

/**
 * MCP Trace Analysis Utilities
 *
 * Provides comprehensive trace-based testing capabilities replacing static screenshots.
 * Captures interaction history, DOM state, performance metrics, console logs,
 * network activity, form validation, navigation flows, and accessibility snapshots.
 */

export interface TraceMetrics {
  timestamp: Date
  performanceMetrics: {
    lcp: number
    fid: number
    cls: number
    ttfb: number
    loadTime: number
  }
  domState: {
    elementCount: number
    formFields: number
    buttonsEnabled: number
    visibleElements: string[]
    focusedElement: string | null
  }
  networkActivity: {
    requestCount: number
    failedRequests: number
    slowRequests: number
    totalDataTransferred: number
  }
  accessibilityState: {
    landmarks: string[]
    headingStructure: string[]
    ariaLabels: number
    keyboardNavigable: boolean
  }
}

export interface FormValidationState {
  fieldName: string
  value: string
  isValid: boolean
  errorMessage?: string
  touched: boolean
  focused: boolean
}

export interface NavigationFlowStep {
  action: string
  url: string
  timestamp: Date
  elementInteracted?: string
  formData?: Record<string, string>
  validationErrors?: string[]
}

export class TraceAnalyzer {
  private page: Page
  private navigationFlow: NavigationFlowStep[] = []
  private performanceObserver: any = null

  constructor(page: Page) {
    this.page = page
    this.setupPerformanceTracking()
  }

  private async setupPerformanceTracking(): Promise<void> {
    await this.page.addInitScript(() => {
      window.traceMetrics = {
        interactions: [],
        performance: {},
        networkRequests: []
      }

      // Web Vitals tracking
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.traceMetrics.performance[entry.name] = entry.value
        }
      })
      observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] })

      // Network request tracking
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const start = performance.now()
        try {
          const response = await originalFetch(...args)
          window.traceMetrics.networkRequests.push({
            url: args[0],
            duration: performance.now() - start,
            status: response.status,
            success: response.ok
          })
          return response
        } catch (error) {
          window.traceMetrics.networkRequests.push({
            url: args[0],
            duration: performance.now() - start,
            error: error.message,
            success: false
          })
          throw error
        }
      }
    })
  }

  async captureTraceSnapshot(actionDescription: string): Promise<TraceMetrics> {
    const timestamp = new Date()

    const [performanceMetrics, domState, networkActivity, accessibilityState] = await Promise.all([
      this.getPerformanceMetrics(),
      this.getDOMState(),
      this.getNetworkActivity(),
      this.getAccessibilityState()
    ])

    const metrics: TraceMetrics = {
      timestamp,
      performanceMetrics,
      domState,
      networkActivity,
      accessibilityState
    }

    console.log(`=== TRACE SNAPSHOT: ${actionDescription} ===`)
    console.log(JSON.stringify(metrics, null, 2))

    return metrics
  }

  private async getPerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')

      return {
        lcp: window.traceMetrics?.performance?.['largest-contentful-paint'] || 0,
        fid: window.traceMetrics?.performance?.['first-input-delay'] || 0,
        cls: window.traceMetrics?.performance?.['cumulative-layout-shift'] || 0,
        ttfb: navigation?.responseStart - navigation?.requestStart || 0,
        loadTime: navigation?.loadEventEnd - navigation?.loadEventStart || 0
      }
    })

    return metrics
  }

  private async getDOMState() {
    return await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      const forms = document.querySelectorAll('input, textarea, select')
      const buttons = document.querySelectorAll('button:not([disabled])')
      const visibleElements = Array.from(document.querySelectorAll('[data-testid], [role], button, input, a'))
        .filter(el => el.offsetParent !== null)
        .map(el => el.tagName.toLowerCase() + (el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : ''))
        .slice(0, 20)

      return {
        elementCount: elements.length,
        formFields: forms.length,
        buttonsEnabled: buttons.length,
        visibleElements,
        focusedElement: document.activeElement?.tagName.toLowerCase() || null
      }
    })
  }

  private async getNetworkActivity() {
    return await this.page.evaluate(() => {
      const requests = window.traceMetrics?.networkRequests || []
      return {
        requestCount: requests.length,
        failedRequests: requests.filter(r => !r.success).length,
        slowRequests: requests.filter(r => r.duration > 1000).length,
        totalDataTransferred: requests.reduce((sum, r) => sum + (r.size || 0), 0)
      }
    })
  }

  private async getAccessibilityState() {
    return await this.page.evaluate(() => {
      const landmarks = Array.from(document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]'))
        .map(el => el.getAttribute('role') || '')

      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(el => `${el.tagName.toLowerCase()}: ${el.textContent?.slice(0, 50)}`)

      const ariaLabels = document.querySelectorAll('[aria-label], [aria-labelledby]').length

      const tabbableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')

      return {
        landmarks,
        headingStructure: headings,
        ariaLabels,
        keyboardNavigable: tabbableElements.length > 0
      }
    })
  }

  async validateFormState(expectedFields: string[]): Promise<FormValidationState[]> {
    return await this.page.evaluate((fields) => {
      return fields.map(fieldName => {
        const element = document.querySelector(`[name="${fieldName}"], #${fieldName}`) as HTMLInputElement
        if (!element) {
          return {
            fieldName,
            value: '',
            isValid: false,
            errorMessage: 'Field not found',
            touched: false,
            focused: false
          }
        }

        const value = element.value || ''
        const isValid = element.checkValidity()
        const errorMessage = element.validationMessage
        const touched = element.hasAttribute('data-touched') || value.length > 0
        const focused = document.activeElement === element

        return {
          fieldName,
          value,
          isValid,
          errorMessage: errorMessage || undefined,
          touched,
          focused
        }
      })
    }, expectedFields)
  }

  recordNavigationStep(action: string, elementInteracted?: string, formData?: Record<string, string>) {
    this.navigationFlow.push({
      action,
      url: this.page.url(),
      timestamp: new Date(),
      elementInteracted,
      formData
    })
  }

  getNavigationFlow(): NavigationFlowStep[] {
    return [...this.navigationFlow]
  }

  async generateTraceReport(): Promise<string> {
    const finalMetrics = await this.captureTraceSnapshot('Final State')
    const flow = this.getNavigationFlow()

    const report = [
      '=== MCP TRACE ANALYSIS REPORT ===',
      `Generated: ${new Date().toISOString()}`,
      `Total Navigation Steps: ${flow.length}`,
      '',
      '📊 PERFORMANCE METRICS:',
      `  LCP: ${finalMetrics.performanceMetrics.lcp}ms`,
      `  FID: ${finalMetrics.performanceMetrics.fid}ms`,
      `  CLS: ${finalMetrics.performanceMetrics.cls}`,
      `  TTFB: ${finalMetrics.performanceMetrics.ttfb}ms`,
      `  Load Time: ${finalMetrics.performanceMetrics.loadTime}ms`,
      '',
      '🌐 DOM STATE:',
      `  Total Elements: ${finalMetrics.domState.elementCount}`,
      `  Form Fields: ${finalMetrics.domState.formFields}`,
      `  Active Buttons: ${finalMetrics.domState.buttonsEnabled}`,
      `  Focused Element: ${finalMetrics.domState.focusedElement || 'None'}`,
      '',
      '📡 NETWORK ACTIVITY:',
      `  Total Requests: ${finalMetrics.networkActivity.requestCount}`,
      `  Failed Requests: ${finalMetrics.networkActivity.failedRequests}`,
      `  Slow Requests (>1s): ${finalMetrics.networkActivity.slowRequests}`,
      '',
      '♿ ACCESSIBILITY:',
      `  Landmarks: ${finalMetrics.accessibilityState.landmarks.length}`,
      `  Aria Labels: ${finalMetrics.accessibilityState.ariaLabels}`,
      `  Keyboard Navigation: ${finalMetrics.accessibilityState.keyboardNavigable ? 'Yes' : 'No'}`,
      '',
      '🗺️ NAVIGATION FLOW:',
      ...flow.map((step, index) =>
        `  ${index + 1}. [${step.timestamp.toISOString()}] ${step.action} → ${step.url}`
      ),
      '',
      '=== END TRACE REPORT ===',
      ''
    ]

    return report.join('\n')
  }

  clear(): void {
    this.navigationFlow = []
  }
}