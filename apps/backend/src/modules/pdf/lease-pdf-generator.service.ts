/**
 * Lease PDF Generator Service
 *
 * Fills residential lease PDF templates with data.
 * Uses pdf-lib to manipulate PDF form fields.
 * Supports state-specific templates with validation and caching.
 */

import { Injectable, BadRequestException } from '@nestjs/common'
import { PDFDocument, PDFForm } from 'pdf-lib'
import type { LeasePdfFields } from './lease-pdf-mapper.service'
import { StateValidationService } from './state-validation.service'
import { TemplateCacheService } from './template-cache.service'
import {
	DEFAULT_STATE_CODE,
	DEFAULT_TEMPLATE_TYPE,
	TemplateType
} from './state-constants'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * PDF generation options
 */
export interface PdfGenerationOptions {
	/**
	 * State code for template selection
	 */
	state?: string | undefined

	/**
	 * Template type (residential, commercial, etc.)
	 */
	templateType?: TemplateType | undefined

	/**
	 * Whether to throw error for unsupported states
	 */
	throwOnUnsupportedState?: boolean | undefined

	/**
	 * Whether to validate template exists before generation
	 */
	validateTemplate?: boolean | undefined
}

@Injectable()
export class LeasePdfGeneratorService {
	constructor(
		private readonly logger: AppLogger,
		private readonly stateValidation: StateValidationService,
		private readonly templateCache: TemplateCacheService
	) {}

