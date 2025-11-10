import {
	Injectable,
	Logger,
	InternalServerErrorException
} from '@nestjs/common'
import {
	PDFDocument,
	rgb,
	StandardFonts,
	type PDFPage,
	type PDFFont
} from 'pdf-lib'
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'

/**
 * Texas Lease PDF Service
 * Fills the Texas Residential Lease Agreement PDF template
 * Replaces puppeteer with pdf-lib (450KB vs 900KB bundle reduction)
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
	 * Create reusable text drawing function
	 */
	private createTextDrawer(
		page: PDFPage,
		font: PDFFont,
		fontBold: PDFFont,
		pageHeight: number,
		fontSize: number
	) {
		return (
			text: string,
			x: number,
			y: number,
			options?: {
				bold?: boolean
				size?: number
			}
		) => {
			try {
				page.drawText(text, {
					x,
					y: pageHeight - y, // Convert from top-left to bottom-left
					size: options?.size ?? fontSize,
					font: options?.bold ? fontBold : font,
					color: rgb(0, 0, 0)
				})
			} catch (error) {
				this.logger.warn(`Failed to draw text at (${x}, ${y}): ${text}`)
			}
		}
	}

	/**
	 * Generate filled Texas lease PDF from form data
	 */
	async generateLeasePDF(formData: LeaseGenerationFormData): Promise<Buffer> {
		try {
			this.logger.log('Generating Texas lease PDF')

			// Verify template exists
			await this.verifyTemplateExists()

			// Load the template PDF asynchronously
			const templateBytes = await readFile(this.templatePath)
			const pdfDoc = await PDFDocument.load(templateBytes)

			// Get first page (all fields are on page 1 of the template)
			const pages = pdfDoc.getPages()
			const firstPage = pages[0]

			if (!firstPage) {
				throw new InternalServerErrorException('PDF template has no pages')
			}

			// Load fonts
			const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
			const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

			// Page dimensions
			const { height } = firstPage.getSize()
			const fontSize = 10

			// Create text drawing helper
			const drawText = this.createTextDrawer(
				firstPage,
				font,
				fontBold,
				height,
				fontSize
			)

			// PAGE 1: Agreement Date, Parties, Property Address
			drawText(formData.agreementDate, 100, 100) // Agreement date field
			drawText(formData.landlordName, 100, 130, { bold: true }) // Landlord name
			drawText(formData.landlordAddress, 100, 145) // Landlord address
			if (formData.landlordPhone) {
				drawText(formData.landlordPhone, 400, 145) // Landlord phone
			}
			drawText(formData.tenantName, 100, 175, { bold: true }) // Tenant name
			drawText(formData.propertyAddress, 100, 205, { bold: true }) // Property address

			// PAGE 1: Term Dates
			drawText(formData.commencementDate, 100, 235) // Lease start date
			drawText(formData.terminationDate, 300, 235) // Lease end date

			// PAGE 1-2: Rent Information
			drawText(`$${formData.monthlyRent.toFixed(2)}`, 100, 265) // Monthly rent
			drawText(`${formData.rentDueDay}`, 350, 265) // Due day
			if (formData.lateFeeAmount) {
				drawText(`$${formData.lateFeeAmount.toFixed(2)}`, 100, 295) // Late fee
				drawText(`${formData.lateFeeGraceDays}`, 300, 295) // Grace period
			}
			drawText(`$${formData.nsfFee.toFixed(2)}`, 100, 325) // NSF fee

			// PAGE 2: Security Deposit
			drawText(`$${formData.securityDeposit.toFixed(2)}`, 100, 355) // Security deposit
			drawText(
				`${formData.securityDepositDueDays}`,
				400,
				355
			) // Refund days

			// PAGE 2: Use of Premises
			if (formData.maxOccupants) {
				drawText(`${formData.maxOccupants}`, 100, 385) // Max occupants
			}
			drawText(formData.allowedUse, 100, 415, { size: 9 }) // Allowed use

			// PAGE 2: Alterations
			const alterationsText = formData.alterationsAllowed
				? formData.alterationsRequireConsent
					? 'Allowed with prior written consent'
					: 'Allowed'
				: 'Not allowed'
			drawText(alterationsText, 100, 445)

			// PAGE 3: Utilities
			if (formData.utilitiesIncluded.length > 0) {
				drawText(
					`Included: ${formData.utilitiesIncluded.join(', ')}`,
					100,
					475
				)
			}
			if (formData.tenantResponsibleUtilities.length > 0) {
				drawText(
					`Tenant pays: ${formData.tenantResponsibleUtilities.join(', ')}`,
					100,
					505
				)
			}

			// PAGE 5: Animals/Pets
			if (formData.petsAllowed) {
				drawText('Pets allowed with deposit and monthly rent', 100, 535)
				drawText(`Pet deposit: $${formData.petDeposit.toFixed(2)}`, 100, 555)
				drawText(`Pet rent: $${formData.petRent.toFixed(2)}/month`, 100, 575)
			} else {
				drawText('No pets allowed', 100, 535)
			}

			// PAGE 5: Hold Over Rent
			const holdOverRent = formData.monthlyRent * formData.holdOverRentMultiplier
			drawText(
				`Hold over rent: $${holdOverRent.toFixed(2)}/month (${(formData.holdOverRentMultiplier * 100).toFixed(0)}% of monthly rent)`,
				100,
				605
			)

			// PAGE 7: Lead-Based Paint Disclosure
			if (formData.propertyBuiltBefore1978) {
				drawText(
					'Property built before 1978 - Lead paint disclosure provided',
					100,
					635,
					{ size: 9 }
				)
			}

			// PAGE 6: Notice Address
			if (formData.noticeAddress) {
				drawText(`Notice Address: ${formData.noticeAddress}`, 100, 665, {
					size: 9
				})
			}
			if (formData.noticeEmail) {
				drawText(`Notice Email: ${formData.noticeEmail}`, 100, 685, {
					size: 9
				})
			}

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
