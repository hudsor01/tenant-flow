import { Injectable, Optional } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { StripeSyncService } from '../billing/stripe-sync.service';
import { PinoLogger } from 'nestjs-pino';

/**
 * Stripe FDW Health Indicator
 * 
 * Checks the health of the Stripe Foreign Data Wrapper connection
 * following ultra-native architecture principles - no abstractions
 */
@Injectable()
export class StripeFdwHealthIndicator extends HealthIndicator {
  constructor(
    private readonly stripeSyncService: StripeSyncService,
    @Optional() private readonly logger?: PinoLogger
  ) {
    super();
    this.logger?.setContext(StripeFdwHealthIndicator.name);
  }

  /**
   * Single health check method - eliminated duplicate patterns
   */
  async checkHealth(key: string, throwOnFailure = true): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();
      const isHealthy = await this.stripeSyncService.isHealthy();
      const responseTime = `${Date.now() - startTime}ms`;

      const result = this.getStatus(key, isHealthy, {
        responseTime,
        type: 'fdw',
        realTime: true,
        connection: isHealthy ? 'active' : 'failed'
      });

      if (!isHealthy && throwOnFailure) {
        throw new HealthCheckError('Stripe FDW check failed', result);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      this.logger?.error('Stripe FDW health check failed', error);
      
      const result = this.getStatus(key, false, {
        error: errorMessage,
        type: 'fdw',
        realTime: false,
        connection: 'failed'
      });

      if (throwOnFailure) {
        throw new HealthCheckError('Stripe FDW check failed', result);
      }
      
      return result;
    }
  }

  // Compatibility methods - now just wrappers
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    return this.checkHealth(key, true);
  }

  async quickPing(key: string): Promise<HealthIndicatorResult> {
    return this.checkHealth(key, false);
  }

  async detailedCheck(key: string): Promise<HealthIndicatorResult> {
    return this.checkHealth(key, true);
  }
}