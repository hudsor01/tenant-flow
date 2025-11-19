/**
 * @vitest-environment jsdom
 *
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
} from '#hooks/api/use-properties'
import type { ReactNode } from 'react'
import type { CreatePropertyRequest } from '@repo/shared/types/api-contracts'
import type { Tables } from '@repo/shared/types/supabase'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'UsePropertyImagesTest' })

type PropertyImage = Tables<'property_images'>

// Test image file
const TEST_IMAGE_FILE = new File(['test'], 'test-image.jpg', {
	type: 'image/jpeg'
})

// Test property data factory
const createTestPropertyData = (): CreatePropertyRequest => ({
	name: `Test Property ${Date.now()}`,
	address_line1: '123 Test St',
	city: 'Test City',
	state: 'TS',
	postal_code: '12345',
	property_type: 'SINGLE_FAMILY',
	description: 'Test property for image upload tests'
	// NOTE: owner_id and status removed - backend derives from auth
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
	let testproperty_id: string
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

		// Direct await instead of waitFor for mutations (prevents 30s timeouts)
		const property = await result.current.mutateAsync(createTestPropertyData())
		testproperty_id = property.id
		expect(testproperty_id).toBeDefined()
	})

	// Teardown: Delete test property after all tests
	afterAll(async () => {
		if (!testproperty_id) return

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)

		const { result } = renderHook(() => useDeleteProperty(), { wrapper })

		// Direct await instead of waitFor for mutations (prevents 30s timeouts)
		await result.current.mutateAsync(testproperty_id)
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

		// Upload image - direct await instead of waitFor for mutations (prevents 30s timeouts)
		const uploaded = await uploadResult.current.mutateAsync({
		property_id: testproperty_id,
		file: TEST_IMAGE_FILE,
		isPrimary: false
	})

	expect(uploaded).toBeDefined()
		const typedUploaded = uploaded as any
		expect(typedUploaded?.id).toBeDefined()
		expect(typedUploaded?.image_url).toContain('property-images')
		expect(typedUploaded?.property_id).toBe(testproperty_id)
		expect(typedUploaded?.display_order).toBeDefined()

		uploadedImageId = (uploaded as any)?.id

		// Cleanup - direct await instead of waitFor for mutations (prevents 30s timeouts)
		await deleteResult.current.mutateAsync({
			imageId: uploadedImageId,
			property_id: testproperty_id
		})
	})

	/**
	 * TEST 2: Complete image lifecycle (upload → fetch → delete → verify)
	 * Verifies: Full CRUD operations work end-to-end
	 */
	it('should complete full image lifecycle', async () => {
		const wrapper = createWrapper()
		let uploadedImageId: string

		// Step 1: Upload image - direct await instead of waitFor for mutations (prevents 30s timeouts)
		const { result: uploadResult } = renderHook(() => useUploadPropertyImage(), { wrapper })
		const uploaded = await uploadResult.current.mutateAsync({
		property_id: testproperty_id,
		file: TEST_IMAGE_FILE,
		isPrimary: false
	})
	const typedUploaded2 = uploaded as any
	expect(typedUploaded2).toBeDefined()
	expect(typedUploaded2?.id).toBeDefined()
	uploadedImageId = typedUploaded2?.id

		// Step 2: Fetch and verify image exists
		const { result: fetchResult } = renderHook(() => usePropertyImages(testproperty_id), {
			wrapper
		})

		await waitFor(() => {
			expect(fetchResult.current.isSuccess).toBe(true)
			const propertyImages = (fetchResult.current.data ??
				[]) as PropertyImage[]
			const testImage = propertyImages.find(
				(img: PropertyImage) => img.id === uploadedImageId
			)
			expect(testImage).toBeDefined()
			// Backend doesn't support captions, only display_order for sorting
			expect(testImage!.property_id).toBe(testproperty_id)
		})

		// Step 3: Delete image - direct await instead of waitFor for mutations (prevents 30s timeouts)
		const { result: deleteResult } = renderHook(() => useDeletePropertyImage(), { wrapper })
		await deleteResult.current.mutateAsync({
			imageId: uploadedImageId,
			property_id: testproperty_id
		})

		// Step 4: Verify deletion
		const { result: verifyResult } = renderHook(
			() => usePropertyImages(testproperty_id),
			{ wrapper }
		)

		await waitFor(() => {
			const deletedImage = (verifyResult.current.data as
				| PropertyImage[]
				| undefined)?.find(
				(img: PropertyImage) => img.id === uploadedImageId
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

		// Upload small - direct await instead of waitFor for mutations (prevents 30s timeouts)
		const small = await result.current.mutateAsync({
			property_id: testproperty_id,
			file: smallFile,
			isPrimary: false
		})
		expect(small).toBeDefined()

		// Upload large - direct await instead of waitFor for mutations (prevents 30s timeouts)
		const large = await result.current.mutateAsync({
			property_id: testproperty_id,
			file: largeFile,
			isPrimary: false
		})
		expect(large).toBeDefined()

		// Cleanup: Delete uploaded images
		try {
			const { result: deleteResult } = renderHook(() => useDeletePropertyImage(), { wrapper })
			await deleteResult.current.mutateAsync({
				imageId: (small as PropertyImage).id,
				property_id: testproperty_id
			})
			await deleteResult.current.mutateAsync({
				imageId: (large as any)?.id,
				property_id: testproperty_id
			})
		} catch (error) {
			logger.warn('Failed to cleanup uploaded images', {
				metadata: { error: error instanceof Error ? error.message : String(error) }
			})
		}
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
				property_id: testproperty_id,
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
 *    upload.mutate({ property_id: 'xxx', file: file, isPrimary: false })
 *
 * 4. Verify in Supabase Dashboard:
 *    - Storage → property-images → check file exists
 *    - Table Editor → property_images → check record exists
 *
 * 5. Delete image via UI/console:
 *    const del = useDeletePropertyImage()
 *    del.mutate({ imageId: 'xxx', property_id: 'xxx' })
 *
 * 6. Verify cleanup:
 *    - Storage → file should be gone
 *    - Table → record should be gone
 */
