import { test as base, Page, ConsoleMessage } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

export interface ConsoleLog {
  type: string
  text: string
  location?: string
  timestamp: string
}

export interface PageWithConsole extends Page {
  consoleLogs: ConsoleLog[]
  errors: string[]
}

export const test = base.extend<{
  pageWithConsole: PageWithConsole
}>({
  pageWithConsole: async ({ page }, use) => {
    const consoleLogs: ConsoleLog[] = []
    const errors: string[] = []
    
    // Capture console messages
    page.on('console', (msg: ConsoleMessage) => {
      const log: ConsoleLog = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location().url,
        timestamp: new Date().toISOString()
      }
      consoleLogs.push(log)
      
      // Track errors specifically
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(error.message)
      consoleLogs.push({
        type: 'pageerror',
        text: error.message,
        timestamp: new Date().toISOString()
      })
    })
    
    // Capture request failures
    page.on('requestfailed', (request) => {
      const failure = request.failure()
      if (failure) {
        errors.push(`Request failed: ${request.url()} - ${failure.errorText}`)
        consoleLogs.push({
          type: 'requestfailed',
          text: `${request.url()} - ${failure.errorText}`,
          timestamp: new Date().toISOString()
        })
      }
    })
    
    // Add custom methods to page
    const pageWithConsole = Object.assign(page, {
      consoleLogs,
      errors
    }) as PageWithConsole
    
    await use(pageWithConsole)
    
    // Save console logs if test fails
    const testInfo = base.info()
    if (testInfo.status !== 'passed' && consoleLogs.length > 0) {
      const logsPath = path.join(testInfo.outputDir, 'console-logs.json')
      await fs.writeFile(logsPath, JSON.stringify(consoleLogs, null, 2))
      testInfo.attachments.push({
        name: 'console-logs',
        path: logsPath,
        contentType: 'application/json'
      })
    }
  }
})

export { expect } from '@playwright/test'
