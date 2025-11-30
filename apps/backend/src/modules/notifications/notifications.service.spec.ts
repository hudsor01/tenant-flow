import { Test, type TestingModule } from '@nestjs/testing'
import { NotificationsService } from './notifications.service'
import { SupabaseService } from '../../database/supabase.service'
import { FailedNotificationsService } from './failed-notifications.service'
import { AppConfigService } from '../../config/app-config.service'
import { EmailService } from '../email/email.service'

/**
 * Focused resilience tests: email delivery failures must NOT bubble up and
 * block the lease signature workflow that emits these events.
 */
describe('NotificationsService – email failure resilience', () => {
	let service: NotificationsService

	const mockSupabaseService: jest.Mocked<Partial<SupabaseService>> = {
		getAdminClient: jest.fn()
	}

	const mockFailedNotifications: jest.Mocked<Partial<FailedNotificationsService>> = {
		retryWithBackoff: jest.fn()
	}

	const mockConfig: jest.Mocked<Partial<AppConfigService>> = {
		getFrontendUrl: jest.fn(() => 'https://frontend.example')
	}

	const mockEmailService: jest.Mocked<Partial<EmailService>> = {
		sendTenantSignedEmail: jest.fn()
	}

	beforeEach(async () => {
		// Simple Supabase query chain helper
		const chainFactory = (data: unknown) => {
			const chain: any = {
				select: jest.fn(() => chain),
				eq: jest.fn(() => chain),
				single: jest.fn(async () => ({ data, error: null }))
			}
			return chain
		}

		let userQueryCount = 0
		const supabaseClient = {
			from: jest.fn((table: string) => {
				switch (table) {
					case 'leases':
						return chainFactory({
							id: 'lease-123',
							property_owner_id: 'owner-111',
							primary_tenant_id: 'tenant-222',
							unit: { property: { name: 'Test Property' }, unit_number: '1A' }
						})
					case 'tenants':
						return chainFactory({ user_id: 'tenant-user-999' })
					case 'users': {
						userQueryCount += 1
						// First users query is for owner, second for tenant
						if (userQueryCount === 1) {
							return chainFactory({
								email: 'owner@example.com',
								first_name: 'Olivia',
								last_name: 'Owner'
							})
						}

						return chainFactory({
							email: 'tenant@example.com',
							first_name: 'Tina',
							last_name: 'Tenant'
						})
					}
					default:
						return chainFactory(null)
				}
			})
		}

		mockSupabaseService.getAdminClient = jest.fn(() => supabaseClient) as any

		mockEmailService.sendTenantSignedEmail = jest.fn().mockRejectedValue(new Error('SMTP down'))

		mockFailedNotifications.retryWithBackoff = jest.fn(async (operation, eventType) => {
			// Retry service should swallow failures so upstream callers never throw
			expect(eventType).toBe('lease.tenant_signed')
			try {
				await operation()
			} catch (_err) {
				return null
			}
			return null
		}) as any

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				NotificationsService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: FailedNotificationsService, useValue: mockFailedNotifications },
				{ provide: AppConfigService, useValue: mockConfig },
				{ provide: EmailService, useValue: mockEmailService }
			]
		}).compile()

		service = module.get<NotificationsService>(NotificationsService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('does not propagate email delivery failures when tenant signs', async () => {
		await expect(
			service.handleLeaseTenantSigned({
				lease_id: 'lease-123',
				tenant_id: 'tenant-222',
				signed_at: '2024-01-01T00:00:00Z'
			})
		).resolves.toBeUndefined()

		expect(mockFailedNotifications.retryWithBackoff).toHaveBeenCalledTimes(1)
		expect(mockEmailService.sendTenantSignedEmail).toHaveBeenCalledTimes(1)
	})
})
