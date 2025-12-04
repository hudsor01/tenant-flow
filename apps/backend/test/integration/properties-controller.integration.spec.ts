import type { INestApplication } from '@nestjs/common'
import { HttpStatus } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ZodValidationPipe } from 'nestjs-zod'
import request from 'supertest'
import { PropertiesController } from '../../src/modules/properties/properties.controller'
import { PropertiesService } from '../../src/modules/properties/properties.service'
import { PropertyBulkImportService } from '../../src/modules/properties/services/property-bulk-import.service'
import { PropertyAnalyticsService } from '../../src/modules/properties/services/property-analytics.service'
import { DashboardService } from '../../src/modules/dashboard/dashboard.service'

/**
 * Integration Tests - Properties Controller Production Validation
 *
 * These tests verify that the property creation/update bugs are ACTUALLY FIXED
 * by testing the full HTTP request pipeline including:
 * - Zod DTO validation (trims whitespace, validates enum)
 * - Controller request handling
 * - Transform logic (property_type always included)
 *
 * This is NOT a unit test - it spins up a real NestJS app and hits the endpoints.
 *
 * BUG FIXES BEING TESTED:
 * 1. Property creation with property_type enum validation
 * 2. Property creation with whitespace trimming via Zod
 * 3. Property update with property_type validation
 */
