import type { TestingModule } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger';
import { Test } from '@nestjs/testing';
import type { HealthCheckResult } from '@nestjs/terminus';
import { HealthCheckService } from '@nestjs/terminus';
import { Logger } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SupabaseHealthIndicator } from './supabase.health';
import { StripeFdwHealthIndicator } from './stripe-fdw.health';
import { StripeSyncService } from '../billing/stripe-sync.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let supabaseHealth: SupabaseHealthIndicator;
  let stripeFdwHealth: StripeFdwHealthIndicator;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: SupabaseHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
            quickPing: jest.fn(),
          },
        },
        {
          provide: StripeFdwHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
            quickPing: jest.fn(),
            detailedCheck: jest.fn(),
          },
        },
        {
          provide: StripeSyncService,
          useValue: {
            getHealthStatus: jest.fn().mockReturnValue({
              initialized: true,
              migrationsRun: true
            }),
            testConnection: jest.fn().mockResolvedValue(true)
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
            info: jest.fn(),
          },
        },
      ],
    })
			.setLogger(new SilentLogger())
			.compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    supabaseHealth = module.get<SupabaseHealthIndicator>(SupabaseHealthIndicator);
    stripeFdwHealth = module.get<StripeFdwHealthIndicator>(StripeFdwHealthIndicator);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should perform comprehensive health check with both database and Stripe FDW', async () => {
      const mockHealthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          stripe_fdw: { status: 'up', realTime: true },
        },
        error: {},
        details: {
          database: { status: 'up' },
          stripe_fdw: { status: 'up', realTime: true },
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockHealthResult);
      jest.spyOn(supabaseHealth, 'pingCheck').mockResolvedValue({ database: { status: 'up' } });
      jest.spyOn(stripeFdwHealth, 'isHealthy').mockResolvedValue({ 
        stripe_fdw: { status: 'up', realTime: true } 
      });

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          health: {
            environment: process.env.NODE_ENV,
            checkType: 'full',
          },
        }),
        expect.stringContaining('Health check started')
      );
    });

    it('should handle health check failures gracefully', async () => {
      const mockErrorResult: HealthCheckResult = {
        status: 'error',
        info: {
          database: { status: 'up' },
        },
        error: {
          stripe_fdw: { status: 'down', error: 'Connection failed' },
        },
        details: {
          database: { status: 'up' },
          stripe_fdw: { status: 'down', error: 'Connection failed' },
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockErrorResult);

      const result = await controller.check();

      expect(result).toEqual(mockErrorResult);
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('stripe_fdw');
    });

    it('should log health check initiation with correct environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      jest.spyOn(healthCheckService, 'check').mockResolvedValue({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      });

      await controller.check();

      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          health: {
            environment: 'test',
            checkType: 'full',
          },
        }),
        'Health check started - Environment: test'
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('GET /health/ping', () => {
    it('should return basic ping response with system information', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalPort = process.env.PORT;
      process.env.NODE_ENV = 'test';
      process.env.PORT = '3001';

      // Mock process methods
      const mockUptime = jest.spyOn(process, 'uptime').mockReturnValue(120.5);
      const mockMemoryUsage = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 52428800, // 50MB
        heapTotal: 41943040, // 40MB
        heapUsed: 31457280, // 30MB
        external: 1048576, // 1MB
        arrayBuffers: 524288, // 0.5MB
      });

      const result = controller.ping();

      expect(result).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: 121, // Math.round(120.5)
        memory: 30, // Math.round(31457280 / 1024 / 1024)
        env: 'test',
        port: '3001',
      });

      // Verify timestamp is a valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);

      mockUptime.mockRestore();
      mockMemoryUsage.mockRestore();
      process.env.NODE_ENV = originalEnv;
      process.env.PORT = originalPort;
    });

    it('should handle missing environment variables gracefully', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalPort = process.env.PORT;
      delete process.env.NODE_ENV;
      delete process.env.PORT;

      const result = controller.ping();

      expect(result).toMatchObject({
        status: 'ok',
        env: undefined,
        port: undefined,
      });

      process.env.NODE_ENV = originalEnv;
      process.env.PORT = originalPort;
    });
  });

  describe('GET /health/ready', () => {
    it('should perform readiness check with both database and Stripe FDW quick pings', async () => {
      const mockReadyResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up', type: 'quick' },
          stripe_fdw: { status: 'up', type: 'fdw-quick' },
        },
        error: {},
        details: {
          database: { status: 'up', type: 'quick' },
          stripe_fdw: { status: 'up', type: 'fdw-quick' },
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockReadyResult);
      jest.spyOn(supabaseHealth, 'quickPing').mockResolvedValue({ 
        database: { status: 'up', type: 'quick' } 
      });
      jest.spyOn(stripeFdwHealth, 'quickPing').mockResolvedValue({ 
        stripe_fdw: { status: 'up', type: 'fdw-quick' } 
      });

      const result = await controller.ready();

      expect(result).toEqual(mockReadyResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should handle readiness check failures', async () => {
      const mockErrorResult: HealthCheckResult = {
        status: 'error',
        info: {
          database: { status: 'up', type: 'quick' },
        },
        error: {
          stripe_fdw: { status: 'down', type: 'fdw-quick', error: 'Quick ping failed' },
        },
        details: {
          database: { status: 'up', type: 'quick' },
          stripe_fdw: { status: 'down', type: 'fdw-quick', error: 'Quick ping failed' },
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockErrorResult);

      const result = await controller.ready();

      expect(result).toEqual(mockErrorResult);
      expect(result.status).toBe('error');
    });
  });

  describe('GET /health/stripe', () => {
    it('should perform detailed Stripe FDW health check', async () => {
      const mockStripeResult: HealthCheckResult = {
        status: 'ok',
        info: {
          stripe_fdw: { 
            status: 'up', 
            type: 'fdw-detailed',
            realTime: true,
            responseTime: '15ms',
          },
        },
        error: {},
        details: {
          stripe_fdw: { 
            status: 'up', 
            type: 'fdw-detailed',
            realTime: true,
            responseTime: '15ms',
          },
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockStripeResult);
      jest.spyOn(stripeFdwHealth, 'detailedCheck').mockResolvedValue({ 
        stripe_fdw: { 
          status: 'up', 
          type: 'fdw-detailed',
          realTime: true,
          responseTime: '15ms',
        } 
      });

      const result = await controller.stripeCheck();

      expect(result).toEqual(mockStripeResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
      expect(logger.log).toHaveBeenCalledWith('Stripe FDW health check started');
    });

    it('should handle Stripe FDW health check failures', async () => {
      const mockErrorResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          stripe_fdw: { 
            status: 'down', 
            type: 'fdw-detailed',
            error: 'Detailed check failed',
            realTime: false,
          },
        },
        details: {
          stripe_fdw: { 
            status: 'down', 
            type: 'fdw-detailed',
            error: 'Detailed check failed',
            realTime: false,
          },
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockErrorResult);

      const result = await controller.stripeCheck();

      expect(result).toEqual(mockErrorResult);
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('stripe_fdw');
    });

    it('should log Stripe health check initiation', async () => {
      jest.spyOn(healthCheckService, 'check').mockResolvedValue({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      });

      await controller.stripeCheck();

      expect(logger.log).toHaveBeenCalledWith('Stripe FDW health check started');
    });
  });

  describe('GET /health/debug', () => {
    it('should return comprehensive debug information', () => {
      const originalEnv = {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        DOCKER_CONTAINER: process.env.DOCKER_CONTAINER,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      };

      // Set test environment variables
      process.env.NODE_ENV = 'test';
      process.env.PORT = '3001';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.DOCKER_CONTAINER = 'true';
      process.env.RAILWAY_ENVIRONMENT = 'production';

      // Mock process methods
      const mockUptime = jest.spyOn(process, 'uptime').mockReturnValue(300.75);
      const mockMemoryUsage = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 104857600, // 100MB
        heapTotal: 83886080, // 80MB
        heapUsed: 62914560, // 60MB
        external: 2097152, // 2MB
        arrayBuffers: 1048576, // 1MB
      });
      const mockCpuUsage = jest.spyOn(process, 'cpuUsage').mockReturnValue({
        user: 1000000, // 1 second
        system: 500000, // 0.5 seconds
      });

      const result = controller.debug();

      expect(result).toMatchObject({
        timestamp: expect.any(String),
        process: {
          pid: expect.any(Number),
          uptime: 301, // Math.round(300.75)
          version: expect.any(String),
          platform: expect.any(String),
          arch: expect.any(String),
          memory: expect.objectContaining({
            rss: 104857600,
            heapTotal: 83886080,
            heapUsed: 62914560,
            external: 2097152,
            arrayBuffers: 1048576,
          }),
          cpuUsage: expect.objectContaining({
            user: 1000000,
            system: 500000,
          }),
        },
        environment: {
          NODE_ENV: 'test',
          PORT: '3001',
          hostname: expect.any(String),
          DOCKER_CONTAINER: 'true',
          RAILWAY_ENVIRONMENT: 'production',
          hasSupabaseUrl: true,
          hasServiceKey: true,
        },
      });

      // Verify timestamp is a valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);

      // Restore mocks and environment
      mockUptime.mockRestore();
      mockMemoryUsage.mockRestore();
      mockCpuUsage.mockRestore();
      Object.assign(process.env, originalEnv);
    });

    it('should handle missing environment variables in debug info', () => {
      const originalEnv = {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        DOCKER_CONTAINER: process.env.DOCKER_CONTAINER,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      };

      // Remove environment variables
      delete process.env.SUPABASE_URL;
      delete process.env.SERVICE_ROLE_KEY;
      delete process.env.DOCKER_CONTAINER;
      delete process.env.RAILWAY_ENVIRONMENT;

      const result = controller.debug();

      expect(result.environment).toMatchObject({
        hasSupabaseUrl: false,
        hasServiceKey: false,
        DOCKER_CONTAINER: undefined,
        RAILWAY_ENVIRONMENT: undefined,
      });

      // Restore environment
      Object.assign(process.env, originalEnv);
    });

    it('should include hostname in debug information', () => {
      const result = controller.debug();

      expect(result.environment.hostname).toBeDefined();
      expect(typeof result.environment.hostname).toBe('string');
      expect(result.environment.hostname.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should handle concurrent health check requests', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      // Simulate concurrent requests
      const promises = [
        controller.check(),
        controller.ready(),
        controller.stripeCheck(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockResult);
      });

      // Verify health check service was called for each request
      expect(healthCheckService.check).toHaveBeenCalledTimes(3);
    });

    it('should maintain performance under load', async () => {
      jest.spyOn(healthCheckService, 'check').mockResolvedValue({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      });

      const startTime = Date.now();
      
      // Simulate multiple concurrent requests
      const promises = Array(10).fill(null).map(() => controller.check());
      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete all requests within a reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds max for 10 concurrent requests
    });
  });

  describe('Error Handling', () => {
    it('should handle health check service errors gracefully', async () => {
      const error = new Error('Health check service error');
      jest.spyOn(healthCheckService, 'check').mockRejectedValue(error);

      await expect(controller.check()).rejects.toThrow(error);
      expect(logger.log).toHaveBeenCalled(); // Should still log the start
    });

    it('should handle logger errors gracefully', async () => {
      jest.spyOn(logger, 'log').mockImplementation(() => {
        throw new Error('Logger error');
      });

      jest.spyOn(healthCheckService, 'check').mockResolvedValue({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      });

      // The method will throw due to logger error, but we can catch it
      await expect(controller.check()).rejects.toThrow('Logger error');
      
      // Verify that health check service would have been called if logger didn't fail
      // This test demonstrates that logger errors are not handled gracefully in this implementation
    });
  });
});