import { Injectable, Logger } from '@nestjs/common'
import type {
	LeaseFormData,
	USState
} from '@repo/shared/types/lease-generator.types'
import {
	createContextFromLeaseData,
	createDefaultContext,
	getDefaultSelections,
	leaseTemplateSchema,
	renderLeaseHtmlDocument,
	type LeaseTemplateContext,
	type LeaseTemplateSelections
} from '@repo/shared/templates/lease-template'
import { PDFGeneratorService } from './pdf-generator.service'

/**
 * Lease PDF Generation Service
 * Uses shared JSON schema + renderer to produce HTML and PDFs
 */
@Injectable()
export class LeasePDFService {
	private readonly logger = new Logger(LeasePDFService.name)

	constructor(private readonly pdfGenerator: PDFGeneratorService) {}

	/**
	 * Generate a lease agreement PDF buffer from raw form data
	 */
	async generateLeasePDF(leaseData: Record<string, unknown>): Promise<Buffer> {
		try {
			const htmlContent = this.generateLeaseHTML(leaseData as unknown as LeaseFormData)
			const pdfBuffer = await this.pdfGenerator.generatePDF(htmlContent, {
				format: 'A4',
				margin: {
					top: '50px',
					bottom: '50px',
					left: '50px',
					right: '50px'
				}
			})
			return pdfBuffer
		} catch (error) {
			this.logger.error('Error generating lease PDF', error)
			throw error
		}
	}

	/**
	 * Generate a lease agreement PDF buffer from explicit selections/context.
	 * Used by the template builder preview endpoint.
	 */
	async generateLeasePdfFromTemplate(
		selections: LeaseTemplateSelections,
		context: LeaseTemplateContext
	) {
		try {
			const html = renderLeaseHtmlDocument(
				leaseTemplateSchema,
				this.ensureSelections(selections),
				createDefaultContext(context)
			)
			const pdfBuffer = await this.pdfGenerator.generatePDF(html, {
				format: 'A4',
				margin: {
					top: '50px',
					bottom: '50px',
					left: '50px',
					right: '50px'
				}
			})
			return pdfBuffer
		} catch (error) {
			this.logger.error('Error generating preview PDF', error)
			throw error
		}
	}

	/**
	 * Generate full HTML document for a lease
	 */
	private generateLeaseHTML(leaseData: LeaseFormData): string {
		const baseContext = createContextFromLeaseData(leaseData)
		const overrideContext =
			leaseData.templateConfig?.contextOverrides ?? {}
		const effectiveContext = createDefaultContext({
			...baseContext,
			...overrideContext
		})

		const state: USState =
			leaseData.templateConfig?.selections?.state ??
			effectiveContext.propertyState

		const selections = leaseData.templateConfig?.selections
			? this.ensureSelections(leaseData.templateConfig.selections)
			: getDefaultSelections(leaseTemplateSchema, state)

		return renderLeaseHtmlDocument(
			leaseTemplateSchema,
			this.ensureSelections(selections),
			effectiveContext
		)
	}

	/**
	 * Ensure selections contain mandatory defaults like clause list.
	 */
	private ensureSelections(
		selections: LeaseTemplateSelections
	): LeaseTemplateSelections {
		const state = selections.state
		const defaults = getDefaultSelections(leaseTemplateSchema, state)

		return {
			state,
			selectedClauses:
				selections.selectedClauses && selections.selectedClauses.length
					? selections.selectedClauses
					: defaults.selectedClauses,
			includeFederalDisclosures:
				selections.includeFederalDisclosures ?? defaults.includeFederalDisclosures,
			includeStateDisclosures:
				selections.includeStateDisclosures ?? defaults.includeStateDisclosures,
			customClauses: selections.customClauses ?? []
		}
	}
}
