import chalk from 'chalk';
// import { Test } from '@nestjs/testing';

// Type definitions for test utilities
interface PlaybookData {
  symptoms: string[];
  diagnosis: { action: string; command?: string; checkFor?: string; }[];
  resolution: string[];
  prevention?: string[];
  relatedIssues?: string[];
}

interface ConsoleLog {
  type: string;
  text: string;
}

interface NetworkRequest {
  method: string;
  url: string;
  status: number;
}

interface ElementState {
  visible?: boolean;
  enabled?: boolean;
  text?: string | null;
  classes?: string | null;
  exists?: boolean;
  error?: string;
}

interface PlaywrightPage {
  screenshot: (options: { path: string; fullPage: boolean }) => Promise<void>;
  content: () => Promise<string>;
  evaluate: (fn: () => unknown) => Promise<unknown>;
  $: (selector: string) => Promise<{
    isVisible: () => Promise<boolean>;
    isEnabled: () => Promise<boolean>;
    textContent: () => Promise<string | null>;
    getAttribute: (name: string) => Promise<string | null>;
  } | null>;
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
 * Self-documenting test utilities
 */
export class TestDocumentation {
  static describeScenario(scenario: TestScenario): string {
    const parts: string[] = [
      chalk.blue.bold(`📋 Test Scenario: ${scenario.name}`),
      '',
      chalk.gray('Description:'),
      `  ${scenario.description}`,
      '',
    ];

    if (scenario.setup && scenario.setup.length > 0) {
      parts.push(chalk.gray('Setup Requirements:'));
      scenario.setup.forEach((req, index) => {
        parts.push(`  ${index + 1}. ${req}`);
      });
      parts.push('');
    }

    parts.push(chalk.gray('Test Steps:'));
    scenario.steps.forEach((step, index) => {
      parts.push(`  ${index + 1}. ${step.action}`);
      if (step.data) {
        parts.push(`     Data: ${JSON.stringify(step.data, null, 2).split('\n').join('\n     ')}`);
      }
      if (step.validation) {
        parts.push(`     ✓ Validate: ${step.validation}`);
      }
    });

    parts.push('', chalk.gray('Expected Outcome:'), `  ${scenario.expectedOutcome}`);

    if (scenario.commonFailures && scenario.commonFailures.length > 0) {
      parts.push('', chalk.yellow.bold('⚠️  Common Failures:'));
      scenario.commonFailures.forEach((failure, index) => {
        parts.push('', chalk.yellow(`${index + 1}. ${failure.symptom}`));
        parts.push('   Causes:');
        failure.causes.forEach((cause) => parts.push(`     - ${cause}`));
        parts.push('   Fixes:');
        failure.fixes.forEach((fix) => parts.push(`     ✓ ${fix}`));
        if (failure.example) {
          parts.push(`   Example: ${failure.example}`);
        }
      });
    }

    return parts.join('\n');
  }

  static generateFixGuide(
    testName: string,
    error: Error,
    context: Record<string, unknown>
  ): string {
    const errorType = error.constructor.name;
    const guides = this.getFixGuides();
    const guide = guides[errorType] || guides.default;

    const parts: string[] = [
      chalk.red.bold(`❌ Test Failed: ${testName}`),
      '',
      chalk.red('Error:'),
      `  ${error.message}`,
      '',
    ];

    if (error.stack) {
      const relevantStack = error.stack
        .split('\n')
        .slice(1, 4)
        .join('\n');
      parts.push(chalk.gray('Stack Trace:'), relevantStack, '');
    }

    if (guide) {
      parts.push(chalk.yellow.bold('🔧 Fix Guide:'));
      guide.steps.forEach((step, index) => {
        parts.push(`  ${index + 1}. ${step}`);
      });
    }

    if (context && Object.keys(context).length > 0) {
      parts.push('', chalk.gray('Context:'));
      Object.entries(context).forEach(([key, value]) => {
        parts.push(`  ${key}: ${JSON.stringify(value, null, 2).split('\n').join('\n  ')}`);
      });
    }

    if (guide?.resources) {
      parts.push('', chalk.blue('📚 Resources:'));
      guide.resources.forEach((resource) => {
        parts.push(`  - ${resource}`);
      });
    }

    return parts.join('\n');
  }

