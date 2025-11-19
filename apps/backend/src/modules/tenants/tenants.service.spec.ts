import { TenantsService } from './tenants.service'
import type { TenantListService } from './tenant-list.service'
import type { TenantDetailService } from './tenant-detail.service'
import type { TenantStatsService } from './tenant-stats.service'
import type { TenantRelationsService } from './tenant-relations.service'
import type { TenantCrudService } from './tenant-crud.service'
import type { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import type { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import type { TenantAnalyticsService } from './tenant-analytics.service'
import type { TenantInvitationService } from './tenant-invitation.service'
import type { TenantInvitationTokenService } from './tenant-invitation-token.service'
import type { TenantResendInvitationService } from './tenant-resend-invitation.service'

/**
 * Test helper: Creates TenantsService with all mocked sub-services
 */
function createTenantsServiceWithMocks() {
	const mockListService = {
		findAll: jest.fn(),
		findAllWithActiveLease: jest.fn()
	} as unknown as TenantListService

	const mockDetailService = {
		findById: jest.fn(),
		findByIdWithLeases: jest.fn(),
		findByAuthUserId: jest.fn()
	} as unknown as TenantDetailService

	const mockStatsService = {
		getStatusCounts: jest.fn(),
		getSummary: jest.fn()
	} as unknown as TenantStatsService

	const mockRelationsService = {
		getOwnerPropertyIds: jest.fn(),
		getTenantIdsForOwner: jest.fn(),
		getPaymentHistory: jest.fn(),
		fetchPaymentStatuses: jest.fn()
	} as unknown as TenantRelationsService

	const mockCrudService = {
		create: jest.fn(),
		update: jest.fn(),
		softDelete: jest.fn(),
		hardDelete: jest.fn()
	} as unknown as TenantCrudService

	const mockEmergencyContactService = {
		getEmergencyContact: jest.fn(),
		createEmergencyContact: jest.fn(),
		updateEmergencyContact: jest.fn(),
		deleteEmergencyContact: jest.fn()
	} as unknown as TenantEmergencyContactService

	const mockNotificationPreferencesService = {
		getPreferences: jest.fn(),
		updatePreferences: jest.fn()
	} as unknown as TenantNotificationPreferencesService

	const mockAnalyticsService = {
		calculatePaymentStatus: jest.fn(),
		getOwnerPaymentSummary: jest.fn(),
		sendPaymentReminder: jest.fn(),
		queryTenantPayments: jest.fn(),
		mapPaymentIntentToRecord: jest.fn(),
		isLateFeeRecord: jest.fn()
	} as unknown as TenantAnalyticsService

	const mockInvitationService = {
		inviteTenantWithLease: jest.fn(),
		checkExistingAuthUser: jest.fn()
	} as unknown as TenantInvitationService

	const mockInvitationTokenService = {
		validateToken: jest.fn(),
		acceptToken: jest.fn(),
		activateTenantFromAuthUser: jest.fn()
	} as unknown as TenantInvitationTokenService

	const mockResendInvitationService = {
		resendInvitation: jest.fn()
	} as unknown as TenantResendInvitationService

	const tenantsService = new TenantsService(
		mockListService,
		mockDetailService,
		mockStatsService,
		mockRelationsService,
		mockCrudService,
		mockEmergencyContactService,
		mockNotificationPreferencesService,
		mockAnalyticsService,
		mockInvitationService,
		mockInvitationTokenService,
		mockResendInvitationService
	)

	return {
		tenantsService,
		mockListService,
		mockDetailService,
		mockStatsService,
		mockRelationsService,
		mockCrudService,
		mockEmergencyContactService,
		mockNotificationPreferencesService,
		mockAnalyticsService,
		mockInvitationService,
		mockInvitationTokenService,
		mockResendInvitationService
	}
}

describe('TenantsService.getSummary', () => {
	let tenantsService: TenantsService
	let mockStatsService: TenantStatsService

	beforeEach(() => {
		const mocks = createTenantsServiceWithMocks()
		tenantsService = mocks.tenantsService
		mockStatsService = mocks.mockStatsService
	})

	it('should compute totals and return a TenantSummary', async () => {
		const mockSummary = {
			total: 2,
			invited: 0,
			active: 2,
			overdueBalanceCents: 5000,
			upcomingDueCents: 12000,
			timestamp: '2025-01-01T00:00:00Z'
		}

		;(mockStatsService.getSummary as jest.Mock).mockResolvedValue(mockSummary)

		const summary = await tenantsService.getSummary('user-123')

		expect(summary).toBeDefined()
		expect(summary.total).toBe(2)
		expect(summary.invited).toBe(0)
		expect(summary.active).toBe(2)
		expect(mockStatsService.getSummary).toHaveBeenCalledWith('user-123')
	})
})

describe('TenantsService.findOneWithLease', () => {
	let tenantsService: TenantsService
	let mockDetailService: TenantDetailService

	beforeEach(() => {
		const mocks = createTenantsServiceWithMocks()
		tenantsService = mocks.tenantsService
		mockDetailService = mocks.mockDetailService
	})

	it('should return tenant with lease info', async () => {
		const tenant_id = 'tenant-123'
		const mockTenantWithLease = {
			id: tenant_id,
			user_id: 'user-123',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			paymentStatus: 'Current'
		}

		;(mockDetailService.findByIdWithLeases as jest.Mock).mockResolvedValue(mockTenantWithLease)

		const result = await tenantsService.findOneWithLease(tenant_id)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Current')
		expect(mockDetailService.findByIdWithLeases).toHaveBeenCalledWith(tenant_id)
	})

	it('should return "Overdue" status when payment is past due', async () => {
		const tenant_id = 'tenant-123'
		const mockTenantWithLease = {
			id: tenant_id,
			user_id: 'user-123',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			paymentStatus: 'Overdue'
		}

		;(mockDetailService.findByIdWithLeases as jest.Mock).mockResolvedValue(mockTenantWithLease)

		const result = await tenantsService.findOneWithLease(tenant_id)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Overdue')
	})

	it('should return "Due Soon" status when payment is coming due', async () => {
		const tenant_id = 'tenant-123'
		const mockTenantWithLease = {
			id: tenant_id,
			user_id: 'user-123',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			paymentStatus: 'Due Soon'
		}

		;(mockDetailService.findByIdWithLeases as jest.Mock).mockResolvedValue(mockTenantWithLease)

		const result = await tenantsService.findOneWithLease(tenant_id)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Due Soon')
	})

	it('should return "Payment Failed" status', async () => {
		const tenant_id = 'tenant-123'
		const mockTenantWithLease = {
			id: tenant_id,
			user_id: 'user-123',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			paymentStatus: 'Payment Failed'
		}

		;(mockDetailService.findByIdWithLeases as jest.Mock).mockResolvedValue(mockTenantWithLease)

		const result = await tenantsService.findOneWithLease(tenant_id)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Payment Failed')
	})

	it('should return "Action Required" status', async () => {
		const tenant_id = 'tenant-123'
		const mockTenantWithLease = {
			id: tenant_id,
			user_id: 'user-123',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			paymentStatus: 'Action Required'
		}

		;(mockDetailService.findByIdWithLeases as jest.Mock).mockResolvedValue(mockTenantWithLease)

		const result = await tenantsService.findOneWithLease(tenant_id)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Action Required')
	})

	it('should return null status when no payment data exists', async () => {
		const tenant_id = 'tenant-123'
		const mockTenantWithLease = {
			id: tenant_id,
			user_id: 'user-123',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			paymentStatus: null
		}

		;(mockDetailService.findByIdWithLeases as jest.Mock).mockResolvedValue(mockTenantWithLease)

		const result = await tenantsService.findOneWithLease(tenant_id)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBeNull()
	})

	it('should return null status when payment is CANCELLED', async () => {
		const tenant_id = 'tenant-123'
		const mockTenantWithLease = {
			id: tenant_id,
			user_id: 'user-123',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			paymentStatus: null
		}

		;(mockDetailService.findByIdWithLeases as jest.Mock).mockResolvedValue(mockTenantWithLease)

		const result = await tenantsService.findOneWithLease(tenant_id)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBeNull()
	})
})

describe('TenantsService.inviteTenantWithLease', () => {
	let tenantsService: TenantsService
	let mockInvitationService: TenantInvitationService

	beforeEach(() => {
		const mocks = createTenantsServiceWithMocks()
		tenantsService = mocks.tenantsService
		mockInvitationService = mocks.mockInvitationService
	})

	it('should send invitation successfully', async () => {
		const user_id = 'user-123'
		const tenant_id = 'tenant-456'
		const lease_id = 'lease-101'

		const inviteResponse = {
			success: true,
			tenant_id,
			lease_id,
			message: 'Tenant invited successfully'
		}

		const dto: any = {
			email: 'tenant@example.com',
			unit_id: 'unit-789',
			first_name: 'John',
			last_name: 'Doe',
			lease_start_date: '2025-01-01',
			lease_end_date: '2025-12-31',
			rent_amount: 1500
		}

		;(mockInvitationService.inviteTenantWithLease as jest.Mock).mockResolvedValue(inviteResponse)

		const result = await tenantsService.inviteTenantWithLease(user_id, dto)

		expect(result.success).toBe(true)
		expect(result.tenant_id).toBe(tenant_id)
		expect(result.lease_id).toBe(lease_id)
	})
})

describe('TenantsService.activateTenantFromAuthUser', () => {
	let tenantsService: TenantsService
	let mockInvitationTokenService: TenantInvitationTokenService

	beforeEach(() => {
		const mocks = createTenantsServiceWithMocks()
		tenantsService = mocks.tenantsService
		mockInvitationTokenService = mocks.mockInvitationTokenService
	})

	it('should activate tenant from auth user ID', async () => {
		const authuser_id = 'auth-user-123'
		const tenant_id = '00000000-0000-4000-8000-000000000456'

		const mockTenant = {
			id: tenant_id,
			user_id: authuser_id,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		}

		;(mockInvitationTokenService.activateTenantFromAuthUser as jest.Mock).mockResolvedValue(mockTenant)

		const result = await tenantsService.activateTenantFromAuthUser(authuser_id)

		expect(result).toBeDefined()
		expect(result.id).toBe(tenant_id)
		expect(mockInvitationTokenService.activateTenantFromAuthUser).toHaveBeenCalledWith(authuser_id)
	})

	it('should handle tenant not found', async () => {
		const authuser_id = 'auth-user-nonexistent'

		;(mockInvitationTokenService.activateTenantFromAuthUser as jest.Mock).mockRejectedValue(
			new Error('Tenant not found')
		)

		const result = tenantsService.activateTenantFromAuthUser(authuser_id)

		expect(result).rejects.toThrow('Tenant not found')
	})
})
