import chalk from 'chalk';

export interface DiagnosticOptions {
  context?: string;
  suggestion?: string;
  documentation?: string;
  relatedTests?: string[];
  commonFixes?: string[];
}

/**
 * Enhanced assertion utilities that provide actionable feedback
 */
export class DiagnosticAssertions {
  private static formatError(
    message: string,
    actual: unknown,
    expected: unknown,
    options: DiagnosticOptions = {}
  ): string {
    const parts: string[] = [
      chalk.red.bold('✗ Assertion Failed'),
      '',
      chalk.yellow('Message:'),
      `  ${message}`,
    ];

    if (options.context) {
      parts.push('', chalk.yellow('Context:'), `  ${options.context}`);
    }

    parts.push(
      '',
      chalk.yellow('Diff:'),
      JSON.stringify({ expected, actual }, null, 2) || '  No diff available'
    );

    if (options.suggestion) {
      parts.push(
        '',
        chalk.green.bold('💡 Suggestion:'),
        `  ${options.suggestion}`
      );
    }

    if (options.commonFixes && options.commonFixes.length > 0) {
      parts.push('', chalk.green('Common Fixes:'));
      options.commonFixes.forEach((fix, index) => {
        parts.push(`  ${index + 1}. ${fix}`);
      });
    }

    if (options.documentation) {
      parts.push(
        '',
        chalk.blue('📚 Documentation:'),
        `  ${options.documentation}`
      );
    }

    if (options.relatedTests && options.relatedTests.length > 0) {
      parts.push('', chalk.cyan('Related Tests:'));
      options.relatedTests.forEach((test) => {
        parts.push(`  - ${test}`);
      });
    }

    return parts.join('\n');
  }

  static toHaveValidJWT(token: string, options: DiagnosticOptions = {}) {
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const isValid = jwtPattern.test(token);

    if (!isValid) {
      const parts = token.split('.');
      const errorMessage = this.formatError(
        'Invalid JWT format',
        token,
        'valid.jwt.token',
        {
          context: `JWT has ${parts.length} parts, expected 3 (header.payload.signature)`,
          suggestion:
            parts.length < 3
              ? 'Token appears to be incomplete. Check if the auth service is returning the full token.'
              : 'Token format is invalid. Verify the auth service is using proper JWT encoding.',
          commonFixes: [
            'Ensure Supabase JWT_SECRET is correctly configured',
            'Check if the token is being properly extracted from the auth response',
            'Verify the auth middleware is not modifying the token',
            'Confirm the token is not being truncated in storage or transmission',
          ],
          documentation: 'https://jwt.io/introduction/',
          ...options,
        }
      );
      throw new Error(errorMessage);
    }

    return true;
  }

  static toHaveRequiredAuthHeaders(
    headers: Record<string, string>,
    options: DiagnosticOptions = {}
  ) {
    const requiredHeaders = {
      authorization: 'Bearer token',
      'x-tenant-id': 'tenant-uuid',
    };

    const missingHeaders: string[] = [];
    const invalidHeaders: string[] = [];

    Object.entries(requiredHeaders).forEach(([key, _format]) => {
      if (!headers[key]) {
        missingHeaders.push(key);
      } else if (key === 'authorization' && !headers[key].startsWith('Bearer ')) {
        invalidHeaders.push(key);
      }
    });

    if (missingHeaders.length > 0 || invalidHeaders.length > 0) {
      const errorMessage = this.formatError(
        'Missing or invalid auth headers',
        headers,
        requiredHeaders,
        {
          context: `Missing: [${missingHeaders.join(', ')}], Invalid: [${invalidHeaders.join(', ')}]`,
          suggestion: 'Ensure all required headers are included in the request',
          commonFixes: [
            'Add missing headers using request interceptors',
            'Check if auth token is being properly stored after login',
            'Verify tenant context is being set correctly',
            'Ensure headers are not being stripped by proxy or CORS',
          ],
          documentation: '/docs/api/authentication',
          ...options,
        }
      );
      throw new Error(errorMessage);
    }

    return true;
  }

