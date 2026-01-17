import { Test } from '@nestjs/testing'
import { StripeSyncService } from './stripe-sync.service'
import { AppConfigService } from '../../config/app-config.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

// Mock the @supabase/stripe-sync-engine module
jest.mock('@supabase/stripe-sync-engine', () => ({
	StripeSync: jest.fn().mockImplementation(() => ({
		processWebhook: jest.fn(),
		syncSingleEntity: jest.fn(),
		syncBackfill: jest.fn(),
		close: jest.fn()
	}))
}))

import { StripeSync } from '@supabase/stripe-sync-engine'

describe('StripeSyncService', () => {
	let service: StripeSyncService
	let mockConfigService: jest.Mocked<AppConfigService>
	let mockStripeSyncInstance: jest.Mocked<{
		processWebhook: jest.Mock
		syncSingleEntity: jest.Mock
		syncBackfill: jest.Mock
		close: jest.Mock
	}>

	const validConfig = {
		directUrl: 'postgresql://localhost:5432/test',
		databaseUrl: 'postgresql://localhost:5432/test',
		stripeSecretKey: 'sk_test_123',
		stripeWebhookSecret: 'whsec_123'
	}

	beforeEach(async () => {
		// Reset the mock for each test
		jest.clearAllMocks()

		mockStripeSyncInstance = {
			processWebhook: jest.fn(),
			syncSingleEntity: jest.fn(),
			syncBackfill: jest.fn(),
			close: jest.fn()
		}
		;(StripeSync as jest.Mock).mockImplementation(() => mockStripeSyncInstance)

		mockConfigService = {
			getDirectUrl: jest.fn().mockReturnValue(validConfig.directUrl),
			getDatabaseUrl: jest.fn().mockReturnValue(validConfig.databaseUrl),
			getStripeSecretKey: jest.fn().mockReturnValue(validConfig.stripeSecretKey),
			getStripeWebhookSecret: jest
				.fn()
				.mockReturnValue(validConfig.stripeWebhookSecret)
		} as unknown as jest.Mocked<AppConfigService>

		const module = await Test.createTestingModule({
			providers: [
				StripeSyncService,
				{ provide: AppConfigService, useValue: mockConfigService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<StripeSyncService>(StripeSyncService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('initialization', () => {
		it('initializes lazily on first use', async () => {
			// StripeSync should not be instantiated on service creation
			expect(StripeSync).not.toHaveBeenCalled()

			// Trigger initialization via any method that requires it
			await service.processWebhook(Buffer.from('{}'), 'sig_123')

			// Now StripeSync should be instantiated
			expect(StripeSync).toHaveBeenCalledTimes(1)
		})

		it('initializes with correct configuration', async () => {
			await service.processWebhook(Buffer.from('{}'), 'sig_123')

			expect(StripeSync).toHaveBeenCalledWith(
				expect.objectContaining({
					poolConfig: expect.objectContaining({
						connectionString: validConfig.directUrl,
						max: 10
					}),
					stripeSecretKey: validConfig.stripeSecretKey,
					stripeWebhookSecret: validConfig.stripeWebhookSecret,
					schema: 'stripe',
					autoExpandLists: true,
					backfillRelatedEntities: false
				})
			)
		})

		it('uses DATABASE_URL when DIRECT_URL is not available', async () => {
			mockConfigService.getDirectUrl.mockReturnValue('')

			await service.processWebhook(Buffer.from('{}'), 'sig_123')

			expect(StripeSync).toHaveBeenCalledWith(
				expect.objectContaining({
					poolConfig: expect.objectContaining({
						connectionString: validConfig.databaseUrl
					})
				})
			)
		})

		it('throws error when database URL is missing', async () => {
			mockConfigService.getDirectUrl.mockReturnValue('')
			mockConfigService.getDatabaseUrl.mockReturnValue('')

			await expect(
				service.processWebhook(Buffer.from('{}'), 'sig_123')
			).rejects.toThrow('Missing required configuration')
		})

		it('throws error when Stripe secret key is missing', async () => {
			mockConfigService.getStripeSecretKey.mockReturnValue('')

			await expect(
				service.processWebhook(Buffer.from('{}'), 'sig_123')
			).rejects.toThrow('Missing required configuration')
		})

		it('throws error when webhook secret is missing', async () => {
			mockConfigService.getStripeWebhookSecret.mockReturnValue('')

			await expect(
				service.processWebhook(Buffer.from('{}'), 'sig_123')
			).rejects.toThrow('Missing required configuration')
		})

		it('reuses existing instance on subsequent calls', async () => {
			await service.processWebhook(Buffer.from('{}'), 'sig_1')
			await service.processWebhook(Buffer.from('{}'), 'sig_2')
			await service.processWebhook(Buffer.from('{}'), 'sig_3')

			// Should only instantiate once
			expect(StripeSync).toHaveBeenCalledTimes(1)
		})
	})

	describe('processWebhook', () => {
		it('delegates to StripeSync.processWebhook', async () => {
			const payload = Buffer.from('{"type":"customer.created"}')
			const signature = 'sig_test_123'

			await service.processWebhook(payload, signature)

			expect(mockStripeSyncInstance.processWebhook).toHaveBeenCalledWith(
				payload,
				signature
			)
		})

		it('propagates errors from StripeSync', async () => {
			mockStripeSyncInstance.processWebhook.mockRejectedValue(
				new Error('Invalid signature')
			)

			await expect(
				service.processWebhook(Buffer.from('{}'), 'bad_sig')
			).rejects.toThrow('Invalid signature')
		})
	})

	describe('syncSingleEntity', () => {
		it('delegates to StripeSync.syncSingleEntity', async () => {
			mockStripeSyncInstance.syncSingleEntity.mockResolvedValue({ id: 'cus_123' })

			const result = await service.syncSingleEntity('cus_123')

			expect(mockStripeSyncInstance.syncSingleEntity).toHaveBeenCalledWith(
				'cus_123'
			)
			expect(result).toEqual({ id: 'cus_123' })
		})

		it('propagates errors from StripeSync', async () => {
			mockStripeSyncInstance.syncSingleEntity.mockRejectedValue(
				new Error('Entity not found')
			)

			await expect(service.syncSingleEntity('invalid_id')).rejects.toThrow(
				'Entity not found'
			)
		})
	})

	describe('syncBackfill', () => {
		it('delegates to StripeSync.syncBackfill without options', async () => {
			mockStripeSyncInstance.syncBackfill.mockResolvedValue(undefined)

			await service.syncBackfill()

			expect(mockStripeSyncInstance.syncBackfill).toHaveBeenCalledWith(undefined)
		})

		it('delegates to StripeSync.syncBackfill with object type', async () => {
			mockStripeSyncInstance.syncBackfill.mockResolvedValue(undefined)

			await service.syncBackfill({ object: 'customer' })

			expect(mockStripeSyncInstance.syncBackfill).toHaveBeenCalledWith({
				object: 'customer'
			})
		})

		it('delegates to StripeSync.syncBackfill with created date filter', async () => {
			mockStripeSyncInstance.syncBackfill.mockResolvedValue(undefined)

			const options = {
				object: 'subscription' as const,
				created: { gte: 1704067200 }
			}
			await service.syncBackfill(options)

			expect(mockStripeSyncInstance.syncBackfill).toHaveBeenCalledWith(options)
		})

		it('propagates errors from StripeSync', async () => {
			mockStripeSyncInstance.syncBackfill.mockRejectedValue(
				new Error('Backfill failed')
			)

			await expect(service.syncBackfill()).rejects.toThrow('Backfill failed')
		})
	})

	describe('getHealthStatus', () => {
		it('returns healthy when config is valid and not initialized', () => {
			const status = service.getHealthStatus()

			expect(status).toEqual({
				status: 'healthy',
				initialized: false,
				timestamp: expect.any(String)
			})
		})

		it('returns healthy when initialized', async () => {
			// Trigger initialization
			await service.processWebhook(Buffer.from('{}'), 'sig_123')

			const status = service.getHealthStatus()

			expect(status).toEqual({
				status: 'healthy',
				initialized: true,
				timestamp: expect.any(String)
			})
		})

		it('returns unhealthy when database URL is missing', () => {
			mockConfigService.getDirectUrl.mockReturnValue('')
			mockConfigService.getDatabaseUrl.mockReturnValue('')

			const status = service.getHealthStatus()

			expect(status).toEqual({
				status: 'unhealthy',
				initialized: false,
				timestamp: expect.any(String),
				error: 'Missing required environment variables'
			})
		})

		it('returns unhealthy when Stripe secret key is missing', () => {
			mockConfigService.getStripeSecretKey.mockReturnValue('')

			const status = service.getHealthStatus()

			expect(status).toEqual({
				status: 'unhealthy',
				initialized: false,
				timestamp: expect.any(String),
				error: 'Missing required environment variables'
			})
		})

		it('returns unhealthy when webhook secret is missing', () => {
			mockConfigService.getStripeWebhookSecret.mockReturnValue('')

			const status = service.getHealthStatus()

			expect(status).toEqual({
				status: 'unhealthy',
				initialized: false,
				timestamp: expect.any(String),
				error: 'Missing required environment variables'
			})
		})

		it('returns timestamp in ISO format', () => {
			const status = service.getHealthStatus()

			expect(status.timestamp).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
			)
		})
	})

	describe('onModuleDestroy', () => {
		it('closes connection pool when initialized', async () => {
			// Initialize the service
			await service.processWebhook(Buffer.from('{}'), 'sig_123')

			// Trigger module destroy
			service.onModuleDestroy()

			expect(mockStripeSyncInstance.close).toHaveBeenCalled()
		})

		it('does nothing when not initialized', () => {
			// Don't initialize, just call destroy
			service.onModuleDestroy()

			expect(mockStripeSyncInstance.close).not.toHaveBeenCalled()
		})

		it('handles close errors gracefully', async () => {
			// Initialize the service
			await service.processWebhook(Buffer.from('{}'), 'sig_123')

			// Make close throw an error
			mockStripeSyncInstance.close.mockImplementation(() => {
				throw new Error('Close failed')
			})

			// Should not throw
			expect(() => service.onModuleDestroy()).not.toThrow()
		})
	})
})
