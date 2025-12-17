/**
 * Lease PDF Generator Service
 *
 * Fills residential lease PDF templates with data.
 * Uses pdf-lib to manipulate PDF form fields.
 * Currently configured for Texas Residential Lease Agreement.
 */

import { Injectable } from '@nestjs/common'
import { PDFDocument, PDFForm } from 'pdf-lib'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { LeasePdfFields } from './lease-pdf-mapper.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class LeasePdfGeneratorService {
	constructor(private readonly logger: AppLogger) {}

	/**
	 * Get template path for a given state
	 * @param state - Two-letter state code (e.g., 'TX', 'CA')
	 * @returns Path to the state-specific PDF template
	 */
	private getTemplatePath(state: string = 'TX'): string {
		// Normalize state code to uppercase
		const stateCode = state.toUpperCase()
		
		// Map state codes to template file names
		// Currently only Texas template exists, but this allows for easy expansion
		const templateFileName = `${this.getStateTemplateName(stateCode)}_Residential_Lease_Agreement.pdf`
		
		return path.join(process.cwd(), 'assets', templateFileName)
	}

	/**
	 * Get state template name (for file naming)
	 * @param state - Two-letter state code
	 * @returns Full state name for template file
	 */
	private getStateTemplateName(state: string): string {
		const stateNames: Record<string, string> = {
			'TX': 'Texas',
			'CA': 'California',
			'NY': 'New_York',
			'FL': 'Florida',
			// Add more states as templates become available
		}
		
		return stateNames[state] || 'Texas' // Default to Texas if state not found
	}

	/**
	 * Generate filled PDF from template + data
	 * Returns PDF as Buffer for upload to DocuSeal or storage
	 * @param fields - PDF field values
	 * @param leaseId - Lease identifier for logging
	 * @param state - Two-letter state code for template selection (defaults to 'TX')
	 */
	async generateFilledPdf(
		fields: LeasePdfFields, 
		leaseId: string,
		state: string = 'TX'
	): Promise<Buffer> {
		this.logger.log('Generating lease PDF', { leaseId, state })

		try {
			// Get state-specific template path
			const templatePath = this.getTemplatePath(state)
			
			// Load template PDF
			const templateBytes = await fs.readFile(templatePath)
			const pdfDoc = await PDFDocument.load(templateBytes)

			// Get form
			const form = pdfDoc.getForm()

			// Fill all fields
			this.fillTextField(form, 'agreement_date_day', fields.agreement_date_day)
			this.fillTextField(form, 'agreement_date_month', fields.agreement_date_month)
			this.fillTextField(form, 'agreement_date_year', fields.agreement_date_year)
			this.fillTextField(form, 'landlord_name', fields.landlord_name)
			this.fillTextField(form, 'tenant_name', fields.tenant_name)
			this.fillTextField(form, 'property_address', fields.property_address)
			this.fillTextField(form, 'lease_start_date', fields.lease_start_date)
			this.fillTextField(form, 'lease_end_date', fields.lease_end_date)
			this.fillTextField(form, 'monthly_rent_amount', fields.monthly_rent_amount)
			this.fillTextField(form, 'late_fee_per_day', fields.late_fee_per_day)
			this.fillTextField(form, 'nsf_fee', fields.nsf_fee)
			this.fillTextField(form, 'security_deposit_amount', fields.security_deposit_amount)
			this.fillTextField(
				form,
				'immediate_family_members',
				fields.immediate_family_members || 'None'
			)
			this.fillTextField(form, 'month_to_month_rent', fields.month_to_month_rent)
			this.fillTextField(form, 'pet_fee_per_day', fields.pet_fee_per_day)
			this.fillTextField(
				form,
				'landlord_notice_address',
				fields.landlord_notice_address || ''
			)
			this.fillTextField(form, 'property_built_before_1978', fields.property_built_before_1978)

			// Flatten form (make fields non-editable)
			form.flatten()

			// Save PDF
			const pdfBytes = await pdfDoc.save()

			this.logger.log('Lease PDF generated successfully', {
				leaseId,
				state,
				size: pdfBytes.length
			})

			return Buffer.from(pdfBytes)
		} catch (error) {
			this.logger.error('Failed to generate lease PDF', {
				leaseId,
				state,
				error: error instanceof Error ? error.message : String(error)
			})
			throw new Error(`PDF generation failed for state ${state}: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Helper to safely fill a text field (handles missing fields)
	 */
	private fillTextField(form: PDFForm, fieldName: string, value: string): void {
		try {
			const field = form.getTextField(fieldName)
			field.setText(value)
		} catch (error) {
			// Field doesn't exist in PDF - log warning but continue
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
		const templatePath = this.getTemplatePath(state)
		try {
			await fs.access(templatePath)
			this.logger.log('Lease PDF template found', { path: templatePath, state })
			return true
		} catch {
			this.logger.error('Lease PDF template not found', { path: templatePath, state })
			return false
		}
	}

	/**
	 * Get template metadata (for debugging)
	 * @param state - Two-letter state code (defaults to 'TX')
	 */
	async getTemplateMetadata(state: string = 'TX'): Promise<{
		exists: boolean
		state: string
		size?: number
		fields?: string[]
	}> {
		const templatePath = this.getTemplatePath(state)
		try {
			const stats = await fs.stat(templatePath)
			const templateBytes = await fs.readFile(templatePath)
			const pdfDoc = await PDFDocument.load(templateBytes)
			const form = pdfDoc.getForm()
			const fields = form.getFields().map(f => f.getName())

			return {
				exists: true,
				state,
				size: stats.size,
				fields
			}
		} catch (error) {
			this.logger.error('Failed to read template metadata', {
				state,
				error: error instanceof Error ? error.message : String(error)
			})
			return {
				exists: false,
				state
			}
		}
	}
}
