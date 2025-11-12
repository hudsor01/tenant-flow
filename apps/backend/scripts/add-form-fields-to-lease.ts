/**
/**
 * DEV-ONLY SCRIPT: Add form fields to Texas Residential Lease Agreement PDF

 * Classification: Development/Testing Tool (NOT production code)
 * Purpose: Manually add AcroForm fields to the PDF template for testing the pdf-lib form filling API

 * Usage:
 * 1. Place Texas_Residential_Lease_Agreement.pdf in project root
 * 2. Run: pnpm tsx apps/backend/scripts/add-form-fields-to-lease.ts
 * 3. Output: Texas_Residential_Lease_Agreement.filled.pdf with editable form fields

 * IMPORTANT:
 * - This script is for template preparation ONLY
 * - DO NOT use in production code or deployment pipelines
 * - The output PDF should be reviewed manually before use
 * - Template modifications should be documented in apps/backend/assets/README.md
 */

import { PDFDocument } from 'pdf-lib'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'AddFormFieldsScript' })

async function addFormFields() {
	const templatePath = join(
		process.cwd(),
		'Texas_Residential_Lease_Agreement.pdf'
	)
	const outputPath = join(
		process.cwd(),
		'Texas_Residential_Lease_Agreement.filled.pdf'
	)

	logger.info(' Loading PDF template...')
	const pdfBytes = await readFile(templatePath)
	const pdfDoc = await PDFDocument.load(pdfBytes)

	logger.info(' Adding form fields...')
	const form = pdfDoc.getForm()

	// Get first page dimensions
	const pages = pdfDoc.getPages()
	const firstPage = pages[0]
	const { height } = firstPage.getSize()


	// Page 1 - Agreement Information
	form.createTextField('agreement_date')
	form.createTextField('owner_name')
	form.createTextField('owner_address')
	form.createTextField('owner_phone')
	form.createTextField('tenant_name')
	form.createTextField('property_address')

	// Lease Term
	form.createTextField('commencement_date')
	form.createTextField('termination_date')

	// Rent Information
	form.createTextField('monthly_rent')
	form.createTextField('rent_due_day')
	form.createTextField('late_fee_amount')
	form.createTextField('late_fee_grace_days')
	form.createTextField('nsf_fee')

	// Security Deposit
	form.createTextField('security_deposit')
	form.createTextField('security_deposit_due_days')

	// Use of Premises
	form.createTextField('max_occupants')
	form.createTextField('allowed_use')

	// Alterations
	form.createTextField('alterations')

	// Utilities
	form.createTextField('utilities_included')
	form.createTextField('tenant_utilities')

	// Pets
	form.createTextField('pets_allowed')
	form.createTextField('pet_deposit')
	form.createTextField('pet_rent')

	// Hold Over Rent
	form.createTextField('hold_over_rent')

	// Lead Paint
	form.createTextField('lead_paint_disclosure')

	// Notice
	form.createTextField('notice_address')
	form.createTextField('notice_email')

	logger.info(' Saving fillable PDF...')
	const filledPdfBytes = await pdfDoc.save()
	await writeFile(outputPath, filledPdfBytes)

	const fields = form.getFields()
	logger.info(` Added ${fields.length} form fields to PDF`, {
		metadata: { outputPath }
	})
}

addFormFields().catch(error => {
	logger.error('Failed to add form fields to lease template', {
		metadata: { error: error instanceof Error ? error.message : String(error) }
	})
	process.exit(1)
})
