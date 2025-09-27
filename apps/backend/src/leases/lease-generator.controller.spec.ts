import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Response } from 'express'
import type { LeaseGeneratorFormData as LeaseFormData } from '@repo/shared'
import { SilentLogger } from '../__test__/silent-logger'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { LeaseGeneratorController } from './lease-generator.controller'

describe('LeaseGeneratorController', () => {
	let controller: LeaseGeneratorController
	let pdfService: { generateLeaseAgreement: jest.Mock }

	const validLease: LeaseFormData = {
		property: {
			address: {
				street: '123 Main St',
				city: 'Los Angeles',
				state: 'CA' as const,
				zipCode: '90001'
			},
			type: 'apartment' as const,
			bedrooms: 2,
			bathrooms: 1
		},
		landlord: {
			name: 'Test Landlord',
			isEntity: false,
			address: {
				street: '456 Owner Ave',
				city: 'San Francisco',
				state: 'CA' as const,
				zipCode: '94102'
			},
			phone: '555-0100',
			email: 'landlord@example.com'
		},
		tenants: [{
			name: 'John Doe',
			email: 'john@example.com',
			phone: '555-0200',
			isMainTenant: true
		}],
		leaseTerms: {
			type: 'fixed_term' as const,
			startDate: '2024-01-01',
			endDate: '2024-12-31',
			rentAmount: 2500,
			currency: 'USD' as const,
			dueDate: 1,
			lateFee: {
				enabled: true,
				amount: 50,
				gracePeriod: 5
			},
			securityDeposit: {
				amount: 2500,
				monthsRent: 1
			}
		},
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
			const invalidLease = {
				...validLease,
				property: {
					...validLease.property,
					address: {
						...validLease.property.address,
						state: '' as 'CA' // TypeScript hack for invalid state test
					}
				}
			}

			await expect(controller.generateLease(invalidLease))
				.rejects.toThrow(new BadRequestException('Property state is required'))
		})

		it('rejects missing landlord', async () => {
			const invalidLease = {
				...validLease,
				landlord: {
					name: '',
					isEntity: false,
					address: { street: '123 Test St', city: 'Test City', state: 'CA' as const, zipCode: '12345' },
					phone: '555-0123',
					email: 'test@example.com'
				}
			}

			await expect(controller.generateLease(invalidLease))
				.rejects.toThrow(new BadRequestException('Landlord name is required'))
		})

		it('rejects empty tenants', async () => {
			const invalidLease = { ...validLease, tenants: [] }

			await expect(controller.generateLease(invalidLease))
				.rejects.toThrow(new BadRequestException('At least one tenant is required'))
		})

		it('rejects missing rent', async () => {
			const invalidLease = {
				...validLease,
				leaseTerms: {
					type: 'fixed_term' as const,
					startDate: '2024-01-01',
					rentAmount: 0,
					currency: 'USD' as const,
					dueDate: 1,
					lateFee: { enabled: false },
					securityDeposit: { amount: 1000, monthsRent: 1 }
				}
			}

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

			await controller.downloadLease('test.pdf', mockReply as unknown as Response)

			expect(mockReply.type).toHaveBeenCalledWith('application/pdf')
			expect(mockReply.header).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.pdf"')
			expect(mockReply.send).toHaveBeenCalledWith(pdfBuffer)
		})
	})

	describe('previewLease', () => {
		it('streams PDF with inline headers', async () => {
			const pdfBuffer = Buffer.from('test-pdf')
			pdfService.generateLeaseAgreement.mockResolvedValue(pdfBuffer)

			await controller.previewLease('test.pdf', mockReply as unknown as Response)

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
			const result = await controller.validateLease({
				property: {
					address: { street: '', city: '', state: '' as 'CA', zipCode: '' },
					type: 'apartment',
					bedrooms: 1,
					bathrooms: 1
				},
				landlord: {
					name: '',
					isEntity: false,
					address: { street: '', city: '', state: 'CA' as const, zipCode: '' },
					phone: '',
					email: ''
				},
				tenants: [],
				leaseTerms: {
					type: 'fixed_term',
					startDate: '',
					rentAmount: 0,
					currency: 'USD' as const,
					dueDate: 1,
					lateFee: { enabled: false },
					securityDeposit: { amount: 0, monthsRent: 0 }
				},
				options: {
					includeStateDisclosures: false,
					includeFederalDisclosures: false,
					includeSignaturePages: false,
					format: 'standard' as const
				}
			})

			expect(result.valid).toBe(false)
			expect(result.errors[0]?.code).toBe('REQUIRED_FIELD')
		})

		it('validates CA security deposit limits', async () => {
			const caLease = {
				...validLease,
				property: {
					...validLease.property,
					address: { ...validLease.property.address, state: 'CA' as const }
				},
				leaseTerms: {
					...validLease.leaseTerms,
					rentAmount: 2000,
					securityDeposit: { amount: 5000, monthsRent: 2.5 } // Exceeds 2x rent
				}
			}

			const result = await controller.validateLease(caLease)

			expect(result.valid).toBe(false)
			expect(result.errors[0]?.code).toBe('CA_DEPOSIT_LIMIT')
		})

		it('warns about CA late fee grace period', async () => {
			const caLease = {
				...validLease,
				property: {
					...validLease.property,
					address: { ...validLease.property.address, state: 'CA' as const }
				},
				leaseTerms: {
					...validLease.leaseTerms,
					lateFee: { enabled: true, gracePeriod: 1 } // Less than 3 days
				}
			}

			const result = await controller.validateLease(caLease)

			expect(result.warnings.length).toBeGreaterThan(0)
		})

		it('returns state requirements', async () => {
			const result = await controller.validateLease({
			...validLease,
			property: {
				...validLease.property,
				address: { ...validLease.property.address, state: 'TX' as const }
			}
		})

			expect(result.stateRequirements.stateName).toBe('Texas')
		})
	})
})
