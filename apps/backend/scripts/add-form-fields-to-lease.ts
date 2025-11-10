/**
 * Script to add form fields to Texas Residential Lease Agreement PDF
 * Run with: pnpm tsx apps/backend/scripts/add-form-fields-to-lease.ts
 */

import { PDFDocument } from 'pdf-lib'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

async function addFormFields() {
	const templatePath = join(
		process.cwd(),
		'Texas_Residential_Lease_Agreement.pdf'
	)
	const outputPath = join(
		process.cwd(),
		'Texas_Residential_Lease_Agreement.pdf'
	)

	console.log('📄 Loading PDF template...')
	const pdfBytes = await readFile(templatePath)
	const pdfDoc = await PDFDocument.load(pdfBytes)

	console.log('📝 Adding form fields...')
	const form = pdfDoc.getForm()

	// Get first page dimensions
	const pages = pdfDoc.getPages()
	const firstPage = pages[0]
	const { height } = firstPage.getSize()

	// Helper to convert top-left coordinates to bottom-left (PDF standard)
	const convertY = (y: number) => height - y - 20

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

	console.log('💾 Saving fillable PDF...')
	const filledPdfBytes = await pdfDoc.save()
	await writeFile(outputPath, filledPdfBytes)

	const fields = form.getFields()
	console.log(`✅ Added ${fields.length} form fields to PDF`)
	console.log('   Output:', outputPath)
}

addFormFields().catch(console.error)
