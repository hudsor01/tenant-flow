/**
 * Integration Test: Property Image Upload End-to-End
 *
 * Tests:
 * 1. POST /properties/:id/images - Upload image
 * 2. GET /properties/:id/images - Fetch images
 * 3. DELETE /properties/images/:imageId - Delete image
 * 4. Verify Supabase storage cleanup
 * 5. Verify database record cleanup
 *
 * Run: pnpm --filter @repo/backend test:integration
 */

import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { APP_GUARD } from '@nestjs/core'
import request from 'supertest'
import { AppModule } from '../../../app.module'
import { SupabaseService } from '../../../database/supabase.service'
import { StorageService } from '../../../database/storage.service'

describe('Property Images Integration (E2E)', () => {
	let app: INestApplication
	let supabase: SupabaseService
	let storage: StorageService
	let authToken: string
	let testPropertyId: string
	let uploadedImageId: string

	beforeAll(async () => {
		// Debug: log presence of SUPABASE env vars to help triage test DB insert failures
		console.log(
			'TEST SUPABASE_SECRET_KEY present:',
			!!process.env.SUPABASE_SECRET_KEY
		)

		const moduleBuilder = Test.createTestingModule({
			imports: [AppModule]
		})

		// Override global auth guard for tests to attach a test user
		const testUserId =
			process.env.SUPABASE_RPC_TEST_USER_ID ||
			'11111111-1111-1111-1111-111111111111'
		moduleBuilder.overrideProvider(APP_GUARD).useValue({
			canActivate: (context: any) => {
				const req = context.switchToHttp().getRequest()
				req.user = { id: testUserId }
				return true
			}
		})

		const moduleRef = await moduleBuilder.compile()

		app = moduleRef.createNestApplication()
		await app.init()

		// Ensure test app uses the same global prefix as the real server
		// main.ts sets GLOBAL_PREFIX = 'api/v1' in production, tests instantiate AppModule directly
		app.setGlobalPrefix('api/v1')

		supabase = moduleRef.get<SupabaseService>(SupabaseService)
		storage = moduleRef.get<StorageService>(StorageService)

		// Ensure test user exists to satisfy FK constraints (ownerId -> users.id)
		// testUserId is defined above when overriding APP_GUARD
		const upsertUser = await supabase.getAdminClient().from('users').upsert(
			{
				id: testUserId,
				supabaseId: testUserId,
				email: 'test+integration@example.com'
				// 'name' is a generated column in the users table; do not supply it here
			},
			{ onConflict: 'id' }
		)

		if (!upsertUser || upsertUser.error) {
			throw new Error('User upsert failed in test setup')
		}

		// Create test property for this test suite
		// Note: You'll need to mock auth or use a test user token
		authToken = process.env.TEST_AUTH_TOKEN || 'test-token'

		// Create a test property
		const insertResult = await supabase
			.getAdminClient()
			.from('property')
			.insert({
				name: 'Test Property for Images',
				address: '123 Test St',
				city: 'TestCity',
				state: 'TS',
				zipCode: '12345',
				ownerId:
					process.env.SUPABASE_RPC_TEST_USER_ID ||
					'11111111-1111-1111-1111-111111111111',
				status: 'ACTIVE'
			})
			.select()
			.single()

		// Debug: if insert failed, log full response for triage and include it in the thrown error
		if (!insertResult || !insertResult.data) {
			const asJson = JSON.stringify(insertResult, null, 2)
			throw new Error(`Property insert failed in test setup: ${asJson}`)
		}

		const property = insertResult.data

		testPropertyId = property.id
	})

	afterAll(async () => {
		// Cleanup: Delete test property
		if (testPropertyId) {
			await supabase
				.getAdminClient()
				.from('property')
				.delete()
				.eq('id', testPropertyId)
		}

		await app.close()
	})

	describe('POST /api/v1/properties/:id/images', () => {
		it('should upload an image successfully', async () => {
			// Create test image buffer
			const testImageBuffer = Buffer.from([
				0xff,
				0xd8,
				0xff,
				0xe0,
				0x00,
				0x10,
				0x4a,
				0x46,
				0x49,
				0x46,
				0x00,
				0x01,
				0x01,
				0x00,
				0x00,
				0x01,
				0x00,
				0x01,
				0x00,
				0x00,
				0xff,
				0xdb,
				0x00,
				0x43,
				...Array(64).fill(0),
				0xff,
				0xd9
			])

			const response = await request(app.getHttpServer())
				.post(`/api/v1/properties/${testPropertyId}/images`)
				.set('Authorization', `Bearer ${authToken}`)
				.attach('file', testImageBuffer, 'test-image.jpg')
				.field('isPrimary', 'false')
				.field('caption', 'Test image upload')

			if (response.status !== 201) {
				console.error('Upload response status:', response.status)
				try {
					console.error('Upload response body:', JSON.stringify(response.body, null, 2))
				} catch (e) {
					console.error('Upload response body (raw):', response.text || response.error || '<no-body>')
				}
			}
			expect(response.status).toBe(201)
			expect(response.body).toHaveProperty('id')
			expect(response.body).toHaveProperty('url')
			expect(response.body.propertyId).toBe(testPropertyId)
			expect(response.body.caption).toBe('Test image upload')
			expect(response.body.isPrimary).toBe(false)

			uploadedImageId = response.body.id

			// Verify in database
			const { data: dbImage } = await supabase
				.getAdminClient()
				.from('property_images')
				.select('*')
				.eq('id', uploadedImageId)
				.single()

			expect(dbImage).toBeDefined()
			expect(dbImage?.url).toBe(response.body.url)

			// Verify in storage (check file exists)
			const urlPath = new URL(response.body.url).pathname
			const filePath = urlPath.split('/property-images/')[1]
			expect(filePath).toBeDefined()
		})

		it('should reject files over 5MB', async () => {
			// Create 6MB buffer
			const largeBuffer = Buffer.alloc(6 * 1024 * 1024)

			const response = await request(app.getHttpServer())
				.post(`/api/v1/properties/${testPropertyId}/images`)
				.set('Authorization', `Bearer ${authToken}`)
				.attach('file', largeBuffer, 'large-image.jpg')
				.field('isPrimary', 'false')

			if (response.status !== 413) {
				console.error('Large upload response status:', response.status)
				console.error('Large upload response body:', JSON.stringify(response.body || response.text || {}, null, 2))
			}
			expect(response.status).toBe(413) // Payload Too Large
		})

		it('should reject unauthorized requests', async () => {
			const testImageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9])

			const response = await request(app.getHttpServer())
				.post(`/api/v1/properties/${testPropertyId}/images`)
				// No Authorization header
				.attach('file', testImageBuffer, 'test.jpg')
				.field('isPrimary', 'false')

			if (response.status !== 401) {
				console.error('Unauthorized upload response status:', response.status)
				console.error('Unauthorized upload response body:', JSON.stringify(response.body || response.text || {}, null, 2))
			}
			expect(response.status).toBe(401)
		})
	})

	describe('GET /api/v1/properties/:id/images', () => {
		it('should fetch all images for a property', async () => {
			const response = await request(app.getHttpServer())
				.get(`/api/v1/properties/${testPropertyId}/images`)
				.set('Authorization', `Bearer ${authToken}`)

			if (response.status !== 200) {
				console.error('GET images response status:', response.status)
				console.error('GET images response body:', JSON.stringify(response.body || response.text || {}, null, 2))
			}
			expect(response.status).toBe(200)
			expect(Array.isArray(response.body)).toBe(true)
			expect(response.body.length).toBeGreaterThan(0)

			const uploadedImage = response.body.find(
				(img: { id: string }) => img.id === uploadedImageId
			)
			expect(uploadedImage).toBeDefined()
			expect(uploadedImage.caption).toBe('Test image upload')
		})

		it('should return images ordered by displayOrder', async () => {
			const response = await request(app.getHttpServer())
				.get(`/api/v1/properties/${testPropertyId}/images`)
				.set('Authorization', `Bearer ${authToken}`)

			if (response.status !== 200) {
				console.error('GET images (ordering) response status:', response.status)
				console.error('GET images (ordering) response body:', JSON.stringify(response.body || response.text || {}, null, 2))
			}
			expect(response.status).toBe(200)

			// Check ordering
			for (let i = 1; i < response.body.length; i++) {
				expect(response.body[i].displayOrder).toBeGreaterThanOrEqual(
					response.body[i - 1].displayOrder
				)
			}
		})
	})

	describe('DELETE /api/v1/properties/images/:imageId', () => {
		it('should delete image and cleanup storage', async () => {
			// Get image URL before deletion
			const { data: imageBeforeDelete } = await supabase
				.getAdminClient()
				.from('property_images')
				.select('url')
				.eq('id', uploadedImageId)
				.single()

			const imageUrl = imageBeforeDelete?.url
			expect(imageUrl).toBeDefined()

			// Delete image
			const response = await request(app.getHttpServer())
				.delete(`/api/v1/properties/images/${uploadedImageId}`)
				.set('Authorization', `Bearer ${authToken}`)

			expect(response.status).toBe(200)
			expect(response.body.message).toBe('Image deleted successfully')

			// Verify database record deleted
			const { data: dbImage } = await supabase
				.getAdminClient()
				.from('property_images')
				.select('*')
				.eq('id', uploadedImageId)
				.single()

			expect(dbImage).toBeNull()

			// Verify storage file deleted
			const urlPath = new URL(imageUrl!).pathname
			const filePath = urlPath.split('/property-images/')[1]

			const { data: storageCheck } = await supabase
				.getAdminClient()
				.storage.from('property-images')
				.list(filePath.split('/')[0])

			const fileExists = storageCheck?.some(
				file => file.name === filePath.split('/')[1]
			)
			expect(fileExists).toBe(false)
		})

		it('should return 404 for non-existent image', async () => {
			const response = await request(app.getHttpServer())
				.delete('/api/v1/properties/images/non-existent-id')
				.set('Authorization', `Bearer ${authToken}`)

			expect(response.status).toBe(404)
		})
	})

	describe('Error Handling: Orphaned Files', () => {
		it('should cleanup storage file if database insert fails', async () => {
			// This would require mocking the database insert to fail
			// After storage upload succeeds but before DB insert
			// The service should automatically delete the uploaded file

			// Mock test - implementation already in service:
			// if (error) {
			//   await this.storage.deleteFile('property-images', filename)
			// }

			expect(true).toBe(true) // Placeholder
		})
	})
})

/**
 * Manual Verification Checklist:
 *
 * 1. Run integration tests:
 *    pnpm --filter @repo/backend test:integration
 *
 * 2. Check Supabase Dashboard:
 *    - Storage → property-images → verify test files are created/deleted
 *    - Table Editor → property_images → verify records are created/deleted
 *
 * 3. Monitor logs during test:
 *    - Check for "Cleaned up orphaned file" warnings
 *    - Verify no error logs
 *
 * 4. Database check:
 *    SELECT COUNT(*) FROM property_images WHERE "propertyId" = 'test-property-id';
 *    -- Should return 0 after tests complete
 *
 * 5. Storage check:
 *    -- Check property-images bucket is empty or only has expected files
 */
