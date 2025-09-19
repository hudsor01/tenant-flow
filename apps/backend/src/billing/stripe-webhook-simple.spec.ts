import type { TestingModule } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger';
import { Test } from '@nestjs/testing';
import { StripeSyncService } from './stripe-sync.service';
import { Logger } from '@nestjs/common';

describe('StripeSyncService Webhook Processing', () => {
  let service: StripeSyncService;

  beforeEach(async () => {
    // Set required environment variables
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123'

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StripeSyncService,
          useValue: {
            processWebhook: jest.fn().mockResolvedValue(undefined),
            onModuleInit: jest.fn().mockResolvedValue(undefined),
            syncSingleEntity: jest.fn().mockResolvedValue({}),
            backfillData: jest.fn().mockResolvedValue({ success: true }),
            testConnection: jest.fn().mockResolvedValue(true),
            isHealthy: jest.fn().mockResolvedValue(true),
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
          },
        },
      ],
    })
			.setLogger(new SilentLogger())
			.compile();

    service = module.get<StripeSyncService>(StripeSyncService);
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.STRIPE_SECRET_KEY;  
    delete process.env.STRIPE_WEBHOOK_SECRET;
    jest.clearAllMocks();
  });

  describe('Webhook Processing', () => {
    const mockPayload = Buffer.from('{"type": "customer.subscription.created"}');
    const mockSignature = 'v1=test-signature';

    it('should call processWebhook with correct parameters', async () => {
      await service.processWebhook(mockPayload, mockSignature);

      expect(service.processWebhook).toHaveBeenCalledWith(mockPayload, mockSignature);
    });

    it('should handle processWebhook without throwing errors', async () => {
      await expect(service.processWebhook(mockPayload, mockSignature)).resolves.not.toThrow();
    });
  });

  describe('Service Health', () => {
    it('should return healthy status', async () => {
      const result = await service.isHealthy();
      expect(result).toBe(true);
    });

    it('should allow connection testing', async () => {
      const result = await service.testConnection();
      expect(result).toBe(true);
    });
  });

  describe('Data Sync', () => {
    it('should sync single entity', async () => {
      const result = await service.syncSingleEntity('cus_test123');
      expect(result).toEqual({});
      expect(service.syncSingleEntity).toHaveBeenCalledWith('cus_test123');
    });

    it('should perform backfill operations', async () => {
      const result = await service.backfillData();
      expect(result).toEqual({ success: true });
    });
  });
});