  static async toMatchDatabaseState(
    actual: unknown,
    expectedQuery: () => Promise<unknown>,
    options: DiagnosticOptions = {}
  ) {
    const dbState = await expectedQuery();
    const matches = JSON.stringify(actual) === JSON.stringify(dbState);

    if (!matches) {
      const errorMessage = this.formatError(
        'Object does not match database state',
        actual,
        dbState,
        {
          context: 'The in-memory object differs from the current database state',
          suggestion: 'This often indicates a missing database update or cache invalidation issue',
          commonFixes: [
            'Ensure the service method calls repository.save() or update()',
            'Check if the transaction was committed successfully',
            'Verify cache invalidation is working correctly',
            'Look for missing await statements in async operations',
            'Check if optimistic updates are being reverted on error',
          ],
          ...options,
        }
      );
      throw new Error(errorMessage);
    }

    return true;
  }

  static toHaveValidSubscriptionState(
    subscription: { status?: string } | null | undefined,
    expectedState: string,
    options: DiagnosticOptions = {}
  ) {
    const validStates = ['active', 'trialing', 'past_due', 'canceled', 'incomplete'];
    
    if (!subscription) {
      const errorMessage = this.formatError(
        'Subscription is null or undefined',
        subscription,
        { status: expectedState },
        {
          context: 'No subscription object was provided',
          suggestion: 'Ensure the user has a subscription created',
          commonFixes: [
            'Check if subscription was created successfully in Stripe',
            'Verify webhook processing for subscription.created event',
            'Ensure subscription is being loaded with the user data',
            'Check database foreign key relationships',
          ],
          documentation: '/docs/subscriptions/lifecycle',
          ...options,
        }
      );
      throw new Error(errorMessage);
    }

    if (!subscription.status || !validStates.includes(subscription.status)) {
      const errorMessage = this.formatError(
        'Invalid subscription status',
        subscription.status,
        expectedState,
        {
          context: `Status "${subscription.status}" is not a valid Stripe subscription status`,
          suggestion: `Valid statuses are: ${validStates.join(', ')}`,
          commonFixes: [
            'Ensure webhook events are being processed correctly',
            'Check if subscription status is being mapped correctly from Stripe',
            'Verify the subscription lifecycle transitions are valid',
            'Look for race conditions in status updates',
          ],
          documentation: 'https://stripe.com/docs/billing/subscriptions/overview#subscription-statuses',
          ...options,
        }
      );
      throw new Error(errorMessage);
    }

    if (subscription.status !== expectedState) {
      const errorMessage = this.formatError(
        'Subscription status mismatch',
        subscription.status,
        expectedState,
        {
          context: `Expected subscription to be ${expectedState} but was ${subscription.status}`,
          suggestion: this.getSubscriptionStatusSuggestion(subscription.status, expectedState),
          commonFixes: this.getSubscriptionStatusFixes(subscription.status, expectedState),
          documentation: '/docs/subscriptions/status-transitions',
          ...options,
        }
      );
      throw new Error(errorMessage);
    }

    return true;
  }

  private static getSubscriptionStatusSuggestion(actual: string, expected: string): string {
    const suggestions: Record<string, Record<string, string>> = {
      incomplete: {
        active: 'Complete payment method setup or wait for webhook confirmation',
        canceled: 'Incomplete subscriptions cannot be directly canceled',
      },
      past_due: {
        active: 'Process successful payment to reactivate subscription',
        canceled: 'Clear outstanding invoices before canceling',
      },
      canceled: {
        active: 'Canceled subscriptions cannot be reactivated, create a new one',
        past_due: 'Canceled subscriptions cannot become past_due',
      },
    };

    return suggestions[actual]?.[expected] || 'Check subscription lifecycle transitions';
  }

