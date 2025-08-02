import type { Page, BrowserContext, Request, Response } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

interface PageStateInfo {
  url: string;
  title: string;
  viewportSize: { width: number; height: number } | null;
  timestamp: string;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: { name: string; value: string; domain: string; path: string }[];
  networkRequests: {
    url: string;
    method: string;
    status?: number;
    timing: string;
    isAPI: boolean;
  }[];
  consoleLogs: { type: string; text: string; timestamp: Date }[];
}

interface ConsoleLogEntry {
  type: string;
  text: string;
  timestamp: string;
}

// Extend the global Window interface instead of creating separate interfaces
declare global {
  interface Window {
    __consoleLogs?: ConsoleLogEntry[];
    __performanceData?: PerformanceData;
  }
}

interface PerformanceData {
  navigationStart: number;
  marks: Map<string, number>;
  measures: Map<string, number>;
}

interface PerformanceMetrics {
  navigation: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
  };
  steps: Record<string, number>;
  resources: {
    name: string | undefined;
    duration: number;
    size: number;
  }[];
}

interface ElementStateInfo {
  exists: boolean;
  visible?: boolean;
  enabled?: boolean;
  text?: string | null;
  innerHTML?: string;
  attributes?: Record<string, string>;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
  count?: number;
  elements?: { visible: boolean; text: string | null }[];
  error?: string;
}

export interface TestScenario {
  name: string;
  description: string;
  setup?: string[];
  steps: TestStep[];
  expectedOutcome: string;
  commonFailures?: FailureScenario[];
}

export interface TestStep {
  action: string;
  data?: Record<string, unknown>;
  validation?: string;
}

export interface FailureScenario {
  symptom: string;
  causes: string[];
  fixes: string[];
  example?: string;
}

/**
 * Visual debugging helper for E2E tests
 */
export class VisualDebugger {
  private networkRequests: { request: Request; response?: Response }[] = [];
  private consoleLogs: { type: string; text: string; timestamp: Date }[] = [];
  private pageStates = new Map<string, PageStateInfo>();

  constructor(
    private page: Page,
    private context: BrowserContext
  ) {}

  async startNetworkMonitoring() {
    this.page.on('request', (request) => {
      this.networkRequests.push({ request });
    });

    this.page.on('response', (response) => {
      const existingEntry = this.networkRequests.find(
        entry => entry.request === response.request()
      );
      if (existingEntry) {
        existingEntry.response = response;
      }
    });
  }

