import { Test } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { createMockSupabaseService } from '../../test-utils/mocks'
import { EmailService } from '../email/email.service'
import { TenantsService } from './tenants.service'

describe('TenantsService.getSummary', () => {
	let tenantsService: TenantsService
	let mockSupabaseService: ReturnType<typeof createMockSupabaseService>
	let mockEventEmitter: jest.Mocked<EventEmitter2>
	let mockEmailService: jest.Mocked<EmailService>

	beforeEach(async () => {
		mockSupabaseService = createMockSupabaseService()
		mockEventEmitter = {
			emit: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>
		mockEmailService = {
			sendTenantInvitation: jest.fn()
		} as unknown as jest.Mocked<EmailService>

		const moduleRef = await Test.createTestingModule({
			providers: [
				TenantsService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: EmailService, useValue: mockEmailService }
			]
		}).compile()

		tenantsService = moduleRef.get(TenantsService)
	})

	it('should compute totals and return a TenantSummary', async () => {
		const fakeAdminClient: any = {
			from: (table: string) => {
				const chain: any = {
					_table: table,
					_selectCols: undefined,
					select(cols: string) {
						this._selectCols = cols
						return this
					},
					eq() {
						return this
					},
					lt() {
						return this
					},
					lte() {
						return this
					},
					gte() {
						return this
					},
					neq() {
						return this
					},
					then: function (resolve: any) {
						let data: any[] = []
						const t = this._table
						const cols = this._selectCols
						if (t === 'tenant') {
							data = [
								{ id: 't1', invitation_status: 'PENDING', status: 'ACTIVE' },
								{ id: 't2', invitation_status: 'SENT', status: 'PENDING' }
							]
						} else if (t === 'rent_payment' && /sum\(/.test(cols || '')) {
							if (!fakeAdminClient._aggCalled) {
								fakeAdminClient._aggCalled = 1
								data = [{ sum: '5000' }]
							} else {
								data = [{ sum: '12000' }]
							}
						}
						return Promise.resolve({ data, error: null }).then(resolve)
					}
				}
				return chain
			}
		}

		mockSupabaseService.getAdminClient.mockReturnValue(fakeAdminClient as any)

		const summary = await tenantsService.getSummary('user-123')

		expect(summary).toBeDefined()
		expect(summary.total).toBe(2)
		expect(summary.invited).toBe(2)
		expect(summary.active).toBe(2)
		expect(summary.overdueBalanceCents).toBe(5000)
		expect(summary.upcomingDueCents).toBe(12000)
		expect(typeof summary.timestamp).toBe('string')
	})
})

describe('TenantsService.sendTenantInvitationV2', () => {
	let tenantsService: TenantsService
	let mockSupabaseService: ReturnType<typeof createMockSupabaseService>
	let mockEventEmitter: jest.Mocked<EventEmitter2>
	let mockEmailService: jest.Mocked<EmailService>

	beforeEach(async () => {
		mockSupabaseService = createMockSupabaseService()
		mockEventEmitter = {
			emit: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>
		mockEmailService = {
			sendTenantInvitation: jest.fn()
		} as unknown as jest.Mocked<EmailService>

		const moduleRef = await Test.createTestingModule({
			providers: [
				TenantsService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: EmailService, useValue: mockEmailService }
			]
		}).compile()

		tenantsService = moduleRef.get(TenantsService)
	})

	it('should send invitation via Supabase Auth', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-456'
		const propertyId = 'property-789'
		const leaseId = 'lease-101'

		// Mock tenant lookup
		const mockTenant = {
			id: tenantId,
			userId,
			email: 'tenant@example.com',
			firstName: 'John',
			lastName: 'Doe',
			auth_user_id: null // No existing auth user
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const queryBuilder: any = {
					select: jest.fn(() => queryBuilder),
					eq: jest.fn(() => queryBuilder),
					update: jest.fn(() => queryBuilder),
					maybeSingle: jest.fn(() =>
						Promise.resolve({ data: mockTenant, error: null })
					),
					single: jest.fn(() =>
						Promise.resolve({ data: mockTenant, error: null })
					)
				}
				return queryBuilder
			}),
			auth: {
				admin: {
					listUsers: jest.fn(() =>
						Promise.resolve({
							data: {
								users: []
							},
							error: null
						})
					),
					inviteUserByEmail: jest.fn(() =>
						Promise.resolve({
							data: {
								user: { id: 'auth-user-789' }
							},
							error: null
						})
					)
				}
			}
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.sendTenantInvitationV2(
			userId,
			tenantId,
			propertyId,
			leaseId
		)

		expect(result.success).toBe(true)
		expect(result.authUserId).toBe('auth-user-789')
		expect(mockAdminClient.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
			'tenant@example.com',
			expect.objectContaining({
				data: expect.objectContaining({
					tenantId,
					propertyId,
					leaseId,
					firstName: 'John',
					lastName: 'Doe',
					role: 'tenant'
				})
			})
		)
	})

	it('should reject duplicate invitations', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-456'

		// Mock tenant with existing auth_user_id
		const mockTenant = {
			id: tenantId,
			userId,
			email: 'tenant@example.com',
			auth_user_id: 'existing-auth-user-123'
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const queryBuilder: any = {
					select: jest.fn(() => queryBuilder),
					eq: jest.fn(() => queryBuilder),
					maybeSingle: jest.fn(() =>
						Promise.resolve({ data: mockTenant, error: null })
					),
					single: jest.fn(() =>
						Promise.resolve({ data: mockTenant, error: null })
					)
				}
				return queryBuilder
			})
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.sendTenantInvitationV2(
			userId,
			tenantId
		)

		expect(result.success).toBe(false)
		expect(result.message).toBe('Tenant already has an account')
		expect(result.authUserId).toBe('existing-auth-user-123')
	})
})

