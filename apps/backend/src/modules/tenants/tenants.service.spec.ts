import type { EventEmitter2 } from '@nestjs/event-emitter'
import {
	createMockSupabaseService,
	createMockStripeConnectService,
	createMockAppConfigService
} from '../../test-utils/mocks'
import { TenantsService } from './tenants.service'

/**
 * Test helper: Creates TenantsService with mocked dependencies
 * Consolidates service instantiation to reduce duplication across test suites
 */
function createTenantsServiceWithMocks() {
	const mockSupabaseService = createMockSupabaseService()
	const mockStripeConnectService = createMockStripeConnectService()
	const mockEventEmitter = {
		emit: jest.fn()
	} as unknown as jest.Mocked<EventEmitter2>
	const mockAppConfigService = createMockAppConfigService()

	// Directly instantiate the service to avoid Nest DI resolution issues
	const tenantsService = new TenantsService(
		mockSupabaseService as any,
		mockEventEmitter as any,
		mockStripeConnectService as any,
		mockAppConfigService as any
	)

	return {
		tenantsService,
		mockSupabaseService,
		mockStripeConnectService,
		mockEventEmitter,
		mockAppConfigService
	}
}

describe('TenantsService.getSummary', () => {
	let tenantsService: TenantsService
	let mockSupabaseService: ReturnType<typeof createMockSupabaseService>

	beforeEach(async () => {
		const mocks = createTenantsServiceWithMocks()
		tenantsService = mocks.tenantsService
		mockSupabaseService = mocks.mockSupabaseService
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

	beforeEach(async () => {
		const mocks = createTenantsServiceWithMocks()
		tenantsService = mocks.tenantsService
		mockSupabaseService = mocks.mockSupabaseService
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

		const result = await tenantsService.sendTenantInvitationV2(userId, tenantId)

		expect(result.success).toBe(false)
		expect(result.message).toBe('Tenant already has an account')
		expect(result.authUserId).toBe('existing-auth-user-123')
	})
})

describe('TenantsService.activateTenantFromAuthUser', () => {
	let tenantsService: TenantsService
	let mockSupabaseService: ReturnType<typeof createMockSupabaseService>

	beforeEach(async () => {
		const mocks = createTenantsServiceWithMocks()
		tenantsService = mocks.tenantsService
		mockSupabaseService = mocks.mockSupabaseService
	})

	it('should activate tenant from auth user ID', async () => {
		const authUserId = 'auth-user-123'
		const tenantId = '00000000-0000-4000-8000-000000000456'

		const mockAdminClient: any = {
			rpc: jest.fn(() =>
				Promise.resolve({
					data: [{ id: tenantId, activated: true }],
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
					data: [{ id: '00000000-0000-4000-8000-000000000456', activated: false }],
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

describe('TenantsService.findOneWithLease - Payment Status Calculation', () => {
	let tenantsService: TenantsService
	let mockSupabaseService: ReturnType<typeof createMockSupabaseService>

	beforeEach(async () => {
		const mocks = createTenantsServiceWithMocks()
		tenantsService = mocks.tenantsService
		mockSupabaseService = mocks.mockSupabaseService
	})

	it('should return "Current" status when payment is PAID', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-123'
		const leaseId = 'lease-123'

		const mockTenant = {
			id: tenantId,
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			phone: null,
			avatarUrl: null,
			emergencyContact: null,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
			invitation_status: null,
			invitation_sent_at: null,
			invitation_accepted_at: null,
			invitation_expires_at: null,
			userId,
			lease: {
				id: leaseId,
				startDate: '2025-01-01',
				endDate: '2025-12-31',
				rentAmount: 150000,
				securityDeposit: 150000,
				status: 'ACTIVE',
				terms: null,
				unit: {
					id: 'unit-123',
					unitNumber: '101',
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 1000,
					property: {
						id: 'prop-123',
						name: 'Test Property',
						address: '123 Main St',
						city: 'Test City',
						state: 'TS',
						zipCode: '12345'
					}
				}
			}
		}

		const mockPayment = {
			status: 'PAID',
			dueDate: '2025-01-01T00:00:00Z'
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const chain: any = {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest
						.fn()
						.mockResolvedValue({ data: mockTenant, error: null }),
					order: jest.fn().mockReturnThis(),
					limit: jest
						.fn()
						.mockResolvedValue({ data: [mockPayment], error: null })
				}
				return chain
			})
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.findOneWithLease(userId, tenantId)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Current')
	})

	it('should return "Overdue" status when payment is DUE and past due date', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-123'
		const leaseId = 'lease-123'

		const mockTenant = {
			id: tenantId,
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			phone: null,
			avatarUrl: null,
			emergencyContact: null,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
			invitation_status: null,
			invitation_sent_at: null,
			invitation_accepted_at: null,
			invitation_expires_at: null,
			userId,
			lease: {
				id: leaseId,
				startDate: '2025-01-01',
				endDate: '2025-12-31',
				rentAmount: 150000,
				securityDeposit: 150000,
				status: 'ACTIVE',
				terms: null,
				unit: {
					id: 'unit-123',
					unitNumber: '101',
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 1000,
					property: {
						id: 'prop-123',
						name: 'Test Property',
						address: '123 Main St',
						city: 'Test City',
						state: 'TS',
						zipCode: '12345'
					}
				}
			}
		}

		const pastDate = new Date()
		pastDate.setDate(pastDate.getDate() - 30)

		const mockPayment = {
			status: 'DUE',
			dueDate: pastDate.toISOString()
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const chain: any = {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest
						.fn()
						.mockResolvedValue({ data: mockTenant, error: null }),
					order: jest.fn().mockReturnThis(),
					limit: jest
						.fn()
						.mockResolvedValue({ data: [mockPayment], error: null })
				}
				return chain
			})
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.findOneWithLease(userId, tenantId)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Overdue')
	})

	it('should return "Due Soon" status when payment is DUE but not past due date', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-123'
		const leaseId = 'lease-123'

		const mockTenant = {
			id: tenantId,
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			phone: null,
			avatarUrl: null,
			emergencyContact: null,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
			invitation_status: null,
			invitation_sent_at: null,
			invitation_accepted_at: null,
			invitation_expires_at: null,
			userId,
			lease: {
				id: leaseId,
				startDate: '2025-01-01',
				endDate: '2025-12-31',
				rentAmount: 150000,
				securityDeposit: 150000,
				status: 'ACTIVE',
				terms: null,
				unit: {
					id: 'unit-123',
					unitNumber: '101',
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 1000,
					property: {
						id: 'prop-123',
						name: 'Test Property',
						address: '123 Main St',
						city: 'Test City',
						state: 'TS',
						zipCode: '12345'
					}
				}
			}
		}

		const futureDate = new Date()
		futureDate.setDate(futureDate.getDate() + 5)

		const mockPayment = {
			status: 'DUE',
			dueDate: futureDate.toISOString()
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const chain: any = {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest
						.fn()
						.mockResolvedValue({ data: mockTenant, error: null }),
					order: jest.fn().mockReturnThis(),
					limit: jest
						.fn()
						.mockResolvedValue({ data: [mockPayment], error: null })
				}
				return chain
			})
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.findOneWithLease(userId, tenantId)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Due Soon')
	})

	it('should return "Payment Failed" status when payment is FAILED', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-123'
		const leaseId = 'lease-123'

		const mockTenant = {
			id: tenantId,
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			phone: null,
			avatarUrl: null,
			emergencyContact: null,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
			invitation_status: null,
			invitation_sent_at: null,
			invitation_accepted_at: null,
			invitation_expires_at: null,
			userId,
			lease: {
				id: leaseId,
				startDate: '2025-01-01',
				endDate: '2025-12-31',
				rentAmount: 150000,
				securityDeposit: 150000,
				status: 'ACTIVE',
				terms: null,
				unit: {
					id: 'unit-123',
					unitNumber: '101',
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 1000,
					property: {
						id: 'prop-123',
						name: 'Test Property',
						address: '123 Main St',
						city: 'Test City',
						state: 'TS',
						zipCode: '12345'
					}
				}
			}
		}

		const mockPayment = {
			status: 'FAILED',
			dueDate: '2025-01-01T00:00:00Z'
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const chain: any = {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest
						.fn()
						.mockResolvedValue({ data: mockTenant, error: null }),
					order: jest.fn().mockReturnThis(),
					limit: jest
						.fn()
						.mockResolvedValue({ data: [mockPayment], error: null })
				}
				return chain
			})
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.findOneWithLease(userId, tenantId)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Payment Failed')
	})

	it('should return "Action Required" status when payment is REQUIRES_ACTION', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-123'
		const leaseId = 'lease-123'

		const mockTenant = {
			id: tenantId,
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			phone: null,
			avatarUrl: null,
			emergencyContact: null,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
			invitation_status: null,
			invitation_sent_at: null,
			invitation_accepted_at: null,
			invitation_expires_at: null,
			userId,
			lease: {
				id: leaseId,
				startDate: '2025-01-01',
				endDate: '2025-12-31',
				rentAmount: 150000,
				securityDeposit: 150000,
				status: 'ACTIVE',
				terms: null,
				unit: {
					id: 'unit-123',
					unitNumber: '101',
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 1000,
					property: {
						id: 'prop-123',
						name: 'Test Property',
						address: '123 Main St',
						city: 'Test City',
						state: 'TS',
						zipCode: '12345'
					}
				}
			}
		}

		const mockPayment = {
			status: 'REQUIRES_ACTION',
			dueDate: '2025-01-01T00:00:00Z'
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const chain: any = {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest
						.fn()
						.mockResolvedValue({ data: mockTenant, error: null }),
					order: jest.fn().mockReturnThis(),
					limit: jest
						.fn()
						.mockResolvedValue({ data: [mockPayment], error: null })
				}
				return chain
			})
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.findOneWithLease(userId, tenantId)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBe('Action Required')
	})

	it('should return null status when no payment data exists', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-123'
		const leaseId = 'lease-123'

		const mockTenant = {
			id: tenantId,
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			phone: null,
			avatarUrl: null,
			emergencyContact: null,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
			invitation_status: null,
			invitation_sent_at: null,
			invitation_accepted_at: null,
			invitation_expires_at: null,
			userId,
			lease: {
				id: leaseId,
				startDate: '2025-01-01',
				endDate: '2025-12-31',
				rentAmount: 150000,
				securityDeposit: 150000,
				status: 'ACTIVE',
				terms: null,
				unit: {
					id: 'unit-123',
					unitNumber: '101',
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 1000,
					property: {
						id: 'prop-123',
						name: 'Test Property',
						address: '123 Main St',
						city: 'Test City',
						state: 'TS',
						zipCode: '12345'
					}
				}
			}
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const chain: any = {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest
						.fn()
						.mockResolvedValue({ data: mockTenant, error: null }),
					order: jest.fn().mockReturnThis(),
					limit: jest.fn().mockResolvedValue({ data: [], error: null })
				}
				return chain
			})
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.findOneWithLease(userId, tenantId)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBeNull()
	})

	it('should return null status when payment status is CANCELLED', async () => {
		const userId = 'user-123'
		const tenantId = 'tenant-123'
		const leaseId = 'lease-123'

		const mockTenant = {
			id: tenantId,
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			phone: null,
			avatarUrl: null,
			emergencyContact: null,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
			invitation_status: null,
			invitation_sent_at: null,
			invitation_accepted_at: null,
			invitation_expires_at: null,
			userId,
			lease: {
				id: leaseId,
				startDate: '2025-01-01',
				endDate: '2025-12-31',
				rentAmount: 150000,
				securityDeposit: 150000,
				status: 'ACTIVE',
				terms: null,
				unit: {
					id: 'unit-123',
					unitNumber: '101',
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 1000,
					property: {
						id: 'prop-123',
						name: 'Test Property',
						address: '123 Main St',
						city: 'Test City',
						state: 'TS',
						zipCode: '12345'
					}
				}
			}
		}

		const mockPayment = {
			status: 'CANCELLED',
			dueDate: '2025-01-01T00:00:00Z'
		}

		const mockAdminClient: any = {
			from: jest.fn((_table: string) => {
				const chain: any = {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest
						.fn()
						.mockResolvedValue({ data: mockTenant, error: null }),
					order: jest.fn().mockReturnThis(),
					limit: jest
						.fn()
						.mockResolvedValue({ data: [mockPayment], error: null })
				}
				return chain
			})
		}

		mockSupabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const result = await tenantsService.findOneWithLease(userId, tenantId)

		expect(result).toBeDefined()
		expect(result?.paymentStatus).toBeNull()
	})
})
