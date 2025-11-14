import { ConflictException, NotFoundException } from '@nestjs/common'
import type { PostgrestError } from '@supabase/supabase-js'
import { SupabaseErrorHandler } from '../supabase-error-handler'
import { SupabaseQueryHelpers } from '../supabase-query-helpers'

describe('SupabaseQueryHelpers', () => {
	let queryHelpers: SupabaseQueryHelpers
	let errorHandler: SupabaseErrorHandler

	beforeEach(() => {
		errorHandler = {
			mapAndThrow: jest.fn(),
			isOptimisticLockingConflict: jest.fn(),
			throwOptimisticLockingError: jest.fn()
		} as unknown as SupabaseErrorHandler

		queryHelpers = new SupabaseQueryHelpers(errorHandler)
	})

	describe('querySingle', () => {
		it('should return data when query succeeds', async () => {
			const mockData = { id: '123', name: 'Test Property' }
			const mockQuery = Promise.resolve({
				data: mockData,
				error: null
			})

			const result = await queryHelpers.querySingle(mockQuery as any, {
				resource: 'property',
				id: '123',
				operation: 'findOne'
			})

			expect(result).toEqual(mockData)
			expect(errorHandler.mapAndThrow).not.toHaveBeenCalled()
		})

		it('should throw when error is present', async () => {
			const mockError: PostgrestError = {
				code: 'PGRST116',
				message: 'Not found',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}
			const mockQuery = Promise.resolve({
				data: null,
				error: mockError
			})

			;(errorHandler.mapAndThrow as unknown as jest.Mock).mockImplementation(() => {
				throw new NotFoundException('property (123) not found')
			})

			await expect(
				queryHelpers.querySingle(mockQuery as any, {
					resource: 'property',
					id: '123',
					operation: 'findOne'
				})
			).rejects.toThrow(NotFoundException)

			expect(errorHandler.mapAndThrow).toHaveBeenCalledWith(mockError, {
				resource: 'property',
				id: '123',
				operation: 'findOne'
			})
		})

		it('should throw NotFoundException when data is null', async () => {
			const mockQuery = Promise.resolve({
				data: null,
				error: null
			})

			await expect(
				queryHelpers.querySingle(mockQuery as any, {
					resource: 'property',
					id: '123',
					operation: 'findOne'
				})
			).rejects.toThrow(NotFoundException)

			await expect(
				queryHelpers.querySingle(mockQuery as any, {
					resource: 'property',
					id: '123',
					operation: 'findOne'
				})
			).rejects.toThrow('property (123) not found')
		})

		it('should throw NotFoundException with default message when no context', async () => {
			const mockQuery = Promise.resolve({
				data: null,
				error: null
			})

			await expect(queryHelpers.querySingle(mockQuery as any)).rejects.toThrow('Resource not found')
		})
	})

	describe('querySingleWithVersion', () => {
		it('should return data when query succeeds', async () => {
			const mockData = { id: '123', name: 'Updated Property', version: 6 }
			const mockQuery = Promise.resolve({
				data: mockData,
				error: null
			})

			const result = await queryHelpers.querySingleWithVersion(mockQuery as any, {
				resource: 'property',
				id: '123',
				operation: 'update',
				metadata: { expectedVersion: 5 }
			})

			expect(result).toEqual(mockData)
			expect(errorHandler.isOptimisticLockingConflict).not.toHaveBeenCalled()
		})

		it('should throw ConflictException when optimistic locking conflict detected', async () => {
			const mockError: PostgrestError = {
				code: 'PGRST116',
				message: 'Not found',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}
			const mockQuery = Promise.resolve({
				data: null,
				error: mockError
			})

			;(errorHandler.isOptimisticLockingConflict as unknown as jest.Mock).mockReturnValue(true)
			;(errorHandler.throwOptimisticLockingError as unknown as jest.Mock).mockImplementation(() => {
				throw new ConflictException('property (123) was modified by another user')
			})

			await expect(
				queryHelpers.querySingleWithVersion(mockQuery as any, {
					resource: 'property',
					id: '123',
					operation: 'update',
					metadata: { expectedVersion: 5 }
				})
			).rejects.toThrow(ConflictException)

			expect(errorHandler.isOptimisticLockingConflict).toHaveBeenCalledWith(mockError)
			expect(errorHandler.throwOptimisticLockingError).toHaveBeenCalledWith({
				resource: 'property',
				id: '123',
				operation: 'update',
				metadata: { expectedVersion: 5 }
			})
		})

		it('should call mapAndThrow for non-optimistic-locking errors', async () => {
			const mockError: PostgrestError = {
				code: '23505',
				message: 'Unique violation',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}
			const mockQuery = Promise.resolve({
				data: null,
				error: mockError
			})

			;(errorHandler.isOptimisticLockingConflict as unknown as jest.Mock).mockReturnValue(false)
			;(errorHandler.mapAndThrow as unknown as jest.Mock).mockImplementation(() => {
				throw new ConflictException('property already exists')
			})

			await expect(
				queryHelpers.querySingleWithVersion(mockQuery as any, {
					resource: 'property',
					id: '123',
					operation: 'update',
					metadata: { expectedVersion: 5 }
				})
			).rejects.toThrow(ConflictException)

			expect(errorHandler.isOptimisticLockingConflict).toHaveBeenCalledWith(mockError)
			expect(errorHandler.mapAndThrow).toHaveBeenCalledWith(mockError, {
				resource: 'property',
				id: '123',
				operation: 'update',
				metadata: { expectedVersion: 5 }
			})
			expect(errorHandler.throwOptimisticLockingError).not.toHaveBeenCalled()
		})

		it('should throw NotFoundException when data is null without error', async () => {
			const mockQuery = Promise.resolve({
				data: null,
				error: null
			})

			;(errorHandler.isOptimisticLockingConflict as unknown as jest.Mock).mockReturnValue(false)

			await expect(
				queryHelpers.querySingleWithVersion(mockQuery as any, {
					resource: 'property',
					id: '123',
					operation: 'update',
					metadata: { expectedVersion: 5 }
				})
			).rejects.toThrow(NotFoundException)

			await expect(
				queryHelpers.querySingleWithVersion(mockQuery as any, {
					resource: 'property',
					id: '123',
					operation: 'update',
					metadata: { expectedVersion: 5 }
				})
			).rejects.toThrow('property (123) not found')
		})
	})

	describe('queryList', () => {
		it('should return data array when query succeeds', async () => {
			const mockData = [
				{ id: '1', name: 'Property 1' },
				{ id: '2', name: 'Property 2' }
			]
			const mockQuery = Promise.resolve({
				data: mockData,
				error: null
			})

			const result = await queryHelpers.queryList(mockQuery as any, {
				resource: 'property',
				operation: 'findAll',
				userId: 'user-123'
			})

			expect(result).toEqual(mockData)
			expect(errorHandler.mapAndThrow).not.toHaveBeenCalled()
		})

		it('should return empty array when data is null', async () => {
			const mockQuery = Promise.resolve({
				data: null,
				error: null
			})

			const result = await queryHelpers.queryList(mockQuery as any, {
				resource: 'property',
				operation: 'findAll'
			})

			expect(result).toEqual([])
			expect(errorHandler.mapAndThrow).not.toHaveBeenCalled()
		})

		it('should throw when error is present', async () => {
			const mockError: PostgrestError = {
				code: '42501',
				message: 'Insufficient privilege',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}
			const mockQuery = Promise.resolve({
				data: null,
				error: mockError
			})

			;(errorHandler.mapAndThrow as unknown as jest.Mock).mockImplementation(() => {
				throw new Error('Insufficient permissions')
			})

			await expect(
				queryHelpers.queryList(mockQuery, {
					resource: 'property',
					operation: 'findAll'
				})
			).rejects.toThrow()

			expect(errorHandler.mapAndThrow).toHaveBeenCalledWith(mockError, {
				resource: 'property',
				operation: 'findAll'
			})
		})

		it('should handle empty result set', async () => {
			const mockQuery = Promise.resolve({
				data: [],
				error: null
			})

			const result = await queryHelpers.queryList(mockQuery)

			expect(result).toEqual([])
		})
	})

	describe('queryCount', () => {
		it('should return count when query succeeds', async () => {
			const mockQuery = Promise.resolve({
				data: null,
				count: 42,
				error: null
			})

			const result = await queryHelpers.queryCount(mockQuery as any, {
				resource: 'property',
				operation: 'count',
				userId: 'user-123'
			})

			expect(result).toBe(42)
			expect(errorHandler.mapAndThrow).not.toHaveBeenCalled()
		})

		it('should return 0 when count is null', async () => {
			const mockQuery = Promise.resolve({
				data: null,
				count: null,
				error: null
			})

			const result = await queryHelpers.queryCount(mockQuery as any, {
				resource: 'property',
				operation: 'count'
			})

			expect(result).toBe(0)
		})

		it('should throw when error is present', async () => {
			const mockError: PostgrestError = {
				code: '42501',
				message: 'Insufficient privilege',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}
			const mockQuery = Promise.resolve({
				data: null,
				count: null,
				error: mockError
			})

			;(errorHandler.mapAndThrow as unknown as jest.Mock).mockImplementation(() => {
				throw new Error('Insufficient permissions')
			})

			await expect(
				queryHelpers.queryCount(mockQuery as any, {
					resource: 'property',
					operation: 'count'
				})
			).rejects.toThrow()

			expect(errorHandler.mapAndThrow).toHaveBeenCalledWith(mockError, {
				resource: 'property',
				operation: 'count'
			})
		})

		it('should handle zero count', async () => {
			const mockQuery = Promise.resolve({
				data: null,
				count: 0,
				error: null
			})

			const result = await queryHelpers.queryCount(mockQuery as any)

			expect(result).toBe(0)
		})
	})
})
