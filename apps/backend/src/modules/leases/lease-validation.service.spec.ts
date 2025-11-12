import { Test, type TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { LeaseValidationService } from './lease-validation.service'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'

describe('LeaseValidationService', () => {
	let service: LeaseValidationService

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [LeaseValidationService]
		}).compile()

		service = module.get<LeaseValidationService>(LeaseValidationService)
	})

	it('should be defined', () => {
		expect(service).toBeDefined()
	})

	describe('validateRequiredFields', () => {
		it('should throw BadRequestException when property state is missing', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: {}
				}
			} as Partial<LeaseFormData>

			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).toThrow(
				BadRequestException
			)
			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).toThrow(
				'Property state is required'
			)
		})

		it('should throw BadRequestException when owner name is missing', () => {
			const leaseData = {
				property: {
					address: { state: 'CA' }
				},
				owner: {}
			} as unknown as LeaseFormData

			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).toThrow(
				BadRequestException
			)
			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).toThrow(
				'Owner name is required'
			)
		})

		it('should throw BadRequestException when tenants array is empty', () => {
			const leaseData = {
				property: {
					address: { state: 'CA' }
				},
				owner: { name: 'John Doe' },
				tenants: []
			} as unknown as LeaseFormData

			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).toThrow(
				BadRequestException
			)
			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).toThrow(
				'At least one tenant is required'
			)
		})

		it('should throw BadRequestException when rent amount is missing', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'CA' }
				},
				owner: { name: 'John Doe' },
				tenants: [{ name: 'Jane Smith' }],
				leaseTerms: {}
			} as Partial<LeaseFormData>

			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).toThrow(
				BadRequestException
			)
			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).toThrow(
				'Rent amount is required'
			)
		})

		it('should not throw when all required fields are present', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'CA' }
				},
				owner: { name: 'John Doe' },
				tenants: [{ name: 'Jane Smith' }],
				leaseTerms: {
					rentAmount: 2000
				}
			} as Partial<LeaseFormData>

			expect(() => service.validateRequiredFields(leaseData as LeaseFormData)).not.toThrow()
		})
	})

	describe('validateDates', () => {
		it('should parse valid start and end dates', () => {
			const leaseData: Partial<LeaseFormData> = {
				leaseTerms: {
					startDate: '2025-06-01',
					endDate: '2026-05-31'
				}
			} as Partial<LeaseFormData>

			const result = service.validateDates(leaseData as LeaseFormData)

			expect(result.startDate).toBeInstanceOf(Date)
			expect(result.endDate).toBeInstanceOf(Date)
			expect(result.startDate.toISOString()).toContain('2025-06')
			expect(result.endDate.toISOString()).toContain('2026-05')
		})

		it('should throw BadRequestException for invalid start date', () => {
			const leaseData: Partial<LeaseFormData> = {
				leaseTerms: {
					startDate: 'invalid-date',
					endDate: '2024-12-31'
				}
			} as Partial<LeaseFormData>

			expect(() => service.validateDates(leaseData as LeaseFormData)).toThrow(
				BadRequestException
			)
			expect(() => service.validateDates(leaseData as LeaseFormData)).toThrow('Invalid start date')
		})

		it('should throw BadRequestException for invalid end date', () => {
			const leaseData: Partial<LeaseFormData> = {
				leaseTerms: {
					startDate: '2024-01-01',
					endDate: 'invalid-date'
				}
			} as Partial<LeaseFormData>

			expect(() => service.validateDates(leaseData as LeaseFormData)).toThrow(
				BadRequestException
			)
			expect(() => service.validateDates(leaseData as LeaseFormData)).toThrow('Invalid end date')
		})

		it('should handle month-to-month leases (no end date) by setting far-future date', () => {
			const leaseData: Partial<LeaseFormData> = {
				leaseTerms: {
					startDate: '2024-01-01'
					// No endDate for month-to-month lease
				}
			} as Partial<LeaseFormData>

			const result = service.validateDates(leaseData as LeaseFormData)

			expect(result.startDate).toBeInstanceOf(Date)
			expect(result.endDate).toBeInstanceOf(Date)
			// End date should be ~100 years in the future
			const yearsDifference =
				(result.endDate.getTime() - result.startDate.getTime()) /
				(365 * 24 * 60 * 60 * 1000)
			expect(yearsDifference).toBeGreaterThan(99)
			expect(yearsDifference).toBeLessThan(101)
		})
	})

	describe('validateLeaseData', () => {
		it('should return valid=true for valid lease data', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'CA' }
				},
				leaseTerms: {
					rentAmount: 2000,
					securityDeposit: {
						amount: 3000
					}
				}
			} as Partial<LeaseFormData>

			const result = service.validateLeaseData(leaseData as LeaseFormData)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it('should return error when property state is missing', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: {}
				}
			} as Partial<LeaseFormData>

			const result = service.validateLeaseData(leaseData as LeaseFormData)

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]).toEqual({
				field: 'property.address.state',
				message: 'Property state is required',
				code: 'REQUIRED_FIELD'
			})
		})

		describe('California state-specific validation', () => {
			it('should return error when security deposit exceeds 2x rent', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'CA' }
					},
					leaseTerms: {
						rentAmount: 2000,
						securityDeposit: {
							amount: 5000 // Exceeds 2x rent (4000)
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(false)
				expect(result.errors).toHaveLength(1)
				expect(result.errors[0]).toEqual({
					field: 'leaseTerms.securityDeposit.amount',
					message: 'Security deposit cannot exceed 2x monthly rent in California',
					code: 'CA_DEPOSIT_LIMIT'
				})
			})

			it('should allow security deposit exactly at 2x rent limit', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'CA' }
					},
					leaseTerms: {
						rentAmount: 2000,
						securityDeposit: {
							amount: 4000 // Exactly 2x rent
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(true)
				expect(result.errors).toHaveLength(0)
			})

			it('should return warning when late fee grace period is less than 3 days', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'CA' }
					},
					leaseTerms: {
						rentAmount: 2000,
						lateFee: {
							enabled: true,
							gracePeriod: 1 // Less than recommended 3 days
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(true) // Valid, but with warning
				expect(result.errors).toHaveLength(0)
				expect(result.warnings).toHaveLength(1)
				expect(result.warnings[0]).toEqual({
					field: 'leaseTerms.lateFee.gracePeriod',
					message: 'California recommends minimum 3-day grace period for late fees',
					suggestion: 'Increase grace period to 3 days'
				})
			})

			it('should not return warning when late fee grace period is 3 or more days', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'CA' }
					},
					leaseTerms: {
						rentAmount: 2000,
						lateFee: {
							enabled: true,
							gracePeriod: 3
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(true)
				expect(result.warnings).toHaveLength(0)
			})

			it('should not validate late fee grace period when late fees are disabled', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'CA' }
					},
					leaseTerms: {
						rentAmount: 2000,
						lateFee: {
							enabled: false,
							gracePeriod: 0
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(true)
				expect(result.warnings).toHaveLength(0)
			})
		})

		it('should return state requirements in response', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'CA' }
				},
				leaseTerms: {
					rentAmount: 2000
				}
			} as Partial<LeaseFormData>

			const result = service.validateLeaseData(leaseData as LeaseFormData)

			expect(result.stateRequirements).toBeDefined()
			expect(result.stateRequirements.stateName).toBe('California')
		})
	})

	describe('getStateRequirements', () => {
		it('should return California requirements', () => {
			const result = service.getStateRequirements('CA')

			expect(result).toEqual({
				stateName: 'California',
				securityDepositMax: '2x monthly rent',
				lateFeeGracePeriod: '3 days minimum',
				requiredDisclosures: ['Lead Paint (pre-1978)', 'Bed Bug History']
			})
		})

		it('should return Texas requirements', () => {
			const result = service.getStateRequirements('TX')

			expect(result).toEqual({
				stateName: 'Texas',
				securityDepositMax: '2x monthly rent',
				lateFeeGracePeriod: '1 day minimum',
				requiredDisclosures: ['Lead Paint (pre-1978)']
			})
		})

		it('should return New York requirements', () => {
			const result = service.getStateRequirements('NY')

			expect(result).toEqual({
				stateName: 'New York',
				securityDepositMax: '1x monthly rent',
				lateFeeGracePeriod: '5 days minimum',
				requiredDisclosures: ['Lead Paint (pre-1978)', 'Bed Bug Annual Statement']
			})
		})

		it('should return default requirements for unknown state', () => {
			const result = service.getStateRequirements('WA')

			expect(result).toEqual({
				stateName: 'WA',
				securityDepositMax: 'Varies by state',
				lateFeeGracePeriod: 'Check state law',
				requiredDisclosures: ['Lead Paint (pre-1978)']
			})
		})
	})
})
