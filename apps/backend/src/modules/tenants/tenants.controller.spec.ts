import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { TenantsController } from './tenants.controller'
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantBulkOperationsService } from './tenant-bulk-operations.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'

// Helper to create mock request with auth headers
function createMockAuthRequest(userId: string = 'user-1'): AuthenticatedRequest {
	return {
		user: { id: userId },
		headers: { authorization: 'Bearer test-token' }
	} as unknown as AuthenticatedRequest
}

describe('TenantsController', () => {
	type TenantControllerRequest = AuthenticatedRequest
	type CreateTenantBody = Parameters<TenantsController['create']>[0]
	type UpdateTenantBody = Parameters<TenantsController['update']>[1]

	let controller: TenantsController
	let mockQueryService: jest.Mocked<TenantQueryService>
	let mockCrudService: jest.Mocked<TenantCrudService>
	let mockBulkOperationsService: Partial<TenantBulkOperationsService>
	let mockNotificationPreferencesService: jest.Mocked<TenantNotificationPreferencesService>

	beforeEach(async () => {
		mockQueryService = {
			findAll: jest.fn(),
			findAllWithLeaseInfo: jest.fn(),
			findOne: jest.fn(),
			findOneWithLease: jest.fn(),
			getStats: jest.fn(),
			getSummary: jest.fn(),
			getTenantPaymentHistory: jest.fn(),
			getTenantByAuthUserId: jest.fn()
		} as unknown as jest.Mocked<TenantQueryService>

		mockCrudService = {
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			hardDelete: jest.fn()
		} as unknown as jest.Mocked<TenantCrudService>

		mockNotificationPreferencesService = {
			getPreferences: jest.fn(),
			updatePreferences: jest.fn()
		} as unknown as jest.Mocked<TenantNotificationPreferencesService>

		mockBulkOperationsService = {
			bulkUpdate: jest.fn(),
			bulkDelete: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [TenantsController],
			providers: [
				{ provide: TenantQueryService, useValue: mockQueryService },
				{ provide: TenantCrudService, useValue: mockCrudService },
				{
					provide: TenantBulkOperationsService,
					useValue: mockBulkOperationsService
				},
				{
					provide: TenantNotificationPreferencesService,
					useValue: mockNotificationPreferencesService
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.overrideGuard(PropertyOwnershipGuard)
			.useValue({ canActivate: () => true })
			.compile()

		controller = module.get<TenantsController>(TenantsController)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('Query Endpoints', () => {
		describe('findAll', () => {
			it('should return all tenants with lease info in PaginatedResponse format', async () => {
				const mockReq = createMockAuthRequest()
				const mockTenants = [{ id: 'tenant-1', first_name: 'John' }]
				mockQueryService.findAllWithLeaseInfo.mockResolvedValue({
					data: mockTenants,
					count: 25
				})

				const result = await controller.findAll(mockReq)

				expect(result).toEqual({ data: mockTenants, total: 25 })
				expect(mockQueryService.findAllWithLeaseInfo).toHaveBeenCalledWith(
					'user-1',
					{ token: 'test-token' }
				)
			})
		})

		describe('getStats', () => {
			it('should return tenant statistics', async () => {
				const mockReq = createMockAuthRequest()
				const mockStats = { total: 10, active: 8 }
				mockQueryService.getStats.mockResolvedValue(mockStats)

				const result = await controller.getStats(mockReq)

				expect(result).toEqual(mockStats)
			})
		})

		describe('getSummary', () => {
			it('should return tenant summary', async () => {
				const mockReq = createMockAuthRequest()
				const mockSummary = { totalTenants: 10 }
				mockQueryService.getSummary.mockResolvedValue(mockSummary)

				const result = await controller.getSummary(mockReq)

				expect(result).toEqual(mockSummary)
			})
		})

		describe('findOne', () => {
			it('should return a single tenant', async () => {
				const mockReq = createMockAuthRequest()
				const mockTenant = {
					id: 'tenant-1',
					first_name: 'John',
					last_name: 'Doe'
				}
				mockQueryService.findOne.mockResolvedValue(mockTenant)

				const result = await controller.findOne('tenant-1', mockReq)

				expect(result).toEqual(mockTenant)
				expect(mockQueryService.findOne).toHaveBeenCalledWith(
					'tenant-1',
					'test-token'
				)
			})
		})

		describe('findOneWithLease', () => {
			it('should return tenant with lease info', async () => {
				const mockReq = createMockAuthRequest()
				const mockTenant = {
					id: 'tenant-1',
					first_name: 'John',
					lease: { id: 'lease-1' }
				}
				mockQueryService.findOneWithLease.mockResolvedValue(mockTenant)

				const result = await controller.findOneWithLease('tenant-1', mockReq)

				expect(result).toEqual(mockTenant)
				expect(mockQueryService.findOneWithLease).toHaveBeenCalledWith(
					'tenant-1',
					'test-token'
				)
			})
		})
	})

	describe('CRUD Endpoints', () => {
		describe('create', () => {
			it('should create a new tenant', async () => {
				const mockReq = createMockAuthRequest()
				const createDto = {
					email: 'tenant@example.com',
					first_name: 'John',
					last_name: 'Doe',
					user_id: 'auth-user-1',
					stripe_customer_id: 'cus_test123'
				}
				const mockTenant = { id: 'tenant-1', ...createDto }
				mockCrudService.create.mockResolvedValue(mockTenant)

				const result = await controller.create(
					createDto as CreateTenantBody,
					mockReq
				)

				expect(result).toEqual(mockTenant)
				expect(mockCrudService.create).toHaveBeenCalledWith(
					'user-1',
					createDto,
					'test-token'
				)
			})
		})

		describe('update', () => {
			it('should update a tenant', async () => {
				const mockReq = createMockAuthRequest()
				const updateDto = { first_name: 'Jane' }
				const mockTenant = { id: 'tenant-1', first_name: 'Jane' }
				mockCrudService.update.mockResolvedValue(mockTenant)

				const result = await controller.update(
					'tenant-1',
					updateDto as UpdateTenantBody,
					mockReq
				)

				expect(result).toEqual(mockTenant)
				expect(mockCrudService.update).toHaveBeenCalledWith(
					'user-1',
					'tenant-1',
					updateDto,
					'test-token'
				)
			})
		})

		describe('remove', () => {
			it('should soft delete a tenant', async () => {
				const mockReq = createMockAuthRequest()
				mockCrudService.softDelete.mockResolvedValue(undefined)

				await controller.remove('tenant-1', mockReq)

				expect(mockCrudService.softDelete).toHaveBeenCalledWith(
					'user-1',
					'tenant-1',
					'test-token'
				)
			})
		})

		describe('hardDelete', () => {
			it('should permanently delete a tenant', async () => {
				const mockReq = createMockAuthRequest()
				mockCrudService.hardDelete.mockResolvedValue(undefined)

				await controller.hardDelete('tenant-1', mockReq)

				expect(mockCrudService.hardDelete).toHaveBeenCalledWith(
					'user-1',
					'tenant-1',
					'test-token'
				)
			})
		})
	})

	describe('Notification Preferences Endpoints', () => {
		describe('getNotificationPreferences', () => {
			it('should get notification preferences', async () => {
				const mockReq = createMockAuthRequest()
				const mockPrefs = { email_enabled: true, sms_enabled: false }
				mockNotificationPreferencesService.getPreferences.mockResolvedValue(
					mockPrefs
				)

				const result = await controller.getNotificationPreferences(
					'tenant-1',
					mockReq
				)

				expect(result).toEqual(mockPrefs)
				expect(
					mockNotificationPreferencesService.getPreferences
				).toHaveBeenCalledWith('user-1', 'tenant-1', 'test-token')
			})
		})

		describe('updateNotificationPreferences', () => {
			it('should update notification preferences', async () => {
				const mockReq = createMockAuthRequest()
				const updateDto = { email_enabled: false }
				const mockPrefs = { email_enabled: false, sms_enabled: false }
				mockNotificationPreferencesService.updatePreferences.mockResolvedValue(
					mockPrefs
				)

				const result = await controller.updateNotificationPreferences(
					'tenant-1',
					updateDto as UpdateTenantBody,
					mockReq
				)

				expect(result).toEqual(mockPrefs)
				expect(
					mockNotificationPreferencesService.updatePreferences
				).toHaveBeenCalledWith('user-1', 'tenant-1', updateDto, 'test-token')
			})
		})
	})
})