  private static getFixGuides(): Record<string, { steps: string[]; resources?: string[] }> {
    return {
      UnauthorizedException: {
        steps: [
          'Check if test user has valid authentication token',
          'Verify JWT_SECRET is properly configured in test environment',
          'Ensure auth headers are being sent with the request',
          'Check if user session has expired during test',
          'Verify auth middleware is properly configured',
        ],
        resources: [
          'Authentication Setup: /docs/auth/setup',
          'Test Auth Utils: /src/test-utils/auth-helper.ts',
        ],
      },
      ForbiddenException: {
        steps: [
          'Verify user has required role for this operation',
          'Check if tenant context is properly set',
          'Ensure RLS policies allow this operation',
          'Verify organization membership is valid',
          'Check if subscription tier allows this feature',
        ],
        resources: [
          'Role-Based Access: /docs/auth/rbac',
          'Multi-tenancy Guide: /docs/architecture/multi-tenancy',
        ],
      },
      ValidationError: {
        steps: [
          'Check if all required fields are provided',
          'Verify data types match DTO expectations',
          'Ensure enum values are from allowed set',
          'Check date formats (should be ISO 8601)',
          'Verify nested objects have required properties',
        ],
        resources: [
          'DTO Validation: /docs/api/validation',
          'Common DTOs: /src/common/dto',
        ],
      },
      DatabaseError: {
        steps: [
          'Check if database migrations are up to date',
          'Verify foreign key relationships are valid',
          'Ensure unique constraints are not violated',
          'Check if transaction was properly started',
          'Verify database connection is active',
        ],
        resources: [
          'Database Schema: /prisma/schema.prisma',
          'Migration Guide: /docs/database/migrations',
        ],
      },
      StripeError: {
        steps: [
          'Verify Stripe API keys are configured',
          'Check if webhook secret matches environment',
          'Ensure customer exists in Stripe',
          'Verify price/product IDs are valid',
          'Check if payment method is attached',
        ],
        resources: [
          'Stripe Integration: /docs/payments/stripe',
          'Webhook Testing: /scripts/test-webhooks.sh',
        ],
      },
      default: {
        steps: [
          'Review the error message and stack trace',
          'Check recent code changes in related modules',
          'Verify all dependencies are properly mocked',
          'Ensure test data setup is complete',
          'Look for timing issues or race conditions',
          'Check if external services are properly stubbed',
        ],
        resources: [
          'Testing Guide: /docs/testing/overview',
          'Debugging Tests: /docs/testing/debugging',
        ],
      },
    };
  }
}

/**
 * Failure playbook generator
 */
export class FailurePlaybook {
  static async generatePlaybook(
    testFile: string,
    failurePattern: string
  ): Promise<string> {
    const playbooks = this.getPlaybooks();
    const playbook = playbooks[failurePattern] || this.createGenericPlaybook(failurePattern);

    const parts: string[] = [
      chalk.blue.bold(`📖 Failure Playbook: ${failurePattern}`),
      chalk.gray(`Test File: ${testFile}`),
      '',
      chalk.yellow('Symptoms:'),
    ];

    playbook.symptoms.forEach((symptom: string) => {
      parts.push(`  • ${symptom}`);
    });

    parts.push('', chalk.cyan('Diagnosis Steps:'));
    playbook.diagnosis.forEach((step: { action: string; command?: string; checkFor?: string; }, index: number) => {
      parts.push(`  ${index + 1}. ${step.action}`);
      if (step.command) {
        parts.push(`     ${chalk.gray('$')} ${step.command}`);
      }
      if (step.checkFor) {
        parts.push(`     ${chalk.gray('Check for:')} ${step.checkFor}`);
      }
    });

    parts.push('', chalk.green('Resolution Steps:'));
    playbook.resolution.forEach((step: string, index: number) => {
      parts.push(`  ${index + 1}. ${step}`);
    });

    if (playbook.prevention) {
      parts.push('', chalk.magenta('Prevention:'));
      playbook.prevention.forEach((tip: string) => {
        parts.push(`  • ${tip}`);
      });
    }

    if (playbook.relatedIssues) {
      parts.push('', chalk.gray('Related Issues:'));
      playbook.relatedIssues.forEach((issue: string) => {
        parts.push(`  - ${issue}`);
      });
    }

    return parts.join('\n');
  }

