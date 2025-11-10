import {
	BadRequestException,
	InternalServerErrorException,
	Logger
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'
import { SilentLogger } from '../../__test__/silent-logger'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { LeaseGeneratorController } from './lease-generator.controller'
import { LeasesService } from './leases.service'
import { LeaseTransformationService } from './lease-transformation.service'
import { LeaseValidationService } from './lease-validation.service'

describe('LeaseGeneratorController', () => {
	let controller: LeaseGeneratorController
	let pdfService: { generateLeasePDF: jest.Mock }
	let leasesService: {
		findOne: jest.Mock
		getUserClient: jest.Mock
	}
	const mockToken = 'mock-token'
	const mockUserId = 'user-123'

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
		owner: {
			name: 'Test owner',
			isEntity: false,
			address: {
				street: '456 Owner Ave',
				city: 'San Francisco',
				state: 'CA' as const,
				zipCode: '94102'
			},
			phone: '555-0100',
			email: 'owner@example.com'
		},
		tenants: [
			{
				name: 'John Doe',
				email: 'john@example.com',
				phone: '555-0200',
				isMainTenant: true
			}
		],
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





	beforeEach(async () => {
		pdfService = { generateLeasePDF: jest.fn() }

		// Mock Supabase client chain for database operations
		const mockSupabaseClient = {
			from: jest.fn(() => ({
				insert: jest.fn(() => ({
					select: jest.fn(() => ({
						single: jest.fn(() =>
							Promise.resolve({
								data: { id: 'lease_mock-uuid', version: 1 },
								error: null
							})
						)
					}))
				})),
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						single: jest.fn(() =>
							Promise.resolve({
								data: null,
								error: { code: 'PGRST116', message: 'Not found' }
							})
						)
					}))
				}))
			}))
		}

		leasesService = {
			findOne: jest.fn(),
			getUserClient: jest.fn(() => mockSupabaseClient)
		}

		const module = await Test.createTestingModule({
			controllers: [LeaseGeneratorController],
			providers: [
				{ provide: LeasePDFService, useValue: pdfService },
				{ provide: LeasesService, useValue: leasesService },
				LeaseTransformationService,
				LeaseValidationService,
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
		it('generates lease with valid data and persists to database', async () => {
			pdfService.generateLeasePDF.mockResolvedValue(Buffer.from('pdf'))

			const result = await controller.generateLease(
				mockToken,
				mockUserId,
				validLease
			)

			expect(result.success).toBe(true)
			expect(result.lease.monthlyRent).toBe(25)
			expect(result.lease.id).toMatch(/^lease_/)
			expect(pdfService.generateLeasePDF).toHaveBeenCalledWith(validLease)
			expect(leasesService.getUserClient).toHaveBeenCalledWith(mockToken)
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

			await expect(
				controller.generateLease(mockToken, mockUserId, invalidLease)
			).rejects.toThrow(new BadRequestException('Property state is required'))
		})

		it('rejects missing owner', async () => {
			const invalidLease = {
				...validLease,
				owner: {
					name: '',
					isEntity: false,
					address: {
						street: '123 Test St',
						city: 'Test City',
						state: 'CA' as const,
						zipCode: '12345'
					},
					phone: '555-0123',
					email: 'test@example.com'
				}
			}

			await expect(
				controller.generateLease(mockToken, mockUserId, invalidLease)
			).rejects.toThrow(new BadRequestException('Owner name is required'))
		})

		it('rejects empty tenants', async () => {
			const invalidLease = { ...validLease, tenants: [] }

			await expect(
				controller.generateLease(mockToken, mockUserId, invalidLease)
			).rejects.toThrow(new BadRequestException('At least one tenant is required'))
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

			await expect(
				controller.generateLease(mockToken, mockUserId, invalidLease)
			).rejects.toThrow(new BadRequestException('Rent amount is required'))
		})

		it('handles PDF service errors', async () => {
			pdfService.generateLeasePDF.mockRejectedValue(new Error('PDF failed'))
			await expect(
				controller.generateLease(mockToken, mockUserId, validLease)
			).rejects.toThrow(
				new InternalServerErrorException('Failed to generate lease agreement')
			)
		})

		it('handles invalid start date', async () => {
			pdfService.generateLeasePDF.mockResolvedValue(Buffer.from('pdf'))

			const invalidLease = {
				...validLease,
				leaseTerms: {
					...validLease.leaseTerms,
					startDate: 'invalid-date'
				}
			}

			await expect(
				controller.generateLease(mockToken, mockUserId, invalidLease)
			).rejects.toThrow(new BadRequestException('Invalid start date'))
		})
	})

	describe('downloadLease', () => {
		let mockTransformationService: { buildLeaseFormData: jest.Mock }

		beforeEach(() => {
			mockTransformationService = {
				buildLeaseFormData: jest.fn()
			}
			// Replace the transformation service mock
			;(controller as any).transformationService = mockTransformationService
		})

		it('throws error when leaseId is missing', async () => {
			const mockReq = {
				headers: { authorization: `Bearer ${mockToken}` }
			} as any

			await expect(
				controller.downloadLease(undefined, mockReq)
			).rejects.toThrow('leaseId query parameter is required')
		})

		it('throws error when authorization token is missing', async () => {
			const mockReq = {
				headers: {}
			} as any

			await expect(
				controller.downloadLease('lease_123', mockReq)
			).rejects.toThrow('Authentication token is required')
		})

		it('successfully generates PDF for download', async () => {
			const leaseId = 'lease_test-123'
			const mockReq = {
				headers: { authorization: `Bearer ${mockToken}` }
			} as any

			// Mock transformation service to return valid lease data
			mockTransformationService.buildLeaseFormData.mockResolvedValue(validLease)

			// Mock PDF service
			const pdfBuffer = Buffer.from('test-pdf-content')
			pdfService.generateLeasePDF.mockResolvedValue(pdfBuffer)

			const result = await controller.downloadLease(leaseId, mockReq)

			// Verify transformation service called with correct params
			expect(mockTransformationService.buildLeaseFormData).toHaveBeenCalledWith(
				mockToken,
				leaseId
			)

			// Verify PDF generation
			expect(pdfService.generateLeasePDF).toHaveBeenCalledWith(validLease)

			// Verify response format (attachment for download)
			expect(result.success).toBe(true)
			expect(result.contentType).toBe('application/pdf')
			expect(result.disposition).toBe('attachment')
			expect(result.filename).toBe(`lease-${leaseId}.pdf`)
			expect(result.buffer).toBe(pdfBuffer)
		})

		it('handles transformation service errors', async () => {
			const mockReq = {
				headers: { authorization: `Bearer ${mockToken}` }
			} as any

			mockTransformationService.buildLeaseFormData.mockRejectedValue(
				new Error('Lease not found')
			)

			await expect(
				controller.downloadLease('lease_missing', mockReq)
			).rejects.toThrow('Lease not found')
		})

		it('handles PDF generation errors', async () => {
			const mockReq = {
				headers: { authorization: `Bearer ${mockToken}` }
			} as any

			mockTransformationService.buildLeaseFormData.mockResolvedValue(validLease)
			pdfService.generateLeasePDF.mockRejectedValue(new Error('PDF generation failed'))

			await expect(
				controller.downloadLease('lease_123', mockReq)
			).rejects.toThrow('PDF generation failed')
		})
	})

	describe('previewLease', () => {
		let mockTransformationService: { buildLeaseFormData: jest.Mock }

		beforeEach(() => {
			mockTransformationService = {
				buildLeaseFormData: jest.fn()
			}
			// Replace the transformation service mock
			;(controller as any).transformationService = mockTransformationService
		})

		it('throws error when leaseId is missing', async () => {
			const mockReq = {
				headers: { authorization: `Bearer ${mockToken}` }
			} as any

			await expect(
				controller.previewLease(undefined, mockReq)
			).rejects.toThrow('leaseId query parameter is required')
		})

		it('throws error when authorization token is missing', async () => {
			const mockReq = {
				headers: {}
			} as any

			await expect(
				controller.previewLease('lease_123', mockReq)
			).rejects.toThrow('Authentication token is required')
		})

		it('successfully generates PDF for preview (inline display)', async () => {
			const leaseId = 'lease_test-456'
			const mockReq = {
				headers: { authorization: `Bearer ${mockToken}` }
			} as any

			// Mock transformation service to return valid lease data
			mockTransformationService.buildLeaseFormData.mockResolvedValue(validLease)

			// Mock PDF service
			const pdfBuffer = Buffer.from('preview-pdf-content')
			pdfService.generateLeasePDF.mockResolvedValue(pdfBuffer)

			const result = await controller.previewLease(leaseId, mockReq)

			// Verify transformation service called
			expect(mockTransformationService.buildLeaseFormData).toHaveBeenCalledWith(
				mockToken,
				leaseId
			)

			// Verify PDF generation
			expect(pdfService.generateLeasePDF).toHaveBeenCalledWith(validLease)

			// Verify response format (inline for preview - key difference from download)
			expect(result.success).toBe(true)
			expect(result.contentType).toBe('application/pdf')
			expect(result.disposition).toBe('inline') // Different from download!
			expect(result.filename).toBe(`lease-${leaseId}.pdf`)
			expect(result.buffer).toBe(pdfBuffer)
		})

		it('handles transformation service errors', async () => {
			const mockReq = {
				headers: { authorization: `Bearer ${mockToken}` }
			} as any

			mockTransformationService.buildLeaseFormData.mockRejectedValue(
				new Error('Database connection failed')
			)

			await expect(
				controller.previewLease('lease_error', mockReq)
			).rejects.toThrow('Database connection failed')
		})

		it('handles PDF generation errors', async () => {
			const mockReq = {
				headers: { authorization: `Bearer ${mockToken}` }
			} as any

			mockTransformationService.buildLeaseFormData.mockResolvedValue(validLease)
			pdfService.generateLeasePDF.mockRejectedValue(
				new Error('Puppeteer timeout')
			)

			await expect(
				controller.previewLease('lease_456', mockReq)
			).rejects.toThrow('Puppeteer timeout')
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
				owner: {
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
