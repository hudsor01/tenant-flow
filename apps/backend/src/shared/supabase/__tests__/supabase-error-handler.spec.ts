import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { PostgrestError } from '@supabase/supabase-js'
import { SupabaseErrorHandler } from '../supabase-error-handler'

describe('SupabaseErrorHandler', () => {
	let errorHandler: SupabaseErrorHandler
	let configService: ConfigService

	beforeEach(() => {
		configService = {
			get: jest.fn().mockReturnValue('development')
		} as unknown as ConfigService
		errorHandler = new SupabaseErrorHandler(configService)
	})

	describe('mapAndThrow', () => {
		it('should throw NotFoundException for PGRST116', () => {
			const error: PostgrestError = {
				code: 'PGRST116',
				message: 'Not found',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property', id: '123' })
			}).toThrow(NotFoundException)

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property', id: '123' })
			}).toThrow('property (123) not found')
		})

		it('should throw NotFoundException for PGRST116 without ID', () => {
			const error: PostgrestError = {
				code: 'PGRST116',
				message: 'Not found',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property' })
			}).toThrow('property not found')
		})

		it('should throw ConflictException for 23505 (unique violation)', () => {
			const error: PostgrestError = {
				code: '23505',
				message: 'Unique violation',
				details: 'Key (email)=(test@example.com) already exists.',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'user' })
			}).toThrow(ConflictException)

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'user' })
			}).toThrow("email 'test@example.com' is already in use")
		})

		it('should throw ConflictException for 23505 without constraint details', () => {
			const error: PostgrestError = {
				code: '23505',
				message: 'Unique violation',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'user', id: '456' })
			}).toThrow('user (456) already exists')
		})

		it('should throw BadRequestException for 23503 (foreign key violation)', () => {
			const error: PostgrestError = {
				code: '23503',
				message: 'Foreign key violation',
				details: 'Key (property_id)=(123) is not present in table "property".',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'unit' })
			}).toThrow(BadRequestException)

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'unit' })
			}).toThrow('Invalid reference')
		})

		it('should throw ForbiddenException for 42501 (insufficient privilege)', () => {
			const error: PostgrestError = {
				code: '42501',
				message: 'Insufficient privilege',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property', id: '789' })
			}).toThrow(ForbiddenException)

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property', id: '789' })
			}).toThrow('Insufficient permissions to access property (789)')
		})

		it('should throw UnauthorizedException for PGRST301 (JWT expired)', () => {
			const error: PostgrestError = {
				code: 'PGRST301',
				message: 'JWT expired',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, {})
			}).toThrow(UnauthorizedException)

			expect(() => {
				errorHandler.mapAndThrow(error, {})
			}).toThrow('Invalid or expired authentication token')
		})

		it('should throw UnauthorizedException for PGRST302 (JWT invalid)', () => {
			const error: PostgrestError = {
				code: 'PGRST302',
				message: 'JWT invalid',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, {})
			}).toThrow(UnauthorizedException)
		})

		it('should throw BadRequestException for 22P02 (invalid input syntax)', () => {
			const error: PostgrestError = {
				code: '22P02',
				message: 'Invalid input syntax',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property', id: 'abc' })
			}).toThrow(BadRequestException)

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property', id: 'abc' })
			}).toThrow('Invalid input format for property (abc)')
		})

		it('should throw BadRequestException for 23514 (check constraint)', () => {
			const error: PostgrestError = {
				code: '23514',
				message: 'Check constraint violation',
				details: 'Check constraint "rent_amount_positive" failed',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'lease' })
			}).toThrow(BadRequestException)

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'lease' })
			}).toThrow('Check constraint "rent_amount_positive" failed')
		})

		it('should throw InternalServerErrorException for unknown error codes in development', () => {
			const error: PostgrestError = {
				code: 'UNKNOWN_CODE',
				message: 'Unknown error',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property' })
			}).toThrow(InternalServerErrorException)

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property' })
			}).toThrow('Database error: Unknown error (code: UNKNOWN_CODE)')
		})

		it('should throw generic InternalServerErrorException for unknown errors in production', () => {
			configService.get = jest.fn().mockReturnValue('production')
			errorHandler = new SupabaseErrorHandler(configService)

			const error: PostgrestError = {
				code: 'UNKNOWN_CODE',
				message: 'Unknown error',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'property' })
			}).toThrow('An unexpected error occurred')
		})

		it('should handle errors without resource context', () => {
			const error: PostgrestError = {
				code: 'PGRST116',
				message: 'Not found',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, {})
			}).toThrow('Resource not found')
		})
	})

	describe('isOptimisticLockingConflict', () => {
		it('should return true for PGRST116', () => {
			const error: PostgrestError = {
				code: 'PGRST116',
				message: 'Not found',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(errorHandler.isOptimisticLockingConflict(error)).toBe(true)
		})

		it('should return false for other error codes', () => {
			const error: PostgrestError = {
				code: '23505',
				message: 'Unique violation',
				details: '',
				hint: '',
				name: 'PostgrestError'
			}

			expect(errorHandler.isOptimisticLockingConflict(error)).toBe(false)
		})

		it('should return false for null error', () => {
			expect(errorHandler.isOptimisticLockingConflict(null)).toBe(false)
		})
	})

	describe('throwOptimisticLockingError', () => {
		it('should throw ConflictException with proper message', () => {
			expect(() => {
				errorHandler.throwOptimisticLockingError({
					resource: 'property',
					id: '123',
					operation: 'update',
					metadata: { expectedVersion: 5 }
				})
			}).toThrow(ConflictException)

			expect(() => {
				errorHandler.throwOptimisticLockingError({
					resource: 'property',
					id: '123'
				})
			}).toThrow('property (123) was modified by another user')
		})

		it('should handle missing resource context', () => {
			expect(() => {
				errorHandler.throwOptimisticLockingError({})
			}).toThrow('Resource was modified by another user')
		})
	})

	describe('extractConstraintMessage', () => {
		it('should extract field and value from unique violation details', () => {
			const error: PostgrestError = {
				code: '23505',
				message: 'Unique violation',
				details: 'Key (email)=(test@example.com) already exists.',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'user' })
			}).toThrow("email 'test@example.com' is already in use")
		})

		it('should extract multiple fields from constraint details', () => {
			const error: PostgrestError = {
				code: '23505',
				message: 'Unique violation',
				details: 'Key (property_id, unit_number)=(123, 101) already exists.',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'unit' })
			}).toThrow("property_id, unit_number '123, 101' is already in use")
		})

		it('should return details as-is when no pattern match', () => {
			const error: PostgrestError = {
				code: '23505',
				message: 'Unique violation',
				details: 'Some custom constraint message',
				hint: '',
				name: 'PostgrestError'
			}

			expect(() => {
				errorHandler.mapAndThrow(error, { resource: 'user' })
			}).toThrow('Some custom constraint message')
		})
	})
})
