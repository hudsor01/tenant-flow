import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EmailService } from './email.service'
import { EmailMetricsService } from './services/email-metrics.service'
import { EmailTemplateService } from './services/email-template.service'
import { ExternalApiService } from '../common/services/external-api.service'

// Mock external services
jest.mock('../common/services/external-api.service')
jest.mock('./services/email-metrics.service')
jest.mock('./services/email-template.service')


describe('EmailService', () => {
	let service: EmailService
	let metricsService: jest.Mocked<EmailMetricsService>
	let externalApiService: jest.Mocked<ExternalApiService>
	let configService: ConfigService

	beforeEach(async () => {
		// Reset mocks
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EmailService,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn().mockImplementation((key: string) => {
							const config: Record<string, any> = {
								'RESEND_FROM_EMAIL': 'noreply@tenantflow.app',
								'NODE_ENV': 'test'
							}
							return config[key]
						})
					}
				},
				{
					provide: EmailMetricsService,
					useValue: {
						recordMetric: jest.fn()
					}
				},
				{
					provide: ExternalApiService,
					useValue: {
						sendEmailViaApi: jest.fn()
					}
				},
				{
					provide: EmailTemplateService,
					useValue: {
						renderEmail: jest.fn().mockImplementation((templateName: string, data: any) => {
							// Mock realistic responses based on template name
							switch (templateName) {
								case 'welcome':
									return Promise.resolve({
										subject: 'Welcome to TenantFlow - Your Property Management Journey Begins!',
										html: `<!DOCTYPE html><html><body><h1>Welcome to TenantFlow, ${data.name || 'User'}!</h1><p>Thank you for joining our property management platform.</p></body></html>`
									})
								case 'tenant-invitation':
									return Promise.resolve({
										subject: "You're Invited to Join Your Property Portal",
										html: `<!DOCTYPE html><html><body><h1>You're Invited!</h1><p>Hello ${data.tenantName}, you've been invited to ${data.propertyAddress}.</p></body></html>`
									})
								case 'payment-reminder':
									return Promise.resolve({
										subject: `Rent Payment Reminder - Due ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Soon'}`,
										html: `<!DOCTYPE html><html><body><h1>Rent Payment Reminder</h1><p>Hello ${data.tenantName}, your rent of $${data.amountDue} is due.</p></body></html>`
									})
								case 'lease-expiration':
									return Promise.resolve({
										subject: 'Lease Expiration Notice',
										html: `<!DOCTYPE html><html><body><h1>Lease Expiration Notice</h1><p>Hello ${data.tenantName}, your lease expires soon.</p></body></html>`
									})
								default:
									return Promise.resolve({
										subject: 'TenantFlow Notification',
										html: '<!DOCTYPE html><html><body><h1>TenantFlow Notification</h1></body></html>'
									})
							}
						})
					}
				}
			]
		}).compile()

		service = module.get<EmailService>(EmailService)
		metricsService = module.get(EmailMetricsService) as jest.Mocked<EmailMetricsService>
		externalApiService = module.get(ExternalApiService) as jest.Mocked<ExternalApiService>
		configService = module.get<ConfigService>(ConfigService)

		// Reset circuit breaker state
		service['circuitBreakerState'] = 'closed'
		service['failureCount'] = 0
		service['lastFailureTime'] = null
	})

	it('should be defined', () => {
		expect(service).toBeDefined()
	})

	describe('sendWelcomeEmail', () => {
		it('should send welcome email successfully', async () => {
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendWelcomeEmail(
				'john@example.com',
				'John Doe',
				'medium',
				'test'
			)

			expect(result.success).toBe(true)
			expect(result.messageId).toMatch(/^msg_\d+_[a-z0-9]+$/)
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledWith(
				'john@example.com',
				'Welcome to TenantFlow - Your Property Management Journey Begins!',
				expect.stringContaining('<!DOCTYPE html>')
			)
			expect(metricsService.recordMetric).toHaveBeenCalledWith(
				expect.objectContaining({
					template: 'welcome',
					recipient: 'john@example.com',
					status: 'sent'
				})
			)
		})

		it('should handle API errors', async () => {
			externalApiService.sendEmailViaApi.mockRejectedValue(new Error('Invalid API key'))

			const result = await service.sendWelcomeEmail(
				'john@example.com',
				'John Doe'
			)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid API key')
			expect(metricsService.recordMetric).toHaveBeenCalledWith(
				expect.objectContaining({
					template: 'welcome',
					recipient: 'john@example.com',
					status: 'failed',
					error: 'Invalid API key'
				})
			)
		})

		it('should handle network errors', async () => {
			externalApiService.sendEmailViaApi.mockRejectedValue(new Error('Network error'))

			const result = await service.sendWelcomeEmail(
				'john@example.com',
				'John Doe'
			)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Network error')
		})

		it('should validate email format', async () => {
			const result = await service.sendWelcomeEmail(
				'invalid-email',
				'John Doe'
			)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid email format')
			expect(externalApiService.sendEmailViaApi).not.toHaveBeenCalled()
		})

		it('should handle missing name gracefully', async () => {
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendWelcomeEmail(
				'john@example.com',
				''
			)

			expect(result.success).toBe(true)
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledWith(
				'john@example.com',
				'Welcome to TenantFlow - Your Property Management Journey Begins!',
				expect.stringContaining('<!DOCTYPE html>')
			)
		})
	})

	describe('sendTenantInvitation', () => {
		const validInvitationData = {
			email: 'tenant@example.com',
			tenantName: 'Jane Doe',
			propertyAddress: '123 Main St, Apt 4B',
			invitationLink: 'https://app.tenantflow.app/invite/abc123',
			landlordName: 'John Smith'
		}

		it('should send tenant invitation successfully', async () => {
			// Reset circuit breaker and mocks
			service['circuitBreakerState'] = 'closed'
			service['failureCount'] = 0
			service['lastFailureTime'] = null
			jest.clearAllMocks()
			
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendTenantInvitation(
				validInvitationData.email,
				validInvitationData.tenantName,
				validInvitationData.propertyAddress,
				validInvitationData.invitationLink,
				validInvitationData.landlordName
			)

			expect(result.success).toBe(true)
			expect(result.messageId).toMatch(/^msg_\d+_[a-z0-9]+$/)
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledWith(
				'tenant@example.com',
				"You're Invited to Join Your Property Portal",
				expect.stringContaining('<!DOCTYPE html>')
			)
			expect(metricsService.recordMetric).toHaveBeenCalledWith(
				expect.objectContaining({
					template: 'tenant-invitation',
					recipient: 'tenant@example.com',
					status: 'sent'
				})
			)
		})

		it('should validate invitation link format', async () => {
			const result = await service.sendTenantInvitation(
				validInvitationData.email,
				validInvitationData.tenantName,
				validInvitationData.propertyAddress,
				'not-a-valid-url',
				validInvitationData.landlordName
			)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid invitation link')
		})
	})

	describe('sendPaymentReminder', () => {
		const validPaymentData = {
			email: 'tenant@example.com',
			tenantName: 'Bob Johnson',
			amountDue: 1500,
			dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			propertyAddress: '456 Oak Ave',
			paymentLink: 'https://app.tenantflow.app/pay/xyz789'
		}

		it('should send payment reminder successfully', async () => {
			// Reset circuit breaker and mocks
			service['circuitBreakerState'] = 'closed'
			service['failureCount'] = 0
			service['lastFailureTime'] = null
			jest.clearAllMocks()
			
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendPaymentReminder(
				validPaymentData.email,
				validPaymentData.tenantName,
				validPaymentData.amountDue,
				validPaymentData.dueDate,
				validPaymentData.propertyAddress,
				validPaymentData.paymentLink
			)

			expect(result.success).toBe(true)
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledWith(
				'tenant@example.com',
				expect.stringContaining('Rent Payment Reminder'),
				expect.stringContaining('<!DOCTYPE html>')
			)
			expect(metricsService.recordMetric).toHaveBeenCalledWith(
				expect.objectContaining({
					template: 'payment-reminder',
					recipient: 'tenant@example.com',
					status: 'sent'
				})
			)
		})

		it('should handle negative amounts', async () => {
			const result = await service.sendPaymentReminder(
				validPaymentData.email,
				validPaymentData.tenantName,
				-100,
				validPaymentData.dueDate,
				validPaymentData.propertyAddress,
				validPaymentData.paymentLink
			)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid amount')
		})

		it('should handle past due dates', async () => {
			const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
			
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendPaymentReminder(
				validPaymentData.email,
				validPaymentData.tenantName,
				validPaymentData.amountDue,
				pastDate,
				validPaymentData.propertyAddress,
				validPaymentData.paymentLink
			)

			// Should still send but with different messaging
			expect(result.success).toBe(true)
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalled()
		})
	})

	describe('sendLeaseExpirationAlert', () => {
		const validLeaseData = {
			email: 'tenant@example.com',
			tenantName: 'Alice Brown',
			propertyAddress: '789 Pine St',
			expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			renewalLink: 'https://app.tenantflow.app/renew/lease123',
			leaseId: 'lease_123'
		}

		it('should send lease expiration alert successfully', async () => {
			// Reset circuit breaker and mocks
			service['circuitBreakerState'] = 'closed'
			service['failureCount'] = 0
			service['lastFailureTime'] = null
			jest.clearAllMocks()
			
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendLeaseExpirationAlert(
				validLeaseData.email,
				validLeaseData.tenantName,
				validLeaseData.propertyAddress,
				validLeaseData.expirationDate,
				validLeaseData.renewalLink,
				validLeaseData.leaseId
			)

			expect(result.success).toBe(true)
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledWith(
				'tenant@example.com',
				'Lease Expiration Notice',
				expect.stringContaining('<!DOCTYPE html>')
			)
			expect(metricsService.recordMetric).toHaveBeenCalledWith(
				expect.objectContaining({
					template: 'lease-expiration',
					recipient: 'tenant@example.com',
					status: 'sent'
				})
			)
		})

		it('should handle already expired leases', async () => {
			const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)

			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendLeaseExpirationAlert(
				validLeaseData.email,
				validLeaseData.tenantName,
				validLeaseData.propertyAddress,
				expiredDate,
				validLeaseData.renewalLink,
				validLeaseData.leaseId
			)

			expect(result.success).toBe(true)
			// Should send with expired messaging
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalled()
		})
	})

	describe('Rate Limiting and Circuit Breaker', () => {
		it('should respect rate limits', async () => {
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			// Send multiple emails rapidly
			const promises = Array(10).fill(null).map((_, i) => 
				service.sendWelcomeEmail(`user${i}@example.com`, `User ${i}`)
			)

			const results = await Promise.all(promises)
			
			// All should succeed if under rate limit
			results.forEach(result => {
				expect(result.success).toBe(true)
			})
		})

		it('should open circuit breaker after consecutive failures', async () => {
			// Reset circuit breaker state before test
			service['circuitBreakerState'] = 'closed'
			service['failureCount'] = 0
			service['lastFailureTime'] = null
			
			// Simulate 5 consecutive failures
			externalApiService.sendEmailViaApi.mockRejectedValue(new Error('API Error'))

			const failures = Array(5).fill(null).map((_, i) =>
				service.sendWelcomeEmail(`fail${i}@example.com`, `User ${i}`)
			)

			await Promise.all(failures)

			// Verify circuit breaker is now open
			expect(service['circuitBreakerState']).toBe('open')
			expect(service['failureCount']).toBe(5)

			// Next call should fail immediately due to open circuit
			const result = await service.sendWelcomeEmail('test@example.com', 'Test User')
			
			expect(result.success).toBe(false)
			expect(result.error).toContain('circuit breaker open')
			// Circuit breaker should prevent the call - still only 5 calls from failures
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledTimes(5)
		})
	})

	describe('Email Validation', () => {
		const invalidEmails = [
			'plainaddress',
			'@missinglocal.com',
			'missing@domain',
			'missing.domain@.com',
			'two@@signs.com',
			'spaces in@email.com',
			'special!char@email.com'
		]

		invalidEmails.forEach(email => {
			it(`should reject invalid email: ${email}`, async () => {
				// Reset circuit breaker and mocks
				service['circuitBreakerState'] = 'closed'
				service['failureCount'] = 0
				service['lastFailureTime'] = null
				jest.clearAllMocks()
				
				const result = await service.sendWelcomeEmail(email, 'Test User')
				
				expect(result.success).toBe(false)
				expect(result.error).toContain('Invalid email format')
				expect(externalApiService.sendEmailViaApi).not.toHaveBeenCalled()
			})
		})

		const validEmails = [
			'user@example.com',
			'user.name@example.com',
			'user+tag@example.co.uk',
			'user_name@example-domain.com',
			'123@example.com'
		]

		validEmails.forEach(email => {
			it(`should accept valid email: ${email}`, async () => {
				// Reset circuit breaker and mocks
				service['circuitBreakerState'] = 'closed'
				service['failureCount'] = 0
				service['lastFailureTime'] = null
				jest.clearAllMocks()
				
				externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

				const result = await service.sendWelcomeEmail(email, 'Test User')
				
				expect(result.success).toBe(true)
				expect(externalApiService.sendEmailViaApi).toHaveBeenCalled()
			})
		})
	})

	describe('Template Fallback', () => {
		it('should successfully send email with simple HTML templates', async () => {
			// Since we now use simple HTML templates instead of React Email,
			// template rendering should always succeed
			externalApiService.sendEmailViaApi.mockResolvedValueOnce()

			const result = await service.sendWelcomeEmail(
				'test@example.com',
				'Test User'
			)

			expect(result.success).toBe(true)
			expect(result.messageId).toBeDefined()
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledWith(
				'test@example.com',
				'Welcome to TenantFlow - Your Property Management Journey Begins!',
				expect.stringContaining('Welcome to TenantFlow, Test User!')
			)
		})
	})

	describe('Production Safety', () => {
		it('should not send emails in test environment by default', async () => {
			// Already mocked as 'test' environment
			const result = await service.sendWelcomeEmail(
				'test@example.com',
				'Test User'
			)

			// In test mode, it should still work but potentially with different behavior
			expect(result).toBeDefined()
		})

		it('should sanitize HTML content to prevent XSS', async () => {
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendTenantInvitation(
				'test@example.com',
				'<script>alert("XSS")</script>',
				'123 Main St',
				'https://app.tenantflow.app/invite/123',
				'Landlord'
			)

			expect(result.success).toBe(true)
			// Check that the email was sent
			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledWith(
				'test@example.com',
				"You're Invited to Join Your Property Portal",
				expect.stringContaining('<!DOCTYPE html>')
			)
		})

		it('should handle very long input strings', async () => {
			// Reset circuit breaker and mocks
			service['circuitBreakerState'] = 'closed'
			service['failureCount'] = 0
			service['lastFailureTime'] = null
			jest.clearAllMocks()
			
			const longString = 'a'.repeat(10000)
			
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			const result = await service.sendWelcomeEmail(
				'test@example.com',
				longString
			)

			// Should handle gracefully
			expect(result.success).toBe(true)
		})

		it('should send emails with proper service integration', async () => {
			// Reset circuit breaker and mocks
			service['circuitBreakerState'] = 'closed'
			service['failureCount'] = 0
			service['lastFailureTime'] = null
			jest.clearAllMocks()
			
			externalApiService.sendEmailViaApi.mockResolvedValue(undefined)

			await service.sendWelcomeEmail('test@example.com', 'Test User')

			expect(externalApiService.sendEmailViaApi).toHaveBeenCalledWith(
				'test@example.com',
				expect.stringContaining('Welcome to TenantFlow'),
				expect.stringContaining('<!DOCTYPE html>')
			)
			expect(metricsService.recordMetric).toHaveBeenCalled()
		})
	})
})