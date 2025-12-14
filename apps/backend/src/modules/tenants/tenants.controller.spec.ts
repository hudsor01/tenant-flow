import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { TenantsController } from './tenants.controller'
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { TenantPaymentService } from './tenant-payment.service'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'
import { TenantPlatformInvitationService } from './tenant-platform-invitation.service'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

// Test constants
const MOCK_JWT_TOKEN = 'test-token'

describe('TenantsController', () => {
	let controller: TenantsController
	let mockQueryService: any
	let mockCrudService: any
	let mockEmergencyContactService: any
	let mockNotificationPreferencesService: any
	let mockPaymentService: any
	let mockPlatformInvitationService: any
	let mockInvitationTokenService: any

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
		}

		mockCrudService = {
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			hardDelete: jest.fn()
		}

		mockEmergencyContactService = {
			createEmergencyContact: jest.fn(),
			getEmergencyContact: jest.fn(),
			updateEmergencyContact: jest.fn(),
			deleteEmergencyContact: jest.fn()
		}

		mockNotificationPreferencesService = {
			getPreferences: jest.fn(),
			updatePreferences: jest.fn()
		}

		mockPaymentService = {
			getTenantPaymentHistory: jest.fn(),
			getTenantPaymentHistoryForTenant: jest.fn(),
			getOwnerPaymentSummary: jest.fn(),
			sendPaymentReminder: jest.fn()
		}

		mockPlatformInvitationService = {
			inviteToPlatform: jest.fn(),
			resendInvitation: jest.fn(),
			cancelInvitation: jest.fn()
		}

		mockInvitationTokenService = {
			validateToken: jest.fn(),
			acceptToken: jest.fn(),
			activateTenantFromAuthUser: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [TenantsController],
			providers: [
				{ provide: TenantQueryService, useValue: mockQueryService },
				{ provide: TenantCrudService, useValue: mockCrudService },
				{ provide: TenantEmergencyContactService, useValue: mockEmergencyContactService },
				{ provide: TenantNotificationPreferencesService, useValue: mockNotificationPreferencesService },
				{ provide: TenantPaymentService, useValue: mockPaymentService },
				{ provide: TenantPlatformInvitationService, useValue: mockPlatformInvitationService },
				{ provide: TenantInvitationTokenService, useValue: mockInvitationTokenService },
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
				const mockReq = {
					user: { id: 'user-1' },
					headers: { authorization: 'Bearer test-token' }
				}
				const mockTenants = [{ id: 'tenant-1', lease: { id: 'lease-1' } }]
				mockQueryService.findAllWithLeaseInfo.mockResolvedValue(mockTenants)

				const result = await controller.findAll(mockReq as any)

				// Controller now returns PaginatedResponse format
				expect(result).toEqual({ data: mockTenants, total: mockTenants.length })
				expect(mockQueryService.findAllWithLeaseInfo).toHaveBeenCalledWith('user-1', { token: MOCK_JWT_TOKEN })
			})
		})

		describe('getStats', () => {
			it('should return tenant statistics', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const mockStats = { total: 10, active: 8, inactive: 2 }
				mockQueryService.getStats.mockResolvedValue(mockStats)

				const result = await controller.getStats(mockReq as any)

				expect(result).toEqual(mockStats)
				expect(mockQueryService.getStats).toHaveBeenCalledWith('user-1')
			})
		})

		describe('getSummary', () => {
			it('should return tenant summary', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const mockSummary = { total: 10, active: 8 }
				mockQueryService.getSummary.mockResolvedValue(mockSummary)

				const result = await controller.getSummary(mockReq as any)

				expect(result).toEqual(mockSummary)
				expect(mockQueryService.getSummary).toHaveBeenCalledWith('user-1')
			})
		})

		describe('findOne', () => {
			it('should return a single tenant', async () => {
				const mockReq = {
					user: { id: 'user-1' },
					headers: { authorization: 'Bearer test-token' }
				}
				const mockTenant = { id: 'tenant-1', user_id: 'user-1' }
				mockQueryService.findOne.mockResolvedValue(mockTenant)

				const result = await controller.findOne('tenant-1', mockReq as any, MOCK_JWT_TOKEN)

				expect(result).toEqual(mockTenant)
				expect(mockQueryService.findOne).toHaveBeenCalledWith('tenant-1', MOCK_JWT_TOKEN)
			})
		})

		describe('findOneWithLease', () => {
			it('should return tenant with lease info', async () => {
				const mockReq = {
					user: { id: 'user-1' },
					headers: { authorization: 'Bearer test-token' }
				}
				const mockTenant = { id: 'tenant-1', lease: { id: 'lease-1' } }
				mockQueryService.findOneWithLease.mockResolvedValue(mockTenant)

				const result = await controller.findOneWithLease('tenant-1', mockReq as any, MOCK_JWT_TOKEN)

				expect(result).toEqual(mockTenant)
				expect(mockQueryService.findOneWithLease).toHaveBeenCalledWith('tenant-1', MOCK_JWT_TOKEN)
			})
		})
	})

	describe('CRUD Endpoints', () => {
		describe('create', () => {
			it('should create a new tenant', async () => {
				const mockReq = {
					user: { id: 'user-1' },
					headers: { authorization: 'Bearer test-token' }
				}
				const createDto = { user_id: 'user-1', stripe_customer_id: 'cus_test123' }
				const mockTenant = { id: 'tenant-1', ...createDto }
				mockCrudService.create.mockResolvedValue(mockTenant)

				const result = await controller.create(createDto as any, mockReq as any, MOCK_JWT_TOKEN)

				expect(result).toEqual(mockTenant)
				expect(mockCrudService.create).toHaveBeenCalledWith('user-1', createDto, MOCK_JWT_TOKEN)
			})
		})

		describe('update', () => {
			it('should update a tenant', async () => {
				const mockReq = {
					user: { id: 'user-1' },
					headers: { authorization: 'Bearer test-token' }
				}
				const updateDto = { emergency_contact_name: 'John Doe' }
				const mockTenant = { id: 'tenant-1', ...updateDto }
				mockCrudService.update.mockResolvedValue(mockTenant)

				const result = await controller.update('tenant-1', updateDto as any, mockReq as any, MOCK_JWT_TOKEN)

				expect(result).toEqual(mockTenant)
				expect(mockCrudService.update).toHaveBeenCalledWith('user-1', 'tenant-1', updateDto, MOCK_JWT_TOKEN)
			})
		})

		describe('remove', () => {
			it('should soft delete a tenant', async () => {
				const mockReq = {
					user: { id: 'user-1' },
					headers: { authorization: 'Bearer test-token' }
				}
				mockCrudService.softDelete.mockResolvedValue(undefined)

				await controller.remove('tenant-1', mockReq as any, MOCK_JWT_TOKEN)

				expect(mockCrudService.softDelete).toHaveBeenCalledWith('user-1', 'tenant-1', MOCK_JWT_TOKEN)
			})
		})

		describe('hardDelete', () => {
			it('should permanently delete a tenant', async () => {
				const mockReq = {
					user: { id: 'user-1' },
					headers: { authorization: 'Bearer test-token' }
				}
				mockCrudService.hardDelete.mockResolvedValue(undefined)

				await controller.hardDelete('tenant-1', mockReq as any, MOCK_JWT_TOKEN)

				expect(mockCrudService.hardDelete).toHaveBeenCalledWith('user-1', 'tenant-1', MOCK_JWT_TOKEN)
			})
		})
	})

	describe('Invitation Endpoints', () => {
		describe('inviteToPlatform', () => {
			it('should invite tenant to platform', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const inviteDto = {
					tenantData: {
						email: 'tenant@example.com',
						first_name: 'John',
						last_name: 'Doe',
						phone: '555-0100'
					},
					leaseData: {
						property_id: 'property-1',
						unit_id: 'unit-1'
					}
				}
				const mockResult = { tenant_id: 'tenant-1', invitation_id: 'inv-1' }
				mockPlatformInvitationService.inviteToPlatform.mockResolvedValue(mockResult)

				const result = await controller.inviteToPlatform(inviteDto as any, mockReq as any)

				expect(result).toEqual(mockResult)
				expect(mockPlatformInvitationService.inviteToPlatform).toHaveBeenCalledWith('user-1', {
					email: 'tenant@example.com',
					first_name: 'John',
					last_name: 'Doe',
					phone: '555-0100',
					property_id: 'property-1',
					unit_id: 'unit-1'
				})
			})

			it('should invite tenant without lease data (platform-only)', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const inviteDto = {
					tenantData: {
						email: 'tenant@example.com',
						first_name: 'John',
						last_name: 'Doe'
					}
				}
				const mockResult = { tenant_id: 'tenant-1', invitation_id: 'inv-1' }
				mockPlatformInvitationService.inviteToPlatform.mockResolvedValue(mockResult)

				const result = await controller.inviteToPlatform(inviteDto as any, mockReq as any)

				expect(result).toEqual(mockResult)
				expect(mockPlatformInvitationService.inviteToPlatform).toHaveBeenCalledWith('user-1', {
					email: 'tenant@example.com',
					first_name: 'John',
					last_name: 'Doe',
					phone: undefined,
					property_id: undefined,
					unit_id: undefined
				})
			})
		})

		describe('resendInvitation', () => {
			it('should resend invitation', async () => {
				const mockReq = { user: { id: 'user-1' } }
				mockPlatformInvitationService.resendInvitation.mockResolvedValue(undefined)

				await controller.resendInvitation('tenant-1', mockReq as any)

				expect(mockPlatformInvitationService.resendInvitation).toHaveBeenCalledWith('user-1', 'tenant-1')
			})
		})

		describe('cancelInvitation', () => {
			it('should cancel invitation', async () => {
				const mockReq = { user: { id: 'user-1' } }
				mockPlatformInvitationService.cancelInvitation.mockResolvedValue(undefined)

				const result = await controller.cancelInvitation('inv-1', mockReq as any)

				expect(result).toEqual({ success: true })
				expect(mockPlatformInvitationService.cancelInvitation).toHaveBeenCalledWith('user-1', 'inv-1')
			})
		})

		describe('validateInvitation', () => {
			it('should validate invitation token', async () => {
				const mockValidation = { valid: true, tenant_id: 'tenant-1' }
				const tokenBody = { token: MOCK_JWT_TOKEN }
				mockInvitationTokenService.validateToken.mockResolvedValue(mockValidation)

				const result = await controller.validateInvitation(tokenBody as any)

				expect(result).toEqual(mockValidation)
				expect(mockInvitationTokenService.validateToken).toHaveBeenCalledWith(tokenBody)
			})
		})

		describe('acceptInvitation', () => {
			it('should accept invitation', async () => {
				const token = MOCK_JWT_TOKEN
				const acceptBody = { authuser_id: 'auth-user-1' }
				mockInvitationTokenService.acceptToken.mockResolvedValue(undefined)

				await controller.acceptInvitation(token, acceptBody as any)

				expect(mockInvitationTokenService.acceptToken).toHaveBeenCalledWith(MOCK_JWT_TOKEN, 'auth-user-1')
			})
		})

		describe('activateTenant', () => {
			it('should activate tenant', async () => {
				const activateBody = { authuser_id: 'auth-user-1' }
				mockInvitationTokenService.activateTenantFromAuthUser.mockResolvedValue(undefined)

				await controller.activateTenant(activateBody as any)

				expect(mockInvitationTokenService.activateTenantFromAuthUser).toHaveBeenCalledWith('auth-user-1')
			})
		})
	})

	describe('Emergency Contact Endpoints', () => {
		describe('getEmergencyContact', () => {
			it('should get emergency contact', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const mockContact = { id: 'contact-1', name: 'John Doe' }
				mockEmergencyContactService.getEmergencyContact.mockResolvedValue(mockContact)

				const result = await controller.getEmergencyContact('tenant-1', mockReq as any)

				expect(result).toEqual(mockContact)
				expect(mockEmergencyContactService.getEmergencyContact).toHaveBeenCalledWith('user-1', 'tenant-1')
			})
		})

		describe('createEmergencyContact', () => {
			it('should create emergency contact', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const createDto = { contactName: 'John Doe', phoneNumber: '555-0100' }
				const mockContact = { id: 'contact-1', name: 'John Doe' }
				mockEmergencyContactService.createEmergencyContact.mockResolvedValue(mockContact)

				const result = await controller.createEmergencyContact('tenant-1', createDto as any, mockReq as any)

				expect(result).toEqual(mockContact)
			})
		})

		describe('updateEmergencyContact', () => {
			it('should update emergency contact', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const updateDto = { phoneNumber: '555-0200' }
				const mockContact = { id: 'contact-1', phone: '555-0200' }
				mockEmergencyContactService.updateEmergencyContact.mockResolvedValue(mockContact)

				const result = await controller.updateEmergencyContact('tenant-1', updateDto as any, mockReq as any)

				expect(result).toEqual(mockContact)
			})
		})

		describe('deleteEmergencyContact', () => {
			it('should delete emergency contact', async () => {
				const mockReq = { user: { id: 'user-1' } }
				mockEmergencyContactService.deleteEmergencyContact.mockResolvedValue(true)

				const result = await controller.deleteEmergencyContact('tenant-1', mockReq as any)

				expect(result).toEqual({ success: true, message: 'Emergency contact deleted successfully' })
				expect(mockEmergencyContactService.deleteEmergencyContact).toHaveBeenCalledWith('user-1', 'tenant-1')
			})
		})
	})

	describe('Notification Preferences Endpoints', () => {
		describe('getNotificationPreferences', () => {
			it('should get notification preferences', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const mockPrefs = { email_enabled: true, sms_enabled: false }
				mockNotificationPreferencesService.getPreferences.mockResolvedValue(mockPrefs)

				const result = await controller.getNotificationPreferences('tenant-1', mockReq as any)

				expect(result).toEqual(mockPrefs)
				expect(mockNotificationPreferencesService.getPreferences).toHaveBeenCalledWith('user-1', 'tenant-1')
			})
		})

		describe('updateNotificationPreferences', () => {
			it('should update notification preferences', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const updateDto = { email_enabled: false }
				const mockPrefs = { email_enabled: false, sms_enabled: false }
				mockNotificationPreferencesService.updatePreferences.mockResolvedValue(mockPrefs)

				const result = await controller.updateNotificationPreferences('tenant-1', updateDto as any, mockReq as any)

				expect(result).toEqual(mockPrefs)
				expect(mockNotificationPreferencesService.updatePreferences).toHaveBeenCalledWith('user-1', 'tenant-1', updateDto)
			})
		})
	})

	describe('Payment Endpoints', () => {
		describe('getPayments', () => {
			it('should get payment history', async () => {
				const mockPayments = [{ id: 'payment-1', amount: 100000, status: 'succeeded' }]
				mockQueryService.getTenantPaymentHistory.mockResolvedValue(mockPayments)

				const result = await controller.getPayments('tenant-1')

				expect(result).toEqual({ payments: mockPayments })
				expect(mockQueryService.getTenantPaymentHistory).toHaveBeenCalledWith('tenant-1', 20)
			})
		})

		describe('getMyPayments', () => {
			it('should get tenant portal payments', async () => {
				const mockReq = {
					user: { id: 'auth-user-1' },
					headers: { authorization: 'Bearer test-token' }
				}
				const mockTenant = { id: 'tenant-1' }
				const mockPayments = [{ id: 'payment-1', amount: 100000, status: 'succeeded' }]
				mockQueryService.getTenantByAuthUserId.mockResolvedValue(mockTenant)
				mockQueryService.getTenantPaymentHistory.mockResolvedValue(mockPayments)

				const result = await controller.getMyPayments(mockReq as any, MOCK_JWT_TOKEN, undefined)

				expect(result).toEqual({ payments: mockPayments })
				expect(mockQueryService.getTenantByAuthUserId).toHaveBeenCalledWith('auth-user-1', MOCK_JWT_TOKEN)
				expect(mockQueryService.getTenantPaymentHistory).toHaveBeenCalledWith('tenant-1', 20)
			})
		})

		describe('getPaymentSummary', () => {
			it('should get owner payment summary', async () => {
				const mockReq = { user: { id: 'user-1' } }
				const mockSummary = { lateFeeTotal: 5000, unpaidTotal: 10000, unpaidCount: 2, tenantCount: 5 }
				mockPaymentService.getOwnerPaymentSummary.mockResolvedValue(mockSummary)

				const result = await controller.getPaymentSummary(mockReq as any)

				expect(result).toEqual(mockSummary)
				expect(mockPaymentService.getOwnerPaymentSummary).toHaveBeenCalledWith('user-1')
			})
		})

		describe('sendPaymentReminder', () => {
			it('should send payment reminder', async () => {
				const mockRequest = { user: { id: 'owner-1' } } as any
				const reminderDto = { tenant_id: 'tenant-1', note: 'Please pay your rent' }
				mockPaymentService.sendPaymentReminder.mockResolvedValue({
					success: true,
					tenant_id: 'tenant-1',
					notificationId: 'notif-1',
					message: 'Please pay your rent'
				})

				await controller.sendPaymentReminder(mockRequest, reminderDto)

				expect(mockPaymentService.sendPaymentReminder).toHaveBeenCalledWith('owner-1', 'tenant-1', 'Please pay your rent')
			})
		})
	})
})
