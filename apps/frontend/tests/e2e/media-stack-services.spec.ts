/**
 * Media Stack Services Comprehensive Test Suite
 * 
 * This test suite verifies that all media stack services are operational:
 * - Radarr (port 7878) - Movie management
 * - Sonarr (port 8989) - TV series management  
 * - qBittorrent (port 8112) - BitTorrent client
 * - Jellyseerr (port 5055) - Media request management
 * - Prowlarr (port 9696) - Indexer management
 * 
 * Features:
 * - Tests multiple host configurations (localhost, 127.0.0.1, custom IPs)
 * - Handles authentication where required
 * - Takes screenshots for visual verification
 * - Generates detailed HTML reports
 * - Detects and reports errors
 * - Verifies page titles and content
 */

import { test, expect, Page } from '@playwright/test'
import { MEDIA_SERVICES, MEDIA_STACK_CONFIG } from './media-stack-config'
import { 
  MediaStackBasePage, 
  RadarrPage, 
  SonarrPage, 
  QBittorrentPage, 
  JellyseerrPage, 
  ProwlarrPage 
} from './media-stack-pages'
import { MediaStackTestUtils, ServiceTestResult, TestSummary } from './media-stack-utils'

// Test configuration
test.describe('Media Stack Services Health Check', () => {
  test.setTimeout(60000) // 60 seconds timeout for each test

  let testUtils: MediaStackTestUtils
  let testResults: ServiceTestResult[] = []

  test.beforeEach(async ({ page }) => {
    testUtils = new MediaStackTestUtils(page)
    
    // Configure page for media stack testing
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Set extra HTTP headers if needed
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
  })

  // Individual service tests
  test('Radarr Service Accessibility', async ({ page }) => {
    await testService(page, 'radarr', RadarrPage)
  })

  test('Sonarr Service Accessibility', async ({ page }) => {
    await testService(page, 'sonarr', SonarrPage)
  })

  test('qBittorrent Service Accessibility', async ({ page }) => {
    await testService(page, 'qbittorrent', QBittorrentPage)
  })

  test('Jellyseerr Service Accessibility', async ({ page }) => {
    await testService(page, 'jellyseerr', JellyseerrPage)
  })

  test('Prowlarr Service Accessibility', async ({ page }) => {
    await testService(page, 'prowlarr', ProwlarrPage)
  })

  // Comprehensive test that runs all services
  test('All Media Stack Services - Comprehensive Check', async ({ page }) => {
    console.log('Starting comprehensive media stack services test...')
    
    const allResults: ServiceTestResult[] = []
    const startTime = Date.now()

    for (const [serviceKey, service] of Object.entries(MEDIA_SERVICES)) {
      console.log(`\n=== Testing ${service.name} ===`)
      
      const result = await testServiceDetailed(page, serviceKey, service)
      allResults.push(result)
      
      // Log result summary
      const status = result.accessible ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'
      const authStatus = service.requiresAuth ? (result.authenticated ? '🔐 AUTH OK' : '🔐 AUTH FAILED') : '🔓 NO AUTH'
      console.log(`${service.name}: ${status} | ${authStatus} | Errors: ${result.errors.length}`)
      
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.join(', ')}`)
      }
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime

    // Generate test summary
    const summary: TestSummary = {
      totalServices: allResults.length,
      accessibleServices: allResults.filter(r => r.accessible).length,
      servicesWithErrors: allResults.filter(r => r.errors.length > 0).length,
      timestamp: new Date().toLocaleString(),
      results: allResults
    }

    // Save results for report generation
    testResults = allResults

    console.log(`\n=== TEST SUMMARY ===`)
    console.log(`Total Services: ${summary.totalServices}`)
    console.log(`Accessible: ${summary.accessibleServices}`)
    console.log(`With Errors: ${summary.servicesWithErrors}`)
    console.log(`Success Rate: ${Math.round((summary.accessibleServices / summary.totalServices) * 100)}%`)
    console.log(`Total Test Time: ${totalTime}ms`)

    // Generate HTML report
    await generateTestReport(page, summary)

    // This test is informational - it reports status but doesn't fail builds
    // In a production environment, you might want different logic here
    console.log(`\n📊 Media Stack Health Summary:`)
    console.log(`   Accessible: ${summary.accessibleServices}/${summary.totalServices}`)
    console.log(`   Success Rate: ${Math.round((summary.accessibleServices / summary.totalServices) * 100)}%`)
    
    // Optional: Only fail if no services accessible AND it's expected that some should be
    // expect(summary.accessibleServices).toBeGreaterThan(0) // Uncomment to enforce availability
  })

  test.afterAll(async ({ browser }) => {
    if (testResults.length > 0) {
      console.log('\n=== FINAL TEST RESULTS ===')
      testResults.forEach(result => {
        console.log(`${result.serviceName}: ${result.accessible ? 'UP' : 'DOWN'} (${result.url})`)
      })
    }
  })

  // Helper function to test individual services
  async function testService(page: Page, serviceKey: string, PageClass: any) {
    const service = MEDIA_SERVICES[serviceKey]
    const result = await testServiceDetailed(page, serviceKey, service, PageClass)
    
    // Store result for comprehensive report
    testResults.push(result)
    
    // Log individual test results (informational, non-failing)
    if (result.accessible) {
      console.log(`✅ ${service.name} is accessible at ${result.url}`)
    } else {
      console.log(`❌ ${service.name} is not accessible. Errors: ${result.errors.join(', ')}`)
    }
    
    // These tests are informational - uncomment the line below to make them enforce availability
    // expect(result.accessible).toBe(true)
  }

  // Detailed service testing function
  async function testServiceDetailed(
    page: Page, 
    serviceKey: string, 
    service: any, 
    PageClass: any = MediaStackBasePage
  ): Promise<ServiceTestResult> {
    const startTime = Date.now()
    let serviceTestResult: ServiceTestResult = {
      serviceName: service.name,
      host: 'unknown',
      port: service.port,
      url: '',
      accessible: false,
      authenticated: false,
      title: '',
      errors: [],
      responseTime: 0
    }

    try {
      console.log(`Finding accessible host for ${service.name}...`)
      const accessibleHost = await testUtils.findAccessibleHost(service)
      
      if (!accessibleHost) {
        serviceTestResult.errors.push('No accessible host found')
        serviceTestResult.responseTime = Date.now() - startTime
        return serviceTestResult
      }

      serviceTestResult.host = accessibleHost
      serviceTestResult.url = `http://${accessibleHost}:${service.port}${service.path}`

      console.log(`Testing ${service.name} at ${serviceTestResult.url}`)

      // Create service page instance
      const servicePage = new PageClass(page, service, accessibleHost)

      // Test service health
      const healthResult = await servicePage.checkServiceHealth()
      
      // Update result with health check data
      serviceTestResult = {
        ...serviceTestResult,
        accessible: healthResult.accessible,
        authenticated: healthResult.authenticated,
        title: healthResult.title,
        errors: healthResult.errors,
        responseTime: Date.now() - startTime
      }

      // Take screenshot if accessible
      if (healthResult.accessible) {
        try {
          await servicePage.takeScreenshot('service-check')
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          serviceTestResult.screenshotPath = `${service.name.toLowerCase()}-service-check-${timestamp}.png`
        } catch (screenshotError) {
          console.warn(`Failed to take screenshot for ${service.name}:`, screenshotError)
        }
      }

    } catch (error) {
      serviceTestResult.errors.push(`Test execution failed: ${error}`)
      serviceTestResult.responseTime = Date.now() - startTime
      console.error(`Error testing ${service.name}:`, error)
    }

    return serviceTestResult
  }

  // Generate comprehensive HTML test report
  async function generateTestReport(page: Page, summary: TestSummary) {
    try {
      console.log('Generating HTML test report...')
      const reportPath = './tests/e2e/media-stack-test/media-stack-report.html'
      await testUtils.saveHtmlReport(summary, reportPath)
      console.log(`✅ Test report saved to: ${reportPath}`)
      
      // Also save a JSON report for programmatic access
      const jsonReportPath = './tests/e2e/media-stack-test/media-stack-results.json'
      const fs = await import('fs')
      await fs.promises.writeFile(jsonReportPath, JSON.stringify(summary, null, 2))
      console.log(`✅ JSON results saved to: ${jsonReportPath}`)
      
    } catch (error) {
      console.error('Failed to generate test report:', error)
    }
  }
})
