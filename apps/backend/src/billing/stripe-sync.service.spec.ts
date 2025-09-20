import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger'

// Mock the entire module
jest.mock('@supabase/stripe-sync-engine')

import { StripeSync, runMigrations } from '@supabase/stripe-sync-engine'
import { StripeSyncService } from './stripe-sync.service'

// Cast the mocked functions
const mockStripeSync = StripeSync as jest.MockedClass<typeof StripeSync>
const mockRunMigrations = runMigrations as jest.MockedFunction<
	typeof runMigrations
>

describe('StripeSyncService', () => {
	let service: StripeSyncService
	let logger: Logger

	const mockStripeSyncInstance = {
		processWebhook: jest.fn(),
		syncSingleEntity: jest.fn(),
		syncBackfill: jest.fn()
	} as const

	beforeEach(async () => {
		jest.clearAllMocks()

		// Mock environment variables
		process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
		process.env.STRIPE_SECRET_KEY = 'sk_test_123'
		process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123'
		process.env.STRIPE_SYNC_DATABASE_SCHEMA = 'stripe'
		process.env.STRIPE_SYNC_AUTO_EXPAND_LISTS = 'true'

		// Setup the mock constructor to return our mock instance
		mockStripeSync.mockImplementation(() => mockStripeSyncInstance)

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StripeSyncService,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string) => {
							switch (key) {
								case 'DATABASE_URL':
									return 'postgresql://test:test@localhost:5432/test'
								case 'STRIPE_SECRET_KEY':
									return 'sk_test_123'
								case 'STRIPE_WEBHOOK_SECRET':
									return 'whsec_123'
								case 'STRIPE_SYNC_DATABASE_SCHEMA':
									return 'stripe'
								case 'STRIPE_SYNC_AUTO_EXPAND_LISTS':
									return true
								default:
									return undefined
							}
						})
					}
				},
				{
					provide: Logger,
					useValue: {
						log: jest.fn(),
						info: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
						debug: jest.fn(),
						verbose: jest.fn()
					}
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<StripeSyncService>(StripeSyncService)
		logger = module.get<Logger>(Logger)
	})

	afterEach(() => {
		// Clean up environment variables
		delete process.env.DATABASE_URL
		delete process.env.STRIPE_SECRET_KEY
		delete process.env.STRIPE_WEBHOOK_SECRET
		delete process.env.STRIPE_SYNC_DATABASE_SCHEMA
		delete process.env.STRIPE_SYNC_AUTO_EXPAND_LISTS
	})

	describe('Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined()
		})

		it('should set logger context', () => {
			// Logger context setting is handled by NestJS Logger
			expect(service).toBeDefined()
		})

		it('should create StripeSync instance after onModuleInit', async () => {
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			expect(mockStripeSync).toHaveBeenCalledWith({
				databaseUrl: 'postgresql://test:test@localhost:5432/test',
				stripeSecretKey: 'sk_test_123',
				stripeWebhookSecret: 'whsec_123',
				schema: 'stripe',
				autoExpandLists: true,
				poolConfig: {
					max: 10,
					min: 2,
					idleTimeoutMillis: 30000
				}
			})
		})

		it('should log initialization after onModuleInit', async () => {
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			expect(logger.log).toHaveBeenCalledWith(
				'Stripe Sync Engine initialized',
				{
					schema: 'stripe',
					autoExpandLists: true,
					hasWebhookSecret: true
				}
			)
		})
	})

	describe('onModuleInit', () => {
		it('should run migrations successfully', async () => {
			mockRunMigrations.mockResolvedValue(undefined)

			await service.onModuleInit()

			expect(mockRunMigrations).toHaveBeenCalledWith({
				databaseUrl: 'postgresql://test:test@localhost:5432/test',
				schema: 'stripe'
			})
			expect(logger.log).toHaveBeenCalledWith(
				'Running Stripe Sync Engine migrations...'
			)
			expect(logger.log).toHaveBeenCalledWith(
				'Stripe Sync Engine migrations completed successfully'
			)
		})

		it('should handle migration errors', async () => {
			const error = new Error('Migration failed')
			mockRunMigrations.mockRejectedValue(error)

			await expect(service.onModuleInit()).rejects.toThrow('Migration failed')
			expect(logger.error).toHaveBeenCalledWith(
				'Stripe Sync Engine initialization failed:',
				error
			)
		})
	})

	describe('processWebhook', () => {
		it('should process webhook successfully', async () => {
			// Initialize service first
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			const rawBody = Buffer.from('test-payload')
			const signature = 'test-signature'

			mockStripeSyncInstance.processWebhook.mockResolvedValue(undefined)

			await service.processWebhook(rawBody, signature)

			expect(mockStripeSyncInstance.processWebhook).toHaveBeenCalledWith(
				rawBody,
				signature
			)
		})

		it('should handle webhook processing errors', async () => {
			// Initialize service first
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			const error = new Error('Webhook processing failed')
			mockStripeSyncInstance.processWebhook.mockRejectedValue(error)

			await expect(
				service.processWebhook(Buffer.from('test'), 'sig')
			).rejects.toThrow('Webhook processing failed')
		})
	})

	describe('syncSingleEntity', () => {
		it('should sync single entity successfully', async () => {
			// Initialize service first
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			const entityId = 'cus_test123'
			const mockResult = [{ id: entityId }]
			mockStripeSyncInstance.syncSingleEntity.mockResolvedValue(mockResult)

			const result = await service.syncSingleEntity(entityId)

			expect(mockStripeSyncInstance.syncSingleEntity).toHaveBeenCalledWith(
				entityId
			)
			expect(logger.log).toHaveBeenCalledWith('Syncing single Stripe entity:', {
				entityId
			})
			expect(result).toEqual(mockResult)
		})
	})

	describe('backfillData', () => {
		it('should backfill data successfully', async () => {
			// Initialize service first
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			const mockResult = { success: true }
			mockStripeSyncInstance.syncBackfill.mockResolvedValue(mockResult)

			const result = await service.backfillData()

			expect(mockStripeSyncInstance.syncBackfill).toHaveBeenCalledTimes(1)
			expect(logger.log).toHaveBeenCalledWith(
				'Starting Stripe data backfill...'
			)
			expect(logger.log).toHaveBeenCalledWith(
				'Stripe data backfill completed successfully',
				expect.objectContaining({
					duration: expect.stringMatching(/\d+\.\d+s/)
				})
			)
			expect(result).toEqual(mockResult)
		})

		it('should handle backfill errors', async () => {
			// Initialize service first
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			const error = new Error('Backfill failed')
			mockStripeSyncInstance.syncBackfill.mockRejectedValue(error)

			await expect(service.backfillData()).rejects.toThrow('Backfill failed')
			expect(logger.error).toHaveBeenCalledWith(
				'Stripe data backfill failed:',
				error
			)
		})
	})

	describe('getHealthStatus', () => {
		it('should return health status', () => {
			const health = service.getHealthStatus()
			expect(health).toEqual({
				initialized: false, // false because onModuleInit hasn't been called yet
				migrationsRun: false // false because migrations haven't run yet
			})
		})

		it('should return correct status after migrations', async () => {
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			const health = service.getHealthStatus()
			expect(health).toEqual({
				initialized: true,
				migrationsRun: true
			})
		})
	})

	describe('testConnection', () => {
		it('should return true when healthy', async () => {
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			const result = await service.testConnection()
			expect(result).toBe(true)
		})

		it('should return false when not initialized', async () => {
			const result = await service.testConnection()
			expect(result).toBe(false)
		})
	})

	describe('isHealthy', () => {
		it('should return health check result', async () => {
			mockRunMigrations.mockResolvedValue(undefined)
			await service.onModuleInit()

			const result = await service.isHealthy()
			expect(result).toBe(true)
		})
	})

	describe('Error Handling', () => {
		it('should throw error when required config is missing', async () => {
			// Clear the environment variables to test error case
			delete process.env.DATABASE_URL
			delete process.env.STRIPE_SECRET_KEY

			const errorService = new StripeSyncService(logger)

			await expect(errorService.onModuleInit()).rejects.toThrow(
				'Missing required configuration for Stripe Sync Engine: DATABASE_URL and STRIPE_SECRET_KEY are required'
			)
		})
	})
})
