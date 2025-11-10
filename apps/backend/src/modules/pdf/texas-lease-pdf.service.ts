import {
	Injectable,
	Logger,
	InternalServerErrorException
} from '@nestjs/common'
import { PDFDocument } from 'pdf-lib'
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'
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
		// Use absolute path relative to backend dist directory
		this.templatePath = join(
			__dirname,
			'../../../Texas_Residential_Lease_Agreement.pdf'
		)
	}

	/**
	 * Check if template file exists
	 */
	private async verifyTemplateExists(): Promise<void> {
		try {
			await access(this.templatePath, constants.R_OK)
		} catch (error) {
			const errorMessage = `PDF template not found at ${this.templatePath}`
			this.logger.error(errorMessage, error)
			throw new InternalServerErrorException(
				'PDF template is not configured correctly'
			)
		}
	}

	/**
	 * Helper to safely set form field value
	 */
	private setFormField(
		form: ReturnType<PDFDocument['getForm']>,
		fieldName: string,
		value: string | number | boolean | undefined
	): void {
		if (value === undefined || value === null) return

		try {
			const field = form.getTextField(fieldName)
			field.setText(String(value))
		} catch (error) {
			this.logger.warn(
				`Form field "${fieldName}" not found in PDF template`
			)
		}
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
				`$${formData.monthlyRent.toFixed(2)}`
			)
			this.setFormField(form, 'rent_due_day', formData.rentDueDay)
			if (formData.lateFeeAmount) {
				this.setFormField(
					form,
					'late_fee_amount',
					`$${formData.lateFeeAmount.toFixed(2)}`
				)
			}
			this.setFormField(form, 'late_fee_grace_days', formData.lateFeeGraceDays)
			this.setFormField(form, 'nsf_fee', `$${formData.nsfFee.toFixed(2)}`)

			// Fill in security deposit
			this.setFormField(
				form,
				'security_deposit',
				`$${formData.securityDeposit.toFixed(2)}`
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
			const petsText = formData.petsAllowed
				? `Pets allowed - Deposit: $${formData.petDeposit.toFixed(2)}, Rent: $${formData.petRent.toFixed(2)}/month`
				: 'No pets allowed'
			this.setFormField(form, 'pets_allowed', petsText)
			if (formData.petsAllowed) {
				this.setFormField(
					form,
					'pet_deposit',
					`$${formData.petDeposit.toFixed(2)}`
				)
				this.setFormField(
					form,
					'pet_rent',
					`$${formData.petRent.toFixed(2)}/month`
				)
			}

			// Fill in hold over rent
			const holdOverRent =
				formData.monthlyRent * formData.holdOverRentMultiplier
			this.setFormField(
				form,
				'hold_over_rent',
				`$${holdOverRent.toFixed(2)}/month (${(formData.holdOverRentMultiplier * 100).toFixed(0)}% of monthly rent)`
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
