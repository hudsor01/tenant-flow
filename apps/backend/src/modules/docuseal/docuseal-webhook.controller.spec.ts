/**
 * TDD Tests for DocuSeal Webhook Controller
 *
 * Tests webhook handling for DocuSeal signature events:
 * - form.completed: When a submitter completes their signature
 * - submission.completed: When all parties have signed
 *
 * TDD Approach: Write tests first, watch them fail, then implement.
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Logger, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { DocuSealWebhookController, type DocuSealWebhookPayload } from './docuseal-webhook.controller'
import type { FormCompletedPayload, SubmissionCompletedPayload } from './docuseal-webhook.service'
import { DocuSealWebhookService } from './docuseal-webhook.service'
import { AppConfigService } from '../../config/app-config.service'

describe('DocuSealWebhookController', () => {
	let controller: DocuSealWebhookController
	let mockWebhookService: {
		handleFormCompleted: jest.Mock<Promise<void>, [FormCompletedPayload]>
		handleSubmissionCompleted: jest.Mock<Promise<void>, [SubmissionCompletedPayload]>
	}
	let mockConfigService: jest.Mocked<Partial<AppConfigService>>
	let mockLogger: jest.Mocked<Partial<Logger>>

	beforeEach(async () => {
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		mockWebhookService = {
			handleFormCompleted: jest.fn<Promise<void>, [FormCompletedPayload]>(),
			handleSubmissionCompleted: jest.fn<Promise<void>, [SubmissionCompletedPayload]>()
		}

		mockConfigService = {
			getDocuSealWebhookSecret: jest.fn().mockReturnValue('test-webhook-secret')
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DocuSealWebhookController],
			providers: [
				{ provide: Logger, useValue: mockLogger },
				{ provide: DocuSealWebhookService, useValue: mockWebhookService },
				{ provide: AppConfigService, useValue: mockConfigService }
			]
		}).compile()

		controller = module.get<DocuSealWebhookController>(DocuSealWebhookController)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('handleWebhook', () => {
		const validHeaders = {
			'x-docuseal-secret': 'test-webhook-secret'
		}

		describe('Security', () => {
			it('should reject requests without webhook secret header', async () => {
				const payload = { event_type: 'form.completed', data: {} }

				await expect(
					controller.handleWebhook({}, payload)
				).rejects.toThrow(UnauthorizedException)
			})

			it('should reject requests with invalid webhook secret', async () => {
				const payload = { event_type: 'form.completed', data: {} }

				await expect(
					controller.handleWebhook({ 'x-docuseal-secret': 'wrong-secret' }, payload)
				).rejects.toThrow(UnauthorizedException)
			})

			it('should accept requests with valid webhook secret', async () => {
				const payload = {
					event_type: 'form.completed',
					data: {
						id: 123,
						submission_id: 456,
						email: 'tenant@example.com',
						completed_at: '2025-01-15T10:00:00Z'
					}
				}

				mockWebhookService.handleFormCompleted.mockResolvedValue(undefined)

				const result = await controller.handleWebhook(validHeaders, payload)
				expect(result).toEqual({ received: true })
			})
		})

		describe('form.completed Event', () => {
			it('should process form.completed event and call service', async () => {
				const payload = {
					event_type: 'form.completed',
					timestamp: '2025-01-15T10:00:00Z',
					data: {
						id: 123,
						submission_id: 456,
						email: 'tenant@example.com',
						name: 'John Tenant',
						role: 'Tenant',
						completed_at: '2025-01-15T10:00:00Z',
						metadata: {
							lease_id: 'lease-uuid-123'
						}
					}
				}

				mockWebhookService.handleFormCompleted.mockResolvedValue(undefined)

				const result = await controller.handleWebhook(validHeaders, payload)

				expect(mockWebhookService.handleFormCompleted).toHaveBeenCalledWith(payload.data)
				expect(result).toEqual({ received: true })
			})
		})

		describe('submission.completed Event', () => {
			it('should process submission.completed event and call service', async () => {
				const payload = {
					event_type: 'submission.completed',
					timestamp: '2025-01-15T10:00:00Z',
					data: {
						id: 456,
						status: 'completed',
						completed_at: '2025-01-15T10:00:00Z',
						submitters: [
							{ email: 'owner@example.com', role: 'Property Owner', completed_at: '2025-01-15T09:00:00Z' },
							{ email: 'tenant@example.com', role: 'Tenant', completed_at: '2025-01-15T10:00:00Z' }
						],
						documents: [
							{ name: 'lease-agreement.pdf', url: 'https://docuseal.example.com/download/123' }
						],
						metadata: {
							lease_id: 'lease-uuid-123'
						}
					}
				}

				mockWebhookService.handleSubmissionCompleted.mockResolvedValue(undefined)

				const result = await controller.handleWebhook(validHeaders, payload)

				expect(mockWebhookService.handleSubmissionCompleted).toHaveBeenCalledWith(payload.data)
				expect(result).toEqual({ received: true })
			})
		})

		describe('Unknown Events', () => {
			it('should acknowledge unknown events without processing', async () => {
				const payload = {
					event_type: 'template.created',
					data: { id: 123 }
				}

				const result = await controller.handleWebhook(validHeaders, payload)

				expect(mockWebhookService.handleFormCompleted).not.toHaveBeenCalled()
				expect(mockWebhookService.handleSubmissionCompleted).not.toHaveBeenCalled()
				expect(result).toEqual({ received: true })
			})
		})

		describe('Error Handling', () => {
			it('should reject malformed payload', async () => {
				// Deliberately passing invalid payload to test error handling
				const payload = { invalid: 'payload' } as unknown as DocuSealWebhookPayload

				await expect(
					controller.handleWebhook(validHeaders, payload)
				).rejects.toThrow(BadRequestException)
			})

			it('should rethrow service errors', async () => {
				const payload = {
					event_type: 'form.completed',
					data: {
						id: 123,
						submission_id: 456,
						email: 'tenant@example.com'
					}
				}

				const serviceError = new Error('Database connection failed')
				mockWebhookService.handleFormCompleted.mockRejectedValue(serviceError)

				await expect(
					controller.handleWebhook(validHeaders, payload)
				).rejects.toThrow('Database connection failed')
			})
		})
	})
})
