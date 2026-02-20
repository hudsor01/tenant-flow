import {
	InternalServerErrorException,
	NotFoundException
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import { UsersService } from './users.service'
import type { UserDataExport } from './users.service'

describe('UsersService', () => {
	let service: UsersService
	let mockAdminClient: {
		from: jest.Mock
		auth: { admin: { deleteUser: jest.Mock } }
	}
	let mockUserClient: {
		from: jest.Mock
	}

	const mockUserId = 'user-abc-123'
	const mockToken = 'mock-jwt-token'

	const mockUserRow = {
		id: mockUserId,
		email: 'john@example.com',
		first_name: 'John',
		last_name: 'Doe',
		full_name: 'John Doe',
		phone: '555-1234',
		avatar_url: null,
		user_type: 'owner',
		status: 'active',
		onboarding_completed_at: null,
		onboarding_status: 'pending',
		stripe_customer_id: null,
		identity_verification_status: null,
		identity_verification_session_id: null,
		identity_verified_at: null,
		identity_verification_data: null,
		identity_verification_error: null,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	}

	// Reusable chainable query builder factory
	const createQueryBuilder = (
		resolvedValue: { data: unknown; error: unknown }
	) => {
		const builder: Record<string, jest.Mock> = {}
		const chainMethods = [
			'select',
			'eq',
			'neq',
			'in',
			'order',
			'limit',
			'range',
			'insert',
			'update',
			'delete'
		]
		for (const method of chainMethods) {
			builder[method] = jest.fn().mockReturnValue(builder)
		}
		builder.single = jest.fn().mockResolvedValue(resolvedValue)
		builder.maybeSingle = jest.fn().mockResolvedValue(resolvedValue)
		return builder
	}

	beforeEach(async () => {
		mockAdminClient = {
			from: jest.fn(),
			auth: {
				admin: {
					deleteUser: jest.fn()
				}
			}
		}

		mockUserClient = {
			from: jest.fn()
		}

		const module = await Test.createTestingModule({
			providers: [
				UsersService,
				{
					provide: SupabaseService,
					useValue: {
						getAdminClient: jest.fn(() => mockAdminClient),
						getUserClient: jest.fn(() => mockUserClient)
					}
				}
			]
		}).compile()

		service = module.get<UsersService>(UsersService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	// ================================================================
	// findUserByEmail
	// ================================================================
	describe('findUserByEmail', () => {
		it('returns user when found by email', async () => {
			const qb = createQueryBuilder({ data: mockUserRow, error: null })
			mockAdminClient.from.mockReturnValue(qb)

			const result = await service.findUserByEmail('john@example.com')

			expect(result).toEqual(mockUserRow)
			expect(mockAdminClient.from).toHaveBeenCalledWith('users')
			expect(qb.eq).toHaveBeenCalledWith('email', 'john@example.com')
		})

		it('throws NotFoundException when user not found', async () => {
			const qb = createQueryBuilder({
				data: null,
				error: { message: 'not found', code: 'PGRST116' }
			})
			mockAdminClient.from.mockReturnValue(qb)

			await expect(
				service.findUserByEmail('nonexistent@example.com')
			).rejects.toThrow(NotFoundException)
		})

		it('throws NotFoundException when database returns error', async () => {
			const qb = createQueryBuilder({
				data: null,
				error: { message: 'DB error', code: '500' }
			})
			mockAdminClient.from.mockReturnValue(qb)

			await expect(
				service.findUserByEmail('john@example.com')
			).rejects.toThrow(NotFoundException)
		})

		it('throws NotFoundException when data is null without error', async () => {
			const qb = createQueryBuilder({ data: null, error: null })
			mockAdminClient.from.mockReturnValue(qb)

			await expect(
				service.findUserByEmail('john@example.com')
			).rejects.toThrow('User not found')
		})
	})

	// ================================================================
	// createUser
	// ================================================================
	describe('createUser', () => {
		const userData = {
			id: 'new-user-id',
			email: 'new@example.com',
			first_name: 'Jane',
			last_name: 'Smith',
			user_type: 'owner'
		}

		it('creates and returns a new user', async () => {
			const createdUser = { ...mockUserRow, ...userData }
			const qb = createQueryBuilder({ data: createdUser, error: null })
			mockAdminClient.from.mockReturnValue(qb)

			const result = await service.createUser(userData)

			expect(result).toEqual(createdUser)
			expect(mockAdminClient.from).toHaveBeenCalledWith('users')
			expect(qb.insert).toHaveBeenCalledWith(userData)
		})

		it('throws InternalServerErrorException on database error', async () => {
			const qb = createQueryBuilder({
				data: null,
				error: { message: 'duplicate key', code: '23505' }
			})
			// Need to make insert -> select -> single chain work
			qb.insert = jest.fn().mockReturnValue(qb)
			qb.select = jest.fn().mockReturnValue(qb)
			qb.single = jest
				.fn()
				.mockResolvedValue({
					data: null,
					error: { message: 'duplicate key', code: '23505' }
				})
			mockAdminClient.from.mockReturnValue(qb)

			await expect(service.createUser(userData)).rejects.toThrow(
				InternalServerErrorException
			)
			await expect(service.createUser(userData)).rejects.toThrow(
				'Failed to create user: duplicate key'
			)
		})
	})

	// ================================================================
	// updateUser
	// ================================================================
	describe('updateUser', () => {
		const updateData = { first_name: 'Updated' }

		it('updates and returns the user via RLS-protected client', async () => {
			// First call: verify user exists
			const verifyQb = createQueryBuilder({
				data: { id: mockUserId },
				error: null
			})
			// Second call: perform update
			const updateQb = createQueryBuilder({
				data: { ...mockUserRow, first_name: 'Updated' },
				error: null
			})

			mockUserClient.from
				.mockReturnValueOnce(verifyQb)
				.mockReturnValueOnce(updateQb)

			const result = await service.updateUser(
				mockToken,
				mockUserId,
				updateData
			)

			expect(result).toEqual({ ...mockUserRow, first_name: 'Updated' })
			expect(mockUserClient.from).toHaveBeenCalledTimes(2)
		})

		it('throws InternalServerErrorException when user verification fails', async () => {
			const verifyQb = createQueryBuilder({
				data: null,
				error: { message: 'RLS denied' }
			})
			mockUserClient.from.mockReturnValue(verifyQb)

			await expect(
				service.updateUser(mockToken, mockUserId, updateData)
			).rejects.toThrow(InternalServerErrorException)
			await expect(
				service.updateUser(mockToken, mockUserId, updateData)
			).rejects.toThrow('Failed to verify user access: RLS denied')
		})

		it('throws InternalServerErrorException when user not found', async () => {
			const verifyQb = createQueryBuilder({ data: null, error: null })
			mockUserClient.from.mockReturnValue(verifyQb)

			await expect(
				service.updateUser(mockToken, mockUserId, updateData)
			).rejects.toThrow(InternalServerErrorException)
			await expect(
				service.updateUser(mockToken, mockUserId, updateData)
			).rejects.toThrow('User not found or access denied')
		})

		it('throws InternalServerErrorException when update fails', async () => {
			const verifyQb = createQueryBuilder({
				data: { id: mockUserId },
				error: null
			})
			const updateQb = createQueryBuilder({
				data: null,
				error: { message: 'Constraint violation' }
			})

			mockUserClient.from
				.mockReturnValueOnce(verifyQb)
				.mockReturnValueOnce(updateQb)

			await expect(
				service.updateUser(mockToken, mockUserId, updateData)
			).rejects.toThrow('Failed to update user: Constraint violation')
		})
	})

	// ================================================================
	// getUserById
	// ================================================================
	describe('getUserById', () => {
		it('returns user when found via RLS-protected query', async () => {
			const qb = createQueryBuilder({ data: mockUserRow, error: null })
			mockUserClient.from.mockReturnValue(qb)

			const result = await service.getUserById(mockToken, mockUserId)

			expect(result).toEqual(mockUserRow)
			expect(mockUserClient.from).toHaveBeenCalledWith('users')
			expect(qb.eq).toHaveBeenCalledWith('id', mockUserId)
		})

		it('throws NotFoundException when user not found', async () => {
			const qb = createQueryBuilder({
				data: null,
				error: { message: 'not found' }
			})
			mockUserClient.from.mockReturnValue(qb)

			await expect(
				service.getUserById(mockToken, 'nonexistent-id')
			).rejects.toThrow(NotFoundException)
			await expect(
				service.getUserById(mockToken, 'nonexistent-id')
			).rejects.toThrow('User not found')
		})

		it('throws NotFoundException when data is null', async () => {
			const qb = createQueryBuilder({ data: null, error: null })
			mockUserClient.from.mockReturnValue(qb)

			await expect(
				service.getUserById(mockToken, mockUserId)
			).rejects.toThrow('User not found')
		})
	})

	// ================================================================
	// deleteAccount
	// ================================================================
	describe('deleteAccount', () => {
		it('soft-deletes user, deactivates properties, and deletes auth user', async () => {
			// Step 1: soft-delete user record
			const softDeleteQb = createQueryBuilder({ data: null, error: null })
			// Override so .update().eq() resolves (not .single())
			softDeleteQb.eq = jest
				.fn()
				.mockResolvedValue({ error: null })
			softDeleteQb.update = jest.fn().mockReturnValue(softDeleteQb)

			// Step 2: deactivate properties
			const deactivateQb = createQueryBuilder({ data: null, error: null })
			deactivateQb.update = jest.fn().mockReturnValue(deactivateQb)
			// .eq('owner_user_id').eq('status') chain
			const eqChain = jest.fn().mockResolvedValue({ error: null })
			deactivateQb.eq = jest.fn().mockReturnValue({ eq: eqChain })

			mockAdminClient.from
				.mockReturnValueOnce(softDeleteQb) // users table
				.mockReturnValueOnce(deactivateQb) // properties table

			mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
				error: null
			})

			await expect(
				service.deleteAccount(mockUserId)
			).resolves.toBeUndefined()

			expect(mockAdminClient.from).toHaveBeenCalledWith('users')
			expect(mockAdminClient.from).toHaveBeenCalledWith('properties')
			expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
				mockUserId
			)
		})

		it('throws InternalServerErrorException when soft-delete fails', async () => {
			const softDeleteQb = createQueryBuilder({ data: null, error: null })
			softDeleteQb.update = jest.fn().mockReturnValue(softDeleteQb)
			softDeleteQb.eq = jest
				.fn()
				.mockResolvedValue({ error: { message: 'DB error' } })

			mockAdminClient.from.mockReturnValue(softDeleteQb)

			await expect(service.deleteAccount(mockUserId)).rejects.toThrow(
				InternalServerErrorException
			)
			await expect(service.deleteAccount(mockUserId)).rejects.toThrow(
				'Failed to delete account: DB error'
			)
		})

		it('throws InternalServerErrorException when property deactivation fails', async () => {
			// User soft-delete succeeds
			const softDeleteQb = createQueryBuilder({ data: null, error: null })
			softDeleteQb.update = jest.fn().mockReturnValue(softDeleteQb)
			softDeleteQb.eq = jest.fn().mockResolvedValue({ error: null })

			// Property deactivation fails
			const deactivateQb = createQueryBuilder({ data: null, error: null })
			deactivateQb.update = jest.fn().mockReturnValue(deactivateQb)
			const eqChain = jest
				.fn()
				.mockResolvedValue({ error: { message: 'Properties error' } })
			deactivateQb.eq = jest.fn().mockReturnValue({ eq: eqChain })

			mockAdminClient.from
				.mockReturnValueOnce(softDeleteQb)
				.mockReturnValueOnce(deactivateQb)

			await expect(service.deleteAccount(mockUserId)).rejects.toThrow(
				'Failed to deactivate properties: Properties error'
			)
		})

		it('throws InternalServerErrorException when auth deletion fails', async () => {
			// User soft-delete succeeds
			const softDeleteQb = createQueryBuilder({ data: null, error: null })
			softDeleteQb.update = jest.fn().mockReturnValue(softDeleteQb)
			softDeleteQb.eq = jest.fn().mockResolvedValue({ error: null })

			// Property deactivation succeeds
			const deactivateQb = createQueryBuilder({ data: null, error: null })
			deactivateQb.update = jest.fn().mockReturnValue(deactivateQb)
			const eqChain = jest.fn().mockResolvedValue({ error: null })
			deactivateQb.eq = jest.fn().mockReturnValue({ eq: eqChain })

			mockAdminClient.from
				.mockReturnValueOnce(softDeleteQb)
				.mockReturnValueOnce(deactivateQb)

			mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
				error: { message: 'Auth error' }
			})

			await expect(service.deleteAccount(mockUserId)).rejects.toThrow(
				'Failed to delete auth user: Auth error'
			)
		})
	})

	// ================================================================
	// exportUserData
	// ================================================================
	describe('exportUserData', () => {
		it('exports all user data when user has properties and related data', async () => {
			const mockProperties = [
				{
					id: 'prop-1',
					name: 'Main House',
					address_line1: '123 Main',
					city: 'Austin',
					state: 'TX',
					postal_code: '78701',
					property_type: 'SINGLE_FAMILY',
					status: 'active',
					created_at: '2024-01-01'
				}
			]
			const mockUnits = [
				{
					id: 'unit-1',
					property_id: 'prop-1',
					unit_number: '1',
					bedrooms: 2,
					bathrooms: 1,
					rent_amount: 1200,
					status: 'occupied',
					created_at: '2024-01-01'
				}
			]
			const mockTenants = [
				{
					id: 'tenant-1',
					first_name: 'Alice',
					last_name: 'B',
					email: 'alice@example.com',
					phone: '555',
					status: 'active',
					created_at: '2024-01-01'
				}
			]
			const mockLeases = [
				{
					id: 'lease-1',
					unit_id: 'unit-1',
					start_date: '2024-01-01',
					end_date: '2025-01-01',
					rent_amount: 1200,
					lease_status: 'active',
					created_at: '2024-01-01'
				}
			]
			const mockPayments = [
				{
					id: 'pay-1',
					lease_id: 'lease-1',
					amount: 120000,
					status: 'succeeded',
					due_date: '2024-02-01',
					created_at: '2024-02-01'
				}
			]
			const mockMaintenance = [
				{
					id: 'maint-1',
					property_id: 'prop-1',
					title: 'Fix sink',
					description: 'Kitchen sink leaking',
					status: 'open',
					priority: 'high',
					created_at: '2024-03-01'
				}
			]

			// Call 1: user profile
			const userQb = createQueryBuilder({
				data: {
					id: mockUserId,
					email: 'john@example.com',
					first_name: 'John',
					last_name: 'Doe',
					phone: '555',
					user_type: 'owner',
					created_at: '2024-01-01'
				},
				error: null
			})

			// Call 2: properties (resolves via chain, not .single())
			const propertiesQb = createQueryBuilder({ data: null, error: null })
			propertiesQb.eq = jest
				.fn()
				.mockResolvedValue({ data: mockProperties, error: null })

			// Call 3: units
			const unitsQb = createQueryBuilder({ data: null, error: null })
			unitsQb.in = jest
				.fn()
				.mockResolvedValue({ data: mockUnits, error: null })

			// Call 4: tenants
			const tenantsQb = createQueryBuilder({ data: null, error: null })
			tenantsQb.eq = jest
				.fn()
				.mockResolvedValue({ data: mockTenants, error: null })

			// Call 5: leases
			const leasesQb = createQueryBuilder({ data: null, error: null })
			leasesQb.in = jest
				.fn()
				.mockResolvedValue({ data: mockLeases, error: null })

			// Call 6: rent_payments
			const paymentsQb = createQueryBuilder({ data: null, error: null })
			paymentsQb.in = jest
				.fn()
				.mockResolvedValue({ data: mockPayments, error: null })

			// Call 7: maintenance_requests
			const maintenanceQb = createQueryBuilder({ data: null, error: null })
			maintenanceQb.in = jest
				.fn()
				.mockResolvedValue({ data: mockMaintenance, error: null })

			mockAdminClient.from
				.mockReturnValueOnce(userQb) // users
				.mockReturnValueOnce(propertiesQb) // properties
				.mockReturnValueOnce(unitsQb) // units
				.mockReturnValueOnce(tenantsQb) // tenants
				.mockReturnValueOnce(leasesQb) // leases
				.mockReturnValueOnce(paymentsQb) // rent_payments
				.mockReturnValueOnce(maintenanceQb) // maintenance_requests

			const result = await service.exportUserData(mockUserId)

			expect(result.user.email).toBe('john@example.com')
			expect(result.properties).toEqual(mockProperties)
			expect(result.units).toEqual(mockUnits)
			expect(result.tenants).toEqual(mockTenants)
			expect(result.leases).toEqual(mockLeases)
			expect(result.rent_payments).toEqual(mockPayments)
			expect(result.maintenance_requests).toEqual(mockMaintenance)
			expect(result.exported_at).toBeDefined()
		})

		it('throws NotFoundException when user not found', async () => {
			const userQb = createQueryBuilder({
				data: null,
				error: { message: 'not found' }
			})
			mockAdminClient.from.mockReturnValue(userQb)

			await expect(
				service.exportUserData('nonexistent-user')
			).rejects.toThrow(NotFoundException)
		})

		it('returns empty arrays when user has no properties', async () => {
			const userQb = createQueryBuilder({
				data: {
					id: mockUserId,
					email: 'john@example.com',
					first_name: 'John',
					last_name: 'Doe',
					phone: null,
					user_type: 'owner',
					created_at: '2024-01-01'
				},
				error: null
			})

			// properties returns empty
			const propertiesQb = createQueryBuilder({ data: null, error: null })
			propertiesQb.eq = jest
				.fn()
				.mockResolvedValue({ data: [], error: null })

			// tenants returns empty
			const tenantsQb = createQueryBuilder({ data: null, error: null })
			tenantsQb.eq = jest
				.fn()
				.mockResolvedValue({ data: [], error: null })

			mockAdminClient.from
				.mockReturnValueOnce(userQb) // users
				.mockReturnValueOnce(propertiesQb) // properties
				// No units/leases/payments/maintenance queries because propertyIds is empty
				.mockReturnValueOnce(tenantsQb) // tenants

			const result = await service.exportUserData(mockUserId)

			expect(result.properties).toEqual([])
			expect(result.units).toEqual([])
			expect(result.tenants).toEqual([])
			expect(result.leases).toEqual([])
			expect(result.rent_payments).toEqual([])
			expect(result.maintenance_requests).toEqual([])
		})

		it('handles null data from database gracefully', async () => {
			const userQb = createQueryBuilder({
				data: {
					id: mockUserId,
					email: 'john@example.com',
					first_name: null,
					last_name: null,
					phone: null,
					user_type: 'owner',
					created_at: null
				},
				error: null
			})

			// Properties return null data
			const propertiesQb = createQueryBuilder({ data: null, error: null })
			propertiesQb.eq = jest
				.fn()
				.mockResolvedValue({ data: null, error: null })

			// Tenants return null data
			const tenantsQb = createQueryBuilder({ data: null, error: null })
			tenantsQb.eq = jest
				.fn()
				.mockResolvedValue({ data: null, error: null })

			mockAdminClient.from
				.mockReturnValueOnce(userQb)
				.mockReturnValueOnce(propertiesQb)
				.mockReturnValueOnce(tenantsQb)

			const result = await service.exportUserData(mockUserId)

			// Null data should become empty arrays via ?? []
			expect(result.properties).toEqual([])
			expect(result.tenants).toEqual([])
		})
	})
})
