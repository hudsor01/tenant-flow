import { describe, it, expect, vi } from 'vitest'

// Mock the frontend-logger (transitive dependency via api-error)
vi.mock('#shared/lib/frontend-logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	})
}))

import {
	isConflictError,
	handleConflictError,
	withVersion,
	incrementVersion
} from '../optimistic-locking'
import { ApiError, ApiErrorCode } from '../api-error'

describe('isConflictError', () => {
	it('returns true for ApiError with 409 status', () => {
		const err = new ApiError('Conflict', ApiErrorCode.UNKNOWN_ERROR, 409)
		expect(isConflictError(err)).toBe(true)
	})
	it('returns false for ApiError with non-409 status', () => {
		const err = new ApiError('Not found', ApiErrorCode.API_NOT_FOUND, 404)
		expect(isConflictError(err)).toBe(false)
	})
	it('returns true for plain object with status 409', () => {
		expect(isConflictError({ status: 409 })).toBe(true)
	})
	it('returns false for plain object with non-409 status', () => {
		expect(isConflictError({ status: 400 })).toBe(false)
	})
	it('returns false for null', () => {
		expect(isConflictError(null)).toBe(false)
	})
	it('returns false for undefined', () => {
		expect(isConflictError(undefined)).toBe(false)
	})
	it('returns false for string', () => {
		expect(isConflictError('error')).toBe(false)
	})
	it('returns false for plain Error', () => {
		expect(isConflictError(new Error('test'))).toBe(false)
	})
})

describe('handleConflictError (message overload)', () => {
	it('returns conflict message for 409 error', () => {
		const err = new ApiError('Conflict', ApiErrorCode.UNKNOWN_ERROR, 409)
		const msg = handleConflictError(err)
		expect(msg).toBe(
			'This item was modified by another user. Please refresh and try again.'
		)
	})
	it('returns error message for non-conflict Error', () => {
		const err = new Error('Something broke')
		const msg = handleConflictError(err)
		expect(msg).toBe('Something broke')
	})
	it('returns default message for non-Error values', () => {
		const msg = handleConflictError('unknown')
		expect(msg).toBe('An unexpected error occurred')
	})
})

describe('handleConflictError (cache invalidation overload)', () => {
	it('invalidates queries for each query key', () => {
		const mockInvalidateQueries = vi.fn()
		const queryClient = {
			invalidateQueries: mockInvalidateQueries
		} as unknown as import('@tanstack/react-query').QueryClient
		const queryKeys = [['properties'], ['dashboard']]

		handleConflictError('Property', '123', queryClient, queryKeys)

		expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
		expect(mockInvalidateQueries).toHaveBeenCalledWith({
			queryKey: ['properties']
		})
		expect(mockInvalidateQueries).toHaveBeenCalledWith({
			queryKey: ['dashboard']
		})
	})
})

describe('withVersion', () => {
	it('adds version to object', () => {
		const data = { name: 'test' }
		const result = withVersion(data, 3)
		expect(result).toEqual({ name: 'test', version: 3 })
	})
	it('preserves existing fields', () => {
		const data = { id: '1', name: 'test', extra: true }
		const result = withVersion(data, 1)
		expect(result.id).toBe('1')
		expect(result.name).toBe('test')
		expect(result.extra).toBe(true)
		expect(result.version).toBe(1)
	})
})

describe('incrementVersion', () => {
	it('increments a number', () => {
		expect(incrementVersion(5)).toBe(6)
	})
	it('increments zero', () => {
		expect(incrementVersion(0)).toBe(1)
	})
	it('returns 1 for null', () => {
		expect(incrementVersion(null)).toBe(1)
	})
	it('returns 1 for undefined', () => {
		expect(incrementVersion(undefined)).toBe(1)
	})
	it('increments version on object', () => {
		const obj = { id: '1', name: 'test', version: 3 }
		const result = incrementVersion(obj)
		expect(result.version).toBe(4)
		expect(result.id).toBe('1')
		expect(result.name).toBe('test')
	})
	it('defaults to version 1 when object has no version', () => {
		const obj: { id: string; name: string; version?: number } = {
			id: '1',
			name: 'test'
		}
		const result = incrementVersion(obj)
		expect(result.version).toBe(1)
	})
	it('merges new data and increments version', () => {
		const obj = { id: '1', name: 'old', version: 2 }
		const result = incrementVersion(obj, { name: 'new' })
		expect(result.name).toBe('new')
		expect(result.version).toBe(3)
		expect(result.id).toBe('1')
	})
	it('merges new data defaulting version to 1 when missing', () => {
		const obj: { id: string; name: string; version?: number } = {
			id: '1',
			name: 'old'
		}
		const result = incrementVersion(obj, { name: 'new' })
		expect(result.name).toBe('new')
		expect(result.version).toBe(1)
	})
})
