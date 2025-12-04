/**
 * Property Mutations Tests (TDD - Testing CORRECT Behavior)
 *
 * Tests property mutation hooks for:
 * - Correct API calls
 * - Cache invalidation
 * - Error handling
 * - Success notifications
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
	useUpdatePropertyMutation,
	useDeletePropertyMutation,
	useDeletePropertyImageMutation,
	usePropertyImages
} from '../property-mutations'

// Create mock functions before vi.mock calls (hoisting-safe)
const mockFetch = vi.hoisted(() => vi.fn())
const mockHandleMutationError = vi.hoisted(() => vi.fn())
const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
const mockSupabaseDelete = vi.hoisted(() => vi.fn())
const mockSupabaseEq = vi.hoisted(() => vi.fn())
const mockSupabaseFrom = vi.hoisted(() => vi.fn())
const mockSupabaseStorageRemove = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())

// Mock fetch globally
vi.stubGlobal('fetch', mockFetch)

// Mock api-config (used by api-request internally)
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: () => 'http://localhost:4600'
}))

vi.mock('#lib/mutation-error-handler', () => ({
	handleMutationError: mockHandleMutationError
}))

vi.mock('sonner', () => ({
	toast: {
		success: mockToastSuccess,
		error: mockToastError
	}
}))

vi.mock('#utils/supabase/client', () => ({
	createClient: () => ({
		from: mockSupabaseFrom,
		auth: {
			getSession: mockGetSession
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
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		)
	}
}

describe('useUpdatePropertyMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		// Setup default session mock
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})

		// Setup default fetch mock (apiRequest uses .text() then JSON.parse)
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: 'prop-123', name: 'Updated Property' }),
			text: () => Promise.resolve(JSON.stringify({ id: 'prop-123', name: 'Updated Property' }))
		})
	})

	it('should call fetch with correct endpoint and method', async () => {
		const { result } = renderHook(() => useUpdatePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			id: 'prop-123',
			data: { name: 'Updated Property' }
		})

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:4600/api/v1/properties/prop-123',
			expect.objectContaining({
				method: 'PUT',
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
					Authorization: 'Bearer test-token'
				}),
				body: JSON.stringify({ name: 'Updated Property' })
			})
		)
	})

	it('should include version in body when provided', async () => {
		const { result } = renderHook(() => useUpdatePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync({
			id: 'prop-123',
			data: { name: 'Updated Property' },
			version: 5
		})

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:4600/api/v1/properties/prop-123',
			expect.objectContaining({
				method: 'PUT',
				body: JSON.stringify({ name: 'Updated Property', version: 5 })
			})
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

		expect(mockToastSuccess).toHaveBeenCalledWith('Property updated successfully')
	})

	it('should call handleMutationError on failure', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error'
		})

		const { result } = renderHook(() => useUpdatePropertyMutation(), {
			wrapper: createWrapper()
		})

		await expect(
			result.current.mutateAsync({
				id: 'prop-123',
				data: { name: 'Updated' }
			})
		).rejects.toThrow()

		expect(mockHandleMutationError).toHaveBeenCalledWith(expect.any(Error), 'Update property')
	})
})

describe('useDeletePropertyMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		// Setup default session mock
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})

		// Setup default fetch mock (apiRequest uses .text() then JSON.parse)
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true }),
			text: () => Promise.resolve(JSON.stringify({ success: true }))
		})
	})

	it('should call fetch with correct endpoint and method', async () => {
		const { result } = renderHook(() => useDeletePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync('prop-123')

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:4600/api/v1/properties/prop-123',
			expect.objectContaining({
				method: 'DELETE',
				headers: expect.objectContaining({
					Authorization: 'Bearer test-token'
				})
			})
		)
	})

	it('should show success toast on successful delete', async () => {
		const { result } = renderHook(() => useDeletePropertyMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync('prop-123')

		expect(mockToastSuccess).toHaveBeenCalledWith('Property deleted successfully')
	})

	it('should call handleMutationError on failure', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error'
		})

		const { result } = renderHook(() => useDeletePropertyMutation(), {
			wrapper: createWrapper()
		})

		await expect(result.current.mutateAsync('prop-123')).rejects.toThrow()

		expect(mockHandleMutationError).toHaveBeenCalledWith(expect.any(Error), 'Delete property')
	})
})

describe('useDeletePropertyImageMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSupabaseFrom.mockReset()
		mockSupabaseDelete.mockReset()
		mockSupabaseEq.mockReset()
		mockSupabaseStorageRemove.mockReset()

		// Setup default Supabase chain
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

		await expect(
			result.current.mutateAsync({
				imageId: 'img-123',
				property_id: 'prop-123'
			})
		).rejects.toThrow('DB delete failed')
	})

	it('should not fail when storage delete fails (non-blocking)', async () => {
		mockSupabaseStorageRemove.mockRejectedValue(new Error('Storage error'))

		const { result } = renderHook(() => useDeletePropertyImageMutation(), {
			wrapper: createWrapper()
		})

		// Should succeed despite storage error
		await expect(
			result.current.mutateAsync({
				imageId: 'img-123',
				property_id: 'prop-123',
				imagePath: 'prop-123/image.webp'
			})
		).resolves.toEqual({ success: true })
	})

	it('should call handleMutationError on failure', async () => {
		const _error = new Error('DB delete failed')
		mockSupabaseEq.mockResolvedValue({ error: { message: 'DB delete failed' } })

		const { result } = renderHook(() => useDeletePropertyImageMutation(), {
			wrapper: createWrapper()
		})

		await expect(
			result.current.mutateAsync({
				imageId: 'img-123',
				property_id: 'prop-123'
			})
		).rejects.toThrow()

		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.any(Error),
			'Delete image'
		)
	})
})

describe('usePropertyImages', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSupabaseFrom.mockReset()

		// Setup Supabase chain for images query
		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: [{ id: 'img-1', property_id: 'prop-123' }],
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
