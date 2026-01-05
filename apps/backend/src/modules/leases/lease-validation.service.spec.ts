import { Test, type TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { LeaseValidationService } from './lease-validation.service'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('LeaseValidationService', () => {
	let service: LeaseValidationService

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeaseValidationService,
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
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

			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).toThrow(BadRequestException)
			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).toThrow('Property state is required')
		})

		it('should throw BadRequestException when owner name is missing', () => {
			const leaseData = {
				property: {
					address: { state: 'TX' }
				},
				owner: {}
			} as unknown as LeaseFormData

			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).toThrow(BadRequestException)
			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).toThrow('Owner name is required')
		})

		it('should throw BadRequestException when tenants array is empty', () => {
			const leaseData = {
				property: {
					address: { state: 'TX' }
				},
				owner: { name: 'John Doe' },
				tenants: []
			} as unknown as LeaseFormData

			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).toThrow(BadRequestException)
			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).toThrow('At least one tenant is required')
		})

		it('should throw BadRequestException when rent amount is missing', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'TX' }
				},
				owner: { name: 'John Doe' },
				tenants: [{ name: 'Jane Smith' }],
				leaseTerms: {}
			} as Partial<LeaseFormData>

			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).toThrow(BadRequestException)
			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).toThrow('Rent amount is required')
		})

		it('should not throw when all required fields are present', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'TX' }
				},
				owner: { name: 'John Doe' },
				tenants: [{ name: 'Jane Smith' }],
				leaseTerms: {
					rent_amount: 2000
				}
			} as Partial<LeaseFormData>

			expect(() =>
				service.validateRequiredFields(leaseData as LeaseFormData)
			).not.toThrow()
		})
	})

	describe('validateDates', () => {
		it('should parse valid start and end dates', () => {
			const leaseData: Partial<LeaseFormData> = {
				leaseTerms: {
					start_date: '2025-06-01',
					end_date: '2026-05-31'
				}
			} as Partial<LeaseFormData>

			const result = service.validateDates(leaseData as LeaseFormData)

			expect(result.start_date).toBeInstanceOf(Date)
			expect(result.end_date).toBeInstanceOf(Date)
			expect(result.start_date.toISOString()).toContain('2025-06')
			expect(result.end_date.toISOString()).toContain('2026-05')
		})

		it('should throw BadRequestException for invalid start date', () => {
			const leaseData: Partial<LeaseFormData> = {
				leaseTerms: {
					start_date: 'invalid-date',
					end_date: '2024-12-31'
				}
			} as Partial<LeaseFormData>

			expect(() => service.validateDates(leaseData as LeaseFormData)).toThrow(
				BadRequestException
			)
			expect(() => service.validateDates(leaseData as LeaseFormData)).toThrow(
				'Invalid start date'
			)
		})

		it('should throw BadRequestException for invalid end date', () => {
			const leaseData: Partial<LeaseFormData> = {
				leaseTerms: {
					start_date: '2024-01-01',
					end_date: 'invalid-date'
				}
			} as Partial<LeaseFormData>

			expect(() => service.validateDates(leaseData as LeaseFormData)).toThrow(
				BadRequestException
			)
			expect(() => service.validateDates(leaseData as LeaseFormData)).toThrow(
				'Invalid end date'
			)
		})

		it('should handle month-to-month leases (no end date) by setting far-future date', () => {
			const leaseData: Partial<LeaseFormData> = {
				leaseTerms: {
					start_date: '2024-01-01'
					// No end_date for month-to-month lease
				}
			} as Partial<LeaseFormData>

			const result = service.validateDates(leaseData as LeaseFormData)

			expect(result.start_date).toBeInstanceOf(Date)
			expect(result.end_date).toBeInstanceOf(Date)
			// End date should be ~100 years in the future
			const yearsDifference =
				(result.end_date.getTime() - result.start_date.getTime()) /
				(365 * 24 * 60 * 60 * 1000)
			expect(yearsDifference).toBeGreaterThan(99)
			expect(yearsDifference).toBeLessThan(101)
		})
	})

	describe('validateLeaseData', () => {
		it('should return valid=true for valid Texas lease data', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'TX' }
				},
				leaseTerms: {
					rent_amount: 2000,
					security_deposit: {
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

		it('should return error for non-Texas states', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'CA' }
				},
				leaseTerms: {
					rent_amount: 2000
				}
			} as Partial<LeaseFormData>

			const result = service.validateLeaseData(leaseData as LeaseFormData)

			expect(result.valid).toBe(false)
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0]).toEqual({
				field: 'property.address.state',
				message: 'Only Texas (TX) properties are currently supported',
				code: 'UNSUPPORTED_STATE'
			})
		})

		describe('Texas state-specific validation', () => {
			it('should return warning when security deposit exceeds 2x rent', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'TX' }
					},
					leaseTerms: {
						rent_amount: 2000,
						security_deposit: {
							amount: 5000 // Exceeds 2x rent (4000)
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				// In Texas, exceeding 2x rent is a warning, not an error
				expect(result.valid).toBe(true)
				expect(result.errors).toHaveLength(0)
				expect(result.warnings).toHaveLength(1)
				expect(result.warnings[0]?.field).toBe(
					'leaseTerms.security_deposit.amount'
				)
			})

			it('should allow security deposit at 2x rent without warning', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'TX' }
					},
					leaseTerms: {
						rent_amount: 2000,
						security_deposit: {
							amount: 4000 // Exactly 2x rent
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(true)
				expect(result.errors).toHaveLength(0)
				expect(result.warnings).toHaveLength(0)
			})

			it('should return error when late fee grace period is less than 2 days', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'TX' }
					},
					leaseTerms: {
						rent_amount: 2000,
						lateFee: {
							enabled: true,
							gracePeriod: 1 // Less than required 2 days
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(false)
				expect(result.errors).toHaveLength(1)
				expect(result.errors[0]).toEqual({
					field: 'leaseTerms.lateFee.gracePeriod',
					message:
						'Texas law requires minimum 2-day grace period before late fees (Tex. Prop. Code § 92.019)',
					code: 'TX_GRACE_PERIOD'
				})
			})

			it('should accept 2-day grace period', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'TX' }
					},
					leaseTerms: {
						rent_amount: 2000,
						lateFee: {
							enabled: true,
							gracePeriod: 2
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(true)
				expect(result.errors).toHaveLength(0)
			})

			it('should warn when late fee exceeds 15% of rent', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'TX' }
					},
					leaseTerms: {
						rent_amount: 2000,
						lateFee: {
							enabled: true,
							amount: 400, // 20% of rent
							gracePeriod: 3
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(true)
				expect(result.warnings).toHaveLength(1)
				expect(result.warnings[0]?.field).toBe('leaseTerms.lateFee.amount')
			})

			it('should not validate late fee when disabled', () => {
				const leaseData: Partial<LeaseFormData> = {
					property: {
						address: { state: 'TX' }
					},
					leaseTerms: {
						rent_amount: 2000,
						lateFee: {
							enabled: false,
							gracePeriod: 0
						}
					}
				} as Partial<LeaseFormData>

				const result = service.validateLeaseData(leaseData as LeaseFormData)

				expect(result.valid).toBe(true)
				expect(result.errors).toHaveLength(0)
				expect(result.warnings).toHaveLength(0)
			})
		})

		it('should return Texas state requirements in response', () => {
			const leaseData: Partial<LeaseFormData> = {
				property: {
					address: { state: 'TX' }
				},
				leaseTerms: {
					rent_amount: 2000
				}
			} as Partial<LeaseFormData>

			const result = service.validateLeaseData(leaseData as LeaseFormData)

			expect(result.stateRequirements).toBeDefined()
			expect(result.stateRequirements.stateName).toBe('Texas')
		})
	})

	describe('getTexasRequirements', () => {
		it('should return Texas-specific requirements', () => {
			const result = service.getTexasRequirements()

			expect(result).toEqual({
				stateName: 'Texas',
				security_depositMax: 'No statutory limit (2x monthly rent recommended)',
				lateFeeGracePeriod: '2 days minimum (Tex. Prop. Code § 92.019)',
				requiredDisclosures: [
					'Lead Paint Disclosure (pre-1978 buildings)',
					'Property Condition Report',
					'Landlord Contact Information'
				]
			})
		})
	})
})
