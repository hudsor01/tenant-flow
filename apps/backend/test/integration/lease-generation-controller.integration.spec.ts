import type { INestApplication } from '@nestjs/common'
import { HttpStatus } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ZodValidationPipe } from 'nestjs-zod'
import request from 'supertest'
import { LeaseGenerationController } from '../../src/modules/pdf/lease-generation.controller'
import { ReactLeasePDFService } from '../../src/modules/pdf/react-lease-pdf.service'
import { SupabaseService } from '../../src/database/supabase.service'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'

/**
 * Integration Tests - Lease Generation Controller
 *
 * Tests the full HTTP request pipeline for lease generation:
 * - Zod DTO validation
 * - Controller request handling
 * - PDF generation service integration
 * - Proper HTTP headers for PDF responses
 * - Auto-fill endpoint validation
 *
 * Mocks database layer but tests full controller/service/validation stack
 */
describe('LeaseGenerationController (Integration)', () => {
	let app: INestApplication
	let leasePDFService: jest.Mocked<ReactLeasePDFService>
	let supabaseService: jest.Mocked<SupabaseService>

	const mockLeaseData: LeaseGenerationFormData = {
		agreementDate: '2024-01-15',
		ownerName: 'John Smith',
		ownerAddress: '123 Main St, Austin, TX 78701',
		ownerPhone: '512-555-1234',
		tenantName: 'Jane Doe',
		propertyAddress: '456 Oak Ave, Austin, TX 78702',
		property_id: '123e4567-e89b-12d3-a456-426614174000',
		commencementDate: '2024-02-01',
		terminationDate: '2025-01-31',
		rent_amount: 1500,
		rentDueDay: 1,
		late_fee_amount: 50,
		lateFeeGraceDays: 3,
		nsfFee: 50,
		security_deposit: 1500,
		security_depositDueDays: 30,
		holdOverRentMultiplier: 1.2,
		maxOccupants: 2,
		allowedUse: 'Residential dwelling purposes only',
		utilitiesIncluded: ['Water', 'Trash'],
		tenantResponsibleUtilities: ['Electric', 'Gas', 'Internet'],
		alterationsAllowed: false,
		alterationsRequireConsent: true,
		propertyRules: 'No smoking',
		petsAllowed: false,
		petDeposit: 0,
		petRent: 0,
		prevailingPartyAttorneyFees: true,
		governingState: 'TX',
		noticeAddress: '123 Main St, Austin, TX 78701',
		noticeEmail: 'john.smith@example.com',
		propertyBuiltBefore1978: false,
		leadPaintDisclosureProvided: false,
		tenant_id: '223e4567-e89b-12d3-a456-426614174000'
	}

	const mockPDFBuffer = Buffer.from('mock-pdf-content')

	beforeAll(async () => {
		// Mock services
		const mockLeasePDFService = {
			generateLeasePDF: jest.fn()
		}

		const mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue({
				from: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn()
			})
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LeaseGenerationController],
			providers: [
				{
					provide: ReactLeasePDFService,
					useValue: mockLeasePDFService
				},
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		}).compile()

		app = module.createNestApplication()
		app.useGlobalPipes(new ZodValidationPipe())
		await app.init()

		leasePDFService = module.get(ReactLeasePDFService)
		supabaseService = module.get(SupabaseService)
	})

	afterAll(async () => {
		await app.close()
	})

	beforeEach(() => {
		jest.clearAllMocks()
		leasePDFService.generateLeasePDF.mockResolvedValue(mockPDFBuffer)
	})

	describe('POST /api/v1/leases/generate - Preview PDF', () => {
		it('should generate PDF and return with inline disposition', async () => {
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases/generate')
				.send(mockLeaseData)
				.expect(HttpStatus.OK)

			// Verify PDF service was called
			expect(leasePDFService.generateLeasePDF).toHaveBeenCalledWith(mockLeaseData)

			// Verify response headers
			expect(response.headers['content-type']).toBe('application/pdf')
			expect(response.headers['content-disposition']).toMatch(/^inline; filename="lease-.*\.pdf"$/)
			expect(response.headers['cache-control']).toBe('no-cache')

			// Verify response body
			expect(response.body).toEqual(mockPDFBuffer)
		})

		it('should sanitize filename with special characters', async () => {
			const dataWithSpecialChars = {
				...mockLeaseData,
				propertyAddress: '456 Oak Ave. (Unit #2), Austin, TX 78702',
				tenantName: "Jane O'Doe-Smith"
			}

			const response = await request(app.getHttpServer())
				.post('/api/v1/leases/generate')
				.send(dataWithSpecialChars)
				.expect(HttpStatus.OK)

			// Filename should have special characters replaced with hyphens
			const contentDisposition = response.headers['content-disposition'] as string
			const filename = contentDisposition.match(/filename="([^"]+)"/)?.[1]
			expect(filename).toBeDefined()
			expect(filename).toMatch(/^lease-[-a-zA-Z0-9]+-[-a-zA-Z0-9]+-\d{4}-\d{2}-\d{2}\.pdf$/)
			expect(filename).not.toMatch(/[()#'.,]/)
		})

		it('should reject invalid lease data with Zod validation', async () => {
			const invalidData = {
				...mockLeaseData,
				rent_amount: -100, // Invalid: negative rent
				rentDueDay: 35 // Invalid: day > 31
			}

			await request(app.getHttpServer())
				.post('/api/v1/leases/generate')
				.send(invalidData)
				.expect(HttpStatus.BAD_REQUEST)

			// Service should not be called with invalid data
			expect(leasePDFService.generateLeasePDF).not.toHaveBeenCalled()
		})

		it('should reject missing required fields', async () => {
			const incompleteData = {
				agreementDate: '2024-01-15',
				ownerName: 'John Smith'
				// Missing required fields
			}

			await request(app.getHttpServer())
				.post('/api/v1/leases/generate')
				.send(incompleteData)
				.expect(HttpStatus.BAD_REQUEST)

			expect(leasePDFService.generateLeasePDF).not.toHaveBeenCalled()
		})

		it('should handle PDF generation errors gracefully', async () => {
			leasePDFService.generateLeasePDF.mockRejectedValue(
				new Error('PDF generation failed')
			)

			await request(app.getHttpServer())
				.post('/api/v1/leases/generate')
				.send(mockLeaseData)
				.expect(HttpStatus.INTERNAL_SERVER_ERROR)
		})
	})

	describe('POST /api/v1/leases/download - Download PDF', () => {
		it('should generate PDF and return with attachment disposition', async () => {
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases/download')
				.send(mockLeaseData)
				.expect(HttpStatus.OK)

			// Verify PDF service was called
			expect(leasePDFService.generateLeasePDF).toHaveBeenCalledWith(mockLeaseData)

			// Verify response headers for download
			expect(response.headers['content-type']).toBe('application/pdf')
			expect(response.headers['content-disposition']).toMatch(/^attachment; filename="lease-.*\.pdf"$/)

			// Verify response body
			expect(response.body).toEqual(mockPDFBuffer)
		})

		it('should use same filename sanitization as generate', async () => {
			const generateResponse = await request(app.getHttpServer())
				.post('/api/v1/leases/generate')
				.send(mockLeaseData)
				.expect(HttpStatus.OK)

			const downloadResponse = await request(app.getHttpServer())
				.post('/api/v1/leases/download')
				.send(mockLeaseData)
				.expect(HttpStatus.OK)

			// Extract filenames
			const generateDisposition = generateResponse.headers['content-disposition'] as string
			const downloadDisposition = downloadResponse.headers['content-disposition'] as string
			const generateFilename = generateDisposition.match(/filename="([^"]+)"/)?.[1]
			const downloadFilename = downloadDisposition.match(/filename="([^"]+)"/)?.[1]

			// Should be identical (same date, data)
			expect(generateFilename).toBeDefined()
			expect(downloadFilename).toBeDefined()
			expect(generateFilename).toBe(downloadFilename)
		})
	})

	describe('GET /api/v1/leases/auto-fill/:property_id/:unit_id/:tenant_id', () => {
		const mockproperty_id = '123e4567-e89b-12d3-a456-426614174000'
		const mockunit_id = '223e4567-e89b-12d3-a456-426614174000'
		const mocktenant_id = '323e4567-e89b-12d3-a456-426614174000'

		beforeEach(() => {
			// Reset mock implementation to avoid state pollution
			jest.clearAllMocks()
		})

		it('should auto-fill lease data from property, unit, and tenant', async () => {
			const mockProperty = {
				id: mockproperty_id,
				address: '456 Oak Ave',
				city: 'Austin',
				state: 'TX',
				postal_code: '78702',
				owner_id: 'owner-123'
			}

			const mockUnit = {
				id: mockunit_id,
				rent: 1500,
				unit_number: '101',
				property_id: mockproperty_id
			}

			const mockTenant = {
				id: mocktenant_id,
				first_name: 'Jane',
				last_name: 'Doe',
				email: 'jane.doe@example.com'
			}

			const mockOwner = {
				first_name: 'John',
				last_name: 'Smith',
				email: 'john.smith@example.com'
			}

			// Mock Supabase query chain
			const mockChain = {
				from: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({ data: mockProperty, error: null })
					.mockResolvedValueOnce({ data: mockUnit, error: null })
					.mockResolvedValueOnce({ data: mockTenant, error: null })
					.mockResolvedValueOnce({ data: mockOwner, error: null })
			}
			supabaseService.getAdminClient.mockReturnValue(mockChain as never)

			const response = await request(app.getHttpServer())
				.get(`/api/v1/leases/auto-fill/${mockproperty_id}/${mockunit_id}/${mocktenant_id}`)
				.expect(HttpStatus.OK)

			// Verify auto-filled data structure
			expect(response.body).toMatchObject({
				propertyAddress: '456 Oak Ave, Austin, TX 78702',
				property_id: mockproperty_id,
				ownerName: 'John Smith',
				tenantName: 'Jane Doe',
				tenant_id: mocktenant_id,
				rent_amount: 1500,
				security_deposit: 1500,
				governingState: 'TX'
			})
		})

		it('should return 404 when property not found', async () => {
			const mockChain = {
				from: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116', message: 'Not found' }
				})
			}
			supabaseService.getAdminClient.mockReturnValue(mockChain as never)

			await request(app.getHttpServer())
				.get(`/api/v1/leases/auto-fill/${mockproperty_id}/${mockunit_id}/${mocktenant_id}`)
				.expect(HttpStatus.NOT_FOUND)
		})

		it('should return 404 when unit not found', async () => {
			const mockProperty = {
				id: mockproperty_id,
				address: '456 Oak Ave',
				city: 'Austin',
				state: 'TX',
				postal_code: '78702',
				owner_id: 'owner-123'
			}

			const mockChain = {
				from: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({ data: mockProperty, error: null })
					.mockResolvedValueOnce({
						data: null,
						error: { code: 'PGRST116', message: 'Not found' }
					})
			}
			supabaseService.getAdminClient.mockReturnValue(mockChain as never)

			await request(app.getHttpServer())
				.get(`/api/v1/leases/auto-fill/${mockproperty_id}/${mockunit_id}/${mocktenant_id}`)
				.expect(HttpStatus.NOT_FOUND)
		})

		it('should reject invalid UUID format', async () => {
			await request(app.getHttpServer())
				.get('/api/v1/leases/auto-fill/invalid-uuid/another-invalid/bad-uuid')
				.expect(HttpStatus.BAD_REQUEST)
		})

		it('should return 400 when unit does not belong to property', async () => {
			const mockProperty = {
				id: mockproperty_id,
				address: '456 Oak Ave',
				city: 'Austin',
				state: 'TX',
				postal_code: '78702',
				owner_id: 'owner-123'
			}

			const mockUnit = {
				id: mockunit_id,
				rent: 1500,
				unit_number: '101',
				property_id: 'different-property-id' // Mismatch!
			}

			const mockTenant = {
				id: mocktenant_id,
				first_name: 'Jane',
				last_name: 'Doe',
				email: 'jane.doe@example.com'
			}

			const mockChain = {
				from: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest
					.fn()
					.mockResolvedValueOnce({ data: mockProperty, error: null })
					.mockResolvedValueOnce({ data: mockUnit, error: null })
					.mockResolvedValueOnce({ data: mockTenant, error: null })
			}
			supabaseService.getAdminClient.mockReturnValue(mockChain as never)

			await request(app.getHttpServer())
				.get(`/api/v1/leases/auto-fill/${mockproperty_id}/${mockunit_id}/${mocktenant_id}`)
				.expect(HttpStatus.BAD_REQUEST)
		})
	})

	describe('Filename Sanitization Helper', () => {
		it('should generate consistent filenames with date', async () => {
			const response1 = await request(app.getHttpServer())
				.post('/api/v1/leases/generate')
				.send(mockLeaseData)
				.expect(HttpStatus.OK)

			const contentDisposition = response1.headers['content-disposition'] as string
			const filename = contentDisposition.match(/filename="([^"]+)"/)?.[1]

			// Verify filename format
			expect(filename).toBeDefined()
			expect(filename).toMatch(/^lease-.+-Jane-Doe-\d{4}-\d{2}-\d{2}\.pdf$/)
		})

		it('should truncate long property addresses to max length', async () => {
			const longAddress =
				'123456789012345678901234567890123456789012345678901234567890'
			const dataWithLongAddress = {
				...mockLeaseData,
				propertyAddress: longAddress
			}

			const response = await request(app.getHttpServer())
				.post('/api/v1/leases/generate')
				.send(dataWithLongAddress)
				.expect(HttpStatus.OK)

			const contentDisposition = response.headers['content-disposition'] as string
			const filename = contentDisposition.match(/filename="([^"]+)"/)?.[1]
			expect(filename).toBeDefined()
			const addressPart = filename?.split('-')[1]

			// Should be truncated to MAX_ADDRESS_LENGTH (30 chars)
			expect(addressPart).toBeDefined()
			expect(addressPart?.length).toBeLessThanOrEqual(30)
		})
	})
})
