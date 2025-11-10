import {
	Injectable,
	Logger,
	InternalServerErrorException
} from '@nestjs/common'
import { PDFDocument } from 'pdf-lib'
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, resolve, normalize, relative, isAbsolute } from 'node:path'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'

/**
 * Texas Lease PDF Service
 * Fills the Texas Residential Lease Agreement PDF template using AcroForm fields
 * Uses pdf-lib form filling API (no manual coordinate positioning required)
 */
@Injectable()
export class TexasLeasePDFService {
	private readonly logger = new Logger(TexasLeasePDFService.name)
	private readonly templatePath: string

	constructor() {
		/**
		 * Texas Residential Lease Agreement PDF Template
		 *
		 * Location: apps/backend/assets/Texas_Residential_Lease_Agreement.pdf
		 * Source: Texas Association of Realtors (TAR) - Standard Residential Lease Form
		 * License: Public template form - TAR forms may be used by licensed real estate professionals
		 *
		 * Path resolution:
		 * - Production: Uses TEXAS_LEASE_TEMPLATE_PATH env var
		 * - Development: Resolves from dist/ to assets/ directory
		 *
		 * The path calculation works because:
		 * - __dirname = apps/backend/dist/modules/pdf (compiled output)
		 * - ../../assets = apps/backend/assets (template location)
		 */
		this.templatePath =
			process.env.TEXAS_LEASE_TEMPLATE_PATH ||
			join(
				__dirname,
				'../../assets/Texas_Residential_Lease_Agreement.pdf'
			)
	}

	/**
	 * Check if template file exists
	 */
	private async verifyTemplateExists(): Promise<void> {
		// SECURITY: Prevent path traversal attacks
		// Always validate that resolved path stays within backend root directory
		// regardless of whether path comes from env var or default
		
		const normalizedPath = normalize(this.templatePath)
		const resolvedPath = resolve(normalizedPath)
		
		// Compute backend root directory (apps/backend/)
		// __dirname in production = apps/backend/dist/modules/pdf
		// Going up 3 levels from dist/modules/pdf gets us to dist/
		// Going up 1 more level gets us to apps/backend/
		const backendRoot = resolve(__dirname, '../../../..')
		
		// Ensure resolved path is within backend root
		const relativePath = relative(backendRoot, resolvedPath)
		const isWithinBackendRoot = 
			!relativePath.startsWith('..') && 
			!isAbsolute(relativePath)
		
		if (!isWithinBackendRoot) {
			const errorMessage = `Invalid template path (path traversal detected): ${this.templatePath}`
			this.logger.error(errorMessage)
			throw new InternalServerErrorException(
				'PDF template path is invalid'
			)
		}

		// Check if template file exists and is readable
		try {
			await access(resolvedPath, constants.R_OK)
		} catch (error) {
			const errorMessage = `PDF template not found at ${resolvedPath}`
			this.logger.error(errorMessage, error)
			throw new InternalServerErrorException(
				'PDF template is not configured correctly'
			)
		}
	}

	/**
	 * Helper to safely set form field value
	 * Handles text fields, checkboxes, radio groups, and dropdowns
	 */
	private setFormField(
		form: ReturnType<PDFDocument['getForm']>,
		fieldName: string,
		value: string | number | boolean | undefined
	): void {
		if (value === undefined || value === null) return

		try {
			// Handle boolean values (checkboxes/radio groups)
			if (typeof value === 'boolean') {
				try {
					const checkbox = form.getCheckBox(fieldName)
					if (value) {
						checkbox.check()
					} else {
						checkbox.uncheck()
					}
					return
				} catch {
					// Try radio group
					try {
						const radioGroup = form.getRadioGroup(fieldName)
						radioGroup.select(value ? 'Yes' : 'No')
						return
					} catch {
						// Fallback to text field
						const field = form.getTextField(fieldName)
						field.setText(value ? 'Yes' : 'No')
						return
					}
				}
			}

			// Handle string/number values (text fields or dropdowns)
			const stringValue = String(value)
			try {
				const field = form.getTextField(fieldName)
				field.setText(stringValue)
			} catch {
				// Try dropdown
				try {
					const dropdown = form.getDropdown(fieldName)
					dropdown.select(stringValue)
				} catch {
					this.logger.warn(
						`Form field "${fieldName}" not found or unsupported type (attempted value: ${stringValue})`
					)
				}
			}
		} catch (error) {
			this.logger.warn(
				`Failed to set form field "${fieldName}" with value ${value}`,
				error
			)
		}
	}

	/**
	 * Format currency as USD with two decimal places
	 */
	private formatCurrency(amount: number): string {
		return `$${amount.toFixed(2)}`
	}

	/**
	 * Format pets text based on whether pets are allowed
	 */
	private formatPetsText(formData: LeaseGenerationFormData): string {
		if (!formData.petsAllowed) {
			return 'No pets allowed'
		}
		return `Pets allowed - Deposit: ${this.formatCurrency(formData.petDeposit)}, Rent: ${this.formatCurrency(formData.petRent)}/month`
	}

