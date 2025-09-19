import type { TestingModule } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { StripeSyncService } from './stripe-sync.service';

/**
 * Integration tests for StripeSyncService - ACTUAL SERVICE INTERFACE
 * 
 * Tests only the methods that actually exist in the service:
 * - getHealthStatus()
 * - testConnection() 
 * - isHealthy()
 * - processWebhook() (requires webhook body/signature)
 * - syncSingleEntity() (requires entity ID)
 * - backfillData() (long running operation)
 * 
 * FIXED: Previous test was calling non-existent methods like getProducts(), getPrices() etc.
 */
describe('StripeSyncService Integration Tests', () => {
  let service: StripeSyncService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeSyncService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    })
			.setLogger(new SilentLogger())
			.compile();

    service = module.get<StripeSyncService>(StripeSyncService);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StripeSyncService);
    });
  });

  describe('Health Check Methods', () => {
    it('should return health status with correct structure', () => {
      const healthStatus = service.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('initialized');
      expect(healthStatus).toHaveProperty('migrationsRun');
      expect(typeof healthStatus.initialized).toBe('boolean');
      expect(typeof healthStatus.migrationsRun).toBe('boolean');
    });

    it('should handle testConnection() method', async () => {
      const isConnected = await service.testConnection();
      expect(typeof isConnected).toBe('boolean');
      
      // Connection may be false in test environment without proper setup
      // but method should not throw
    });

    it('should handle isHealthy() method', async () => {
      const isHealthy = await service.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
      
      // Health may be false in test environment without proper setup
      // but method should not throw
    });
  });

  describe('Environment Configuration', () => {
    it('should handle missing environment variables gracefully', () => {
      // Service should be created even without full environment setup
      // It will report as not initialized/healthy but shouldn't crash
      const healthStatus = service.getHealthStatus();
      
      // In test environment without proper setup, should be false
      if (!process.env.DATABASE_URL || !process.env.STRIPE_SECRET_KEY) {
        expect(healthStatus.initialized).toBe(false);
        expect(healthStatus.migrationsRun).toBe(false);
      }
    });
  });

  describe('Core Service Methods (Conditional)', () => {
    // These tests only run if service is properly initialized
    
    it('should handle processWebhook with proper error for uninitialized service', async () => {
      const healthStatus = service.getHealthStatus();
      
      if (!healthStatus.initialized) {
        // Should throw specific error when not initialized
        await expect(service.processWebhook(Buffer.from('test'), 'test_sig'))
          .rejects.toThrow('Stripe Sync Engine not initialized');
      }
      // If initialized, would need actual webhook data to test properly
    });

    it('should handle syncSingleEntity with proper error for uninitialized service', async () => {
      const healthStatus = service.getHealthStatus();
      
      if (!healthStatus.initialized) {
        // Should throw specific error when not initialized
        await expect(service.syncSingleEntity('test_entity_id'))
          .rejects.toThrow('Stripe Sync Engine not initialized');
      }
      // If initialized, would need actual entity ID to test properly
    });

    it('should handle backfillData with proper error for uninitialized service', async () => {
      const healthStatus = service.getHealthStatus();
      
      if (!healthStatus.initialized) {
        // Should throw specific error when not initialized
        await expect(service.backfillData())
          .rejects.toThrow('Stripe Sync Engine not initialized');
      }
      // If initialized, would be a long-running operation requiring careful testing
    });
  });

  describe('Service Interface Validation', () => {
    it('should have only the expected methods and no extra ones', () => {
      const serviceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
        .filter(method => method !== 'constructor' && typeof (service as unknown)[method] === 'function');
      
      const expectedMethods = [
        'onModuleInit',
        'processWebhook',
        'syncSingleEntity', 
        'backfillData',
        'getHealthStatus',
        'testConnection',
        'isHealthy'
      ];
      
      // Should not have methods like getProducts, getPrices, etc.
      expect(serviceMethods).toEqual(expect.arrayContaining(expectedMethods));
      expect(serviceMethods.length).toBeLessThanOrEqual(expectedMethods.length + 2); // Allow for a few extra internal methods
      
      // Verify problematic methods from old test DON'T exist
      expect((service as unknown).getProducts).toBeUndefined();
      expect((service as unknown).getPrices).toBeUndefined();
      expect((service as unknown).getCustomer).toBeUndefined();
      expect((service as unknown).performFullSync).toBeUndefined();
    });
  });
});

/**
 * Simplified smoke test that doesn't expect full integration
 */
describe('Stripe Sync Smoke Tests', () => {
  let service: StripeSyncService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StripeSyncService,
        {
          provide: Logger,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), verbose: jest.fn() }
        }
      ]
    })
			.setLogger(new SilentLogger())
			.compile();

    service = module.get<StripeSyncService>(StripeSyncService);
  });

  it('should get health status without throwing', () => {
    const health = service.getHealthStatus();
    expect(health).toHaveProperty('initialized');
    expect(health).toHaveProperty('migrationsRun');
  }, 15000);

  it('should handle connection test without throwing', async () => {
    const result = await service.testConnection();
    expect(typeof result).toBe('boolean');
  }, 15000);
});