describe('TenantsService.activateTenantFromAuthUser', () => {
	let tenantsService: TenantsService
	let mockSupabaseService: ReturnType<typeof createMockSupabaseService>
	let mockEventEmitter: jest.Mocked<EventEmitter2>
	let mockEmailService: jest.Mocked<EmailService>

	beforeEach(async () => {
		mockSupabaseService = createMockSupabaseService()
		mockEventEmitter = {
			emit: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>
		mockEmailService = {
			sendTenantInvitation: jest.fn()
		} as unknown as jest.Mocked<EmailService>

		const moduleRef = await Test.createTestingModule({
			providers: [
				TenantsService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: EmailService, useValue: mockEmailService }
			]
		}).compile()

		tenantsService = moduleRef.get(TenantsService)
	})

	it('should activate tenant from auth user ID', async () => {
		const authUserId = 'auth-user-123'
		const tenantId = 'tenant-456'

		const mockAdminClient: any = {
			rpc: jest.fn(() =>
				Promise.resolve({
					data: [{ tenant_id: tenantId, activated: true }],
					error: null
				})
			)
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.activateTenantFromAuthUser(authUserId)

		expect(result.success).toBe(true)
		expect(result.tenantId).toBe(tenantId)
		expect(result.message).toBe('Tenant activated successfully')
		expect(mockAdminClient.rpc).toHaveBeenCalledWith(
			'activate_tenant_from_auth_user',
			{ p_auth_user_id: authUserId }
		)
	})

	it('should handle tenant not found', async () => {
		const authUserId = 'auth-user-nonexistent'

		const mockAdminClient: any = {
			rpc: jest.fn(() =>
				Promise.resolve({
					data: [],
					error: null
				})
			)
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.activateTenantFromAuthUser(authUserId)

		expect(result.success).toBe(false)
		expect(result.message).toBe('Tenant not found')
	})

	it('should handle already activated tenant', async () => {
		const authUserId = 'auth-user-123'

		const mockAdminClient: any = {
			rpc: jest.fn(() =>
				Promise.resolve({
					data: [{ tenant_id: 'tenant-456', activated: false }],
					error: null
				})
			)
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.activateTenantFromAuthUser(authUserId)

		expect(result.success).toBe(false)
		expect(result.message).toBe('Tenant not found or already activated')
	})
})
