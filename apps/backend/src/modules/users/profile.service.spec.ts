/**
 * Profile Service Tests
 *
 * Unit tests for the ProfileService covering:
 * - Profile retrieval with role-specific data
 * - Avatar upload/removal
 * - Phone number validation
 * - Emergency contact management
 */

import { Test, TestingModule } from '@nestjs/testing'
import { ProfileService } from './profile.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	BadRequestException,
	InternalServerErrorException,
	NotFoundException
} from '@nestjs/common'
import { SilentLogger } from '../../__tests__/silent-logger'

// Mock user data
const mockUserData = {
	id: 'user-123',
	email: 'test@example.com',
	first_name: 'Test',
	last_name: 'User',
	full_name: 'Test User',
	phone: '(555) 123-4567',
	avatar_url: null,
	user_type: 'owner',
	status: 'active',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-12-01T00:00:00Z'
}

describe('ProfileService', () => {
	let service: ProfileService
	let supabaseService: jest.Mocked<SupabaseService>

	// Create storage mock functions
	const listMock = jest.fn()
	const uploadMock = jest.fn()
	const removeMock = jest.fn()
	const getPublicUrlMock = jest.fn()

	const mockStorageFrom = jest.fn(() => ({
		list: listMock,
		upload: uploadMock,
		remove: removeMock,
		getPublicUrl: getPublicUrlMock
	}))

	// Create query builder mocks that return proper chain
	const createQueryMock = (data: unknown, error: unknown = null) => {
		const singleMock = jest.fn().mockResolvedValue({ data, error })
		const maybeSingleMock = jest.fn().mockResolvedValue({ data, error })
		const eqMock = jest.fn().mockReturnValue({
			single: singleMock,
			maybeSingle: maybeSingleMock
		})
		const selectMock = jest.fn().mockReturnValue({
			eq: eqMock,
			single: singleMock
		})

		return {
			select: selectMock,
			eq: eqMock,
			single: singleMock,
			maybeSingle: maybeSingleMock
		}
	}

	// Create update mock chain
	const createUpdateMock = (error: unknown = null) => {
		const eqMock = jest.fn().mockResolvedValue({ error })
		const updateMock = jest.fn().mockReturnValue({ eq: eqMock })
		return { update: updateMock, eq: eqMock }
	}

	let mockUserClient: {
		from: jest.Mock
		storage: { from: jest.Mock }
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		// Reset from mock for each test
		mockUserClient = {
			from: jest.fn(),
			storage: {
				from: mockStorageFrom
			}
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ProfileService,
				{
					provide: SupabaseService,
					useValue: {
						getUserClient: jest.fn(() => mockUserClient)
					}
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<ProfileService>(ProfileService)
		supabaseService = module.get(SupabaseService)
	})

	describe('getProfile', () => {
		it('returns user profile with owner-specific data', async () => {
			// Mock users table query
			const userQueryMock = createQueryMock(mockUserData)

			// Mock properties count
			const propertiesCountMock = jest
				.fn()
				.mockResolvedValue({ count: 5, error: null })

			// Mock units count
			const unitsCountMock = jest
				.fn()
				.mockResolvedValue({ count: 20, error: null })

			// Mock stripe_connected_accounts query
			const stripeQueryMock = createQueryMock({ id: 'stripe-123' })

			mockUserClient.from = jest.fn((table: string) => {
				if (table === 'users') {
					return userQueryMock
				}
				if (table === 'properties') {
					return { select: jest.fn().mockReturnValue(propertiesCountMock()) }
				}
				if (table === 'units') {
					return { select: jest.fn().mockReturnValue(unitsCountMock()) }
				}
				if (table === 'stripe_connected_accounts') {
					return stripeQueryMock
				}
				return createQueryMock(null)
			})

			const result = await service.getProfile('token', 'user-123')

			expect(result.id).toBe('user-123')
			expect(result.email).toBe('test@example.com')
			expect(result.full_name).toBe('Test User')
			expect(result.user_type).toBe('owner')
			expect(result.owner_profile).toBeDefined()
		})

		it('throws NotFoundException when profile not found', async () => {
			const userQueryMock = createQueryMock(null, {
				code: 'PGRST116',
				message: 'Not found'
			})
			mockUserClient.from = jest.fn().mockReturnValue(userQueryMock)

			await expect(service.getProfile('token', 'user-123')).rejects.toThrow(
				NotFoundException
			)
		})

		it('throws InternalServerErrorException on database error', async () => {
			const userQueryMock = createQueryMock(null, { message: 'Database error' })
			mockUserClient.from = jest.fn().mockReturnValue(userQueryMock)

			await expect(service.getProfile('token', 'user-123')).rejects.toThrow(
				InternalServerErrorException
			)
		})
	})

	describe('uploadAvatar', () => {
		const mockFile = {
			originalname: 'avatar.jpg',
			mimetype: 'image/jpeg',
			size: 1024 * 1024, // 1MB
			buffer: Buffer.from('test image data')
		} as Express.Multer.File

		it('throws BadRequestException when no file provided', async () => {
			await expect(
				service.uploadAvatar(
					'token',
					'user-123',
					undefined as unknown as Express.Multer.File
				)
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException for invalid file type', async () => {
			const invalidFile = {
				...mockFile,
				mimetype: 'application/pdf'
			} as Express.Multer.File

			await expect(
				service.uploadAvatar('token', 'user-123', invalidFile)
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException when file exceeds size limit', async () => {
			const largeFile = {
				...mockFile,
				size: 10 * 1024 * 1024 // 10MB
			} as Express.Multer.File

			await expect(
				service.uploadAvatar('token', 'user-123', largeFile)
			).rejects.toThrow(BadRequestException)
		})

		it('uploads avatar and updates user record', async () => {
			// Mock storage operations
			listMock.mockResolvedValueOnce({
				data: [],
				error: null
			})
			uploadMock.mockResolvedValueOnce({
				data: { path: 'user-123/avatar.jpg' },
				error: null
			})
			getPublicUrlMock.mockReturnValueOnce({
				data: {
					publicUrl: 'https://storage.example.com/avatars/user-123/avatar.jpg'
				}
			})

			// Mock database update
			const updateMock = createUpdateMock(null)
			mockUserClient.from = jest.fn().mockReturnValue(updateMock)

			const result = await service.uploadAvatar('token', 'user-123', mockFile)

			expect(result.avatar_url).toContain('https://storage.example.com')
		})

		it('deletes existing avatars before uploading new one', async () => {
			const existingFiles = [{ name: 'old-avatar.jpg' }]

			// Mock storage operations
			listMock.mockResolvedValueOnce({
				data: existingFiles,
				error: null
			})
			removeMock.mockResolvedValueOnce({
				data: [],
				error: null
			})
			uploadMock.mockResolvedValueOnce({
				data: { path: 'user-123/avatar.jpg' },
				error: null
			})
			getPublicUrlMock.mockReturnValueOnce({
				data: {
					publicUrl: 'https://storage.example.com/avatars/user-123/avatar.jpg'
				}
			})

			const updateMock = createUpdateMock(null)
			mockUserClient.from = jest.fn().mockReturnValue(updateMock)

			await service.uploadAvatar('token', 'user-123', mockFile)

			expect(removeMock).toHaveBeenCalledWith(['user-123/old-avatar.jpg'])
		})
	})

	describe('removeAvatar', () => {
		it('removes avatar files and clears user record', async () => {
			const existingFiles = [{ name: 'avatar.jpg' }]

			// Mock storage operations
			listMock.mockResolvedValueOnce({
				data: existingFiles,
				error: null
			})
			removeMock.mockResolvedValueOnce({
				data: [],
				error: null
			})

			const updateMock = createUpdateMock(null)
			mockUserClient.from = jest.fn().mockReturnValue(updateMock)

			await expect(
				service.removeAvatar('token', 'user-123')
			).resolves.not.toThrow()

			expect(removeMock).toHaveBeenCalledWith(['user-123/avatar.jpg'])
		})

		it('handles case when no existing avatar', async () => {
			// Mock storage operations
			listMock.mockResolvedValueOnce({
				data: [],
				error: null
			})

			const updateMock = createUpdateMock(null)
			mockUserClient.from = jest.fn().mockReturnValue(updateMock)

			await expect(
				service.removeAvatar('token', 'user-123')
			).resolves.not.toThrow()

			expect(removeMock).not.toHaveBeenCalled()
		})
	})

	describe('updatePhone', () => {
		it('updates phone number successfully', async () => {
			const updateMock = createUpdateMock(null)
			mockUserClient.from = jest.fn().mockReturnValue(updateMock)

			const result = await service.updatePhone(
				'token',
				'user-123',
				'(555) 123-4567'
			)

			expect(result.phone).toBe('(555) 123-4567')
		})

		it('allows null phone number', async () => {
			const updateMock = createUpdateMock(null)
			mockUserClient.from = jest.fn().mockReturnValue(updateMock)

			const result = await service.updatePhone('token', 'user-123', null)

			expect(result.phone).toBeNull()
		})

		it('throws BadRequestException for invalid phone format', async () => {
			await expect(
				service.updatePhone('token', 'user-123', 'abc')
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException for too short phone number', async () => {
			await expect(
				service.updatePhone('token', 'user-123', '123')
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('updateEmergencyContact', () => {
		it('updates emergency contact for tenant', async () => {
			// Mock tenant lookup
			const tenantQueryMock = createQueryMock({ id: 'tenant-123' })

			// Mock update
			const updateMock = createUpdateMock(null)

			mockUserClient.from = jest
				.fn()
				.mockReturnValueOnce(tenantQueryMock)
				.mockReturnValueOnce(updateMock)

			await expect(
				service.updateEmergencyContact('token', 'user-123', {
					name: 'Jane Doe',
					phone: '(555) 111-2222',
					relationship: 'Spouse'
				})
			).resolves.not.toThrow()
		})

		it('throws NotFoundException when tenant not found', async () => {
			const tenantQueryMock = createQueryMock(null, { message: 'Not found' })
			mockUserClient.from = jest.fn().mockReturnValue(tenantQueryMock)

			await expect(
				service.updateEmergencyContact('token', 'user-123', {
					name: 'Jane Doe',
					phone: '(555) 111-2222',
					relationship: 'Spouse'
				})
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('clearEmergencyContact', () => {
		it('clears emergency contact for tenant', async () => {
			// Mock tenant lookup
			const tenantQueryMock = createQueryMock({ id: 'tenant-123' })

			// Mock update
			const updateMock = createUpdateMock(null)

			mockUserClient.from = jest
				.fn()
				.mockReturnValueOnce(tenantQueryMock)
				.mockReturnValueOnce(updateMock)

			await expect(
				service.clearEmergencyContact('token', 'user-123')
			).resolves.not.toThrow()
		})

		it('throws NotFoundException when tenant not found', async () => {
			const tenantQueryMock = createQueryMock(null, { message: 'Not found' })
			mockUserClient.from = jest.fn().mockReturnValue(tenantQueryMock)

			await expect(
				service.clearEmergencyContact('token', 'user-123')
			).rejects.toThrow(NotFoundException)
		})
	})
})
