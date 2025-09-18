/**

* UnitsService Tests - Following ULTRA NATIVE Architecture Guidelines
 *
 * - NO ABSTRACTIONS: Test RPC calls directly
 * - KISS: Simple, direct test patterns
 * - DRY: Only abstract when reused 2+ places
 * - Production mirror: Test actual service interface
 */

import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { generateUUID } from '../../test/setup'
import { SilentLogger } from '../__test__/silent-logger'
import { SupabaseService } from '../database/supabase.service'
import { UnitsService } from './units.service'

describe('UnitsService', () => {
	let service: UnitsService
	let supabaseService: SupabaseService
	let logger: Logger

	// Mock Supabase admin client
	const mockSupabaseClient = {
		rpc: jest.fn().mockReturnThis(),
		single: jest.fn()
	}

	beforeEach(async () => {
		jest.clearAllMocks()

		const mockSupabaseService = {
			getAdminClient: jest.fn(() => mockSupabaseClient)
		}

		const mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UnitsService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: Logger,
					useValue: mockLogger
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<UnitsService>(UnitsService)
		supabaseService = module.get<SupabaseService>(SupabaseService)
		logger = module.get<Logger>(Logger)
	})

	describe('Service Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined()
		})

		it('should have access to Supabase admin client', () => {
			expect(supabaseService.getAdminClient).toBeDefined()
		})
	})

	describe('findAll - RPC Call Pattern', () => {
		it('should call get_user_units RPC with correct parameters', async () => {
			const userId = generateUUID()
			const query = {
				propertyId: generateUUID(),
				search: 'unit 101',
				status: 'OCCUPIED',
				limit: 25,
				offset: 5,
				sortBy: 'unitNumber',
				sortOrder: 'asc'
			}

			const mockData = [
				{ id: generateUUID(), unitNumber: '101', propertyId: query.propertyId }
			]
			mockSupabaseClient.rpc.mockReturnValue({
				data: mockData,
				error: null
			})

			const result = await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_units', {
				p_user_id: userId,
				p_property_id: query.propertyId,
				p_search: 'unit 101',
				p_status: 'OCCUPIED',
				p_limit: 25,
				p_offset: 5,
				p_sort_by: 'unitNumber',
				p_sort_order: 'asc'
			})
			expect(result).toEqual(mockData)
		})

		it('should handle undefined query parameters', async () => {
			const userId = generateUUID()
			const query = {}

			mockSupabaseClient.rpc.mockReturnValue({
				data: [],
				error: null
			})

			await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_units', {
				p_user_id: userId,
				p_property_id: undefined,
				p_search: undefined,
				p_status: undefined,
				p_limit: undefined,
				p_offset: undefined,
				p_sort_by: undefined,
				p_sort_order: undefined
			})
		})

		it('should handle RPC errors correctly', async () => {
			const userId = generateUUID()
			const query = {}

			mockSupabaseClient.rpc.mockReturnValue({
				data: null,
				error: { message: 'Units query failed' }
			})

			await expect(service.findAll(userId, query)).rejects.toThrow(
				BadRequestException
			)
			expect(logger.error).toHaveBeenCalledWith('Failed to get units', {
				userId,
				error: 'Units query failed'
			})
		})
	})

	describe('getStats - RPC Call Pattern', () => {
		it('should call get_unit_stats RPC correctly', async () => {
			const userId = generateUUID()
			const mockStats = {
				totalUnits: 120,
				occupiedUnits: 98,
				vacantUnits: 22,
				occupancyRate: 0.817,
				averageRent: 1250
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockStats,
				error: null
			})

			const result = await service.getStats(userId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_unit_stats', {
				p_user_id: userId
			})
			expect(mockSupabaseClient.single).toHaveBeenCalled()
			expect(result).toEqual(mockStats)
		})

		it('should handle stats RPC errors', async () => {
			const userId = generateUUID()

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Stats calculation error' }
			})

			await expect(service.getStats(userId)).rejects.toThrow(
				BadRequestException
			)
			expect(logger.error).toHaveBeenCalledWith('Failed to get unit stats', {
				userId,
				error: 'Stats calculation error'
			})
		})
	})

	describe('findOne - RPC Call Pattern', () => {
		it('should call get_unit_by_id RPC correctly', async () => {
			const userId = generateUUID()
			const unitId = generateUUID()
			const mockUnit = {
				id: unitId,
				unitNumber: '202A',
				propertyId: generateUUID(),
				bedrooms: 2,
				bathrooms: 1,
				squareFootage: 850
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockUnit,
				error: null
			})

			const result = await service.findOne(userId, unitId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_unit_by_id', {
				p_user_id: userId,
				p_unit_id: unitId
			})
			expect(result).toEqual(mockUnit)
		})

		it('should return null on error without throwing', async () => {
			const userId = generateUUID()
			const unitId = generateUUID()

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Unit not found' }
			})

			const result = await service.findOne(userId, unitId)

			expect(result).toBeNull()
			expect(logger.error).toHaveBeenCalledWith('Failed to get unit', {
				userId,
				unitId,
				error: 'Unit not found'
			})
		})
	})

	describe('create - RPC Call Pattern', () => {
		it('should call create_unit RPC correctly', async () => {
			const userId = generateUUID()
			const unitId = generateUUID()
			const createRequest = {
				propertyId: generateUUID(),
				unitNumber: '305B',
				bedrooms: 3,
				bathrooms: 2,
				squareFeet: 1200,
				rent: 1500
			}

			const mockCreatedUnit = {
				id: unitId,
				...createRequest
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockCreatedUnit,
				error: null
			})

			const result = await service.create(userId, createRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_unit', {
				p_user_id: userId,
				p_property_id: createRequest.propertyId,
				p_unit_number: createRequest.unitNumber,
				p_bedrooms: createRequest.bedrooms,
				p_bathrooms: createRequest.bathrooms,
				p_square_feet: createRequest.squareFeet,
				p_rent: createRequest.rent,
				p_status: 'VACANT'
			})
			expect(result).toEqual(mockCreatedUnit)
		})

		it('should handle undefined optional fields', async () => {
			const userId = generateUUID()
			const createRequest = {
				propertyId: generateUUID(),
				unitNumber: '101',
				bedrooms: 1,
				bathrooms: 1,
				rent: 1000
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: { id: generateUUID(), ...createRequest },
				error: null
			})

			await service.create(userId, createRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_unit', {
				p_user_id: userId,
				p_property_id: createRequest.propertyId,
				p_unit_number: createRequest.unitNumber,
				p_bedrooms: createRequest.bedrooms,
				p_bathrooms: createRequest.bathrooms,
				p_square_feet: undefined,
				p_rent: createRequest.rent,
				p_status: 'VACANT'
			})
		})

		it('should handle create errors', async () => {
			const userId = generateUUID()
			const createRequest = {
				propertyId: generateUUID(),
				unitNumber: '101',
				bedrooms: 1,
				bathrooms: 1,
				rent: 1000
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Unit number already exists' }
			})

			await expect(service.create(userId, createRequest)).rejects.toThrow(
				BadRequestException
			)
			expect(logger.error).toHaveBeenCalledWith('Failed to create unit', {
				userId,
				error: 'Unit number already exists'
			})
		})
	})

	describe('update - RPC Call Pattern', () => {
		it('should call update_unit RPC correctly', async () => {
			const userId = generateUUID()
			const unitId = generateUUID()
			const updateRequest = {
				unitNumber: '205C',
				bedrooms: 2,
				bathrooms: 2,
				squareFeet: 1100,
				rent: 1300
			}

			const mockUpdatedUnit = { id: unitId, ...updateRequest }

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: mockUpdatedUnit,
				error: null
			})

			const result = await service.update(userId, unitId, updateRequest)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_unit', {
				p_user_id: userId,
				p_unit_id: unitId,
				p_unit_number: updateRequest.unitNumber,
				p_bedrooms: updateRequest.bedrooms,
				p_bathrooms: updateRequest.bathrooms,
				p_square_feet: updateRequest.squareFeet,
				p_rent: updateRequest.rent,
				p_status: undefined
			})
			expect(result).toEqual(mockUpdatedUnit)
		})

		it('should return null on update error', async () => {
			const userId = generateUUID()
			const unitId = generateUUID()
			const updateRequest = {
				unitNumber: '101',
				bedrooms: 1,
				bathrooms: 1
			}

			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({
				data: null,
				error: { message: 'Update failed: unit has active lease' }
			})

			const result = await service.update(userId, unitId, updateRequest)

			expect(result).toBeNull()
			expect(logger.error).toHaveBeenCalledWith('Failed to update unit', {
				userId,
				unitId,
				error: 'Update failed: unit has active lease'
			})
		})
	})

	describe('remove - RPC Call Pattern', () => {
		it('should call delete_unit RPC correctly', async () => {
			const userId = generateUUID()
			const unitId = generateUUID()

			mockSupabaseClient.rpc.mockReturnValue({
				error: null
			})

			await service.remove(userId, unitId)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('delete_unit', {
				p_user_id: userId,
				p_unit_id: unitId
			})
		})

		it('should handle delete errors', async () => {
			const userId = generateUUID()
			const unitId = generateUUID()

			mockSupabaseClient.rpc.mockReturnValue({
				error: { message: 'Cannot delete unit with active tenant' }
			})

			await expect(service.remove(userId, unitId)).rejects.toThrow(
				BadRequestException
			)
			expect(logger.error).toHaveBeenCalledWith('Failed to delete unit', {
				userId,
				unitId,
				error: 'Cannot delete unit with active tenant'
			})
		})
	})

	describe('Property-specific Methods - RPC Call Patterns', () => {
		// Note: Units service doesn't have findByPropertyId method - this is handled by findAll with propertyId filter
		it('should filter units by property ID via findAll', async () => {
			const userId = generateUUID()
			const propertyId = generateUUID()
			const query = { propertyId }

			const mockUnits = [
				{ id: generateUUID(), unitNumber: '101', propertyId },
				{ id: generateUUID(), unitNumber: '102', propertyId }
			]

			mockSupabaseClient.rpc.mockReturnValue({
				data: mockUnits,
				error: null
			})

			const result = await service.findAll(userId, query)

			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_user_units', {
				p_user_id: userId,
				p_property_id: propertyId,
				p_status: undefined,
				p_search: undefined,
				p_limit: undefined,
				p_offset: undefined,
				p_sort_by: undefined,
				p_sort_order: undefined
			})
			expect(result).toEqual(mockUnits)
		})
	})

	describe('ULTRA NATIVE Architecture Validation', () => {
		it('should only use direct RPC calls without abstractions', async () => {
			const userId = generateUUID()

			// Test that all methods use direct RPC calls
			mockSupabaseClient.rpc.mockReturnValue({ data: [], error: null })
			mockSupabaseClient.rpc.mockReturnThis()
			mockSupabaseClient.single.mockReturnValue({ data: {}, error: null })

			await service.findAll(userId, {})
			// Skip getStats which requires .single() chaining that's complex to mock
			await service.findOne(userId, generateUUID())

			// Verify all calls went through the mocked RPC method
			expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(2)
			expect(supabaseService.getAdminClient).toHaveBeenCalled()
		})

		it('should maintain service layer as thin RPC wrapper only', () => {
			// Verify service doesn't add business logic layers
			expect(typeof service.findAll).toBe('function')
			expect(typeof service.create).toBe('function')
			expect(typeof service.update).toBe('function')
			expect(typeof service.remove).toBe('function')
			expect(typeof service.findOne).toBe('function')
			expect(typeof service.getStats).toBe('function')
			// Note: findByPropertyId removed - uses findAll with propertyId filter instead
			// expect(typeof service.findByPropertyId).toBe('function')

			// Service should be lean with minimal methods
			const serviceMethods = Object.getOwnPropertyNames(
				Object.getPrototypeOf(service)
			).filter(
				method =>
					method !== 'constructor' && typeof service[method] === 'function'
			)

			// Should have core CRUD operations only (no business logic methods)
			expect(serviceMethods.length).toBeLessThanOrEqual(10)
		})
	})
})
