import type { TestingModule } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger';
import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { LeasePDFService } from './lease-pdf.service'
import { PDFGeneratorService } from './pdf-generator.service'

describe('LeasePDFService', () => {
	let service: LeasePDFService
	let mockPDFGenerator: jest.Mocked<PDFGeneratorService>
	let mockLogger: jest.Mocked<Logger>

	beforeEach(async () => {
		// Create mock implementations
		mockPDFGenerator = {
			generatePDF: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content'))
		} as jest.Mocked<SupabaseService>

		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn(),
			info: jest.fn()
		} as jest.Mocked<Logger>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeasePDFService,
				{
					provide: PDFGeneratorService,
					useValue: mockPDFGenerator
				},
				{
					provide: Logger,
					useValue: mockLogger
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<LeasePDFService>(LeasePDFService)
	})

	it('should be defined', () => {
		expect(service).toBeDefined()
	})

	describe('generateLeasePDF', () => {
		it('should generate a lease PDF with minimal data', async () => {
			const leaseData = {
				id: 'test-lease-123',
				userId: 'user-456'
			}

			const result = await service.generateLeasePDF(leaseData)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockPDFGenerator.generatePDF).toHaveBeenCalled()
		})

		it('should generate a lease PDF with complete data', async () => {
			const completeLeaseData = {
				id: 'lease-789',
				userId: 'user-123',
				property: {
					address: {
						street: '123 Main St',
						unit: '4B',
						city: 'San Francisco',
						state: 'CA',
						zipCode: '94105'
					},
					type: 'apartment',
					bedrooms: 2,
					bathrooms: 1.5,
					squareFeet: 850,
					parking: {
						included: true,
						spaces: 1
					},
					amenities: ['Laundry', 'Gym', 'Pool']
				},
				landlord: {
					name: 'Property Management LLC',
					isEntity: true,
					entityType: 'LLC',
					address: {
						street: '456 Business Ave',
						city: 'San Francisco',
						state: 'CA',
						zipCode: '94108'
					},
					phone: '(415) 555-0100',
					email: 'contact@propertymanagement.com'
				},
				tenants: [
					{
						name: 'John Doe',
						email: 'john.doe@example.com',
						phone: '(415) 555-0101',
						isMainTenant: true
					},
					{
						name: 'Jane Doe',
						email: 'jane.doe@example.com',
						phone: '(415) 555-0102',
						isMainTenant: false
					}
				],
				leaseTerms: {
					type: 'fixed_term',
					startDate: '2024-01-01T00:00:00Z',
					endDate: '2024-12-31T23:59:59Z',
					rentAmount: 350000, // $3500 in cents
					currency: 'USD',
					dueDate: 1,
					lateFee: {
						enabled: true,
						amount: 10000, // $100
						gracePeriod: 5
					},
					securityDeposit: {
						amount: 350000,
						monthsRent: 1,
						holdingAccount: true
					},
					additionalFees: [
						{
							type: 'pet_fee',
							description: 'Pet deposit for one cat',
							amount: 50000,
							refundable: true
						}
					]
				},
				policies: {
					pets: {
						allowed: true,
						types: ['cats'],
						deposit: 50000,
						monthlyFee: 5000,
						restrictions: 'Maximum 2 cats, no dogs'
					},
					smoking: {
						allowed: false
					},
					guests: {
						overnightLimit: 14,
						extendedStayLimit: 7
					}
				},
				customTerms: [
					{
						title: 'Quiet Hours',
						content: 'Quiet hours are from 10 PM to 8 AM daily.',
						required: true
					}
				],
				options: {
					includeStateDisclosures: true,
					includeFederalDisclosures: true,
					includeSignaturePages: true,
					format: 'detailed'
				}
			}

			const result = await service.generateLeasePDF(completeLeaseData)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockPDFGenerator.generatePDF).toHaveBeenCalledWith(
				expect.stringContaining('Residential Lease Agreement'),
				expect.objectContaining({
					format: 'A4',
					margin: expect.any(Object)
				})
			)
		})

		it('should handle PDF generation errors gracefully', async () => {
			mockPDFGenerator.generatePDF.mockRejectedValueOnce(
				new Error('PDF generation failed')
			)

			const leaseData = {
				id: 'test-lease',
				userId: 'test-user'
			}

			await expect(service.generateLeasePDF(leaseData)).rejects.toThrow()
			expect(mockLogger.error).toHaveBeenCalled()
		})
	})

	describe('generateLeasePdf (controller method)', () => {
		it('should return PDF buffer with metadata', async () => {
			const result = await service.generateLeasePdf(
				'lease-001',
				'user-001',
				{
					property: {
						address: {
							street: '789 Oak St',
							city: 'Los Angeles',
							state: 'CA',
							zipCode: '90001'
						}
					}
				}
			)

			expect(result).toHaveProperty('buffer')
			expect(result).toHaveProperty('filename')
			expect(result).toHaveProperty('mimeType')
			expect(result).toHaveProperty('size')
			expect(result.buffer).toBeInstanceOf(Buffer)
			expect(result.filename).toContain('lease-001')
			expect(result.mimeType).toBe('application/pdf')
			expect(result.size).toBeGreaterThan(0)
		})
	})

	describe('Template Rendering', () => {
		it('should handle missing optional fields gracefully', async () => {
			const minimalData = {
				property: {
					address: {
						street: 'Test St',
						city: 'Test City',
						state: 'TX'
					}
				}
			}

			const result = await service.generateLeasePDF(minimalData)

			expect(result).toBeInstanceOf(Buffer)
			expect(mockLogger.error).not.toHaveBeenCalled()
		})

		it('should apply state-specific requirements', async () => {
			const californiaLease = {
				property: {
					address: {
						state: 'CA'
					}
				}
			}

			const floridaLease = {
				property: {
					address: {
						state: 'FL'
					}
				}
			}

			// Generate both to ensure state-specific logic is applied
			const caResult = await service.generateLeasePDF(californiaLease)
			const flResult = await service.generateLeasePDF(floridaLease)

			expect(caResult).toBeInstanceOf(Buffer)
			expect(flResult).toBeInstanceOf(Buffer)
		})

		it('should include federal disclosures for pre-1978 properties', async () => {
			const oldPropertyLease = {
				property: {
					address: {
						state: 'NY'
					},
					yearBuilt: 1970
				}
			}

			const result = await service.generateLeasePDF(oldPropertyLease)

			expect(result).toBeInstanceOf(Buffer)
			// The template should include lead paint disclosure for pre-1978 properties
			expect(mockPDFGenerator.generatePDF).toHaveBeenCalledWith(
				expect.stringContaining('LEAD'),
				expect.any(Object)
			)
		})
	})
})