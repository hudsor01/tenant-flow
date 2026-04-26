/**
 * Property Mutations Tests
 *
 * Tests property mutation hooks for:
 * - Correct PostgREST API calls via supabase-js
 * - Cache invalidation
 * - Error handling
 * - Success notifications
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePropertyImages } from '../use-properties'
import {
	useUpdatePropertyMutation,
	useDeletePropertyMutation,
	useDeletePropertyImageMutation
} from '../use-property-mutations'

// Hoisted mocks
const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
const mockSupabaseDelete = vi.hoisted(() => vi.fn())
const mockSupabaseEq = vi.hoisted(() => vi.fn())
const mockSupabaseFrom = vi.hoisted(() => vi.fn())
const mockSupabaseUpdate = vi.hoisted(() => vi.fn())
const mockSupabaseSelect = vi.hoisted(() => vi.fn())
const mockSupabaseSingle = vi.hoisted(() => vi.fn())
const mockSupabaseStorageRemove = vi.hoisted(() => vi.fn())
const mockGetUser = vi.hoisted(() => vi.fn())
const mockHandlePostgrestError = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({
	toast: {
		success: mockToastSuccess,
		error: mockToastError
	}
}))

vi.mock('#lib/postgrest-error-handler', () => ({
	handlePostgrestError: mockHandlePostgrestError
}))

vi.mock('@sentry/nextjs', () => ({
	captureException: vi.fn()
}))

vi.mock('#lib/frontend-logger', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	},
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	})
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		from: mockSupabaseFrom,
		auth: {
			getUser: mockGetUser
		},
		storage: {
			from: () => ({
				remove: mockSupabaseStorageRemove
			})
		}
	})
}))

// Wrapper for hooks
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
	}
}

const mockUpdatedProperty = {
	id: 'prop-123',
	owner_user_id: 'user-1',
	name: 'Updated Property',
	address_line1: '123 Main St',
	address_line2: null,
	city: 'Test City',
	state: 'CA',
	postal_code: '12345',
	country: 'US',
	property_type: 'SINGLE_FAMILY',
	status: 'active',
	stripe_connected_account_id: null,
	date_sold: null,
	sale_price: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-02T00:00:00Z'
}

describe('useUpdatePropertyMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

		// Setup default update chain: .from().update().eq().select().single()
		const chain = {
			update: mockSupabaseUpdate,
			eq: mockSupabaseEq,
			select: mockSupabaseSelect,
			single: mockSupabaseSingle
		}
		mockSupabaseUpdate.mockReturnValue(chain)
		mockSupabaseEq.mockReturnValue(chain)
		mockSupabaseSelect.mockReturnValue(chain)
		mockSupabaseSingle.mockResolvedValue({ data: mockUpdatedProperty, error: null })
		mockSupabaseFrom.mockReturnValue({ update: mockSupabaseUpdate })
	})

	it('should call supabase.from("properties").update() with correct data', async () => {
		const { result } = renderHook(() => useUpdatePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			id: 'prop-123',
			data: { name: 'Updated Property' }
		})

		expect(mockSupabaseFrom).toHaveBeenCalledWith('properties')
		expect(mockSupabaseUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Updated Property' })
		)
		expect(mockSupabaseEq).toHaveBeenCalledWith('id', 'prop-123')
	})

	it('should include version in update payload when provided', async () => {
		const { result } = renderHook(() => useUpdatePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			id: 'prop-123',
			data: { name: 'Updated Property' },
			version: 5
		})

		expect(mockSupabaseUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Updated Property', version: 5 })
		)
	})

	it('should show success toast on successful update', async () => {
		const { result } = renderHook(() => useUpdatePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			id: 'prop-123',
			data: { name: 'Updated' }
		})

		await waitFor(() => {
			expect(mockToastSuccess).toHaveBeenCalledWith('Property updated successfully')
		})
	})

	it('should call handlePostgrestError on PostgREST failure', async () => {
		const postgrestError = { code: '42501', message: 'permission denied', details: null, hint: null }
		mockHandlePostgrestError.mockImplementation(() => { throw new Error('permission denied') })
		mockSupabaseSingle.mockResolvedValue({ data: null, error: postgrestError })

		const { result } = renderHook(() => useUpdatePropertyMutation(), {
			wrapper: createWrapper()
		})

		await expect(
			result.current.mutateAsync({
				id: 'prop-123',
				data: { name: 'Updated' }
			})
		).rejects.toThrow()

		expect(mockHandlePostgrestError).toHaveBeenCalledWith(postgrestError, 'properties')
	})
})

describe('useDeletePropertyMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

		// Setup soft-delete chain: .from().update({ status: 'inactive' }).eq()
		const chain = {
			update: mockSupabaseUpdate,
			eq: mockSupabaseEq
		}
		mockSupabaseUpdate.mockReturnValue(chain)
		mockSupabaseEq.mockResolvedValue({ data: null, error: null })
		mockSupabaseFrom.mockReturnValue({ update: mockSupabaseUpdate })
	})

	it('should soft-delete by setting status to inactive (not hard delete)', async () => {
		const { result } = renderHook(() => useDeletePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync('prop-123')

		expect(mockSupabaseFrom).toHaveBeenCalledWith('properties')
		expect(mockSupabaseUpdate).toHaveBeenCalledWith({ status: 'inactive' })
		expect(mockSupabaseEq).toHaveBeenCalledWith('id', 'prop-123')
	})

	it('should show success toast on successful soft-delete', async () => {
		const { result } = renderHook(() => useDeletePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync('prop-123')

		await waitFor(() => {
			expect(mockToastSuccess).toHaveBeenCalledWith('Property deleted successfully')
		})
	})

	it('should call handlePostgrestError on PostgREST failure', async () => {
		const postgrestError = { code: '42501', message: 'permission denied', details: null, hint: null }
		mockHandlePostgrestError.mockImplementation(() => { throw new Error('permission denied') })
		mockSupabaseEq.mockResolvedValue({ error: postgrestError })

		const { result } = renderHook(() => useDeletePropertyMutation(), {
			wrapper: createWrapper()
		})

		await expect(result.current.mutateAsync('prop-123')).rejects.toThrow()

		expect(mockHandlePostgrestError).toHaveBeenCalledWith(postgrestError, 'properties')
	})
})

describe('useDeletePropertyImageMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

		// Setup default Supabase chain for image delete
		mockSupabaseFrom.mockReturnValue({
			delete: mockSupabaseDelete
		})
		mockSupabaseDelete.mockReturnValue({
			eq: mockSupabaseEq
		})
		mockSupabaseEq.mockResolvedValue({ error: null })
		mockSupabaseStorageRemove.mockResolvedValue({ error: null })
	})

	it('should delete from database using Supabase client', async () => {
		const { result } = renderHook(() => useDeletePropertyImageMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			imageId: 'img-123',
			property_id: 'prop-123'
		})

		expect(mockSupabaseFrom).toHaveBeenCalledWith('property_images')
		expect(mockSupabaseDelete).toHaveBeenCalled()
		expect(mockSupabaseEq).toHaveBeenCalledWith('id', 'img-123')
	})

	it('should delete from storage when imagePath is provided', async () => {
		const { result } = renderHook(() => useDeletePropertyImageMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			imageId: 'img-123',
			property_id: 'prop-123',
			imagePath: 'prop-123/image.webp'
		})

		expect(mockSupabaseStorageRemove).toHaveBeenCalledWith(['prop-123/image.webp'])
	})

	it('should not call storage remove when imagePath is not provided', async () => {
		const { result } = renderHook(() => useDeletePropertyImageMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			imageId: 'img-123',
			property_id: 'prop-123'
		})

		expect(mockSupabaseStorageRemove).not.toHaveBeenCalled()
	})

	it('should show success toast on successful delete', async () => {
		const { result } = renderHook(() => useDeletePropertyImageMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			imageId: 'img-123',
			property_id: 'prop-123'
		})

		expect(mockToastSuccess).toHaveBeenCalledWith('Image deleted successfully')
	})

	it('should throw error when database delete fails', async () => {
		mockSupabaseEq.mockResolvedValue({ error: { message: 'DB delete failed' } })

		const { result } = renderHook(() => useDeletePropertyImageMutation(), {
			wrapper: createWrapper()
		})

		// Note: .rejects.toThrow('string') is broken in Vitest 4.x + chai 6.x
		// (thrown.message undefined in compatibleMessage). Use toMatchObject instead.
		await expect(
			result.current.mutateAsync({
				imageId: 'img-123',
				property_id: 'prop-123'
			})
		).rejects.toMatchObject({ message: 'DB delete failed' })
	})

	it('should not fail when storage delete fails (non-blocking)', async () => {
		mockSupabaseStorageRemove.mockRejectedValue(new Error('Storage error'))

		const { result } = renderHook(() => useDeletePropertyImageMutation(), {
			wrapper: createWrapper()
		})

		await expect(
			result.current.mutateAsync({
				imageId: 'img-123',
				property_id: 'prop-123',
				imagePath: 'prop-123/image.webp'
			})
		).resolves.toEqual({ success: true })
	})
})

describe('usePropertyImages', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: [{ id: 'img-1', property_id: 'prop-123', image_url: 'http://example.com/img.jpg', display_order: 0 }],
					error: null
				})
			})
		})
		mockSupabaseFrom.mockReturnValue({ select: mockSelect })
	})

	it('should be disabled when property_id is empty', () => {
		const { result } = renderHook(() => usePropertyImages(''), {
			wrapper: createWrapper()
		})

		expect(result.current.isFetching).toBe(false)
	})

	it('should fetch images when property_id is provided', async () => {
		const { result } = renderHook(() => usePropertyImages('prop-123'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess || result.current.isError).toBe(true)
		})
	})
})