describe('PropertiesController (Integration - Production Validation)', () => {
	let app: INestApplication
	let propertiesService: jest.Mocked<PropertiesService>

	beforeAll(async () => {
		// Mock PropertiesService - we test the HTTP/validation pipeline, not database
		const mockPropertiesService = {
			create: jest.fn(),
			update: jest.fn(),
			findAll: jest.fn(),
			findOne: jest.fn()
		}

		// Mock additional services required by controller
		const mockPropertyBulkImportService = {
			importProperties: jest.fn(),
			validateCSV: jest.fn()
		}

		const mockPropertyAnalyticsService = {
			getAnalytics: jest.fn(),
			getOccupancyRate: jest.fn()
		}

		const mockDashboardService = {
			getDashboardStats: jest.fn(),
			getRecentActivity: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PropertiesController],
			providers: [
				{
					provide: PropertiesService,
					useValue: mockPropertiesService
				},
				{
					provide: PropertyBulkImportService,
					useValue: mockPropertyBulkImportService
				},
				{
					provide: PropertyAnalyticsService,
					useValue: mockPropertyAnalyticsService
				},
				{
					provide: DashboardService,
					useValue: mockDashboardService
				}
			]
		}).compile()

		app = module.createNestApplication()

		// CRITICAL: Register ZodValidationPipe globally (mirrors production setup)
		// This enables Zod validation BEFORE requests reach the controller
		app.useGlobalPipes(new ZodValidationPipe())

		await app.init()

		propertiesService = module.get(PropertiesService)
	})

	afterAll(async () => {
		await app.close()
	})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('POST /properties - Property Creation', () => {
		it('should accept valid property with property_type enum', async () => {
			const mockCreatedProperty = {
				id: 'prop-123',
				name: 'Test Property',
				address_line1: '123 Main St',
				city: 'Austin',
				state: 'TX',
				postal_code: '78701',
				property_type: 'APARTMENT',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440000',
				status: 'active',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			propertiesService.create.mockResolvedValue(mockCreatedProperty as any)

			const validBody = {
				name: 'Test Property',
				address_line1: '123 Main St',
				city: 'Austin',
				state: 'TX',
				postal_code: '78701',
				property_type: 'APARTMENT',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440000'
			}

			const response = await request(app.getHttpServer())
				.post('/properties')
				.send(validBody)
				.expect(HttpStatus.CREATED)

			expect(response.body).toMatchObject({
				id: mockCreatedProperty.id,
				name: mockCreatedProperty.name,
				address_line1: mockCreatedProperty.address_line1,
				city: mockCreatedProperty.city,
				state: mockCreatedProperty.state,
				postal_code: mockCreatedProperty.postal_code,
				property_type: mockCreatedProperty.property_type,
				property_owner_id: mockCreatedProperty.property_owner_id,
				status: mockCreatedProperty.status
			})
			// Zod adds defaults (country: 'US', status: 'active'), so use objectContaining
			expect(propertiesService.create).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining(validBody)
			)
		})

		it('should trim whitespace via Zod validation (production bug fix)', async () => {
			const mockCreatedProperty = {
				id: 'prop-456',
				name: 'Trimmed Property',
				address_line1: '456 Oak St',
				city: 'Dallas',
				state: 'TX',
				postal_code: '75201',
				property_type: 'SINGLE_FAMILY',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440001',
				status: 'active',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			propertiesService.create.mockResolvedValue(mockCreatedProperty as any)

			// Send values with leading/trailing whitespace
			const bodyWithWhitespace = {
				name: '  Trimmed Property  ',
				address_line1: '  456 Oak St  ',
				city: '  Dallas  ',
				state: 'TX', // State should NOT be trimmed - it must be exactly 2 uppercase letters
				postal_code: '75201',
				property_type: 'SINGLE_FAMILY',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440001'
			}

			await request(app.getHttpServer())
				.post('/properties')
				.send(bodyWithWhitespace)
				.expect(HttpStatus.CREATED)

			// Verify Zod trimmed the values before passing to service
			expect(propertiesService.create).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					name: 'Trimmed Property',
					address_line1: '456 Oak St',
					city: 'Dallas',
					state: 'TX',
					postal_code: '75201'
				})
			)
		})

		it('should reject invalid property_type enum (production validation)', async () => {
			const invalidBody = {
				name: 'Invalid Property',
				address_line1: '789 Elm St',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440002',
				city: 'Houston',
				state: 'TX',
				postal_code: '77001',
				property_type: 'INVALID_TYPE' // Not in enum
			}

			const response = await request(app.getHttpServer())
				.post('/properties')
				.send(invalidBody)
				.expect(HttpStatus.BAD_REQUEST)

			// Zod validation error structure
			expect(response.body.message).toBeDefined()
			expect(response.body.statusCode).toBe(400)
			expect(propertiesService.create).not.toHaveBeenCalled()
		})

		it('should reject missing required fields', async () => {
			const invalidBody = {
				name: 'Incomplete Property'
				// Missing address, city, state, postal_code, property_type
			}

			await request(app.getHttpServer())
				.post('/properties')
				.send(invalidBody)
				.expect(HttpStatus.BAD_REQUEST)

			expect(propertiesService.create).not.toHaveBeenCalled()
		})

		it('should reject empty string after trim', async () => {
			const invalidBody = {
				name: '   ', // Only whitespace, will be trimmed to empty
				address_line1: '123 Main St',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440003',
				city: 'Austin',
				state: 'TX',
				postal_code: '78701',
				property_type: 'APARTMENT'
			}

			await request(app.getHttpServer())
				.post('/properties')
				.send(invalidBody)
				.expect(HttpStatus.BAD_REQUEST)

			expect(propertiesService.create).not.toHaveBeenCalled()
		})

		it('should reject invalid state format (not 2 uppercase letters)', async () => {
			const invalidBody = {
				name: 'Bad State Property',
				address_line1: '123 Main St',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440003',
				city: 'Austin',
				state: 'texas', // Should be 'TX'
				postal_code: '78701',
				property_type: 'APARTMENT'
			}

			await request(app.getHttpServer())
				.post('/properties')
				.send(invalidBody)
				.expect(HttpStatus.BAD_REQUEST)

			expect(propertiesService.create).not.toHaveBeenCalled()
		})

		it('should reject invalid ZIP code format', async () => {
			const invalidBody = {
				name: 'Bad ZIP Property',
				address_line1: '123 Main St',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440003',
				city: 'Austin',
				state: 'TX',
				postal_code: '1234', // Should be 5 or 9 digits
				property_type: 'APARTMENT'
			}

			await request(app.getHttpServer())
				.post('/properties')
				.send(invalidBody)
				.expect(HttpStatus.BAD_REQUEST)

			expect(propertiesService.create).not.toHaveBeenCalled()
		})

		it('should accept valid ZIP+4 format', async () => {
			const mockCreatedProperty = {
				id: 'prop-789',
				name: 'ZIP+4 Property',
				address_line1: '321 Pine St',
				city: 'San Antonio',
				state: 'TX',
				postal_code: '78205-1234',
				property_type: 'CONDO',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440004',
				status: 'active',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			propertiesService.create.mockResolvedValue(mockCreatedProperty as any)

			const validBody = {
				name: 'ZIP+4 Property',
				address_line1: '321 Pine St',
				city: 'San Antonio',
				state: 'TX',
				postal_code: '78205-1234', // ZIP+4 format
				property_type: 'CONDO',
				property_owner_id: '550e8400-e29b-41d4-a716-446655440004'
			}

			await request(app.getHttpServer())
				.post('/properties')
				.send(validBody)
				.expect(HttpStatus.CREATED)

			expect(propertiesService.create).toHaveBeenCalled()
		})
	})

	describe('PUT /properties/:id - Property Update', () => {
		it('should accept valid property update with property_type', async () => {
			const property_id = '550e8400-e29b-41d4-a716-446655440000' // Valid UUID
			const mockUpdatedProperty = {
				id: property_id,
				name: 'Updated Property',
				property_type: 'TOWNHOUSE',
				status: 'active'
			}

			propertiesService.update.mockResolvedValue(mockUpdatedProperty as any)

			const updateBody = {
				name: 'Updated Property',
				property_type: 'TOWNHOUSE'
			}

			const response = await request(app.getHttpServer())
				.put(`/properties/${property_id}`)
				.send(updateBody)

			// Add assertion with better error message
			if (response.status !== HttpStatus.OK) {
				throw new Error(
					`Expected 200 but got ${response.status}. ` +
					`Body: ${JSON.stringify(response.body, null, 2)}`
				)
			}

			expect(response.status).toBe(HttpStatus.OK)

			expect(response.body).toEqual(mockUpdatedProperty)
			expect(propertiesService.update).toHaveBeenCalled()
		})

		it('should reject invalid property_type on update', async () => {
			const property_id = '550e8400-e29b-41d4-a716-446655440001' // Valid UUID
			const invalidBody = {
				property_type: 'NOT_A_REAL_TYPE'
			}

			await request(app.getHttpServer())
				.put(`/properties/${property_id}`)
				.send(invalidBody)
				.expect(HttpStatus.BAD_REQUEST)

			expect(propertiesService.update).not.toHaveBeenCalled()
		})

		it('should accept partial update (only some fields)', async () => {
			const property_id = '550e8400-e29b-41d4-a716-446655440002' // Valid UUID
			const mockUpdatedProperty = {
				id: property_id,
				name: 'Partially Updated Property'
			}

			propertiesService.update.mockResolvedValue(mockUpdatedProperty as any)

			const partialBody = {
				name: 'Partially Updated Property'
				// Only updating name, not property_type or other fields
			}

			await request(app.getHttpServer())
				.put(`/properties/${property_id}`)
				.send(partialBody)
				.expect(HttpStatus.OK)

			expect(propertiesService.update).toHaveBeenCalled()
		})
	})
})