	/**
	 * Generate filled Texas lease PDF from form data
	 * Uses AcroForm field filling (no manual coordinate positioning)
	 */
	async generateLeasePDF(formData: LeaseGenerationFormData): Promise<Buffer> {
		try {
			this.logger.log('Generating Texas lease PDF')

			// Verify template exists
			await this.verifyTemplateExists()

			// Load the template PDF
			const templateBytes = await readFile(this.templatePath)
			const pdfDoc = await PDFDocument.load(templateBytes)

			// Get the form
			const form = pdfDoc.getForm()

			// Fill in basic information
			this.setFormField(form, 'agreement_date', formData.agreementDate)
			this.setFormField(form, 'owner_name', formData.ownerName)
			this.setFormField(form, 'owner_address', formData.ownerAddress)
			this.setFormField(form, 'owner_phone', formData.ownerPhone)
			this.setFormField(form, 'tenant_name', formData.tenantName)
			this.setFormField(form, 'property_address', formData.propertyAddress)

			// Fill in lease term
			this.setFormField(form, 'commencement_date', formData.commencementDate)
			this.setFormField(form, 'termination_date', formData.terminationDate)

			// Fill in rent information
			this.setFormField(
				form,
				'monthly_rent',
				this.formatCurrency(formData.monthlyRent)
			)
			this.setFormField(form, 'rent_due_day', formData.rentDueDay)
			if (formData.lateFeeAmount) {
				this.setFormField(
					form,
					'late_fee_amount',
					this.formatCurrency(formData.lateFeeAmount)
				)
			}
			this.setFormField(form, 'late_fee_grace_days', formData.lateFeeGraceDays)
			this.setFormField(form, 'nsf_fee', this.formatCurrency(formData.nsfFee))

			// Fill in security deposit
			this.setFormField(
				form,
				'security_deposit',
				this.formatCurrency(formData.securityDeposit)
			)
			this.setFormField(
				form,
				'security_deposit_due_days',
				formData.securityDepositDueDays
			)

			// Fill in use of premises
			if (formData.maxOccupants) {
				this.setFormField(form, 'max_occupants', formData.maxOccupants)
			}
			this.setFormField(form, 'allowed_use', formData.allowedUse)

			// Fill in alterations
			const alterationsText = formData.alterationsAllowed
				? formData.alterationsRequireConsent
					? 'Allowed with prior written consent'
					: 'Allowed'
				: 'Not allowed'
			this.setFormField(form, 'alterations', alterationsText)

			// Fill in utilities
			if (formData.utilitiesIncluded?.length > 0) {
				this.setFormField(
					form,
					'utilities_included',
					`Included: ${formData.utilitiesIncluded.join(', ')}`
				)
			}
			if (formData.tenantResponsibleUtilities?.length > 0) {
				this.setFormField(
					form,
					'tenant_utilities',
					`Tenant pays: ${formData.tenantResponsibleUtilities.join(', ')}`
				)
			}

			// Fill in pets information
			this.setFormField(form, 'pets_allowed', this.formatPetsText(formData))
			if (formData.petsAllowed) {
				this.setFormField(
					form,
					'pet_deposit',
					this.formatCurrency(formData.petDeposit)
				)
				this.setFormField(
					form,
					'pet_rent',
					`${this.formatCurrency(formData.petRent)}/month`
				)
			}

			// Fill in hold over rent
			const holdOverRent =
				formData.monthlyRent * formData.holdOverRentMultiplier
			this.setFormField(
				form,
				'hold_over_rent',
				`${this.formatCurrency(holdOverRent)}/month (${(formData.holdOverRentMultiplier * 100).toFixed(0)}% of monthly rent)`
			)

			// Fill in lead paint disclosure
			if (formData.propertyBuiltBefore1978) {
				this.setFormField(
					form,
					'lead_paint_disclosure',
					'Property built before 1978 - Lead paint disclosure provided'
				)
			}

			// Fill in notice information
			if (formData.noticeAddress) {
				this.setFormField(
					form,
					'notice_address',
					`Notice Address: ${formData.noticeAddress}`
				)
			}
			if (formData.noticeEmail) {
				this.setFormField(
					form,
					'notice_email',
					`Notice Email: ${formData.noticeEmail}`
				)
			}

			// Flatten the form (make fields read-only and part of the page content)
			form.flatten()

			// Save and return the PDF
			const pdfBytes = await pdfDoc.save()
			this.logger.log('Texas lease PDF generated successfully')

			return Buffer.from(pdfBytes)
		} catch (error) {
			this.logger.error('Error generating Texas lease PDF', error)
			if (error instanceof InternalServerErrorException) {
				throw error
			}
			throw new InternalServerErrorException(
				'Failed to generate lease PDF',
				error instanceof Error ? error.message : String(error)
			)
		}
	}
}