  private static getSubscriptionStatusFixes(actual: string, expected: string): string[] {
    const fixes: Record<string, Record<string, string[]>> = {
      incomplete: {
        active: [
          'Ensure payment method is attached to customer',
          'Check if initial invoice was paid',
          'Verify webhook for payment_intent.succeeded was processed',
          'Look for failed payment attempts in Stripe dashboard',
        ],
      },
      past_due: {
        active: [
          'Process payment for outstanding invoices',
          'Update payment method if current one is failing',
          'Check retry schedule in Stripe settings',
          'Verify invoice.payment_succeeded webhook handler',
        ],
      },
      canceled: {
        active: [
          'Create a new subscription instead of reactivating',
          'Check if cancellation was intentional',
          'Verify subscription.deleted webhook was processed',
          'Ensure UI prevents operations on canceled subscriptions',
        ],
      },
    };

    return fixes[actual]?.[expected] || [
      'Review subscription webhook handlers',
      'Check Stripe dashboard for subscription history',
      'Verify database sync with Stripe state',
    ];
  }
}

/**
 * State inspection utilities for debugging
 */
export class StateInspector {
  static async captureRequestContext(req: Record<string, unknown>) {
    return {
      headers: req.headers,
      params: req.params,
      query: req.query,
      body: req.body,
      user: req.user,
      tenant: req.tenant,
      timestamp: new Date().toISOString(),
    };
  }

  static async captureDatabaseState(prisma: Record<string, unknown>, models: string[]) {
    const state: Record<string, unknown> = {};
    
    for (const model of models) {
      try {
        const modelInstance = prisma[model] as { findMany: (options: unknown) => Promise<unknown> };
        state[model] = await modelInstance.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
        });
      } catch (error) {
        state[model] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
    
    return state;
  }

  static formatStateComparison(before: Record<string, unknown>, after: Record<string, unknown>): string {
    const changes: string[] = [];
    
    const compareObjects = (obj1: Record<string, unknown>, obj2: Record<string, unknown>, path = '') => {
      Object.keys(obj2).forEach((key) => {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (!(key in obj1)) {
          changes.push(chalk.green(`+ ${fullPath}: ${JSON.stringify(obj2[key])}`));
        } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          if (typeof obj2[key] === 'object' && obj2[key] !== null) {
            compareObjects(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>, fullPath);
          } else {
            changes.push(chalk.yellow(`~ ${fullPath}: ${obj1[key]} → ${obj2[key]}`));
          }
        }
      });
      
      Object.keys(obj1).forEach((key) => {
        if (!(key in obj2)) {
          const fullPath = path ? `${path}.${key}` : key;
          changes.push(chalk.red(`- ${fullPath}: ${JSON.stringify(obj1[key])}`));
        }
      });
    };
    
    compareObjects(before, after);
    
    return changes.length > 0 
      ? `State Changes:\n${changes.join('\n')}`
      : 'No state changes detected';
  }
}

/**
 * Performance profiling helpers
 */
export class PerformanceProfiler {
  private static timers = new Map<string, number>();
  private static metrics = new Map<string, number[]>();

  static startTimer(label: string) {
    this.timers.set(label, performance.now());
  }

  static endTimer(label: string): number {
    const start = this.timers.get(label);
    if (!start) {
      throw new Error(`Timer "${label}" was not started`);
    }
    
    const duration = performance.now() - start;
    this.timers.delete(label);
    
    // Store metric for analysis
    const metrics = this.metrics.get(label) || [];
    metrics.push(duration);
    this.metrics.set(label, metrics);
    
    return duration;
  }

