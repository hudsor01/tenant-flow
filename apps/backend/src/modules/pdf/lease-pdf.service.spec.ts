import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { LeasePDFService } from './lease-pdf.service'
import { PDFGeneratorService } from './pdf-generator.service'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'
import {
	createDefaultContext,
	getDefaultSelections,
	leaseTemplateSchema
} from '@repo/shared/templates/lease-template'

describe('LeasePDFService', () => {
	let service: LeasePDFService
	let mockPDFGenerator: jest.Mocked<PDFGeneratorService>

	const minimalLeaseData: LeaseFormData = {
		property: {
			address: {
				street: '1 Demo Way',
				city: 'Demo City',
				state: 'CA',
				zipCode: '90001'
			},
			type: 'apartment',
			bedrooms: 1,
			bathrooms: 1
		},
		landlord: {
			name: 'Landlord',
			isEntity: false,
			address: {
				street: '500 Landlord St',
				city: 'Demo City',
				state: 'CA',
				zipCode: '90002'
			},
			phone: '555-0100',
			email: 'landlord@example.com'
		},
		tenants: [
			{
				name: 'Tenant One',
				email: 'tenant@example.com',
				phone: '555-0101',
				isMainTenant: true
			}
		],
		leaseTerms: {
			type: 'fixed_term',
			startDate: '2024-01-01T00:00:00.000Z',
			endDate: '2024-12-31T23:59:59.000Z',
			rentAmount: 120000,
			currency: 'USD',
			dueDate: 1,
			lateFee: {
				enabled: true,
				amount: 5000,
				gracePeriod: 5
			},
			securityDeposit: {
				amount: 120000,
				monthsRent: 1
			}
		},
		options: {
			includeStateDisclosures: true,
			includeFederalDisclosures: true,
			includeSignaturePages: true,
			format: 'standard'
		}
	}

	beforeEach(async () => {
		mockPDFGenerator = {
			generatePDF: jest.fn().mockResolvedValue(Buffer.from('pdf')),
			generateInvoicePDF: jest.fn(),
			generateLeaseAgreementPDF: jest.fn(),
			onModuleDestroy: jest.fn(),
			getBrowser: jest.fn(),
			browser: null
		} as unknown as jest.Mocked<PDFGeneratorService>

		const moduleRef = await Test.createTestingModule({
			providers: [
				LeasePDFService,
				{ provide: PDFGeneratorService, useValue: mockPDFGenerator }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = moduleRef.get(LeasePDFService)

		jest.spyOn(service['logger'], 'error').mockImplementation(() => {})
	})

	it('generates PDF with minimal data', async () => {
		const buffer = await service.generateLeasePDF(
			minimalLeaseData as unknown as Record<string, unknown>
		)
		expect(buffer).toBeInstanceOf(Buffer)
		expect(mockPDFGenerator.generatePDF).toHaveBeenCalled()
	})

	it('generates PDF with full clause selection', async () => {
		const fullLeaseData = {
			...minimalLeaseData,
			policies: {
				pets: { allowed: true, types: ['cats'] },
				smoking: { allowed: false },
				guests: { allowed: true },
				maintenance: { requestProcess: 'Contact landlord' }
			},
			customTerms: [
				{ title: 'Quiet Hours', content: '10 PM to 8 AM', required: true }
			]
		}

		const buffer = await service.generateLeasePDF(
			fullLeaseData as unknown as Record<string, unknown>
		)
		expect(buffer).toBeInstanceOf(Buffer)
		expect(mockPDFGenerator.generatePDF).toHaveBeenCalledWith(
			expect.stringContaining('Residential Lease Agreement'),
			expect.any(Object)
		)
	})

	it('logs and rethrows when PDF generation fails', async () => {
		mockPDFGenerator.generatePDF.mockRejectedValueOnce(new Error('PDF failure'))

		await expect(
			service.generateLeasePDF(
				minimalLeaseData as unknown as Record<string, unknown>
			)
		).rejects.toThrow('PDF failure')
		expect(service['logger'].error).toHaveBeenCalled()
	})

	it('renders PDF from template selections', async () => {
		const context = createDefaultContext({
			landlordName: 'Preview Landlord',
			tenantNames: 'Preview Tenant',
			propertyAddress: '123 Preview Ave, Demo City, CA 90003',
			propertyState: 'CA',
			rentAmountCents: 150000,
			securityDepositCents: 150000,
			leaseStartDateISO: '2024-02-01T00:00:00.000Z'
		})
		const selections = getDefaultSelections(leaseTemplateSchema, 'CA')

		const buffer = await service.generateLeasePdfFromTemplate(
			selections,
			context
		)

		expect(buffer).toBeInstanceOf(Buffer)
	})
})
