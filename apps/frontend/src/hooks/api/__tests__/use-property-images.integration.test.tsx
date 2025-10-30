/**
 * Integration Test: Property Image Upload
 *
 * Tests the complete flow of:
 * 1. Upload image to backend
 * 2. Verify storage upload
 * 3. Verify DB record
 * 4. Delete image
 * 5. Verify cleanup
 *
 * Run with: pnpm test apps/frontend/src/hooks/api/__tests__/use-property-images.integration.test.tsx
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	usePropertyImages,
	useUploadPropertyImage,
	useDeletePropertyImage,
	useCreateProperty,
	useDeleteProperty
} from '../use-properties'
import type { ReactNode } from 'react'
import type { CreatePropertyInput } from '@repo/shared/types/api-inputs'

// Test image file
const TEST_IMAGE_FILE = new File(['test'], 'test-image.jpg', {
	type: 'image/jpeg'
})

// Test property data factory
const createTestPropertyData = (): CreatePropertyInput => ({
	name: `Test Property ${Date.now()}`,
	address: '123 Test St',
	city: 'Test City',
	state: 'TS',
	zipCode: '12345',
	propertyType: 'SINGLE_FAMILY',
	status: 'ACTIVE',
	description: 'Test property for image upload tests',
	ownerId: '' // Will be set by backend from authenticated user
})

// Test wrapper with QueryClient
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

describe('Property Image Upload Integration', () => {
	let testPropertyId: string
	let queryClient: QueryClient

	// Setup: Create a real test property before all tests
	beforeAll(async () => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false }
			}
		})

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)

		const { result } = renderHook(() => useCreateProperty(), { wrapper })

		await waitFor(async () => {
			const property = await result.current.mutateAsync(createTestPropertyData())
			testPropertyId = property.id
			expect(testPropertyId).toBeDefined()
		})
	})

	// Teardown: Delete test property after all tests
	afterAll(async () => {
		if (!testPropertyId) return

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)

		const { result } = renderHook(() => useDeleteProperty(), { wrapper })

		await waitFor(async () => {
			await result.current.mutateAsync(testPropertyId)
		})
	})

	/**
	 * TEST 1: Upload image (isolated)
	 * Verifies: Backend accepts file, compresses, stores, returns record
	 * Cleanup: Deletes uploaded image after test
	 */
	it('should upload image successfully', async () => {
		const wrapper = createWrapper()
		const { result: uploadResult } = renderHook(() => useUploadPropertyImage(), { wrapper })
		const { result: deleteResult } = renderHook(() => useDeletePropertyImage(), { wrapper })

		let uploadedImageId: string

		// Upload image
		await waitFor(async () => {
			const uploaded = await uploadResult.current.mutateAsync({
				propertyId: testPropertyId,
				file: TEST_IMAGE_FILE,
				isPrimary: false,
				caption: 'Test image'
			})

			expect(uploaded).toBeDefined()
			expect(uploaded.result).toBeDefined()
			expect((uploaded.result as any).id).toBeDefined()
			expect((uploaded.result as any).url).toContain('property-images')
			expect((uploaded.result as any).propertyId).toBe(testPropertyId)

			uploadedImageId = (uploaded.result as any).id
		})

		// Cleanup
		await waitFor(async () => {
			await deleteResult.current.mutateAsync({
				imageId: uploadedImageId,
				propertyId: testPropertyId
			})
		})
	})

	/**
	 * TEST 2: Complete image lifecycle (upload → fetch → delete → verify)
	 * Verifies: Full CRUD operations work end-to-end
	 */
	it('should complete full image lifecycle', async () => {
		const wrapper = createWrapper()
		let uploadedImageId: string

		// Step 1: Upload image
		const { result: uploadResult } = renderHook(() => useUploadPropertyImage(), { wrapper })
		await waitFor(async () => {
			const uploaded = await uploadResult.current.mutateAsync({
				propertyId: testPropertyId,
				file: TEST_IMAGE_FILE,
				isPrimary: false,
				caption: 'Lifecycle test image'
			})

			expect(uploaded).toBeDefined()
			expect((uploaded.result as any).id).toBeDefined()
			uploadedImageId = (uploaded.result as any).id
		})

		// Step 2: Fetch and verify image exists
		const { result: fetchResult } = renderHook(() => usePropertyImages(testPropertyId), {
			wrapper
		})

		await waitFor(() => {
			expect(fetchResult.current.isSuccess).toBe(true)
			expect(fetchResult.current.data).toBeDefined()
			const testImage = fetchResult.current.data!.find(
				img => img.id === uploadedImageId
			)
			expect(testImage).toBeDefined()
			expect(testImage!.caption).toBe('Lifecycle test image')
		})

		// Step 3: Delete image
		const { result: deleteResult } = renderHook(() => useDeletePropertyImage(), { wrapper })
		await waitFor(async () => {
			await deleteResult.current.mutateAsync({
				imageId: uploadedImageId,
				propertyId: testPropertyId
			})
		})

		// Step 4: Verify deletion
		const { result: verifyResult } = renderHook(
			() => usePropertyImages(testPropertyId),
			{ wrapper }
		)

		await waitFor(() => {
			const deletedImage = verifyResult.current.data?.find(
				img => img.id === uploadedImageId
			)
			expect(deletedImage).toBeUndefined()
		})
	})

	/**
	 * TEST 4: Different file sizes
	 * Verifies: Handles various image sizes correctly
	 */
	it('should handle different image sizes', async () => {
		const wrapper = createWrapper()
		const { result } = renderHook(() => useUploadPropertyImage(), { wrapper })

		// Small image (100KB)
		const smallFile = new File([new ArrayBuffer(100 * 1024)], 'small.jpg', {
			type: 'image/jpeg'
		})

		// Large image (4MB - under 5MB limit)
		const largeFile = new File([new ArrayBuffer(4 * 1024 * 1024)], 'large.jpg', {
			type: 'image/jpeg'
		})

		// Upload small
		await waitFor(async () => {
			const small = await result.current.mutateAsync({
				propertyId: testPropertyId,
				file: smallFile,
				isPrimary: false
			})
			expect(small).toBeDefined()
		})

		// Upload large
		await waitFor(async () => {
			const large = await result.current.mutateAsync({
				propertyId: testPropertyId,
				file: largeFile,
				isPrimary: false
			})
			expect(large).toBeDefined()
		})
	})

	/**
	 * TEST 5: File size limit
	 * Verifies: Rejects files over 5MB
	 */
	it('should reject files over 5MB', async () => {
		const wrapper = createWrapper()
		const { result } = renderHook(() => useUploadPropertyImage(), { wrapper })

		// 6MB file (over limit)
		const oversizedFile = new File(
			[new ArrayBuffer(6 * 1024 * 1024)],
			'oversized.jpg',
			{ type: 'image/jpeg' }
		)

		await expect(
			result.current.mutateAsync({
				propertyId: testPropertyId,
				file: oversizedFile,
				isPrimary: false
			})
		).rejects.toThrow()
	})
})

/**
 * Manual Test Instructions:
 *
 * 1. Start dev environment:
 *    doppler run -- pnpm dev
 *
 * 2. Navigate to any property details page
 *
 * 3. Upload an image via UI/console:
 *    const upload = useUploadPropertyImage()
 *    upload.mutate({ propertyId: 'xxx', file: file, isPrimary: false })
 *
 * 4. Verify in Supabase Dashboard:
 *    - Storage → property-images → check file exists
 *    - Table Editor → property_images → check record exists
 *
 * 5. Delete image via UI/console:
 *    const del = useDeletePropertyImage()
 *    del.mutate({ imageId: 'xxx', propertyId: 'xxx' })
 *
 * 6. Verify cleanup:
 *    - Storage → file should be gone
 *    - Table → record should be gone
 */