  private static getPlaybooks(): Record<string, PlaybookData> {
    return {
      'auth-token-invalid': {
        symptoms: [
          'Tests fail with 401 Unauthorized',
          'Token validation errors',
          'JWT malformed or expired messages',
        ],
        diagnosis: [
          {
            action: 'Check token generation',
            command: 'npm run test:unit -- auth.service.spec.ts -t "generateToken"',
            checkFor: 'Token structure and expiry',
          },
          {
            action: 'Verify environment variables',
            command: 'grep JWT .env.test',
            checkFor: 'JWT_SECRET and JWT_EXPIRES_IN',
          },
          {
            action: 'Inspect token contents',
            command: 'echo $TOKEN | jwt decode',
            checkFor: 'Valid payload and expiry time',
          },
        ],
        resolution: [
          'Ensure JWT_SECRET matches between services',
          'Update token expiry to reasonable duration (e.g., 1h for tests)',
          'Regenerate test tokens if expired',
          'Fix clock skew if using different time zones',
        ],
        prevention: [
          'Use consistent token generation in test utilities',
          'Mock time-dependent operations',
          'Create fresh tokens for each test suite',
        ],
        relatedIssues: [
          'Session management',
          'Token refresh logic',
          'Multi-tenant context',
        ],
      },
      'database-connection-timeout': {
        symptoms: [
          'Tests timeout after 5-30 seconds',
          'Connection pool exhausted errors',
          'Prisma timeout exceptions',
        ],
        diagnosis: [
          {
            action: 'Check active connections',
            command: 'npx prisma db execute --stdin < check-connections.sql',
            checkFor: 'Number of active connections',
          },
          {
            action: 'Review test cleanup',
            command: 'grep -r "afterEach\\|afterAll" src/**/*.spec.ts',
            checkFor: 'Proper connection cleanup',
          },
          {
            action: 'Check for transaction leaks',
            checkFor: 'Unclosed transactions or missing commits/rollbacks',
          },
        ],
        resolution: [
          'Add explicit connection cleanup in afterEach hooks',
          'Increase connection pool size for tests',
          'Use transaction rollback for test isolation',
          'Implement connection pooling limits',
        ],
        prevention: [
          'Use shared test database utilities',
          'Implement automatic transaction rollback',
          'Monitor connection pool metrics',
        ],
        relatedIssues: [
          'Test isolation',
          'Parallel test execution',
          'Database deadlocks',
        ],
      },
      'stripe-webhook-signature': {
        symptoms: [
          'Webhook signature verification fails',
          'Stripe webhook tests return 400',
          'Invalid signature errors',
        ],
        diagnosis: [
          {
            action: 'Verify webhook secret',
            command: 'echo $STRIPE_WEBHOOK_SECRET | head -c 10',
            checkFor: 'Secret starts with "whsec_"',
          },
          {
            action: 'Check signature generation',
            checkFor: 'Proper Stripe signature header format',
          },
          {
            action: 'Review request body handling',
            checkFor: 'Raw body preservation (no JSON parsing)',
          },
        ],
        resolution: [
          'Use correct webhook secret for test environment',
          'Ensure raw body is passed to stripe.webhooks.constructEvent',
          'Generate test signatures using Stripe SDK',
          'Disable body parsing for webhook endpoint',
        ],
        prevention: [
          'Use Stripe webhook test helpers',
          'Document webhook testing setup',
          'Create webhook testing utilities',
        ],
        relatedIssues: [
          'Request body parsing',
          'Stripe API version mismatch',
          'Event replay handling',
        ],
      },
    };
  }

