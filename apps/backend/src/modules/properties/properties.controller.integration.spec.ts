import type { INestApplication } from '@nestjs/common'
import { HttpStatus } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ZodValidationPipe } from 'nestjs-zod'
import request from 'supertest'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'

/**
 * Integration Tests - Properties Controller Production Validation
 *
 * These tests verify that the property creation/update bugs are ACTUALLY FIXED
 * by testing the full HTTP request pipeline including:
 * - Zod DTO validation (trims whitespace, validates enum)
 * - Controller request handling
 * - Transform logic (propertyType always included)
 *
 * This is NOT a unit test - it spins up a real NestJS app and hits the endpoints.
 *
 * BUG FIXES BEING TESTED:
 * 1. Property creation with propertyType enum validation
 * 2. Property creation with whitespace trimming via Zod
 * 3. Property update with propertyType validation
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

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PropertiesController],
			providers: [
				{
					provide: PropertiesService,
					useValue: mockPropertiesService
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
		it('should accept valid property with propertyType enum', async () => {
			const mockCreatedProperty = {
				id: 'prop-123',
				name: 'Test Property',
				address: '123 Main St',
				city: 'Austin',
				state: 'TX',
				zipCode: '78701',
				propertyType: 'APARTMENT',
				ownerId: 'owner-123',
				status: 'ACTIVE',
				createdAt: new Date(),
				updatedAt: new Date()
			}

			propertiesService.create.mockResolvedValue(mockCreatedProperty as any)

			const validBody = {
				name: 'Test Property',
				address: '123 Main St',
				city: 'Austin',
				state: 'TX',
				zipCode: '78701',
				propertyType: 'APARTMENT'
			}

			const response = await request(app.getHttpServer())
				.post('/properties')
				.send(validBody)
				.expect(HttpStatus.CREATED)

			expect(response.body).toMatchObject({
				id: mockCreatedProperty.id,
				name: mockCreatedProperty.name,
				address: mockCreatedProperty.address,
				city: mockCreatedProperty.city,
				state: mockCreatedProperty.state,
				zipCode: mockCreatedProperty.zipCode,
				propertyType: mockCreatedProperty.propertyType,
				ownerId: mockCreatedProperty.ownerId,
				status: mockCreatedProperty.status
			})
			expect(propertiesService.create).toHaveBeenCalledWith(
				expect.any(Object),
				validBody
			)
		})

		it('should trim whitespace via Zod validation (production bug fix)', async () => {
			const mockCreatedProperty = {
				id: 'prop-456',
				name: 'Trimmed Property',
				address: '456 Oak St',
				city: 'Dallas',
				state: 'TX',
				zipCode: '75201',
				propertyType: 'SINGLE_FAMILY',
				ownerId: 'owner-456',
				status: 'ACTIVE',
				createdAt: new Date(),
				updatedAt: new Date()
			}

			propertiesService.create.mockResolvedValue(mockCreatedProperty as any)

			// Send values with leading/trailing whitespace
			const bodyWithWhitespace = {
				name: '  Trimmed Property  ',
				address: '  456 Oak St  ',
				city: '  Dallas  ',
				state: '  TX  ',
				zipCode: '  75201  ',
				propertyType: 'SINGLE_FAMILY'
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
					address: '456 Oak St',
					city: 'Dallas',
					state: 'TX',
					zipCode: '75201'
				})
			)
		})

		it('should reject invalid propertyType enum (production validation)', async () => {
			const invalidBody = {
				name: 'Invalid Property',
				address: '789 Elm St',
				city: 'Houston',
				state: 'TX',
				zipCode: '77001',
				propertyType: 'INVALID_TYPE' // Not in enum
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
				// Missing address, city, state, zipCode, propertyType
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
				address: '123 Main St',
				city: 'Austin',
				state: 'TX',
				zipCode: '78701',
				propertyType: 'APARTMENT'
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
				address: '123 Main St',
				city: 'Austin',
				state: 'texas', // Should be 'TX'
				zipCode: '78701',
				propertyType: 'APARTMENT'
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
				address: '123 Main St',
				city: 'Austin',
				state: 'TX',
				zipCode: '1234', // Should be 5 or 9 digits
				propertyType: 'APARTMENT'
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
				address: '321 Pine St',
				city: 'San Antonio',
				state: 'TX',
				zipCode: '78205-1234',
				propertyType: 'CONDO',
				ownerId: 'owner-789',
				status: 'ACTIVE',
				createdAt: new Date(),
				updatedAt: new Date()
			}

			propertiesService.create.mockResolvedValue(mockCreatedProperty as any)

			const validBody = {
				name: 'ZIP+4 Property',
				address: '321 Pine St',
				city: 'San Antonio',
				state: 'TX',
				zipCode: '78205-1234', // ZIP+4 format
				propertyType: 'CONDO'
			}

			await request(app.getHttpServer())
				.post('/properties')
				.send(validBody)
				.expect(HttpStatus.CREATED)

			expect(propertiesService.create).toHaveBeenCalled()
		})
	})

	describe('PUT /properties/:id - Property Update', () => {
		it('should accept valid property update with propertyType', async () => {
			const propertyId = '550e8400-e29b-41d4-a716-446655440000' // Valid UUID
			const mockUpdatedProperty = {
				id: propertyId,
				name: 'Updated Property',
				propertyType: 'TOWNHOUSE',
				status: 'ACTIVE'
			}

			propertiesService.update.mockResolvedValue(mockUpdatedProperty as any)

			const updateBody = {
				name: 'Updated Property',
				propertyType: 'TOWNHOUSE'
			}

			const response = await request(app.getHttpServer())
				.put(`/properties/${propertyId}`)
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

		it('should reject invalid propertyType on update', async () => {
			const propertyId = '550e8400-e29b-41d4-a716-446655440001' // Valid UUID
			const invalidBody = {
				propertyType: 'NOT_A_REAL_TYPE'
			}

			await request(app.getHttpServer())
				.put(`/properties/${propertyId}`)
				.send(invalidBody)
				.expect(HttpStatus.BAD_REQUEST)

			expect(propertiesService.update).not.toHaveBeenCalled()
		})

		it('should accept partial update (only some fields)', async () => {
			const propertyId = '550e8400-e29b-41d4-a716-446655440002' // Valid UUID
			const mockUpdatedProperty = {
				id: propertyId,
				name: 'Partially Updated Property'
			}

			propertiesService.update.mockResolvedValue(mockUpdatedProperty as any)

			const partialBody = {
				name: 'Partially Updated Property'
				// Only updating name, not propertyType or other fields
			}

			await request(app.getHttpServer())
				.put(`/properties/${propertyId}`)
				.send(partialBody)
				.expect(HttpStatus.OK)

			expect(propertiesService.update).toHaveBeenCalled()
		})
	})
})
