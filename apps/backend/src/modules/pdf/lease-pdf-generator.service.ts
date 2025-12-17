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
	private readonly templatePath: string

	constructor(private readonly logger: AppLogger) {
		// Path to template in assets folder (process.cwd() is already in apps/backend)
		// TODO: Make template path configurable per state
		this.templatePath = path.join(
			process.cwd(),
			'assets/Texas_Residential_Lease_Agreement.pdf'
		)
	}

	/**
	 * Generate filled PDF from template + data
	 * Returns PDF as Buffer for upload to DocuSeal or storage
	 */
	async generateFilledPdf(fields: LeasePdfFields, leaseId: string): Promise<Buffer> {
		this.logger.log('Generating lease PDF', { leaseId })

		try {
			// Load template PDF
			const templateBytes = await fs.readFile(this.templatePath)
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

			this.logger.log('Texas lease PDF generated successfully', {
				leaseId,
				size: pdfBytes.length
			})

			return Buffer.from(pdfBytes)
		} catch (error) {
			this.logger.error('Failed to generate Texas lease PDF', {
				leaseId,
				error: error instanceof Error ? error.message : String(error)
			})
			throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`)
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
	 * Validate template exists
	 */
	async validateTemplate(): Promise<boolean> {
		try {
			await fs.access(this.templatePath)
			this.logger.log('Texas lease PDF template found', { path: this.templatePath })
			return true
		} catch {
			this.logger.error('Texas lease PDF template not found', { path: this.templatePath })
			return false
		}
	}

	/**
	 * Get template metadata (for debugging)
	 */
	async getTemplateMetadata(): Promise<{
		exists: boolean
		size?: number
		fields?: string[]
	}> {
		try {
			const stats = await fs.stat(this.templatePath)
			const templateBytes = await fs.readFile(this.templatePath)
			const pdfDoc = await PDFDocument.load(templateBytes)
			const form = pdfDoc.getForm()
			const fields = form.getFields().map(f => f.getName())

			return {
				exists: true,
				size: stats.size,
				fields
			}
		} catch (error) {
			this.logger.error('Failed to read template metadata', {
				error: error instanceof Error ? error.message : String(error)
			})
			return {
				exists: false
			}
		}
	}
}
