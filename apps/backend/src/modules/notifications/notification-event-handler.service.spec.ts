import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import { FailedNotificationsService } from './failed-notifications.service'
import { EmailService } from '../email/email.service'
import { NotificationEventHandlerService } from './notification-event-handler.service'
import {
	MaintenanceUpdatedEvent,
	PaymentReceivedEvent,
	PaymentFailedEvent,
	TenantCreatedEvent,
	LeaseExpiringEvent
} from './events/notification.events'

describe('NotificationEventHandlerService', () => {
	let service: NotificationEventHandlerService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockFailedNotifications: jest.Mocked<FailedNotificationsService>
	let mockEmailService: jest.Mocked<EmailService>

	const createMockAdminClient = () => {
		const mockInsertResult = { error: null }
		const mockSelectResult = { data: null, error: null }

		return {
			from: jest.fn().mockReturnValue({
				insert: jest.fn().mockResolvedValue(mockInsertResult),
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue(mockSelectResult)
					})
				})
			})
		}
	}

	beforeEach(async () => {
		const mockAdminClient = createMockAdminClient()

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		mockFailedNotifications = {
			retryWithBackoff: jest.fn().mockImplementation(async (fn) => fn())
		} as unknown as jest.Mocked<FailedNotificationsService>

		mockEmailService = {
			sendTenantInvitationEmail: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<EmailService>

		const module = await Test.createTestingModule({
			providers: [
				NotificationEventHandlerService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: FailedNotificationsService, useValue: mockFailedNotifications },
				{ provide: EmailService, useValue: mockEmailService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<NotificationEventHandlerService>(NotificationEventHandlerService)
	})

	describe('handleMaintenanceUpdated', () => {
		it('creates notification for maintenance update event', async () => {
			const event = new MaintenanceUpdatedEvent(
				'user-123',
				'maintenance-456',
				'Broken pipe in bathroom',
				'in_progress',
				'high',
				'Sunset Apartments',
				'101',
				'Water leak needs immediate attention'
			)

			await service.handleMaintenanceUpdated(event)

			expect(mockFailedNotifications.retryWithBackoff).toHaveBeenCalledWith(
				expect.any(Function),
				'maintenance.updated',
				event
			)
		})

		it('inserts notification record into database', async () => {
			const event = new MaintenanceUpdatedEvent(
				'user-123',
				'maintenance-456',
				'Broken pipe',
				'open',
				'urgent',
				'Main Building',
				'202',
				'Emergency repair needed'
			)

			const mockClient = mockSupabaseService.getAdminClient()

			await service.handleMaintenanceUpdated(event)

			expect(mockClient.from).toHaveBeenCalledWith('notifications')
		})
	})

	describe('handlePaymentReceived', () => {
		it('creates notification for payment received event', async () => {
			const event = new PaymentReceivedEvent(
				'user-123',
				'sub-789',
				1500,
				'usd',
				'https://invoice.stripe.com/abc',
				'Rent payment received for March'
			)

			await service.handlePaymentReceived(event)

			expect(mockFailedNotifications.retryWithBackoff).toHaveBeenCalledWith(
				expect.any(Function),
				'payment.received',
				event
			)
		})
	})

	describe('handlePaymentFailed', () => {
		it('creates notification for payment failed event', async () => {
			const event = new PaymentFailedEvent(
				'user-123',
				'sub-789',
				1500,
				'usd',
				'https://invoice.stripe.com/abc',
				'Card declined'
			)

			await service.handlePaymentFailed(event)

			expect(mockFailedNotifications.retryWithBackoff).toHaveBeenCalledWith(
				expect.any(Function),
				'payment.failed',
				event
			)
		})
	})

	describe('handleTenantCreated', () => {
		it('creates notification for tenant created event', async () => {
			const event = new TenantCreatedEvent(
				'owner-123',
				'tenant-456',
				'John Doe',
				'john@example.com',
				'New tenant John Doe added to your property'
			)

			await service.handleTenantCreated(event)

			expect(mockFailedNotifications.retryWithBackoff).toHaveBeenCalledWith(
				expect.any(Function),
				'tenant.created',
				event
			)
		})
	})

	describe('handleLeaseExpiring', () => {
		it('creates notification for lease expiring event', async () => {
			const event = new LeaseExpiringEvent(
				'owner-123',
				'Jane Smith',
				'Oak Tower',
				'303',
				'2025-02-01',
				30
			)

			await service.handleLeaseExpiring(event)

			expect(mockFailedNotifications.retryWithBackoff).toHaveBeenCalledWith(
				expect.any(Function),
				'lease.expiring',
				event
			)
		})
	})

	describe('handleTenantInvited', () => {
		it('creates notification for tenant invited event', async () => {
			const event = {
				tenant_id: 'tenant-123',
				lease_id: 'lease-456',
				owner_id: 'owner-789',
				checkoutUrl: 'https://checkout.stripe.com/abc'
			}

			// Mock the database queries for tenant and lease info
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockImplementation((table: string) => {
				if (table === 'tenants') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockReturnValue({
								single: jest.fn().mockResolvedValue({
									data: {
										id: 'tenant-123',
										user_id: 'user-abc',
										user: { first_name: 'John', last_name: 'Doe', email: 'john@test.com' }
									},
									error: null
								})
							})
						})
					}
				}
				if (table === 'leases') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockReturnValue({
								single: jest.fn().mockResolvedValue({
									data: {
										id: 'lease-456',
										unit_id: 'unit-789',
										unit: {
											unit_number: '101',
											property_id: 'prop-abc',
											property: { name: 'Sunset Apartments' }
										}
									},
									error: null
								})
							})
						})
					}
				}
				if (table === 'notifications') {
					return {
						insert: jest.fn().mockResolvedValue({ error: null })
					}
				}
				return { select: jest.fn().mockReturnThis() }
			})

			await service.handleTenantInvited(event)

			expect(mockFailedNotifications.retryWithBackoff).toHaveBeenCalledWith(
				expect.any(Function),
				'tenant.invited',
				event
			)
		})
	})

	describe('handleTenantInvitationSent', () => {
		it('sends invitation email for tenant invitation sent event', async () => {
			const event = {
				email: 'tenant@example.com',
				tenant_id: 'tenant-123',
				invitationCode: 'inv-abc-123',
				invitationUrl: 'https://app.example.com/invite/abc',
				expiresAt: '2025-01-15T00:00:00Z'
			}

			// Mock the invitation query
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockImplementation((table: string) => {
				if (table === 'tenant_invitations') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockReturnValue({
								single: jest.fn().mockResolvedValue({
									data: {
										id: 'inv-123',
										email: 'tenant@example.com',
										unit_id: 'unit-456',
										property_owner_id: 'owner-789',
										owner: {
											user_id: 'user-abc',
											user: { first_name: 'Property', last_name: 'Owner' }
										},
										unit: {
											unit_number: '202',
											property_id: 'prop-def',
											property: { name: 'Harbor View' }
										}
									},
									error: null
								})
							})
						})
					}
				}
				return { select: jest.fn().mockReturnThis() }
			})

			await service.handleTenantInvitationSent(event)

			expect(mockEmailService.sendTenantInvitationEmail).toHaveBeenCalledWith({
				tenantEmail: 'tenant@example.com',
				invitationUrl: 'https://app.example.com/invite/abc',
				expiresAt: '2025-01-15T00:00:00Z',
				propertyName: 'Harbor View',
				unitNumber: '202',
				ownerName: 'Property Owner'
			})
		})
	})

	describe('handleTenantPlatformInvitationSent', () => {
		it('sends invitation email for platform invitation event (no property/unit)', async () => {
			const event = {
				email: 'tenant@example.com',
				first_name: 'John',
				last_name: 'Doe',
				invitation_id: 'inv-123',
				invitation_url: 'https://app.tenantflow.app/accept-invite?code=abc123',
				expires_at: '2025-01-15T00:00:00Z'
			}

			await service.handleTenantPlatformInvitationSent(event)

			expect(mockEmailService.sendTenantInvitationEmail).toHaveBeenCalledWith({
				tenantEmail: 'tenant@example.com',
				invitationUrl: 'https://app.tenantflow.app/accept-invite?code=abc123',
				expiresAt: '2025-01-15T00:00:00Z'
			})
		})

		it('includes property and unit details when provided', async () => {
			const event = {
				email: 'tenant@example.com',
				first_name: 'John',
				last_name: 'Doe',
				invitation_id: 'inv-123',
				invitation_url: 'https://app.tenantflow.app/accept-invite?code=abc123',
				expires_at: '2025-01-15T00:00:00Z',
				property_id: 'prop-456',
				unit_id: 'unit-789'
			}

			// Mock property and unit queries
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockImplementation((table: string) => {
				if (table === 'properties') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockReturnValue({
								single: jest.fn().mockResolvedValue({
									data: {
										name: 'Sunset Apartments',
										property_owner_id: 'owner-abc',
										owner: {
											user_id: 'user-xyz',
											user: { first_name: 'Property', last_name: 'Owner' }
										}
									},
									error: null
								})
							})
						})
					}
				}
				if (table === 'units') {
					return {
						select: jest.fn().mockReturnValue({
							eq: jest.fn().mockReturnValue({
								single: jest.fn().mockResolvedValue({
									data: { unit_number: '101' },
									error: null
								})
							})
						})
					}
				}
				return { select: jest.fn().mockReturnThis() }
			})

			await service.handleTenantPlatformInvitationSent(event)

			expect(mockEmailService.sendTenantInvitationEmail).toHaveBeenCalledWith({
				tenantEmail: 'tenant@example.com',
				invitationUrl: 'https://app.tenantflow.app/accept-invite?code=abc123',
				expiresAt: '2025-01-15T00:00:00Z',
				propertyName: 'Sunset Apartments',
				unitNumber: '101',
				ownerName: 'Property Owner'
			})
		})

		it('handles missing property/unit gracefully', async () => {
			const event = {
				email: 'tenant@example.com',
				invitation_id: 'inv-123',
				invitation_url: 'https://app.tenantflow.app/accept-invite?code=abc123',
				expires_at: '2025-01-15T00:00:00Z',
				property_id: 'prop-456'
			}

			// Mock property query returning error
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockImplementation(() => ({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue({
							data: null,
							error: { message: 'Not found' }
						})
					})
				})
			}))

			await service.handleTenantPlatformInvitationSent(event)

			// Should still send email without property details
			expect(mockEmailService.sendTenantInvitationEmail).toHaveBeenCalledWith({
				tenantEmail: 'tenant@example.com',
				invitationUrl: 'https://app.tenantflow.app/accept-invite?code=abc123',
				expiresAt: '2025-01-15T00:00:00Z'
			})
		})
	})
})