  static getMetrics(label: string) {
    const metrics = this.metrics.get(label) || [];
    if (metrics.length === 0) {
      return null;
    }
    
    const sorted = [...metrics].sort((a, b) => a - b);
    const sum = metrics.reduce((a, b) => a + b, 0);
    
    return {
      count: metrics.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / metrics.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  static analyzePerformance(label: string, threshold: number): string {
    const metrics = this.getMetrics(label);
    if (!metrics) {
      return 'No metrics available';
    }
    
    const issues: string[] = [];
    
    if (metrics.avg > threshold) {
      issues.push(`Average time (${metrics.avg.toFixed(2)}ms) exceeds threshold (${threshold}ms)`);
    }
    
    if (metrics.p95 && metrics.p95 > threshold * 2) {
      issues.push(`95th percentile (${metrics.p95.toFixed(2)}ms) is more than 2x threshold`);
    }
    
    if (metrics.max && metrics.max > threshold * 5) {
      issues.push(`Maximum time (${metrics.max.toFixed(2)}ms) is more than 5x threshold`);
    }
    
    if (issues.length > 0) {
      return chalk.red('Performance Issues:') + '\n' + issues.map(i => `  - ${i}`).join('\n');
    }
    
    return chalk.green('Performance is within acceptable limits');
  }

  static reset() {
    this.timers.clear();
    this.metrics.clear();
  }
}

/**
 * Database state analyzer
 */
export class DatabaseAnalyzer {
  static async analyzeRelationships(
    prisma: Record<string, unknown>,
    model: string,
    id: string
  ): Promise<Record<string, unknown>> {
    const analysis: Record<string, unknown> = {};
    
    // Get model schema information
    const modelInstance = prisma[model] as { findUnique: (options: unknown) => Promise<unknown> };
    const modelInfo = await modelInstance.findUnique({
      where: { id },
      include: {
        _count: true,
      },
    });
    
    if (!modelInfo) {
      return { error: `${model} with id ${id} not found` };
    }
    
    analysis.entity = modelInfo;
    analysis.relationships = {};
    
    // Analyze common relationships based on model type
    switch (model.toLowerCase()) {
      case 'user':
        analysis.relationships = {
          organizations: await (prisma.organization as { count: (options: unknown) => Promise<number> }).count({ where: { userId: id } }),
          properties: await (prisma.property as { count: (options: unknown) => Promise<number> }).count({ where: { organization: { userId: id } } }),
          tenants: await (prisma.tenant as { count: (options: unknown) => Promise<number> }).count({ where: { userId: id } }),
        };
        break;
        
      case 'property':
        analysis.relationships = {
          units: await (prisma.unit as { count: (options: unknown) => Promise<number> }).count({ where: { propertyId: id } }),
          maintenanceRequests: await (prisma.maintenanceRequest as { count: (options: unknown) => Promise<number> }).count({ where: { propertyId: id } }),
        };
        break;
        
      case 'tenant':
        analysis.relationships = {
          leases: await (prisma.lease as { count: (options: unknown) => Promise<number> }).count({ where: { tenantId: id } }),
          maintenanceRequests: await (prisma.maintenanceRequest as { count: (options: unknown) => Promise<number> }).count({ where: { tenantId: id } }),
        };
        break;
    }
    
    return analysis;
  }

  static async findOrphans(prisma: Record<string, unknown>): Promise<Record<string, unknown[]>> {
    const orphans: Record<string, unknown[]> = {};
    
    // Find units without properties
    orphans.unitsWithoutProperties = await (prisma.unit as { findMany: (options: unknown) => Promise<unknown[]> }).findMany({
      where: { propertyId: null },
      select: { id: true, unitNumber: true },
    });
    
    // Find leases without tenants or units
    orphans.leasesWithoutTenants = await (prisma.lease as { findMany: (options: unknown) => Promise<unknown[]> }).findMany({
      where: { tenantId: null },
      select: { id: true, startDate: true },
    });
    
    orphans.leasesWithoutUnits = await (prisma.lease as { findMany: (options: unknown) => Promise<unknown[]> }).findMany({
      where: { unitId: null },
      select: { id: true, startDate: true },
    });
    
    // Find maintenance requests without properties
    orphans.maintenanceWithoutProperties = await (prisma.maintenanceRequest as { findMany: (options: unknown) => Promise<unknown[]> }).findMany({
      where: { propertyId: null },
      select: { id: true, title: true },
    });
    
    return orphans;
  }

  static generateCleanupScript(orphans: Record<string, unknown[]>): string {
    const scripts: string[] = [];
    
    Object.entries(orphans).forEach(([type, items]) => {
      if (items.length > 0) {
        const ids = items.map(item => (item as { id: string }).id);
        const table = type.replace(/([A-Z])/g, '_$1').toLowerCase();
        scripts.push(`-- Clean up ${type} (${items.length} records)`);
        scripts.push(`DELETE FROM ${table} WHERE id IN (${ids.map(id => `'${id}'`).join(', ')});`);
        scripts.push('');
      }
    });
    
    return scripts.join('\n');
  }
}