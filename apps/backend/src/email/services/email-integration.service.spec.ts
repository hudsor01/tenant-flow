import { Test, TestingModule } from '@nestjs/testing'
import { EmailIntegrationService } from './email-integration.service'
import { EmailQueueService } from './email-queue.service'
import { Job } from 'bull'

// Mock EmailQueueService
const mockQueueService = {
	addImmediateEmail: jest.fn(),
	addScheduledEmail: jest.fn(),
	addBulkCampaign: jest.fn()
}

// Mock job for return values
const createMockJob = (id: string) => ({ id, data: {} }) as Job

describe('EmailIntegrationService', () => {
	let service: EmailIntegrationService
	let queueService: jest.Mocked<EmailQueueService>

	beforeEach(async () => {
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EmailIntegrationService,
				{
					provide: EmailQueueService,
					useValue: mockQueueService
				}
			]
		}).compile()

		service = module.get<EmailIntegrationService>(EmailIntegrationService)
		queueService = module.get(EmailQueueService)
	})

	describe('sendWelcomeEmail', () => {
		it('should queue welcome email with default options', async () => {
			const mockJob = createMockJob('welcome_123')
			queueService.addImmediateEmail.mockResolvedValue(mockJob)

			const result = await service.sendWelcomeEmail(
				'user@example.com',
				'John Doe'
			)

			expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
				'user@example.com',
				'welcome',
				{
					email: 'user@example.com',
					name: 'John Doe',
					companySize: 'medium',
					source: 'signup'
				},
				{
					userId: undefined,
					organizationId: undefined,
					trackingId: expect.stringMatching(/^welcome_\d+$/)
				}
			)
			expect(result).toBe(mockJob)
		})

		it('should queue welcome email with custom options', async () => {
			const mockJob = createMockJob('welcome_456')
			queueService.addImmediateEmail.mockResolvedValue(mockJob)

			await service.sendWelcomeEmail(
				'enterprise@example.com',
				'Jane Smith',
				{
					companySize: 'large',
					source: 'referral',
					userId: 'user_123',
					organizationId: 'org_456'
				}
			)

			expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
				'enterprise@example.com',
				'welcome',
				{
					email: 'enterprise@example.com',
					name: 'Jane Smith',
					companySize: 'large',
					source: 'referral'
				},
				{
					userId: 'user_123',
					organizationId: 'org_456',
					trackingId: expect.stringMatching(/^welcome_\d+$/)
				}
			)
		})
	})

	describe('sendTenantInvitation', () => {
		it('should queue tenant invitation email', async () => {
			const mockJob = createMockJob('invitation_789')
			queueService.addImmediateEmail.mockResolvedValue(mockJob)

			const result = await service.sendTenantInvitation(
				'tenant@example.com',
				'Bob Tenant',
				'123 Main St, Apt 4B',
				'https://app.tenantflow.app/invite/abc123',
				'Alice Landlord',
				{
					userId: 'user_789',
					organizationId: 'org_123',
					propertyId: 'prop_456'
				}
			)

			expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
				'tenant@example.com',
				'tenant-invitation',
				{
					email: 'tenant@example.com',
					tenantName: 'Bob Tenant',
					propertyAddress: '123 Main St, Apt 4B',
					invitationLink: 'https://app.tenantflow.app/invite/abc123',
					landlordName: 'Alice Landlord'
				},
				{
					userId: 'user_789',
					organizationId: 'org_123',
					trackingId: expect.stringMatching(
						/^invitation_prop_456_\d+$/
					)
				}
			)
			expect(result).toBe(mockJob)
		})

		it('should queue tenant invitation email without options', async () => {
			const mockJob = createMockJob('invitation_simple')
			queueService.addImmediateEmail.mockResolvedValue(mockJob)

			await service.sendTenantInvitation(
				'simple@example.com',
				'Simple Tenant',
				'456 Oak Ave',
				'https://app.tenantflow.app/invite/simple',
				'Simple Landlord'
			)

			expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
				'simple@example.com',
				'tenant-invitation',
				expect.objectContaining({
					email: 'simple@example.com',
					tenantName: 'Simple Tenant'
				}),
				expect.objectContaining({
					userId: undefined,
					organizationId: undefined,
					trackingId: expect.stringMatching(
						/^invitation_undefined_\d+$/
					)
				})
			)
		})
	})

	describe('schedulePaymentReminder', () => {
		it('should schedule payment reminder with custom send time', async () => {
			const mockJob = createMockJob('payment_reminder_123')
			queueService.addScheduledEmail.mockResolvedValue(mockJob)

			const dueDate = new Date('2025-02-15T00:00:00.000Z')
			const sendAt = new Date('2025-02-10T09:00:00.000Z')

			const result = await service.schedulePaymentReminder(
				'tenant@example.com',
				'Charlie Tenant',
				1500,
				dueDate,
				'789 Pine St',
				'https://app.tenantflow.app/pay/xyz789',
				{
					sendAt,
					userId: 'user_456',
					organizationId: 'org_789',
					leaseId: 'lease_123'
				}
			)

			expect(queueService.addScheduledEmail).toHaveBeenCalledWith(
				'tenant@example.com',
				'payment-reminder',
				{
					email: 'tenant@example.com',
					tenantName: 'Charlie Tenant',
					amountDue: 1500,
					dueDate: '2025-02-15T00:00:00.000Z',
					propertyAddress: '789 Pine St',
					paymentLink: 'https://app.tenantflow.app/pay/xyz789'
				},
				{ at: sendAt },
				{
					userId: 'user_456',
					organizationId: 'org_789',
					campaignId: 'payment_reminder_lease_123'
				}
			)
			expect(result).toBe(mockJob)
		})

		it('should schedule payment reminder with default 24-hour delay', async () => {
			const mockJob = createMockJob('payment_reminder_default')
			queueService.addScheduledEmail.mockResolvedValue(mockJob)

			const dueDate = new Date('2025-03-01T00:00:00.000Z')

			await service.schedulePaymentReminder(
				'default@example.com',
				'Default Tenant',
				2000,
				dueDate,
				'456 Default St',
				'https://app.tenantflow.app/pay/default'
			)

			expect(queueService.addScheduledEmail).toHaveBeenCalledWith(
				'default@example.com',
				'payment-reminder',
				expect.objectContaining({
					amountDue: 2000
				}),
				{ delay: 24 * 60 * 60 * 1000 }, // 24 hours
				expect.objectContaining({
					campaignId: 'payment_reminder_undefined'
				})
			)
		})
	})

	describe('scheduleLeaseExpirationAlert', () => {
		it('should schedule lease expiration alert with custom days before expiration', async () => {
			const mockJob = createMockJob('lease_expiration_123')
			queueService.addScheduledEmail.mockResolvedValue(mockJob)

			const expirationDate = new Date('2025-06-30T23:59:59.999Z')
			const expectedSendAt = new Date('2025-05-31T23:59:59.999Z') // 30 days before

			const result = await service.scheduleLeaseExpirationAlert(
				'expiring@example.com',
				'Diana Tenant',
				'321 Lease Blvd',
				expirationDate,
				'https://app.tenantflow.app/renew/lease456',
				{
					daysBeforeExpiration: 30,
					userId: 'user_321',
					organizationId: 'org_654',
					leaseId: 'lease_456'
				}
			)

			expect(queueService.addScheduledEmail).toHaveBeenCalledWith(
				'expiring@example.com',
				'lease-expiration',
				{
					email: 'expiring@example.com',
					tenantName: 'Diana Tenant',
					propertyAddress: '321 Lease Blvd',
					expirationDate: '2025-06-30T23:59:59.999Z',
					renewalLink: 'https://app.tenantflow.app/renew/lease456',
					leaseId: 'lease_456'
				},
				{ at: expectedSendAt },
				{
					userId: 'user_321',
					organizationId: 'org_654',
					campaignId: 'lease_expiration_lease_456'
				}
			)
			expect(result).toBe(mockJob)
		})

		it('should default to 30 days before expiration', async () => {
			const mockJob = createMockJob('lease_default')
			queueService.addScheduledEmail.mockResolvedValue(mockJob)

			const expirationDate = new Date('2025-12-31T23:59:59.999Z')

			await service.scheduleLeaseExpirationAlert(
				'default@example.com',
				'Default Tenant',
				'987 Default Ave',
				expirationDate,
				'https://app.tenantflow.app/renew/default'
			)

			// Should schedule 30 days before expiration
			const expectedSendAt = new Date('2025-12-01T23:59:59.999Z')

			expect(queueService.addScheduledEmail).toHaveBeenCalledWith(
				expect.any(String),
				'lease-expiration',
				expect.any(Object),
				{ at: expectedSendAt },
				expect.objectContaining({
					campaignId: 'lease_expiration_undefined'
				})
			)
		})
	})

	describe('sendPropertyTipsCampaign', () => {
		it('should send property tips to multiple recipients', async () => {
			const mockJobs = [
				createMockJob('tips_batch_1'),
				createMockJob('tips_batch_2')
			]
			queueService.addBulkCampaign.mockResolvedValue(mockJobs)

			const recipients = [
				{
					email: 'landlord1@example.com',
					name: 'First Landlord',
					userId: 'user_1'
				},
				{
					email: 'landlord2@example.com',
					name: 'Second Landlord',
					userId: 'user_2'
				}
			]

			const tips = [
				'Regular property maintenance prevents costly repairs',
				'Screen tenants thoroughly to reduce turnover',
				'Stay updated on local rental regulations'
			]

			const result = await service.sendPropertyTipsCampaign(
				recipients,
				tips,
				{
					organizationId: 'org_tips',
					campaignId: 'monthly_tips_jan_2025'
				}
			)

			expect(queueService.addBulkCampaign).toHaveBeenCalledWith(
				[
					{
						email: 'landlord1@example.com',
						data: {
							email: 'landlord1@example.com',
							name: 'First Landlord',
							tips
						}
					},
					{
						email: 'landlord2@example.com',
						data: {
							email: 'landlord2@example.com',
							name: 'Second Landlord',
							tips
						}
					}
				],
				'property-tips',
				{
					organizationId: 'org_tips',
					campaignId: 'monthly_tips_jan_2025'
				}
			)
			expect(result).toBe(mockJobs)
		})

		it('should generate default campaign ID if not provided', async () => {
			const mockJobs = [createMockJob('tips_default')]
			queueService.addBulkCampaign.mockResolvedValue(mockJobs)

			await service.sendPropertyTipsCampaign(
				[{ email: 'test@example.com', name: 'Test User' }],
				['Test tip']
			)

			expect(queueService.addBulkCampaign).toHaveBeenCalledWith(
				expect.any(Array),
				'property-tips',
				expect.objectContaining({
					campaignId: expect.stringMatching(/^property_tips_\d+$/)
				})
			)
		})
	})

	describe('sendFeatureAnnouncement', () => {
		it('should send feature announcement campaign', async () => {
			const mockJobs = [createMockJob('feature_batch_1')]
			queueService.addBulkCampaign.mockResolvedValue(mockJobs)

			const recipients = [
				{
					email: 'user@example.com',
					name: 'Test User',
					userId: 'user_test'
				}
			]

			const features = [
				{
					title: 'New Dashboard',
					description: 'Enhanced analytics and reporting'
				},
				{
					title: 'Mobile App',
					description: 'Manage properties on the go'
				}
			]

			const result = await service.sendFeatureAnnouncement(
				recipients,
				features,
				'https://app.tenantflow.app/features',
				{
					organizationId: 'org_features',
					campaignId: 'feature_launch_v2'
				}
			)

			expect(queueService.addBulkCampaign).toHaveBeenCalledWith(
				[
					{
						email: 'user@example.com',
						data: {
							email: 'user@example.com',
							name: 'Test User',
							features,
							actionUrl: 'https://app.tenantflow.app/features'
						}
					}
				],
				'welcome',
				{
					organizationId: 'org_features',
					campaignId: 'feature_launch_v2'
				}
			)
			expect(result).toBe(mockJobs)
		})
	})

	describe('sendReEngagementCampaign', () => {
		it('should send re-engagement campaign with special offer', async () => {
			const mockJobs = [createMockJob('reengagement_1')]
			queueService.addBulkCampaign.mockResolvedValue(mockJobs)

			const recipients = [
				{
					email: 'inactive@example.com',
					name: 'Inactive User',
					lastActive: '30 days ago',
					userId: 'user_inactive'
				}
			]

			const result = await service.sendReEngagementCampaign(
				recipients,
				'50% off your next 3 months',
				{
					organizationId: 'org_reengagement',
					campaignId: 'winback_q1_2025'
				}
			)

			expect(queueService.addBulkCampaign).toHaveBeenCalledWith(
				[
					{
						email: 'inactive@example.com',
						data: {
							email: 'inactive@example.com',
							name: 'Inactive User',
							lastActive: '30 days ago',
							specialOffer: '50% off your next 3 months'
						}
					}
				],
				'welcome',
				{
					organizationId: 'org_reengagement',
					campaignId: 'winback_q1_2025'
				}
			)
			expect(result).toBe(mockJobs)
		})

		it('should send re-engagement campaign without special offer', async () => {
			const mockJobs = [createMockJob('reengagement_2')]
			queueService.addBulkCampaign.mockResolvedValue(mockJobs)

			const recipients = [
				{
					email: 'dormant@example.com',
					name: 'Dormant User',
					lastActive: '60 days ago'
				}
			]

			await service.sendReEngagementCampaign(recipients)

			expect(queueService.addBulkCampaign).toHaveBeenCalledWith(
				[
					{
						email: 'dormant@example.com',
						data: {
							email: 'dormant@example.com',
							name: 'Dormant User',
							lastActive: '60 days ago',
							specialOffer: undefined
						}
					}
				],
				'welcome',
				expect.objectContaining({
					campaignId: expect.stringMatching(/^re_engagement_\d+$/)
				})
			)
		})
	})

	describe('scheduleRecurringPaymentReminders', () => {
		it('should schedule recurring payment reminders with cron expression', async () => {
			const mockJob = createMockJob('recurring_payment_123')
			queueService.addScheduledEmail.mockResolvedValue(mockJob)

			const result = await service.scheduleRecurringPaymentReminders(
				'recurring@example.com',
				'Recurring Tenant',
				1800,
				'654 Recurring St',
				'https://app.tenantflow.app/pay/recurring',
				{
					dueDay: 15, // 15th of each month
					leaseId: 'lease_recurring',
					userId: 'user_recurring',
					organizationId: 'org_recurring'
				}
			)

			expect(queueService.addScheduledEmail).toHaveBeenCalledWith(
				'recurring@example.com',
				'payment-reminder',
				{
					email: 'recurring@example.com',
					tenantName: 'Recurring Tenant',
					amountDue: 1800,
					dueDate: expect.any(String),
					propertyAddress: '654 Recurring St',
					paymentLink: 'https://app.tenantflow.app/pay/recurring'
				},
				{ cron: '0 9 12 * *' }, // 9 AM on 12th of each month (3 days before 15th)
				{
					userId: 'user_recurring',
					organizationId: 'org_recurring',
					campaignId: 'recurring_payment_lease_recurring'
				}
			)
			expect(result).toBe(mockJob)
		})

		it('should handle edge cases for cron day calculation', async () => {
			const mockJob = createMockJob('edge_case')
			queueService.addScheduledEmail.mockResolvedValue(mockJob)

			// Due on 1st, reminder would be on -2nd (invalid)
			await service.scheduleRecurringPaymentReminders(
				'edge@example.com',
				'Edge Case Tenant',
				1000,
				'123 Edge St',
				'https://app.tenantflow.app/pay/edge',
				{
					dueDay: 1,
					leaseId: 'lease_edge'
				}
			)

			expect(queueService.addScheduledEmail).toHaveBeenCalledWith(
				expect.any(String),
				'payment-reminder',
				expect.any(Object),
				{ cron: '0 9 -2 * *' }, // Will be handled by cron system
				expect.any(Object)
			)
		})
	})

	describe('getCampaignMetrics', () => {
		it('should return placeholder metrics for campaign', async () => {
			const loggerSpy = jest
				.spyOn(service['logger'], 'log')
				.mockImplementation()

			const result = await service.getCampaignMetrics('test_campaign_123')

			expect(loggerSpy).toHaveBeenCalledWith(
				'Getting metrics for campaign: test_campaign_123'
			)
			expect(result).toEqual({
				campaignId: 'test_campaign_123',
				sent: 0,
				delivered: 0,
				opened: 0,
				clicked: 0,
				failed: 0
			})

			loggerSpy.mockRestore()
		})
	})

	describe('Module Initialization', () => {
		it('should initialize successfully', async () => {
			const loggerSpy = jest
				.spyOn(service['logger'], 'log')
				.mockImplementation()

			await service.onModuleInit()

			expect(loggerSpy).toHaveBeenCalledWith(
				'Email integration service initialized'
			)
			loggerSpy.mockRestore()
		})
	})
})
