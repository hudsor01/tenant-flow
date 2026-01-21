import { Test, TestingModule } from '@nestjs/testing'
import { EmailSenderService } from '../email-sender.service'
import { AppConfigService } from '../../../config/app-config.service'
import { AppLogger } from '../../../logger/app-logger.service'

// Mock Resend SDK
const mockResendEmails = {
	send: jest.fn(),
	get: jest.fn(),
	update: jest.fn(),
	cancel: jest.fn()
}

const mockResendBatch = {
	send: jest.fn()
}

jest.mock('resend', () => ({
	Resend: jest.fn().mockImplementation(() => ({
		emails: mockResendEmails,
		batch: mockResendBatch
	}))
}))

describe('EmailSenderService', () => {
	let service: EmailSenderService
	let mockConfigService: Partial<AppConfigService>
	let mockLogger: Partial<AppLogger>

	beforeEach(async () => {
		// Reset mocks
		jest.clearAllMocks()

		mockConfigService = {
			getResendApiKey: jest.fn().mockReturnValue('re_test_123456789')
		}

		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EmailSenderService,
				{ provide: AppConfigService, useValue: mockConfigService },
				{ provide: AppLogger, useValue: mockLogger }
			]
		}).compile()

		service = module.get<EmailSenderService>(EmailSenderService)
	})

	describe('isConfigured', () => {
		it('should return true when API key is configured', () => {
			expect(service.isConfigured()).toBe(true)
		})
	})

	describe('sendEmail', () => {
		const baseEmailParams = {
			from: 'test@example.com',
			to: ['recipient@example.com'],
			subject: 'Test Subject',
			html: '<p>Test content</p>'
		}

		it('should send a basic email successfully', async () => {
			mockResendEmails.send.mockResolvedValue({
				data: { id: 'email-123' },
				error: null
			})

			const result = await service.sendEmail(baseEmailParams)

			expect(result).toEqual({ id: 'email-123' })
			expect(mockResendEmails.send).toHaveBeenCalledWith({
				from: baseEmailParams.from,
				to: baseEmailParams.to,
				subject: baseEmailParams.subject,
				html: baseEmailParams.html,
				reply_to: undefined,
				cc: undefined,
				bcc: undefined,
				scheduled_at: undefined,
				attachments: undefined,
				tags: undefined,
				headers: undefined
			})
		})

		it('should send email with all options', async () => {
			mockResendEmails.send.mockResolvedValue({
				data: { id: 'email-456' },
				error: null
			})

			const fullParams = {
				...baseEmailParams,
				replyTo: 'reply@example.com',
				cc: ['cc@example.com'],
				bcc: ['bcc@example.com'],
				scheduledAt: '2025-01-25T10:00:00Z',
				attachments: [
					{
						filename: 'report.pdf',
						path: 'https://example.com/report.pdf'
					}
				],
				tags: [{ name: 'category', value: 'newsletter' }],
				headers: { 'X-Custom': 'value' }
			}

			const result = await service.sendEmail(fullParams)

			expect(result).toEqual({ id: 'email-456' })
			expect(mockResendEmails.send).toHaveBeenCalledWith({
				from: fullParams.from,
				to: fullParams.to,
				subject: fullParams.subject,
				html: fullParams.html,
				reply_to: fullParams.replyTo,
				cc: fullParams.cc,
				bcc: fullParams.bcc,
				scheduled_at: fullParams.scheduledAt,
				attachments: [
					{
						filename: 'report.pdf',
						path: 'https://example.com/report.pdf',
						content: undefined,
						content_type: undefined
					}
				],
				tags: fullParams.tags,
				headers: fullParams.headers
			})
		})

		it('should throw error when Resend API returns error', async () => {
			mockResendEmails.send.mockResolvedValue({
				data: null,
				error: { message: 'Invalid API key' }
			})

			await expect(service.sendEmail(baseEmailParams)).rejects.toThrow(
				'Resend API error: Invalid API key'
			)
		})

		it('should log scheduled email differently', async () => {
			mockResendEmails.send.mockResolvedValue({
				data: { id: 'scheduled-123' },
				error: null
			})

			await service.sendEmail({
				...baseEmailParams,
				scheduledAt: '2025-01-30T10:00:00Z'
			})

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Email scheduled successfully',
				expect.objectContaining({
					scheduledAt: '2025-01-30T10:00:00Z'
				})
			)
		})
	})

	describe('sendBatch', () => {
		const batchEmails = [
			{
				from: 'test@example.com',
				to: ['user1@example.com'],
				subject: 'Email 1',
				html: '<p>Content 1</p>'
			},
			{
				from: 'test@example.com',
				to: ['user2@example.com'],
				subject: 'Email 2',
				html: '<p>Content 2</p>'
			}
		]

		it('should send batch emails successfully', async () => {
			mockResendBatch.send.mockResolvedValue({
				data: {
					data: [{ id: 'batch-1' }, { id: 'batch-2' }]
				},
				error: null
			})

			const result = await service.sendBatch(batchEmails)

			expect(result).toEqual({
				data: [{ id: 'batch-1' }, { id: 'batch-2' }]
			})
			expect(mockResendBatch.send).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ subject: 'Email 1' }),
					expect.objectContaining({ subject: 'Email 2' })
				]),
				{ batchValidation: 'lenient' }
			)
		})

		it('should use strict validation when specified', async () => {
			mockResendBatch.send.mockResolvedValue({
				data: { data: [] },
				error: null
			})

			await service.sendBatch(batchEmails, { batchValidation: 'strict' })

			expect(mockResendBatch.send).toHaveBeenCalledWith(
				expect.any(Array),
				{ batchValidation: 'strict' }
			)
		})

		it('should return empty data for empty batch', async () => {
			const result = await service.sendBatch([])

			expect(result).toEqual({ data: [] })
			expect(mockResendBatch.send).not.toHaveBeenCalled()
		})

		it('should throw error when batch exceeds 100 emails', async () => {
			const largeBatch = Array(101)
				.fill(null)
				.map((_, i) => ({
					from: 'test@example.com',
					to: [`user${i}@example.com`],
					subject: `Email ${i}`,
					html: '<p>Content</p>'
				}))

			await expect(service.sendBatch(largeBatch)).rejects.toThrow(
				'Batch size exceeds maximum of 100 emails'
			)
		})

		it('should throw error when Resend batch API returns error', async () => {
			mockResendBatch.send.mockResolvedValue({
				data: null,
				error: { message: 'Rate limit exceeded' }
			})

			await expect(service.sendBatch(batchEmails)).rejects.toThrow(
				'Resend batch API error: Rate limit exceeded'
			)
		})
	})

	describe('getEmailStatus', () => {
		it('should get email status successfully', async () => {
			const mockStatus = {
				id: 'email-123',
				object: 'email',
				to: ['recipient@example.com'],
				from: 'test@example.com',
				subject: 'Test',
				html: '<p>Test</p>',
				text: null,
				created_at: '2025-01-21T10:00:00Z',
				last_event: 'delivered'
			}

			mockResendEmails.get.mockResolvedValue({
				data: mockStatus,
				error: null
			})

			const result = await service.getEmailStatus('email-123')

			expect(result).toEqual(mockStatus)
			expect(mockResendEmails.get).toHaveBeenCalledWith('email-123')
		})

		it('should throw error when get status fails', async () => {
			mockResendEmails.get.mockResolvedValue({
				data: null,
				error: { message: 'Email not found' }
			})

			await expect(service.getEmailStatus('invalid-id')).rejects.toThrow(
				'Resend API error: Email not found'
			)
		})
	})

	describe('updateScheduledEmail', () => {
		it('should update scheduled email time successfully', async () => {
			mockResendEmails.update.mockResolvedValue({
				data: { id: 'email-123' },
				error: null
			})

			const result = await service.updateScheduledEmail(
				'email-123',
				'2025-02-01T10:00:00Z'
			)

			expect(result).toEqual({ id: 'email-123' })
			expect(mockResendEmails.update).toHaveBeenCalledWith({
				id: 'email-123',
				scheduledAt: '2025-02-01T10:00:00Z'
			})
		})

		it('should throw error when update fails', async () => {
			mockResendEmails.update.mockResolvedValue({
				data: null,
				error: { message: 'Cannot update sent email' }
			})

			await expect(
				service.updateScheduledEmail('email-123', '2025-02-01T10:00:00Z')
			).rejects.toThrow('Resend API error: Cannot update sent email')
		})
	})

	describe('cancelScheduledEmail', () => {
		it('should cancel scheduled email successfully', async () => {
			mockResendEmails.cancel.mockResolvedValue({
				data: { id: 'email-123' },
				error: null
			})

			const result = await service.cancelScheduledEmail('email-123')

			expect(result).toEqual({ id: 'email-123' })
			expect(mockResendEmails.cancel).toHaveBeenCalledWith('email-123')
		})

		it('should throw error when cancel fails', async () => {
			mockResendEmails.cancel.mockResolvedValue({
				data: null,
				error: { message: 'Email already sent' }
			})

			await expect(service.cancelScheduledEmail('email-123')).rejects.toThrow(
				'Resend API error: Email already sent'
			)
		})
	})

	describe('when Resend is not configured', () => {
		let unconfiguredService: EmailSenderService

		beforeEach(async () => {
			const unconfiguredMockConfig = {
				getResendApiKey: jest.fn().mockReturnValue(undefined)
			}

			const module: TestingModule = await Test.createTestingModule({
				providers: [
					EmailSenderService,
					{ provide: AppConfigService, useValue: unconfiguredMockConfig },
					{ provide: AppLogger, useValue: mockLogger }
				]
			}).compile()

			unconfiguredService = module.get<EmailSenderService>(EmailSenderService)
		})

		it('should return false for isConfigured', () => {
			expect(unconfiguredService.isConfigured()).toBe(false)
		})

		it('should return null for sendEmail', async () => {
			const result = await unconfiguredService.sendEmail({
				from: 'test@example.com',
				to: ['recipient@example.com'],
				subject: 'Test',
				html: '<p>Test</p>'
			})

			expect(result).toBeNull()
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Resend not configured, skipping email send',
				expect.any(Object)
			)
		})

		it('should return null for sendBatch', async () => {
			const result = await unconfiguredService.sendBatch([
				{
					from: 'test@example.com',
					to: ['recipient@example.com'],
					subject: 'Test',
					html: '<p>Test</p>'
				}
			])

			expect(result).toBeNull()
		})

		it('should return null for getEmailStatus', async () => {
			const result = await unconfiguredService.getEmailStatus('email-123')
			expect(result).toBeNull()
		})

		it('should return null for updateScheduledEmail', async () => {
			const result = await unconfiguredService.updateScheduledEmail(
				'email-123',
				'2025-02-01T10:00:00Z'
			)
			expect(result).toBeNull()
		})

		it('should return null for cancelScheduledEmail', async () => {
			const result = await unconfiguredService.cancelScheduledEmail('email-123')
			expect(result).toBeNull()
		})
	})
})
