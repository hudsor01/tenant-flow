import type { Page, ConsoleMessage } from '@playwright/test'

/**
 * Console Message Monitor for Playwright Tests
 *
 * Automatically captures and analyzes all console messages during test execution.
 * Provides categorized reporting for debugging and monitoring.
 */

export interface ConsoleMessageData {
  type: string
  text: string
  timestamp: Date
  location?: string
  args?: string[]
}

export interface ConsoleReport {
  total: number
  errors: ConsoleMessageData[]
  warnings: ConsoleMessageData[]
  logs: ConsoleMessageData[]
  info: ConsoleMessageData[]
  debug: ConsoleMessageData[]
  summary: {
    errorCount: number
    warningCount: number
    logCount: number
    infoCount: number
    debugCount: number
  }
}

export class ConsoleMonitor {
  private messages: ConsoleMessageData[] = []
  private page: Page

  constructor(page: Page) {
    this.page = page
    this.setupConsoleListener()
  }

  private setupConsoleListener(): void {
    this.page.on('console', (msg: ConsoleMessage) => {
      const messageData: ConsoleMessageData = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date(),
        location: msg.location()?.url,
        args: msg.args().map(arg => arg.toString())
      }

      this.messages.push(messageData)
    })

    // Also capture page errors
    this.page.on('pageerror', (error) => {
      const messageData: ConsoleMessageData = {
        type: 'error',
        text: `Page Error: ${error.message}`,
        timestamp: new Date(),
        location: error.stack?.split('\n')[1]
      }

      this.messages.push(messageData)
    })
  }

  /**
   * Get all captured console messages
   */
  getMessages(): ConsoleMessageData[] {
    return [...this.messages]
  }

  /**
   * Get comprehensive console report with categorized messages
   */
  getReport(): ConsoleReport {
    const errors = this.messages.filter(msg => msg.type === 'error')
    const warnings = this.messages.filter(msg => msg.type === 'warning' || msg.type === 'warn')
    const logs = this.messages.filter(msg => msg.type === 'log')
    const info = this.messages.filter(msg => msg.type === 'info')
    const debug = this.messages.filter(msg => msg.type === 'debug')

    return {
      total: this.messages.length,
      errors,
      warnings,
      logs,
      info,
      debug,
      summary: {
        errorCount: errors.length,
        warningCount: warnings.length,
        logCount: logs.length,
        infoCount: info.length,
        debugCount: debug.length
      }
    }
  }

  /**
   * Generate formatted console report for logging
   */
  getFormattedReport(): string {
    const report = this.getReport()
    const lines: string[] = [
      '\n=== CONSOLE MESSAGE REPORT ===',
      `Total Messages: ${report.total}`,
      `Errors: ${report.summary.errorCount}`,
      `Warnings: ${report.summary.warningCount}`,
      `Logs: ${report.summary.logCount}`,
      `Info: ${report.summary.infoCount}`,
      `Debug: ${report.summary.debugCount}`,
      ''
    ]

    if (report.errors.length > 0) {
      lines.push('🔴 ERRORS:')
      report.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. [${error.timestamp.toISOString()}] ${error.text}`)
        if (error.location) lines.push(`     Location: ${error.location}`)
      })
      lines.push('')
    }

    if (report.warnings.length > 0) {
      lines.push('🟡 WARNINGS:')
      report.warnings.forEach((warning, index) => {
        lines.push(`  ${index + 1}. [${warning.timestamp.toISOString()}] ${warning.text}`)
        if (warning.location) lines.push(`     Location: ${warning.location}`)
      })
      lines.push('')
    }

    if (report.logs.length > 0) {
      lines.push('📝 LOGS:')
      report.logs.slice(0, 10).forEach((log, index) => { // Show first 10 logs
        lines.push(`  ${index + 1}. [${log.timestamp.toISOString()}] ${log.text}`)
      })
      if (report.logs.length > 10) {
        lines.push(`  ... and ${report.logs.length - 10} more log messages`)
      }
      lines.push('')
    }

    lines.push('=== END CONSOLE REPORT ===\n')
    return lines.join('\n')
  }

  /**
   * Clear all captured messages
   */
  clear(): void {
    this.messages = []
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.messages.some(msg =>
      msg.type === 'error' &&
      !this.isIgnorableError(msg.text)
    )
  }

  /**
   * Check if error should be ignored (e.g., known development warnings)
   */
  private isIgnorableError(errorText: string): boolean {
    const ignorablePatterns = [
      'Refused to load the script', // CSP warnings in development
      'Failed to load script from https://va.vercel-scripts.com', // Vercel analytics in development
      'Download the React DevTools', // React DevTools reminder
      'Web Vital:', // Web vitals reporting
      'Vercel Web Analytics', // Vercel analytics messages
      'Vercel Speed Insights' // Vercel speed insights messages
    ]

    return ignorablePatterns.some(pattern => errorText.includes(pattern))
  }

  /**
   * Get only critical errors (excluding ignorable ones)
   */
  getCriticalErrors(): ConsoleMessageData[] {
    return this.messages.filter(msg =>
      msg.type === 'error' &&
      !this.isIgnorableError(msg.text)
    )
  }
}

