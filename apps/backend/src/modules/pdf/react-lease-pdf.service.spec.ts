import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { ReactLeasePDFService } from './react-lease-pdf.service'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'

describe('ReactLeasePDFService', () => {
	let service: ReactLeasePDFService

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [ReactLeasePDFService]
		}).compile()

		service = module.get<ReactLeasePDFService>(ReactLeasePDFService)
	})

	const createMockLeaseData = (): LeaseGenerationFormData => ({
		// Agreement date
		agreementDate: '2024-01-15',

		// Parties
		ownerName: 'John Smith',
		ownerAddress: '123 Main St, Austin, TX 78701',
		ownerPhone: '512-555-1234',
		tenantName: 'Jane Doe',

		// Property
		propertyAddress: '456 Oak Ave, Austin, TX 78702',
		propertyId: '123e4567-e89b-12d3-a456-426614174000',

		// Term
		commencementDate: '2024-02-01',
		terminationDate: '2025-01-31',

		// Financial
		monthlyRent: 1500,
		rentDueDay: 1,
		lateFeeAmount: 50,
		lateFeeGraceDays: 3,
		nsfFee: 50,
		securityDeposit: 1500,
		securityDepositDueDays: 30,
		holdOverRentMultiplier: 1.2,

		// Occupancy
		maxOccupants: 2,
		allowedUse: 'Residential dwelling purposes only',

		// Utilities
		utilitiesIncluded: ['Water', 'Trash'],
		tenantResponsibleUtilities: ['Electric', 'Gas', 'Internet'],

		// Pets
		petsAllowed: false,
		petDeposit: 0,
		petRent: 0,

		// Alterations
		alterationsAllowed: false,
		alterationsRequireConsent: true,

		// Legal
		governingState: 'TX',
		prevailingPartyAttorneyFees: true,
		propertyBuiltBefore1978: false,

		// Notices
		noticeAddress: '123 Main St, Austin, TX 78701',
		noticeEmail: 'john.smith@example.com',

		// Tenant ID
		tenantId: '987e6543-e21b-12d3-a456-426614174999'
	})

	describe('generateLeasePDF', () => {
		it('should generate a PDF buffer', async () => {
			const mockData = createMockLeaseData()

			const pdfBuffer = await service.generateLeasePDF(mockData)

			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.length).toBeGreaterThan(0)
		})

		
		it('should handle pets allowed = true', async () => {
			const mockData: LeaseGenerationFormData = {
				...createMockLeaseData(),
				petsAllowed: true,
				petDeposit: 500,
				petRent: 50
			}

			const pdfBuffer = await service.generateLeasePDF(mockData)

			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.length).toBeGreaterThan(0)
		})

		it('should handle property built before 1978', async () => {
			const mockData: LeaseGenerationFormData = {
				...createMockLeaseData(),
				propertyBuiltBefore1978: true
			}

			const pdfBuffer = await service.generateLeasePDF(mockData)

			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.length).toBeGreaterThan(0)
		})

		it('should handle minimal required data', async () => {
			const minimalData: LeaseGenerationFormData = {
				agreementDate: '2024-01-15',
				ownerName: 'Owner',
				ownerAddress: 'Address',
				ownerPhone: '555-1234',
				tenantName: 'Tenant',
				propertyAddress: 'Property',
				propertyId: '123e4567-e89b-12d3-a456-426614174000',
				commencementDate: '2024-02-01',
				terminationDate: '2025-01-31',
				monthlyRent: 1000,
				rentDueDay: 1,
				lateFeeAmount: 50,
				lateFeeGraceDays: 3,
				nsfFee: 50,
				securityDeposit: 1000,
				securityDepositDueDays: 30,
				holdOverRentMultiplier: 1.2,
				maxOccupants: 2,
				allowedUse: 'Residential',
				utilitiesIncluded: [],
				tenantResponsibleUtilities: [],
				petsAllowed: false,
				petDeposit: 0,
				petRent: 0,
				alterationsAllowed: false,
				alterationsRequireConsent: true,
				governingState: 'TX',
				prevailingPartyAttorneyFees: true,
				propertyBuiltBefore1978: false,
				noticeAddress: 'Address',
				noticeEmail: 'owner@example.com',
				tenantId: '123e4567-e89b-12d3-a456-426614174000'
			}

			const pdfBuffer = await service.generateLeasePDF(minimalData)

			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.length).toBeGreaterThan(0)
		})

		it('should handle all optional fields populated', async () => {
			const fullData: LeaseGenerationFormData = {
				...createMockLeaseData(),
				ownerPhone: '512-555-1234',
				lateFeeAmount: 75,
				maxOccupants: 4,
				utilitiesIncluded: ['Water', 'Trash', 'Sewer'],
				tenantResponsibleUtilities: ['Electric', 'Gas', 'Internet', 'Cable'],
				noticeAddress: '789 Notice St, Austin, TX 78703',
				noticeEmail: 'owner@example.com'
			}

			const pdfBuffer = await service.generateLeasePDF(fullData)

			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.length).toBeGreaterThan(0)
		})

		it('should generate consistent PDF size for same data', async () => {
			const mockData = createMockLeaseData()

			const buffer1 = await service.generateLeasePDF(mockData)
			const buffer2 = await service.generateLeasePDF(mockData)

			// PDFs should be similar size (allowing for metadata differences)
			expect(Math.abs(buffer1.length - buffer2.length)).toBeLessThan(1000)
		})

		it('should throw error on invalid data', async () => {
			const invalidData = {} as LeaseGenerationFormData

			await expect(
				service.generateLeasePDF(invalidData)
			).rejects.toThrow('Failed to generate lease PDF')
		})
	})

	describe('Service behavior', () => {
		it('should call renderToBuffer with template data', async () => {
			const mockData = createMockLeaseData()

			const pdfBuffer = await service.generateLeasePDF(mockData)

			// Verify service returns buffer from renderToBuffer (mocked)
			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.toString()).toBe('mock-pdf-buffer')
		})

		it('should handle form data fields correctly', async () => {
			const mockData = createMockLeaseData()

			// Should not throw with valid data
			const pdfBuffer = await service.generateLeasePDF(mockData)
			expect(pdfBuffer).toBeDefined()
		})
	})
})
