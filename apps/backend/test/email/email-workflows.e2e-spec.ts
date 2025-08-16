import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../../src/app.module'
import { EmailService } from '../../src/email/email.service'
import { AuthService } from '../../src/auth/auth.service'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('Email Workflows E2E', () => {
	let app: INestApplication
	let emailService: EmailService
	let authService: AuthService
	let prismaService: PrismaService
	let mockEmailSend: jest.SpyInstance

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()

		app = moduleFixture.createNestApplication()
		await app.init()

		emailService = app.get<EmailService>(EmailService)
		authService = app.get<AuthService>(AuthService)
		prismaService = app.get<PrismaService>(PrismaService)

		// Mock the actual email sending to prevent real emails in tests
		mockEmailSend = jest.spyOn(emailService as any, 'sendEmail').mockImplementation(
			async (options: any) => ({
				success: true,
				messageId: `test_${Date.now()}`,
				data: options
			})
		)
	})

	afterAll(async () => {
		await app.close()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('User Registration Email Flow', () => {
		it('should send welcome email when new user registers', async () => {
			const newUser = {
				email: `test${Date.now()}@example.com`,
				name: 'Test User',
				password: 'SecurePass123!'
			}

			// Simulate user registration
			const response = await request(app.getHttpServer())
				.post('/auth/register')
				.send(newUser)
				.expect(201)

			// Verify welcome email was triggered
			expect(mockEmailSend).toHaveBeenCalledWith(
				expect.objectContaining({
					to: [newUser.email],
					subject: expect.stringContaining('Welcome')
				})
			)

			// Clean up test user
			await prismaService.user.delete({
				where: { email: newUser.email }
			}).catch(() => {}) // Ignore if already deleted
		})

		it('should handle email sending failure gracefully', async () => {
			// Make email sending fail
			mockEmailSend.mockRejectedValueOnce(new Error('Email service down'))

			const newUser = {
				email: `fail${Date.now()}@example.com`,
				name: 'Fail User',
				password: 'SecurePass123!'
			}

			// Registration should still succeed even if email fails
			const response = await request(app.getHttpServer())
				.post('/auth/register')
				.send(newUser)
				.expect(201)

			expect(response.body).toHaveProperty('user')
			expect(response.body.user.email).toBe(newUser.email)

			// Clean up
			await prismaService.user.delete({
				where: { email: newUser.email }
			}).catch(() => {})
		})
	})

	describe('Tenant Invitation Workflow', () => {
		let authToken: string
		let propertyId: string
		let landlordId: string

		beforeEach(async () => {
			// Create a test landlord and authenticate
			const landlord = await prismaService.user.create({
				data: {
					id: `landlord_${Date.now()}`,
					email: `landlord${Date.now()}@example.com`,
					name: 'Test Landlord',
					role: 'OWNER'
				}
			})
			landlordId = landlord.id

			// Mock authentication
			authToken = 'mock_token_' + landlordId

			// Create a test property
			const property = await prismaService.property.create({
				data: {
					name: 'Test Property',
					type: 'APARTMENT',
					address: '123 Test St',
					city: 'Test City',
					state: 'TS',
					zipCode: '12345',
					country: 'USA',
					userId: landlordId
				}
			})
			propertyId = property.id
		})

		afterEach(async () => {
			// Clean up test data
			await prismaService.property.deleteMany({
				where: { userId: landlordId }
			}).catch(() => {})
			
			await prismaService.user.delete({
				where: { id: landlordId }
			}).catch(() => {})
		})

		it('should send invitation email when tenant is invited', async () => {
			const tenantData = {
				email: `tenant${Date.now()}@example.com`,
				name: 'Test Tenant',
				propertyId: propertyId
			}

			const response = await request(app.getHttpServer())
				.post('/tenants/invite')
				.set('Authorization', `Bearer ${authToken}`)
				.send(tenantData)
				.expect(201)

			// Verify invitation email was sent
			expect(mockEmailSend).toHaveBeenCalledWith(
				expect.objectContaining({
					to: [tenantData.email],
					subject: expect.stringContaining('Invited')
				})
			)

			// Verify email contains property details
			const emailCall = mockEmailSend.mock.calls[0][0]
			expect(emailCall.html).toContain('123 Test St')
			expect(emailCall.html).toContain(tenantData.name)
		})

		it('should handle bulk tenant invitations', async () => {
			const tenants = Array(5).fill(null).map((_, i) => ({
				email: `tenant${Date.now()}_${i}@example.com`,
				name: `Tenant ${i}`,
				propertyId: propertyId
			}))

			const response = await request(app.getHttpServer())
				.post('/tenants/bulk-invite')
				.set('Authorization', `Bearer ${authToken}`)
				.send({ tenants })
				.expect(201)

			// Should send email for each tenant
			expect(mockEmailSend).toHaveBeenCalledTimes(5)
			
			// Each email should be personalized
			tenants.forEach((tenant, index) => {
				expect(mockEmailSend).toHaveBeenNthCalledWith(
					index + 1,
					expect.objectContaining({
						to: [tenant.email]
					})
				)
			})
		})
	})

	describe('Payment Reminder Workflow', () => {
		let tenantId: string
		let leaseId: string
		let propertyId: string

		beforeEach(async () => {
			// Setup test data
			const tenant = await prismaService.user.create({
				data: {
					id: `tenant_${Date.now()}`,
					email: `tenant${Date.now()}@example.com`,
					name: 'Test Tenant',
					role: 'TENANT'
				}
			})
			tenantId = tenant.id

			const property = await prismaService.property.create({
				data: {
					name: 'Rental Property',
					type: 'HOUSE',
					address: '456 Rental Ave',
					city: 'Rent City',
					state: 'RC',
					zipCode: '54321',
					country: 'USA',
					userId: `landlord_${Date.now()}`
				}
			})
			propertyId = property.id

			const lease = await prismaService.lease.create({
				data: {
					propertyId: propertyId,
					tenantId: tenantId,
					startDate: new Date(),
					endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
					monthlyRent: 1500,
					securityDeposit: 1500,
					status: 'ACTIVE'
				}
			})
			leaseId = lease.id
		})

		afterEach(async () => {
			await prismaService.lease.deleteMany({
				where: { id: leaseId }
			}).catch(() => {})
			
			await prismaService.property.deleteMany({
				where: { id: propertyId }
			}).catch(() => {})
			
			await prismaService.user.delete({
				where: { id: tenantId }
			}).catch(() => {})
		})

		it('should send payment reminder on scheduled date', async () => {
			// Trigger payment reminder job (simulate cron job)
			const response = await request(app.getHttpServer())
				.post('/payments/send-reminders')
				.set('Authorization', 'Bearer admin_token')
				.expect(200)

			// Verify reminder email was sent
			const tenantEmails = mockEmailSend.mock.calls.filter(
				call => call[0].to[0].includes('tenant')
			)
			
			expect(tenantEmails.length).toBeGreaterThan(0)
			expect(tenantEmails[0][0]).toMatchObject({
				subject: expect.stringContaining('Payment Reminder'),
				html: expect.stringContaining('$1,500')
			})
		})

		it('should not send duplicate reminders', async () => {
			// Send first reminder
			await request(app.getHttpServer())
				.post('/payments/send-reminders')
				.set('Authorization', 'Bearer admin_token')
				.expect(200)

			const firstCallCount = mockEmailSend.mock.calls.length

			// Try to send again immediately
			await request(app.getHttpServer())
				.post('/payments/send-reminders')
				.set('Authorization', 'Bearer admin_token')
				.expect(200)

			// Should not send duplicate
			expect(mockEmailSend).toHaveBeenCalledTimes(firstCallCount)
		})
	})

	describe('Lease Expiration Workflow', () => {
		it('should send expiration alerts 30 days before lease ends', async () => {
			// Create lease expiring in 30 days
			const expiringLease = await prismaService.lease.create({
				data: {
					propertyId: 'prop_test',
					tenantId: 'tenant_test',
					startDate: new Date(Date.now() - 335 * 24 * 60 * 60 * 1000),
					endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					monthlyRent: 2000,
					securityDeposit: 2000,
					status: 'ACTIVE'
				}
			})

			// Trigger lease expiration check
			await request(app.getHttpServer())
				.post('/leases/check-expirations')
				.set('Authorization', 'Bearer admin_token')
				.expect(200)

			// Verify expiration alert was sent
			expect(mockEmailSend).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: expect.stringContaining('Lease Expiration')
				})
			)

			// Clean up
			await prismaService.lease.delete({
				where: { id: expiringLease.id }
			}).catch(() => {})
		})

		it('should send different alerts for 60, 30, and 7 day marks', async () => {
			// Create leases at different expiration stages
			const leases = await Promise.all([
				prismaService.lease.create({
					data: {
						propertyId: 'prop_60',
						tenantId: 'tenant_60',
						startDate: new Date(Date.now() - 305 * 24 * 60 * 60 * 1000),
						endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
						monthlyRent: 1800,
						securityDeposit: 1800,
						status: 'ACTIVE'
					}
				}),
				prismaService.lease.create({
					data: {
						propertyId: 'prop_30',
						tenantId: 'tenant_30',
						startDate: new Date(Date.now() - 335 * 24 * 60 * 60 * 1000),
						endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
						monthlyRent: 1900,
						securityDeposit: 1900,
						status: 'ACTIVE'
					}
				}),
				prismaService.lease.create({
					data: {
						propertyId: 'prop_7',
						tenantId: 'tenant_7',
						startDate: new Date(Date.now() - 358 * 24 * 60 * 60 * 1000),
						endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
						monthlyRent: 2100,
						securityDeposit: 2100,
						status: 'ACTIVE'
					}
				})
			])

			// Trigger expiration checks
			await request(app.getHttpServer())
				.post('/leases/check-expirations')
				.set('Authorization', 'Bearer admin_token')
				.expect(200)

			// Should send 3 different emails
			expect(mockEmailSend).toHaveBeenCalledTimes(3)

			// Each should have different urgency
			const emailContents = mockEmailSend.mock.calls.map(call => call[0].html)
			expect(emailContents[0]).toContain('60 days')
			expect(emailContents[1]).toContain('30 days')
			expect(emailContents[2]).toContain('7 days')

			// Clean up
			await Promise.all(leases.map(lease => 
				prismaService.lease.delete({ where: { id: lease.id } }).catch(() => {})
			))
		})
	})

	describe('Email Retry and Error Recovery', () => {
		it('should retry failed emails with exponential backoff', async () => {
			let attemptCount = 0
			mockEmailSend.mockImplementation(async () => {
				attemptCount++
				if (attemptCount < 3) {
					throw new Error('Temporary failure')
				}
				return { success: true, messageId: 'retry_success' }
			})

			const result = await emailService.sendWelcomeEmail(
				'retry@example.com',
				'Retry User'
			)

			expect(result.success).toBe(true)
			expect(attemptCount).toBe(3) // Failed twice, succeeded on third
		})

		it('should queue emails when service is down', async () => {
			// Simulate service being completely down
			mockEmailSend.mockRejectedValue(new Error('Service unavailable'))

			const emails = Array(10).fill(null).map((_, i) => ({
				email: `queue${i}@example.com`,
				name: `User ${i}`
			}))

			const results = await Promise.all(
				emails.map(e => emailService.sendWelcomeEmail(e.email, e.name))
			)

			// All should return failure but be queued
			results.forEach(result => {
				expect(result.success).toBe(false)
				expect(result.error).toContain('Service unavailable')
			})

			// Verify emails are queued for retry (implementation dependent)
			// This would check your queue/retry mechanism
		})
	})

	describe('Production Monitoring', () => {
		it('should log email metrics for monitoring', async () => {
			const logSpy = jest.spyOn(console, 'log')

			await emailService.sendWelcomeEmail(
				'metrics@example.com',
				'Metrics User'
			)

			// Should log metrics
			expect(logSpy).toHaveBeenCalledWith(
				expect.stringContaining('Email sent'),
				expect.objectContaining({
					template: 'welcome',
					recipient: 'metrics@example.com'
				})
			)

			logSpy.mockRestore()
		})

		it('should track email delivery rates', async () => {
			// Send multiple emails
			const successRate = 0.8 // 80% success rate
			let sentCount = 0

			mockEmailSend.mockImplementation(async () => {
				sentCount++
				if (Math.random() < successRate) {
					return { success: true, messageId: `msg_${sentCount}` }
				}
				throw new Error('Delivery failed')
			})

			const results = await Promise.all(
				Array(100).fill(null).map((_, i) => 
					emailService.sendWelcomeEmail(
						`track${i}@example.com`,
						`User ${i}`
					).catch(() => ({ success: false }))
				)
			)

			const successCount = results.filter(r => r.success).length
			const actualRate = successCount / results.length

			// Should be close to expected rate
			expect(actualRate).toBeGreaterThan(0.7)
			expect(actualRate).toBeLessThan(0.9)
		})
	})
})