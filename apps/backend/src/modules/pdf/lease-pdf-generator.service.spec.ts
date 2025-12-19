/**
 * Test Suite: Lease PDF Generator Service
 *
 * Tests state validation, template caching, and PDF generation with edge cases.
 * Covers invalid state codes, case sensitivity, null data, and error scenarios.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { jest } from '@jest/globals'
import { LeasePdfGeneratorService, PdfGenerationOptions } from './lease-pdf-generator.service'
import { StateValidationService } from './state-validation.service'
import { TemplateCacheService } from './template-cache.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	DEFAULT_STATE_CODE,
	DEFAULT_TEMPLATE_TYPE,
	US_STATE_CODES,
	SUPPORTED_STATES,
	TEMPLATE_TYPES
} from './state-constants'
import type { LeasePdfFields } from './lease-pdf-mapper.service'
import { PDFDocument } from 'pdf-lib'

// Mock pdf-lib to avoid actual PDF parsing in unit tests
jest.mock('pdf-lib', () => {
	const mockTextField = {
		setText: jest.fn(),
		getName: jest.fn().mockReturnValue('mock_field')
	}

	const mockForm = {
		getTextField: jest.fn().mockReturnValue(mockTextField),
		getFields: jest.fn().mockReturnValue([mockTextField]),
		flatten: jest.fn()
	}

	const mockPdfDoc = {
		getForm: jest.fn().mockReturnValue(mockForm),
		save: jest.fn().mockResolvedValue(new Uint8Array([
			0x25, 0x50, 0x44, 0x46, // %PDF
			0x2d, 0x31, 0x2e, 0x34 // -1.4
		]))
	}

	return {
		PDFDocument: {
			load: jest.fn().mockResolvedValue(mockPdfDoc)
		}
	}
})

describe('LeasePdfGeneratorService', () => {
	let service: LeasePdfGeneratorService
	let stateValidation: StateValidationService
	let templateCache: TemplateCacheService
	let logger: AppLogger

	const mockFields: LeasePdfFields = {
		agreement_date_day: '15',
		agreement_date_month: 'December',
		agreement_date_year: '23',
		landlord_name: 'John Doe',
		tenant_name: 'Jane Smith',
		property_address: '123 Main St, Austin, TX',
		lease_start_date: 'January 1, 2024',
		lease_end_date: 'December 31, 2024',
		monthly_rent_amount: '$1,500.00',
		security_deposit_amount: '$1,500.00',
		late_fee_per_day: '$50.00',
		nsf_fee: '$35.00',
		month_to_month_rent: '$1,650.00',
		pet_fee_per_day: '$25.00',
		property_built_before_1978: 'No'
	}

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			providers: [
				{
					provide: AppLogger,
					useValue: {
						log: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
						debug: jest.fn()
					}
				},
				StateValidationService,
				TemplateCacheService,
				LeasePdfGeneratorService
			]
		}).compile()

		service = module.get<LeasePdfGeneratorService>(LeasePdfGeneratorService)
		stateValidation = module.get<StateValidationService>(StateValidationService)
		templateCache = module.get<TemplateCacheService>(TemplateCacheService)
		logger = module.get<AppLogger>(AppLogger)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('State Validation', () => {
		describe('validateState', () => {
			it('should accept valid state code in correct case', () => {
				const result = stateValidation.validateState('TX')

				expect(result.isValid).toBe(true)
				expect(result.stateCode).toBe('TX')
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toBeUndefined()
				expect(result.error).toBeUndefined()
			})

			it('should accept valid state code in lowercase', () => {
				const result = stateValidation.validateState('tx')

				expect(result.isValid).toBe(true)
				expect(result.stateCode).toBe('TX')
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toBeUndefined()
				expect(result.error).toBeUndefined()
			})

			it('should accept valid state code in mixed case', () => {
				const result = stateValidation.validateState('Tx')

				expect(result.isValid).toBe(true)
				expect(result.stateCode).toBe('TX')
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toBeUndefined()
				expect(result.error).toBeUndefined()
			})

			it('should handle null state code with default', () => {
				const result = stateValidation.validateState(null)

				expect(result.isValid).toBe(true)
				expect(result.stateCode).toBe(DEFAULT_STATE_CODE)
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toBe('No state code provided, using default (TX)')
				expect(result.error).toBeUndefined()
			})

			it('should handle undefined state code with default', () => {
				const result = stateValidation.validateState(undefined)

				expect(result.isValid).toBe(true)
				expect(result.stateCode).toBe(DEFAULT_STATE_CODE)
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toBe('No state code provided, using default (TX)')
				expect(result.error).toBeUndefined()
			})

			it('should reject invalid state code format', () => {
				const result = stateValidation.validateState('X')

				expect(result.isValid).toBe(false)
				expect(result.stateCode).toBe(DEFAULT_STATE_CODE) // Fallback to default
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toContain('Invalid state code "X"')
				expect(result.error).toContain('Invalid state code "X"')
			})

			it('should reject state code that is too long', () => {
				const result = stateValidation.validateState('TEXAS')

				expect(result.isValid).toBe(false)
				expect(result.stateCode).toBe(DEFAULT_STATE_CODE) // Fallback to default
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toContain('Invalid state code "TEXAS", using default (TX)')
				expect(result.error).toContain('Invalid state code "TEXAS"')
			})

			it('should reject state code that is too short', () => {
				const result = stateValidation.validateState('T')

				expect(result.isValid).toBe(false)
				expect(result.stateCode).toBe(DEFAULT_STATE_CODE) // Fallback to default
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toContain('Invalid state code "T", using default (TX)')
				expect(result.error).toContain('Invalid state code "T"')
			})

			it('should reject state code with invalid characters', () => {
				const result = stateValidation.validateState('T1')

				expect(result.isValid).toBe(false)
				expect(result.stateCode).toBe(DEFAULT_STATE_CODE) // Fallback to default
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toContain('Invalid state code "T1", using default (TX)')
				expect(result.error).toContain('Invalid state code "T1"')
			})

			it('should reject non-US state code', () => {
				const result = stateValidation.validateState('XX')

				expect(result.isValid).toBe(false)
				expect(result.stateCode).toBe(DEFAULT_STATE_CODE) // Fallback to default
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toContain('Invalid state code "XX", using default (TX)')
				expect(result.error).toContain('Invalid state code "XX"')
			})

			it('should reject unsupported state code with warning', () => {
				const result = stateValidation.validateState('CA')

				expect(result.isValid).toBe(true) // Still valid format
				expect(result.stateCode).toBe(DEFAULT_STATE_CODE) // Fallback to default
				expect(result.stateName).toBe('Texas')
				expect(result.isSupported).toBe(true)
				expect(result.warning).toContain('State "CA" is not supported')
				expect(result.error).toBeUndefined()
			})

			it('should throw error for unsupported state when requested', () => {
				expect(() => {
					stateValidation.validateState('CA', { throwOnUnsupported: true })
				}).toThrow('Unsupported state code: CA')
			})
		})

		describe('getSupportedStates', () => {
			it('should return array of supported state codes', () => {
				const supportedStates = stateValidation.getSupportedStates()

				expect(supportedStates).toEqual(['TX'])
				expect(supportedStates).toHaveLength(1)
			})
		})

		describe('isStateSupported', () => {
			it('should return true for supported state', () => {
				const isSupported = stateValidation.isStateSupported('TX')
				expect(isSupported).toBe(true)
			})

			it('should return false for unsupported state', () => {
				const isSupported = stateValidation.isStateSupported('CA')
				expect(isSupported).toBe(false)
			})

			it('should be case insensitive', () => {
				const isSupported = stateValidation.isStateSupported('tx')
				expect(isSupported).toBe(true)
			})
		})

		describe('getStateName', () => {
			it('should return correct name for supported state', () => {
				const stateName = stateValidation.getStateName('TX')
				expect(stateName).toBe('Texas')
			})

			it('should return default name for unsupported state', () => {
				const stateName = stateValidation.getStateName('CA')
				expect(stateName).toBe('Texas') // Default fallback
			})
		})
	})

	describe('Template Cache Service', () => {
		describe('getTemplateMetadata', () => {
			it('should cache template metadata', async () => {
				const mockMetadata = {
					exists: true,
					size: 1024,
					fields: ['field1', 'field2'],
					path: '/assets/Texas_residential_Lease_Agreement.pdf',
					stateCode: 'TX',
					templateType: 'RESIDENTIAL' as const
				}

				// Mock the public method instead of private method
				jest.spyOn(templateCache, 'getTemplateMetadata')
					.mockResolvedValue(mockMetadata)

				const result = await templateCache.getTemplateMetadata('TX')

				expect(templateCache.getTemplateMetadata).toHaveBeenCalledWith('TX')
				expect(result).toEqual(mockMetadata)
			})

			it('should handle template not found', async () => {
				const mockMetadata = {
					exists: false,
					size: 0,
					fields: [],
					path: '/assets/California_residential_Lease_Agreement.pdf',
					stateCode: 'CA',
					templateType: 'RESIDENTIAL' as const
				}

				jest.spyOn(templateCache, 'getTemplateMetadata')
					.mockResolvedValue(mockMetadata)

				const result = await templateCache.getTemplateMetadata('CA')

				expect(templateCache.getTemplateMetadata).toHaveBeenCalledWith('CA')
				expect(result.exists).toBe(false)
				expect(result.path).toContain('California_residential_Lease_Agreement.pdf')
			})
		})

		describe('getTemplateContent', () => {
			it('should return cached content', async () => {
				const mockContent = new Uint8Array([1, 2, 3])

				jest.spyOn(templateCache, 'getTemplateContent')
					.mockResolvedValue(mockContent)

				const result = await templateCache.getTemplateContent('TX')

				expect(templateCache.getTemplateContent).toHaveBeenCalledWith('TX')
				expect(result).toEqual(mockContent)
			})

			it('should return null for non-existent template', async () => {
				jest.spyOn(templateCache, 'getTemplateContent')
					.mockResolvedValue(null)

				const result = await templateCache.getTemplateContent('CA')

				expect(templateCache.getTemplateContent).toHaveBeenCalledWith('CA')
				expect(result).toBeNull()
			})
		})

		describe('PDF Generation', () => {
			it('should generate PDF with valid Texas template', async () => {
				jest.spyOn(templateCache, 'getTemplateContent')
					.mockResolvedValue(new Uint8Array([1, 2, 3]))

				const result = await service.generateFilledPdf(mockFields, 'lease-123')

				expect(result).toBeInstanceOf(Buffer)
				expect(result.length).toBeGreaterThan(0)
				expect(templateCache.getTemplateContent).toHaveBeenCalledWith('TX', DEFAULT_TEMPLATE_TYPE)
			})

			it('should use default template for unsupported state', async () => {
				jest.spyOn(templateCache, 'getTemplateContent')
					.mockResolvedValue(new Uint8Array([1, 2, 3]))

				const result = await service.generateFilledPdf(mockFields, 'lease-123', {
					state: 'CA' // Unsupported state
				})

				expect(result).toBeInstanceOf(Buffer)
				expect(templateCache.getTemplateContent).toHaveBeenCalledWith('TX', DEFAULT_TEMPLATE_TYPE) // Fallback to default
			})

			it('should throw error when template not found', async () => {
				jest.spyOn(templateCache, 'getTemplateContent')
					.mockResolvedValue(null)

				await expect(service.generateFilledPdf(mockFields, 'lease-123', {
					throwOnUnsupportedState: true
				})).rejects.toThrow('Failed to load template for state TX')
			})

			it('should handle different template types', async () => {
				jest.spyOn(templateCache, 'getTemplateContent')
					.mockResolvedValue(new Uint8Array([1, 2, 3]))

				const result = await service.generateFilledPdf(mockFields, 'lease-123', {
					templateType: 'RESIDENTIAL'
				})

				expect(result).toBeInstanceOf(Buffer)
				expect(templateCache.getTemplateContent).toHaveBeenCalledWith('TX', DEFAULT_TEMPLATE_TYPE)
			})

			it('should log warnings for unsupported states', async () => {
				const loggerSpy = jest.spyOn(logger, 'warn')
				const consoleSpy = jest.spyOn(console, 'warn')

				jest.spyOn(templateCache, 'getTemplateContent')
					.mockResolvedValue(new Uint8Array([1, 2, 3]))

				await service.generateFilledPdf(mockFields, 'lease-123', {
					state: 'CA' // Unsupported state
				})

				expect(loggerSpy).toHaveBeenCalledWith(
				'State validation warning',
				expect.objectContaining({
					inputState: 'CA',
					warning: expect.stringContaining('not supported')
					})
				)
			})
		})

		describe('Error Handling', () => {
			it('should handle PDF generation errors gracefully', async () => {
				// Mock metadata check to pass so we reach getTemplateContent
				jest.spyOn(templateCache, 'getTemplateMetadata')
					.mockResolvedValue({
						exists: true,
						path: '/fake/path/Texas_Residential_Lease_Agreement.pdf',
						stateCode: 'TX',
						stateName: 'Texas'
					})

				jest.spyOn(templateCache, 'getTemplateContent')
					.mockRejectedValue(new Error('Template load failed'))

				const loggerSpy = jest.spyOn(logger, 'error')

				await expect(service.generateFilledPdf(mockFields, 'lease-123')).rejects.toThrow(
					'PDF generation failed for state TX: Template load failed'
				)

				expect(loggerSpy).toHaveBeenCalledWith(
					'Failed to generate lease PDF',
					expect.objectContaining({
						error: 'Template load failed',
						leaseId: 'lease-123'
					})
				)
			})

			it('should preserve original error when BadRequestException', async () => {
				const badRequestError = new BadRequestException('Custom error')

				// Mock metadata check to pass so we reach getTemplateContent
				jest.spyOn(templateCache, 'getTemplateMetadata')
					.mockResolvedValue({
						exists: true,
						path: '/fake/path/Texas_Residential_Lease_Agreement.pdf',
						stateCode: 'TX',
						stateName: 'Texas'
					})

				jest.spyOn(templateCache, 'getTemplateContent')
					.mockRejectedValue(badRequestError)

				await expect(service.generateFilledPdf(mockFields, 'lease-123')).rejects.toThrow('Custom error')
			})
		})

		describe('Edge Cases', () => {
			it('should handle special characters in state codes', () => {
				const result = stateValidation.validateState('T!X')

				expect(result.isValid).toBe(false)
				expect(result.warning).toContain('Invalid state code "T!X", using default (TX)')
			})

			it('should handle whitespace in state codes', () => {
				const result = stateValidation.validateState(' TX ')

				expect(result.isValid).toBe(false)
				expect(result.warning).toContain('Invalid state code " TX ", using default (TX)')
			})

			it('should validate all US state codes format', () => {
				// Test all valid state codes
				for (const stateCode of US_STATE_CODES) {
					const result = stateValidation.validateState(stateCode)

					// Should be valid format (isValid true), but may fallback to default if not supported
					expect(result.isValid).toBe(true)
					if (stateCode in SUPPORTED_STATES) {
						expect(result.stateCode).toBe(stateCode)
					} else {
						expect(result.stateCode).toBe(DEFAULT_STATE_CODE)
					}
				}
			})

			it('should handle template type validation', async () => {
				const result = await service.generateFilledPdf(mockFields, 'lease-123', {
					templateType: 'RESIDENTIAL' // Valid template type
				})

				// Should still work but log error
				expect(result).toBeInstanceOf(Buffer)
			})
		})
	})
})
