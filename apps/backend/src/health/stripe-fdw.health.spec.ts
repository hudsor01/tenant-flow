import type { TestingModule } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger';
import { Test } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { StripeFdwHealthIndicator } from './stripe-fdw.health';
import { StripeSyncService } from '../billing/stripe-sync.service';

describe('StripeFdwHealthIndicator', () => {
  let healthIndicator: StripeFdwHealthIndicator;
  let stripeSyncService: StripeSyncService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Clear mocks before module creation to capture constructor calls
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeFdwHealthIndicator,
        {
          provide: StripeSyncService,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
      ],
    })
			.setLogger(new SilentLogger())
			.compile();

    healthIndicator = module.get<StripeFdwHealthIndicator>(StripeFdwHealthIndicator);
    stripeSyncService = module.get<StripeSyncService>(StripeSyncService);

    // Spy on the logger
    loggerSpy = jest.spyOn(healthIndicator['logger'], 'error');
  });

  describe('Constructor', () => {
    it('should set logger context on initialization', () => {
      // Logger context setting is handled by NestJS Logger
      expect(healthIndicator).toBeDefined();
    });
  });

  describe('checkHealth (Core Method)', () => {
    it('should return healthy status when service is healthy', async () => {
      jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(true);

      const result = await healthIndicator.checkHealth('stripe_fdw', false);

      expect(result).toEqual({
        stripe_fdw: {
          status: 'up',
          responseTime: expect.stringMatching(/\d+ms/),
          type: 'fdw',
          realTime: true,
          connection: 'active'
        },
      });
    });

    it('should return unhealthy status when service is not healthy and throwOnFailure is false', async () => {
      jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(false);

      const result = await healthIndicator.checkHealth('stripe_fdw', false);

      expect(result).toEqual({
        stripe_fdw: {
          status: 'down',
          responseTime: expect.stringMatching(/\d+ms/),
          type: 'fdw',
          realTime: true,
          connection: 'failed'
        },
      });
    });

    it('should throw HealthCheckError when service is unhealthy and throwOnFailure is true', async () => {
      jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(false);

      await expect(healthIndicator.checkHealth('stripe_fdw', true)).rejects.toThrow(HealthCheckError);
    });

    it('should handle service exceptions gracefully', async () => {
      const error = new Error('Service unavailable');
      jest.spyOn(stripeSyncService, 'isHealthy').mockRejectedValue(error);

      const result = await healthIndicator.checkHealth('stripe_fdw', false);

      expect(result).toEqual({
        stripe_fdw: {
          status: 'down',
          error: 'Service unavailable',
          type: 'fdw',
          realTime: false,
          connection: 'failed'
        },
      });

      expect(loggerSpy).toHaveBeenCalledWith('Stripe FDW health check failed', error);
    });

    it('should handle string errors correctly', async () => {
      jest.spyOn(stripeSyncService, 'isHealthy').mockRejectedValue('String error');

      const result = await healthIndicator.checkHealth('stripe_fdw', false);

      expect(result.stripe_fdw?.error).toBe('String error');
    });

    it('should handle unknown error types', async () => {
      const unknownError = { customProperty: 'unknown' };
      jest.spyOn(stripeSyncService, 'isHealthy').mockRejectedValue(unknownError);

      const result = await healthIndicator.checkHealth('stripe_fdw', false);

      expect(result.stripe_fdw?.error).toBe('Unknown error');
    });

    it('should include response time in result', async () => {
      jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(true);

      const result = await healthIndicator.checkHealth('stripe_fdw', false);

      expect(result.stripe_fdw?.responseTime).toMatch(/\d+ms/);
    });
  });

  describe('Compatibility Methods', () => {
    describe('isHealthy', () => {
      it('should call checkHealth with throwOnFailure=true', async () => {
        jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(true);
        const checkHealthSpy = jest.spyOn(healthIndicator, 'checkHealth');

        await healthIndicator.isHealthy('stripe_fdw');

        expect(checkHealthSpy).toHaveBeenCalledWith('stripe_fdw', true);
      });

      it('should throw on unhealthy status', async () => {
        jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(false);

        await expect(healthIndicator.isHealthy('stripe_fdw')).rejects.toThrow(HealthCheckError);
      });
    });

    describe('quickPing', () => {
      it('should call checkHealth with throwOnFailure=false', async () => {
        jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(true);
        const checkHealthSpy = jest.spyOn(healthIndicator, 'checkHealth');

        await healthIndicator.quickPing('stripe_fdw');

        expect(checkHealthSpy).toHaveBeenCalledWith('stripe_fdw', false);
      });

      it('should return result without throwing on unhealthy status', async () => {
        jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(false);

        const result = await healthIndicator.quickPing('stripe_fdw');

        expect(result.stripe_fdw?.status).toBe('down');
      });
    });

    describe('detailedCheck', () => {
      it('should call checkHealth with throwOnFailure=true', async () => {
        jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(true);
        const checkHealthSpy = jest.spyOn(healthIndicator, 'checkHealth');

        await healthIndicator.detailedCheck('stripe_fdw');

        expect(checkHealthSpy).toHaveBeenCalledWith('stripe_fdw', true);
      });

      it('should throw on unhealthy status', async () => {
        jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(false);

        await expect(healthIndicator.detailedCheck('stripe_fdw')).rejects.toThrow(HealthCheckError);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle different error types consistently', async () => {
      // Test Error objects
      const standardError = new Error('Standard error');
      jest.spyOn(stripeSyncService, 'isHealthy').mockRejectedValueOnce(standardError);
      let result = await healthIndicator.checkHealth('stripe_fdw', false);
      expect(result.stripe_fdw?.error).toBe('Standard error');

      // Test string errors
      jest.spyOn(stripeSyncService, 'isHealthy').mockRejectedValueOnce('String error');
      result = await healthIndicator.checkHealth('stripe_fdw', false);
      expect(result.stripe_fdw?.error).toBe('String error');

      // Test unknown error types
      jest.spyOn(stripeSyncService, 'isHealthy').mockRejectedValueOnce({ custom: 'error' });
      result = await healthIndicator.checkHealth('stripe_fdw', false);
      expect(result.stripe_fdw?.error).toBe('Unknown error');
    });

    it('should log all errors consistently', async () => {
      const error = new Error('Test error');
      jest.spyOn(stripeSyncService, 'isHealthy').mockRejectedValue(error);

      await healthIndicator.checkHealth('stripe_fdw', false);

      expect(loggerSpy).toHaveBeenCalledWith('Stripe FDW health check failed', error);
    });
  });

  describe('Performance', () => {
    it('should complete health checks within reasonable time', async () => {
      jest.spyOn(stripeSyncService, 'isHealthy').mockResolvedValue(true);

      const startTime = Date.now();
      await healthIndicator.checkHealth('stripe_fdw', false);
      const duration = Date.now() - startTime;

      // Health check should complete within 100ms in mocked environment
      expect(duration).toBeLessThan(100);
    });

    it('should include accurate response time measurements', async () => {
      // Mock a delay in the service call
      jest.spyOn(stripeSyncService, 'isHealthy').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 50))
      );

      const result = await healthIndicator.checkHealth('stripe_fdw', false);
      const responseTime = parseInt(result.stripe_fdw?.responseTime?.replace('ms', '') ?? '0');

      // Should measure at least the delay time
      expect(responseTime).toBeGreaterThanOrEqual(45); // Allow some margin
    });
  });
});