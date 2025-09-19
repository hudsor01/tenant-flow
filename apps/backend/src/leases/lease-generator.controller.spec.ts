import { Test } from '@nestjs/testing'
import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common'
import { LeaseGeneratorController } from './lease-generator.controller'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { SilentLogger } from '../__test__/silent-logger'

describe('LeaseGeneratorController', () => {
	let controller: LeaseGeneratorController
	let pdfService: { generateLeaseAgreement: jest.Mock }

	const validLease = {
		property: { address: { state: 'CA' } },
		landlord: { name: 'Test Landlord' },
		tenants: [{ name: 'John Doe' }],
		leaseTerms: { rentAmount: 2500 },
		options: {
			includeStateDisclosures: true,
			includeFederalDisclosures: true,
			includeSignaturePages: true,
			format: 'standard' as const
		}
	}

	const mockReply = {
		type: jest.fn().mockReturnThis(),
		header: jest.fn().mockReturnThis(),
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis()
	}

	beforeEach(async () => {
		pdfService = { generateLeaseAgreement: jest.fn() }
		
		const module = await Test.createTestingModule({
			controllers: [LeaseGeneratorController],
			providers: [
				{ provide: LeasePDFService, useValue: pdfService },
				{
					provide: Logger,
					useValue: {
						log: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
						debug: jest.fn(),
						verbose: jest.fn()
					}
				}
			]
		})
		.setLogger(new SilentLogger())
		.compile()

		controller = module.get(LeaseGeneratorController)
		jest.clearAllMocks()
	})

	describe('generateLease', () => {
		it('generates lease with valid data', async () => {
			pdfService.generateLeaseAgreement.mockResolvedValue(Buffer.from('pdf'))

			const result = await controller.generateLease(validLease)

			expect(result.success).toBe(true)
			expect(result.lease.monthlyRent).toBe(25)
			expect(pdfService.generateLeaseAgreement).toHaveBeenCalledWith(validLease)
		})

		it('rejects missing state', async () => {
			const invalidLease = { ...validLease, property: {} }

			await expect(controller.generateLease(invalidLease))
				.rejects.toThrow(new BadRequestException('Property state is required'))
		})

		it('rejects missing landlord', async () => {
			const invalidLease = { ...validLease, landlord: {} }

			await expect(controller.generateLease(invalidLease))
				.rejects.toThrow(new BadRequestException('Landlord name is required'))
		})

		it('rejects empty tenants', async () => {
			const invalidLease = { ...validLease, tenants: [] }

			await expect(controller.generateLease(invalidLease))
				.rejects.toThrow(new BadRequestException('At least one tenant is required'))
		})

		it('rejects missing rent', async () => {
			const invalidLease = { ...validLease, leaseTerms: {} }

			await expect(controller.generateLease(invalidLease))
				.rejects.toThrow(new BadRequestException('Rent amount is required'))
		})

		it('handles PDF service errors', async () => {
			pdfService.generateLeaseAgreement.mockRejectedValue(new Error('PDF failed'))

			await expect(controller.generateLease(validLease))
				.rejects.toThrow(new InternalServerErrorException('Failed to generate lease agreement'))
		})
	})

	describe('downloadLease', () => {
		it('streams PDF with attachment headers', async () => {
			const pdfBuffer = Buffer.from('test-pdf')
			pdfService.generateLeaseAgreement.mockResolvedValue(pdfBuffer)

			await controller.downloadLease('test.pdf', mockReply as unknown)

			expect(mockReply.type).toHaveBeenCalledWith('application/pdf')
			expect(mockReply.header).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.pdf"')
			expect(mockReply.send).toHaveBeenCalledWith(pdfBuffer)
		})
	})

	describe('previewLease', () => {
		it('streams PDF with inline headers', async () => {
			const pdfBuffer = Buffer.from('test-pdf')
			pdfService.generateLeaseAgreement.mockResolvedValue(pdfBuffer)

			await controller.previewLease('test.pdf', mockReply as unknown)

			expect(mockReply.header).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="test.pdf"')
			expect(mockReply.send).toHaveBeenCalledWith(pdfBuffer)
		})
	})

	describe('validateLease', () => {
		it('passes validation for valid lease', async () => {
			const result = await controller.validateLease(validLease)

			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})

		it('fails validation for missing state', async () => {
			const result = await controller.validateLease({ property: {} })

			expect(result.valid).toBe(false)
			expect(result.errors[0].code).toBe('REQUIRED_FIELD')
		})

		it('validates CA security deposit limits', async () => {
			const caLease = {
				property: { address: { state: 'CA' } },
				leaseTerms: { 
					rentAmount: 2000, 
					securityDeposit: { amount: 5000 } // Exceeds 2x rent
				}
			}

			const result = await controller.validateLease(caLease)

			expect(result.valid).toBe(false)
			expect(result.errors[0].code).toBe('CA_DEPOSIT_LIMIT')
		})

		it('warns about CA late fee grace period', async () => {
			const caLease = {
				property: { address: { state: 'CA' } },
				leaseTerms: { 
					lateFee: { enabled: true, gracePeriod: 1 } // Less than 3 days
				}
			}

			const result = await controller.validateLease(caLease)

			expect(result.warnings.length).toBeGreaterThan(0)
		})

		it('returns state requirements', async () => {
			const result = await controller.validateLease({ property: { address: { state: 'TX' } } })

			expect(result.stateRequirements.stateName).toBe('Texas')
		})
	})
})