  private static createGenericPlaybook(pattern: string): PlaybookData {
    return {
      symptoms: [`Test failures matching pattern: ${pattern}`],
      diagnosis: [
        {
          action: 'Review recent changes',
          command: 'git log --oneline -10',
          checkFor: 'Related code modifications',
        },
        {
          action: 'Run focused test',
          command: `npm run test:unit -- --grep "${pattern}"`,
          checkFor: 'Specific failure details',
        },
        {
          action: 'Check test logs',
          checkFor: 'Error messages and stack traces',
        },
      ],
      resolution: [
        'Identify the root cause from diagnostics',
        'Apply targeted fix based on error type',
        'Verify fix with isolated test run',
        'Run full test suite to ensure no regressions',
      ],
      prevention: [
        'Add specific test coverage for this scenario',
        'Document the issue and solution',
        'Consider adding to CI test matrix',
      ],
    };
  }
}

/**
 * Visual debugging helpers for E2E tests
 */
export class VisualDebugger {
  static async captureDebugInfo(page: PlaywrightPage, testName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugDir = `test-artifacts/${testName}/${timestamp}`;

    const info: string[] = [
      chalk.blue.bold('🔍 Visual Debug Information'),
      `Test: ${testName}`,
      `Time: ${timestamp}`,
      '',
    ];

    // Capture screenshot
    const screenshotPath = `${debugDir}/screenshot.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    info.push(`Screenshot: ${screenshotPath}`);

    // Capture DOM snapshot
    await page.content(); // Would save to file in real implementation
    const htmlPath = `${debugDir}/page.html`;
    // Would write to file in real implementation
    info.push(`DOM Snapshot: ${htmlPath}`);

    // Capture console logs
    const logs = await page.evaluate(() => {
      return (window as Window & { __consoleLogs?: ConsoleLog[] }).__consoleLogs || [];
    }) as ConsoleLog[];
    info.push('', 'Console Logs:');
    logs.forEach((log: ConsoleLog) => {
      info.push(`  [${log.type}] ${log.text}`);
    });

    // Capture network activity
    const requests = await page.evaluate(() => {
      return (window as Window & { __networkRequests?: NetworkRequest[] }).__networkRequests || [];
    }) as NetworkRequest[];
    info.push('', 'Network Requests:');
    requests.forEach((req: NetworkRequest) => {
      info.push(`  ${req.method} ${req.url} (${req.status})`);
    });

    // Capture element states
    const elementStates = await this.captureElementStates(page);
    info.push('', 'Element States:');
    Object.entries(elementStates).forEach(([selector, state]) => {
      info.push(`  ${selector}: ${JSON.stringify(state)}`);
    });

    return info.join('\n');
  }

  private static async captureElementStates(page: PlaywrightPage): Promise<Record<string, ElementState>> {
    const selectors = [
      '[data-testid="login-form"]',
      '[data-testid="error-message"]',
      '[data-testid="loading-spinner"]',
      '[data-testid="user-menu"]',
    ];

    const states: Record<string, ElementState> = {};

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          states[selector] = {
            visible: await element.isVisible(),
            enabled: await element.isEnabled(),
            text: await element.textContent(),
            classes: await element.getAttribute('class'),
          };
        } else {
          states[selector] = { exists: false };
        }
      } catch (error) {
        states[selector] = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    return states;
  }

  static generateE2EDebuggingScript(testName: string, step: string): string {
    return `
// Debug script for: ${testName} - ${step}
// Run this in the browser console to inspect state

(function debugTest() {
  console.group('🔍 E2E Test Debug: ${step}');
  
  // Check authentication state
  const authToken = localStorage.getItem('auth-token');
  console.log('Auth Token:', authToken ? 'Present' : 'Missing');
  
  // Check Supabase session
  const supabaseSession = localStorage.getItem('supabase.auth.token');
  console.log('Supabase Session:', supabaseSession ? JSON.parse(supabaseSession) : 'None');
  
  // Check current route
  console.log('Current URL:', window.location.href);
  console.log('Route State:', window.history.state);
  
  // Find and log test elements
  const testElements = document.querySelectorAll('[data-testid]');
  console.log('Test Elements Found:', testElements.length);
  testElements.forEach(el => {
    console.log(\`  - \${el.getAttribute('data-testid')}: \${el.tagName}\`, {
      visible: el.offsetParent !== null,
      disabled: el.hasAttribute('disabled'),
      text: el.textContent?.trim().substring(0, 50)
    });
  });
  
  // Check for error boundaries
  const errors = document.querySelectorAll('[data-error], .error-message, [role="alert"]');
  if (errors.length > 0) {
    console.warn('Errors found:', errors.length);
    errors.forEach(err => console.error('  -', err.textContent));
  }
  
  // Network state
  if (window.performance && window.performance.getEntriesByType) {
    const requests = window.performance.getEntriesByType('resource')
      .filter(r => r.name.includes('/api/'))
      .slice(-10);
    console.log('Recent API Calls:');
    requests.forEach(r => {
      console.log(\`  - \${r.name.split('/').slice(-2).join('/')}: \${r.duration.toFixed(0)}ms\`);
    });
  }
  
  console.groupEnd();
})();
    `.trim();
  }
}