  async startConsoleCapture() {
    this.page.on('console', (msg) => {
      this.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date(),
      });
    });

    // Inject console capture script
    await this.page.addInitScript(() => {
      const originalLog = console.warn;
      const originalError = console.error;
      const originalWarn = console.warn;

      window.__consoleLogs = [];

      console.warn = (...args) => {
        window.__consoleLogs?.push({
          type: 'log',
          text: args.join(' '),
          timestamp: new Date().toISOString(),
        });
        originalLog.apply(console, args);
      };

      console.error = (...args) => {
        window.__consoleLogs?.push({
          type: 'error',
          text: args.join(' '),
          timestamp: new Date().toISOString(),
        });
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        window.__consoleLogs?.push({
          type: 'warn',
          text: args.join(' '),
          timestamp: new Date().toISOString(),
        });
        originalWarn.apply(console, args);
      };
    });
  }

  async capturePageState(label: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stateId = `${label}_${timestamp}`;

    try {
      // Capture screenshot
      const screenshotPath = `test-results/debug/${stateId}_screenshot.png`;
      await this.ensureDirectoryExists('test-results/debug');
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      // Capture DOM
      const html = await this.page.content();
      const htmlPath = `test-results/debug/${stateId}_dom.html`;
      writeFileSync(htmlPath, html);

      // Capture page info
      const pageInfo = {
        url: this.page.url(),
        title: await this.page.title(),
        viewportSize: this.page.viewportSize(),
        timestamp: new Date().toISOString(),
        localStorage: await this.page.evaluate(() => {
          const items: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              items[key] = localStorage.getItem(key) || '';
            }
          }
          return items;
        }),
        sessionStorage: await this.page.evaluate(() => {
          const items: Record<string, string> = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
              items[key] = sessionStorage.getItem(key) || '';
            }
          }
          return items;
        }),
        cookies: await this.context.cookies(),
        networkRequests: this.getNetworkSummary(),
        consoleLogs: this.consoleLogs.slice(-20), // Last 20 logs
      };

      this.pageStates.set(stateId, pageInfo);

      console.warn(`📸 Captured page state: ${stateId}`);
      console.warn(`   Screenshot: ${screenshotPath}`);
      console.warn(`   DOM: ${htmlPath}`);
    } catch (error) {
      console.error(`Failed to capture page state for ${label}:`, error);
    }
  }

  async captureElementStates(
    label: string, 
    selectors: string[]
  ): Promise<Record<string, ElementStateInfo>> {
    const states: Record<string, ElementStateInfo> = {};

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector);
        const count = await element.count();

        if (count === 0) {
          states[selector] = { exists: false };
        } else if (count === 1) {
          states[selector] = {
            exists: true,
            visible: await element.isVisible(),
            enabled: await element.isEnabled(),
            text: await element.textContent(),
            innerHTML: await element.innerHTML(),
            attributes: await this.getElementAttributes(element),
            boundingBox: await element.boundingBox(),
          };
        } else {
          states[selector] = {
            exists: true,
            count,
            elements: await Promise.all(
              Array.from({ length: count }, async (_, i) => ({
                visible: await element.nth(i).isVisible(),
                text: await element.nth(i).textContent(),
              }))
            ),
          };
        }
      } catch (error) {
        states[selector] = {
          exists: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    console.warn(`🔍 Element states for ${label}:`);
    Object.entries(states).forEach(([selector, state]) => {
      console.warn(`  ${selector}:`, JSON.stringify(state, null, 2));
    });

    return states;
  }

  async generateFailureReport(testName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `test-results/debug/${testName}_${timestamp}_failure_report.md`;

    // Capture final state
    await this.capturePageState('test-failure');

    const report = this.buildFailureReport(testName);
    
    await this.ensureDirectoryExists('test-results/debug');
    writeFileSync(reportPath, report);

    console.warn(`📋 Failure report generated: ${reportPath}`);
    return reportPath;
  }

  generateDebuggingScript(testName: string, step: string): string {
    return `
// 🔧 Debug script for: ${testName} - ${step}
// Copy and paste this into the browser console

(function debugE2ETest() {
  console.group('🔍 E2E Test Debug: ${step}');
  
  // Authentication state
  console.group('🔐 Authentication');
  const authToken = localStorage.getItem('auth-token');
  const supabaseSession = localStorage.getItem('supabase.auth.token');
  console.log('Auth Token:', authToken ? 'Present ✅' : 'Missing ❌');
  console.log('Supabase Session:', supabaseSession ? 'Present ✅' : 'Missing ❌');
  
  if (supabaseSession) {
    try {
      const session = JSON.parse(supabaseSession);
      console.log('Session expires:', new Date(session.expires_at * 1000));
      console.log('User ID:', session.user?.id);
    } catch (e) {
      console.error('Invalid session format');
    }
  }
  console.groupEnd();
  
  // Current page state
  console.group('📍 Page State');
  console.log('URL:', window.location.href);
  console.log('Title:', document.title);
  console.log('Ready State:', document.readyState);
  console.groupEnd();
  
  // React state (if available)
  console.group('⚛️ React State');
  const reactRoot = document.querySelector('#root');
  if (reactRoot && (reactRoot as any)._reactInternalFiber) {
    console.log('React app detected');
    // Try to find React context or state
    try {
      const reactFiber = (reactRoot as any)._reactInternalFiber || (reactRoot as any)._reactInternalInstance;
      console.log('React fiber:', reactFiber);
    } catch (e) {
      console.log('Cannot access React internals');
    }
  } else {
    console.log('React app not detected or not accessible');
  }
  console.groupEnd();
  
  // Test elements
  console.group('🎯 Test Elements');
  const testElements = document.querySelectorAll('[data-testid]');
  console.log(\`Found \${testElements.length} test elements\`);
  testElements.forEach(el => {
    const testId = el.getAttribute('data-testid');
    const rect = el.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && 
                     getComputedStyle(el).visibility !== 'hidden' &&
                     getComputedStyle(el).display !== 'none';
    
    console.log(\`  \${testId}:\`, {
      tag: el.tagName,
      visible: isVisible,
      enabled: !el.hasAttribute('disabled'),
      text: el.textContent?.trim().substring(0, 50),
      classes: el.className,
      position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    });
  });
  console.groupEnd();
  
  // Error boundaries and alerts
  console.group('⚠️ Errors and Alerts');
  const errorElements = document.querySelectorAll([
    '[data-testid*="error"]',
    '.error-message',
    '[role="alert"]',
    '.alert-error',
    '.toast-error'
  ].join(', '));
  
  if (errorElements.length > 0) {
    console.log(\`Found \${errorElements.length} error elements:\`);
    errorElements.forEach(el => {
      console.error('Error:', el.textContent?.trim());
    });
  } else {
    console.log('No error messages found');
  }
  console.groupEnd();
  
  // Network requests
  console.group('🌐 Network Activity');
  if (window.performance && window.performance.getEntriesByType) {
    const requests = window.performance.getEntriesByType('resource')
      .filter(r => r.name.includes('/api/') || r.name.includes('supabase'))
      .slice(-10);
    
    console.log(\`Last \${requests.length} API requests:\`);
    requests.forEach(r => {
      const resource = r as PerformanceResourceTiming;
      console.log(\`  \${resource.name.split('/').slice(-2).join('/')}\`, {
        duration: \`\${resource.duration.toFixed(0)}ms\`,
        size: resource.transferSize ? \`\${resource.transferSize} bytes\` : 'cached',
        status: 'check network devtools'
      });
    });
  }
  console.groupEnd();
  
  // Helpful actions
  console.group('🛠️ Helpful Actions');
  console.log('window.debugAuth = () => { /* check auth state */ }');
  window.debugAuth = () => {
    console.table({
      'Auth Token': localStorage.getItem('auth-token') ? 'Present' : 'Missing',
      'Supabase Session': localStorage.getItem('supabase.auth.token') ? 'Present' : 'Missing',
      'Current URL': window.location.href,
      'User Menu Visible': document.querySelector('[data-testid="user-menu"]') ? 'Yes' : 'No'
    });
  };
  
  console.log('window.debugElements = () => { /* show all test elements */ }');
  window.debugElements = () => {
    const elements = Array.from(document.querySelectorAll('[data-testid]'));
    console.table(elements.map(el => ({
      'Test ID': el.getAttribute('data-testid'),
      'Tag': el.tagName,
      'Visible': el.offsetParent !== null,
      'Text': el.textContent?.trim().substring(0, 30)
    })));
  };
  
  console.log('Run debugAuth() or debugElements() for more info');
  console.groupEnd();
  
  console.groupEnd();
})();
    `.trim();
  }

  private async getElementAttributes(element: { evaluate: (fn: (el: Element) => Record<string, string>) => Promise<Record<string, string>> }): Promise<Record<string, string>> {
    return await element.evaluate((el: Element) => {
      const attrs: Record<string, string> = {};
      for (const attr of el.attributes) {
        if (attr?.name && attr?.value !== undefined) {
          attrs[attr.name] = attr.value;
        }
      }
      return attrs;
    });
  }

  private getNetworkSummary() {
    return this.networkRequests.slice(-20).map(entry => ({
      url: entry.request.url(),
      method: entry.request.method(),
      status: entry.response?.status(),
      timing: entry.response ? 'completed' : 'pending',
      isAPI: entry.request.url().includes('/api/'),
    }));
  }

  private buildFailureReport(testName: string): string {
    const latestState = Array.from(this.pageStates.values()).pop();
    
    return `# E2E Test Failure Report: ${testName}

## Summary
- **Test**: ${testName}
- **Time**: ${new Date().toISOString()}
- **URL**: ${latestState?.url || 'Unknown'}
- **Title**: ${latestState?.title || 'Unknown'}

## Page State at Failure
\`\`\`json
${JSON.stringify(latestState, null, 2)}
\`\`\`

## Console Logs (Last 10)
${this.consoleLogs.slice(-10).map(log => 
  `- **${log.type.toUpperCase()}** [${log.timestamp}]: ${log.text}`
).join('\n')}

## Network Requests (Last 10)
${this.getNetworkSummary().map(req =>
  `- **${req.method}** ${req.url} (${req.status || 'pending'})`
).join('\n')}

## Authentication State
- **Auth Token**: ${latestState?.localStorage?.['auth-token'] ? 'Present' : 'Missing'}
- **Supabase Session**: ${latestState?.localStorage?.['supabase.auth.token'] ? 'Present' : 'Missing'}

## Debugging Steps
1. Check the screenshot and DOM capture
2. Verify authentication tokens are present
3. Review console errors for JavaScript issues
4. Check network requests for API failures
5. Ensure test elements are present and visible

## Next Actions
- [ ] Review element selectors
- [ ] Check authentication flow
- [ ] Verify API endpoints
- [ ] Update test timeouts if needed
- [ ] Add more specific error handling
`;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      mkdirSync(dirPath, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }
}

/**
 * Test documentation utilities for E2E tests
 */
export class TestDocumentation {
  static describeScenario(scenario: TestScenario): string {
    const parts: string[] = [
      `\n📋 E2E Test Scenario: ${scenario.name}`,
      `Description: ${scenario.description}`,
      '',
    ];

    if (scenario.setup && scenario.setup.length > 0) {
      parts.push('Setup Requirements:');
      scenario.setup.forEach((req, index) => {
        parts.push(`  ${index + 1}. ${req}`);
      });
      parts.push('');
    }

    parts.push('Test Steps:');
    scenario.steps.forEach((step, index) => {
      parts.push(`  ${index + 1}. ${step.action}`);
      if (step.data) {
        parts.push(`     Data: ${JSON.stringify(step.data)}`);
      }
      if (step.validation) {
        parts.push(`     ✓ ${step.validation}`);
      }
    });

    parts.push(`\nExpected: ${scenario.expectedOutcome}`);

    if (scenario.commonFailures && scenario.commonFailures.length > 0) {
      parts.push('\nCommon Failures:');
      scenario.commonFailures.forEach((failure, index) => {
        parts.push(`\n${index + 1}. ${failure.symptom}`);
        parts.push('   Causes:');
        failure.causes.forEach(cause => parts.push(`     - ${cause}`));
        parts.push('   Fixes:');
        failure.fixes.forEach(fix => parts.push(`     ✓ ${fix}`));
      });
    }

    return parts.join('\n');
  }

  static generateE2EFixGuide(
    testName: string,
    failureType: string,
    context: Record<string, unknown>
  ): string {
    const guides: Record<string, { title: string; checks: string[]; solutions: string[] }> = {
      'element-not-found': {
        title: 'Element Not Found',
        checks: [
          'Verify element selector is correct',
          'Check if element is rendered conditionally',
          'Ensure page has fully loaded',
          'Verify no JavaScript errors preventing render',
        ],
        solutions: [
          'Add waitForSelector with appropriate timeout',
          'Check if element is inside an iframe',
          'Verify CSS selectors haven\'t changed',
          'Use more specific or stable selectors',
        ],
      },
      'authentication-failure': {
        title: 'Authentication Failure',
        checks: [
          'Verify test user credentials are correct',
          'Check if Supabase is running and accessible',
          'Ensure auth endpoints are responding',
          'Verify network connectivity',
        ],
        solutions: [
          'Reset test user password in Supabase',
          'Check Supabase service configuration',
          'Verify API base URL is correct',
          'Clear browser storage before test',
        ],
      },
      'timeout': {
        title: 'Test Timeout',
        checks: [
          'Check if page is loading slowly',
          'Verify no infinite loading states',
          'Look for JavaScript errors',
          'Check network request delays',
        ],
        solutions: [
          'Increase timeout for slow operations',
          'Add more specific wait conditions',
          'Mock slow network requests',
          'Optimize application performance',
        ],
      },
    };

    const guide = guides[failureType] || {
      title: 'Test Failure',
      checks: ['Review error message and stack trace'],
      solutions: ['Check test implementation and selectors'],
    };

    return `
🔧 E2E Fix Guide: ${guide.title}
Test: ${testName}

Context:
${Object.entries(context).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

Checks:
${guide.checks.map((check: string) => `  ☐ ${check}`).join('\n')}

Solutions:
${guide.solutions.map((solution: string) => `  ✓ ${solution}`).join('\n')}
    `.trim();
  }
}

/**
 * Performance monitoring for E2E tests
 */
export class E2EPerformanceMonitor {
  // Store performance metrics and waterfall data for analysis
  // private _metrics: Map<string, number[]> = new Map();
  // private _waterfallData: Array<{ name: string; start: number; duration: number }> = [];

  constructor(private page: Page) {}

  async startMonitoring() {
    // Monitor navigation timing
    await this.page.addInitScript(() => {
      window.__performanceData = {
        navigationStart: performance.now(),
        marks: new Map(),
        measures: new Map(),
      };
    });
  }

  async markStep(name: string) {
    await this.page.evaluate((stepName) => {
      const data = window.__performanceData;
      if (data) {
        data.marks.set(stepName, performance.now() - data.navigationStart);
      }
    }, name);
  }

  async getMetrics(): Promise<PerformanceMetrics> {
    return await this.page.evaluate(() => {
      const data = window.__performanceData;
      if (!data) {
        throw new Error('Performance data not initialized');
      }
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        navigation: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        },
        steps: Object.fromEntries(data.marks),
        resources: performance.getEntriesByType('resource').slice(-10)
          .filter((entry): entry is PerformanceResourceTiming => entry.entryType === 'resource')
          .map((r) => ({
            name: r.name.split('/').pop(),
            duration: r.duration,
            size: (r as PerformanceResourceTiming).transferSize || 0,
          })),
      };
    });
  }

  analyzePerformance(metrics: PerformanceMetrics): string[] {
    const issues: string[] = [];
    
    if (metrics.navigation.domContentLoaded > 2000) {
      issues.push('DOM Content Loaded is slow (>2s)');
    }
    
    if (metrics.navigation.firstContentfulPaint > 1500) {
      issues.push('First Contentful Paint is slow (>1.5s)');
    }
    
    const slowResources = metrics.resources.filter(r => r.duration > 1000);
    if (slowResources.length > 0) {
      issues.push(`${slowResources.length} slow resources (>1s): ${slowResources.map(r => r.name).join(', ')}`);
    }
    
    return issues;
  }
}