	/**
	 * Generate filled PDF from template + data with validation and caching
	 * Returns PDF as Buffer for upload to DocuSeal or storage
	 * @param fields - PDF field values
	 * @param leaseId - Lease identifier for logging
	 * @param options - PDF generation options
	 */
	async generateFilledPdf(
		fields: LeasePdfFields,
		leaseId: string,
		options: PdfGenerationOptions = {}
	): Promise<Buffer> {
		const {
			state: inputState,
			templateType = DEFAULT_TEMPLATE_TYPE,
			throwOnUnsupportedState = false,
			validateTemplate = true
		} = options

		// Validate and normalize state code
		const stateValidation = this.stateValidation.validateState(inputState, {
			throwOnUnsupported: throwOnUnsupportedState,
			logWarnings: true
		})

		// Log any warnings from validation
		if (stateValidation.warning) {
			this.logger.warn('State validation warning', {
				leaseId,
				warning: stateValidation.warning,
				inputState,
				resolvedState: stateValidation.stateCode
			})
		}

		const stateCode = stateValidation.stateCode

		this.logger.log('Generating lease PDF', {
			leaseId,
			stateCode,
			templateType,
			inputState,
			warnings: stateValidation.warning ? [stateValidation.warning] : undefined
		})

		try {
			// Validate template exists if requested
			if (validateTemplate) {
				const metadata = await this.templateCache.getTemplateMetadata(
					stateCode,
					templateType
				)
				if (!metadata.exists) {
					const error = `Failed to load template for state ${stateCode}`
					this.logger.error('Template validation failed', {
						leaseId,
						stateCode,
						templateType,
						path: metadata.path
					})

					// If we're already trying the default state, throw immediately
					if (stateCode === DEFAULT_STATE_CODE) {
						throw new BadRequestException(error)
					}

					if (throwOnUnsupportedState) {
						throw new BadRequestException(error)
					}

					// Fallback to default template
					const defaultMetadata = await this.templateCache.getTemplateMetadata(
						DEFAULT_STATE_CODE,
						templateType
					)
					if (!defaultMetadata.exists) {
						throw new BadRequestException(
							`Failed to load template for state ${DEFAULT_STATE_CODE}`
						)
					}

					this.logger.warn('Using default template as fallback', {
						leaseId,
						defaultState: DEFAULT_STATE_CODE,
						originalState: stateCode
					})
				}
			}

			// Get template content from cache (with fallback to filesystem)
			const templateBytes = await this.templateCache.getTemplateContent(
				stateCode,
				templateType
			)
			if (!templateBytes) {
				throw new BadRequestException(
					`Failed to load template for state ${stateCode}`
				)
			}

			const pdfDoc = await PDFDocument.load(templateBytes)

			// Get form
			const form = pdfDoc.getForm()

			// Track missing fields
			const missingFields: string[] = []

			// Fill all fields
			this.fillTextField(
				form,
				'agreement_date_day',
				fields.agreement_date_day,
				missingFields
			)
			this.fillTextField(
				form,
				'agreement_date_month',
				fields.agreement_date_month,
				missingFields
			)
			this.fillTextField(
				form,
				'agreement_date_year',
				fields.agreement_date_year,
				missingFields
			)
			this.fillTextField(
				form,
				'landlord_name',
				fields.landlord_name,
				missingFields
			)
			this.fillTextField(form, 'tenant_name', fields.tenant_name, missingFields)
			this.fillTextField(
				form,
				'property_address',
				fields.property_address,
				missingFields
			)
			this.fillTextField(
				form,
				'lease_start_date',
				fields.lease_start_date,
				missingFields
			)
			this.fillTextField(
				form,
				'lease_end_date',
				fields.lease_end_date,
				missingFields
			)
			this.fillTextField(
				form,
				'monthly_rent_amount',
				fields.monthly_rent_amount,
				missingFields
			)
			this.fillTextField(
				form,
				'late_fee_per_day',
				fields.late_fee_per_day,
				missingFields
			)
			this.fillTextField(form, 'nsf_fee', fields.nsf_fee, missingFields)
			this.fillTextField(
				form,
				'security_deposit_amount',
				fields.security_deposit_amount,
				missingFields
			)
			this.fillTextField(
				form,
				'immediate_family_members',
				fields.immediate_family_members || 'None',
				missingFields
			)
			this.fillTextField(
				form,
				'month_to_month_rent',
				fields.month_to_month_rent,
				missingFields
			)
			this.fillTextField(
				form,
				'pet_fee_per_day',
				fields.pet_fee_per_day,
				missingFields
			)
			this.fillTextField(
				form,
				'landlord_notice_address',
				fields.landlord_notice_address || '',
				missingFields
			)
			this.fillTextField(
				form,
				'property_built_before_1978',
				fields.property_built_before_1978,
				missingFields
			)

			// Log summary if any fields were missing
			if (missingFields.length > 0) {
				this.logger.warn('Some PDF fields were not found in template', {
					leaseId,
					stateCode,
					templateType,
					missingFieldsCount: missingFields.length,
					missingFields
				})
			}

			// Flatten form (make fields non-editable)
			form.flatten()

			// Save PDF
			const pdfBytes = await pdfDoc.save()

			this.logger.log('Lease PDF generated successfully', {
				leaseId,
				stateCode,
				templateType,
				size: pdfBytes.length
			})

			return Buffer.from(pdfBytes)
		} catch (error) {
			this.logger.error('Failed to generate lease PDF', {
				leaseId,
				stateCode,
				templateType,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException(
				`PDF generation failed for state ${stateCode}: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Helper to safely fill a text field (handles missing fields)
	 */
	private fillTextField(
		form: PDFForm,
		fieldName: string,
		value: string,
		missingFields: string[]
	): void {
		try {
			const field = form.getTextField(fieldName)
			field.setText(value)
		} catch (error) {
			// Field doesn't exist in PDF - track it and log warning
			missingFields.push(fieldName)
			this.logger.warn(`PDF field "${fieldName}" not found in template`, {
				value,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Validate template exists for a given state
	 * @param state - Two-letter state code (defaults to 'TX')
	 */
	async validateTemplate(state: string = 'TX'): Promise<boolean> {
		// Validate state code
		const validation = this.stateValidation.validateState(state, {
			throwOnUnsupported: false,
			logWarnings: true
		})

		// Get metadata from cache
		const metadata = await this.templateCache.getTemplateMetadata(
			validation.stateCode,
			DEFAULT_TEMPLATE_TYPE
		)

		if (metadata.exists) {
			this.logger.log('Lease PDF template found', {
				path: metadata.path,
				state: validation.stateCode,
				size: metadata.size
			})
		} else {
			this.logger.error('Lease PDF template not found', {
				path: metadata.path,
				state: validation.stateCode
			})
		}

		return metadata.exists
	}

	/**
	 * Get template metadata (for debugging)
	 * @param state - Two-letter state code (defaults to 'TX')
	 */
	async getTemplateMetadata(state: string = 'TX'): Promise<{
		exists: boolean
		state: string
		size?: number | undefined
		fields?: string[] | undefined
	}> {
		// Validate state code
		const validation = this.stateValidation.validateState(state, {
			throwOnUnsupported: false,
			logWarnings: true
		})

		try {
			// Get metadata from cache
			const metadata = await this.templateCache.getTemplateMetadata(
				validation.stateCode,
				DEFAULT_TEMPLATE_TYPE
			)

			return {
				exists: metadata.exists,
				state: validation.stateCode,
				size: metadata.size,
				fields: metadata.fields
			}
		} catch (error) {
			this.logger.error('Failed to read template metadata', {
				state: validation.stateCode,
				error: error instanceof Error ? error.message : String(error)
			})
			return {
				exists: false,
				state: validation.stateCode
			}
		}
	}
}
