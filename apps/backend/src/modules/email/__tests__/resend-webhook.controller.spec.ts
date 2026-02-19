import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { createHmac } from 'crypto'
import {
	ResendWebhookController,
	ResendWebhookEvent
} from '../resend-webhook.controller'
import { AppLogger } from '../../../logger/app-logger.service'
import { SupabaseService } from '../../../database/supabase.service'

describe('ResendWebhookController', () => {
	let controller: ResendWebhookController
	let mockLogger: Partial<AppLogger>

	const webhookSecret = 'whsec_test_secret_key_base64encoded=='

	const mockSupabaseAdminClient = {
		from: jest.fn().mockReturnValue({
			upsert: jest.fn().mockResolvedValue({ error: null })
		})
	}

	const mockSupabaseService = {
		getAdminClient: jest.fn().mockReturnValue(mockSupabaseAdminClient)
	}

	beforeEach(async () => {
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		// Set webhook secret env var
		process.env.RESEND_WEBHOOK_SECRET = webhookSecret

		const module: TestingModule = await Test.createTestingModule({
			controllers: [ResendWebhookController],
			providers: [
				{ provide: AppLogger, useValue: mockLogger },
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		}).compile()

		controller = module.get<ResendWebhookController>(ResendWebhookController)
	})

	afterEach(() => {
		delete process.env.RESEND_WEBHOOK_SECRET
	})

	const createMockRequest = (body: object) =>
		({
			rawBody: Buffer.from(JSON.stringify(body))
		}) as unknown as Parameters<typeof controller.handleWebhook>[0]

	const createValidSignature = (
		payload: string,
		secret: string,
		timestamp: number
	) => {
		const svixId = 'msg_test_123'
		const signedPayload = `${svixId}.${timestamp}.${payload}`
		const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret
		const secretBytes = Buffer.from(secretKey, 'base64')
		const signature = createHmac('sha256', secretBytes)
			.update(signedPayload)
			.digest('base64')
		return {
			svixId,
			svixTimestamp: String(timestamp),
			svixSignature: `v1,${signature}`
		}
	}

	describe('handleWebhook', () => {
		const baseEvent: ResendWebhookEvent = {
			type: 'email.delivered',
			created_at: '2025-01-21T10:00:00Z',
			data: {
				email_id: 'email-123',
				from: 'sender@example.com',
				to: ['recipient@example.com'],
				subject: 'Test Email',
				created_at: '2025-01-21T09:55:00Z'
			}
		}

		it('should process valid webhook event', async () => {
			// Temporarily disable signature verification
			delete process.env.RESEND_WEBHOOK_SECRET

			const module: TestingModule = await Test.createTestingModule({
				controllers: [ResendWebhookController],
				providers: [
					{ provide: AppLogger, useValue: mockLogger },
					{ provide: SupabaseService, useValue: mockSupabaseService }
				]
			}).compile()

			const controllerWithoutSecret =
				module.get<ResendWebhookController>(ResendWebhookController)

			const result = await controllerWithoutSecret.handleWebhook(
				createMockRequest(baseEvent),
				'svix-id',
				'svix-timestamp',
				'svix-signature',
				baseEvent
			)

			expect(result).toEqual({ received: true })
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Resend webhook received',
				expect.objectContaining({
					eventType: 'email.delivered',
					emailId: 'email-123'
				})
			)
		})

		it('should reject invalid signature', async () => {
			await expect(
				controller.handleWebhook(
					createMockRequest(baseEvent),
					'invalid-id',
					String(Math.floor(Date.now() / 1000)),
					'v1,invalid_signature',
					baseEvent
				)
			).rejects.toThrow(UnauthorizedException)

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Invalid Resend webhook signature',
				expect.any(Object)
			)
		})

		it('should handle email.sent event', async () => {
			delete process.env.RESEND_WEBHOOK_SECRET

			const module: TestingModule = await Test.createTestingModule({
				controllers: [ResendWebhookController],
				providers: [
					{ provide: AppLogger, useValue: mockLogger },
					{ provide: SupabaseService, useValue: mockSupabaseService }
				]
			}).compile()

			const ctrl =
				module.get<ResendWebhookController>(ResendWebhookController)

			const sentEvent: ResendWebhookEvent = {
				...baseEvent,
				type: 'email.sent'
			}

			await ctrl.handleWebhook(
				createMockRequest(sentEvent),
				'id',
				'timestamp',
				'sig',
				sentEvent
			)

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Email sent',
				expect.objectContaining({ emailId: 'email-123' })
			)
		})

		it('should handle email.bounced event', async () => {
			delete process.env.RESEND_WEBHOOK_SECRET

			const module: TestingModule = await Test.createTestingModule({
				controllers: [ResendWebhookController],
				providers: [
					{ provide: AppLogger, useValue: mockLogger },
					{ provide: SupabaseService, useValue: mockSupabaseService }
				]
			}).compile()

			const ctrl =
				module.get<ResendWebhookController>(ResendWebhookController)

			const bouncedEvent: ResendWebhookEvent = {
				...baseEvent,
				type: 'email.bounced',
				data: {
					...baseEvent.data,
					bounce: { message: 'Mailbox not found' }
				}
			}

			await ctrl.handleWebhook(
				createMockRequest(bouncedEvent),
				'id',
				'timestamp',
				'sig',
				bouncedEvent
			)

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Email bounced',
				expect.objectContaining({
					emailId: 'email-123',
					metadata: { bounceMessage: 'Mailbox not found' }
				})
			)
		})

		it('should handle email.opened event with metadata', async () => {
			delete process.env.RESEND_WEBHOOK_SECRET

			const module: TestingModule = await Test.createTestingModule({
				controllers: [ResendWebhookController],
				providers: [
					{ provide: AppLogger, useValue: mockLogger },
					{ provide: SupabaseService, useValue: mockSupabaseService }
				]
			}).compile()

			const ctrl =
				module.get<ResendWebhookController>(ResendWebhookController)

			const openedEvent: ResendWebhookEvent = {
				...baseEvent,
				type: 'email.opened',
				data: {
					...baseEvent.data,
					open: {
						ipAddress: '192.168.1.1',
						timestamp: '2025-01-21T10:05:00Z',
						userAgent: 'Mozilla/5.0'
					}
				}
			}

			await ctrl.handleWebhook(
				createMockRequest(openedEvent),
				'id',
				'timestamp',
				'sig',
				openedEvent
			)

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Email opened',
				expect.objectContaining({
					emailId: 'email-123',
					metadata: {
						ipAddress: '192.168.1.1',
						userAgent: 'Mozilla/5.0'
					}
				})
			)
		})

		it('should handle email.clicked event with link data', async () => {
			delete process.env.RESEND_WEBHOOK_SECRET

			const module: TestingModule = await Test.createTestingModule({
				controllers: [ResendWebhookController],
				providers: [
					{ provide: AppLogger, useValue: mockLogger },
					{ provide: SupabaseService, useValue: mockSupabaseService }
				]
			}).compile()

			const ctrl =
				module.get<ResendWebhookController>(ResendWebhookController)

			const clickedEvent: ResendWebhookEvent = {
				...baseEvent,
				type: 'email.clicked',
				data: {
					...baseEvent.data,
					click: {
						ipAddress: '192.168.1.1',
						link: 'https://example.com/dashboard',
						timestamp: '2025-01-21T10:10:00Z',
						userAgent: 'Mozilla/5.0'
					}
				}
			}

			await ctrl.handleWebhook(
				createMockRequest(clickedEvent),
				'id',
				'timestamp',
				'sig',
				clickedEvent
			)

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Email link clicked',
				expect.objectContaining({
					emailId: 'email-123',
					metadata: {
						link: 'https://example.com/dashboard',
						ipAddress: '192.168.1.1',
						userAgent: 'Mozilla/5.0'
					}
				})
			)
		})

		it('should handle email.complained event', async () => {
			delete process.env.RESEND_WEBHOOK_SECRET

			const module: TestingModule = await Test.createTestingModule({
				controllers: [ResendWebhookController],
				providers: [
					{ provide: AppLogger, useValue: mockLogger },
					{ provide: SupabaseService, useValue: mockSupabaseService }
				]
			}).compile()

			const ctrl =
				module.get<ResendWebhookController>(ResendWebhookController)

			const complainedEvent: ResendWebhookEvent = {
				...baseEvent,
				type: 'email.complained'
			}

			await ctrl.handleWebhook(
				createMockRequest(complainedEvent),
				'id',
				'timestamp',
				'sig',
				complainedEvent
			)

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Email marked as spam',
				expect.objectContaining({ emailId: 'email-123' })
			)
		})

		it('should handle email.delivery_delayed event', async () => {
			delete process.env.RESEND_WEBHOOK_SECRET

			const module: TestingModule = await Test.createTestingModule({
				controllers: [ResendWebhookController],
				providers: [
					{ provide: AppLogger, useValue: mockLogger },
					{ provide: SupabaseService, useValue: mockSupabaseService }
				]
			}).compile()

			const ctrl =
				module.get<ResendWebhookController>(ResendWebhookController)

			const delayedEvent: ResendWebhookEvent = {
				...baseEvent,
				type: 'email.delivery_delayed'
			}

			await ctrl.handleWebhook(
				createMockRequest(delayedEvent),
				'id',
				'timestamp',
				'sig',
				delayedEvent
			)

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Email delivery delayed',
				expect.objectContaining({ emailId: 'email-123' })
			)
		})
	})

	describe('signature verification', () => {
		it('should reject expired timestamps', async () => {
			const oldTimestamp = Math.floor(Date.now() / 1000) - 400 // 6+ minutes ago

			const event: ResendWebhookEvent = {
				type: 'email.delivered',
				created_at: '2025-01-21T10:00:00Z',
				data: {
					email_id: 'email-123',
					from: 'sender@example.com',
					to: ['recipient@example.com'],
					subject: 'Test',
					created_at: '2025-01-21T09:55:00Z'
				}
			}

			await expect(
				controller.handleWebhook(
					createMockRequest(event),
					'msg_123',
					String(oldTimestamp),
					'v1,some_signature',
					event
				)
			).rejects.toThrow(UnauthorizedException)
		})

		it('should warn when no secret is configured', async () => {
			delete process.env.RESEND_WEBHOOK_SECRET

			const module: TestingModule = await Test.createTestingModule({
				controllers: [ResendWebhookController],
				providers: [
					{ provide: AppLogger, useValue: mockLogger },
					{ provide: SupabaseService, useValue: mockSupabaseService }
				]
			}).compile()

			// Just verify it creates without errors
			const ctrl =
				module.get<ResendWebhookController>(ResendWebhookController)
			expect(ctrl).toBeDefined()
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'RESEND_WEBHOOK_SECRET not configured - webhook signature verification will be skipped'
			)
		})
	})
})
