import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import type { LeaseFormData } from '@repo/shared'
import type { TemplateDelegate as HandlebarsTemplateDelegate } from 'handlebars'
import { PDFGeneratorService } from './pdf-generator.service'
import {
	compileTemplate,
	getStateRequirements,
	getRequiredDisclosures
} from './template-helpers'

/**
 * Lease PDF Generation Service
 * Specialized service for generating lease agreement PDFs
 */
@Injectable()
export class LeasePDFService {
	private readonly logger = new Logger(LeasePDFService.name)
	private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map()

	constructor(
		private readonly pdfGenerator: PDFGeneratorService
	) {
		this.loadTemplates()
	}

	/**
	 * Load and cache templates on service initialization
	 */
	private loadTemplates(): void {
		try {
			const templatePath = path.join(__dirname, 'templates', 'lease-agreement.hbs')
			const templateString = fs.readFileSync(templatePath, 'utf-8')
			const compiledTemplate = compileTemplate(templateString)
			this.templateCache.set('lease-agreement', compiledTemplate)
			this.logger.log('Lease templates loaded successfully')
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.logger.error('Failed to load lease templates:', { error: errorMessage })
			// In production, we might want to throw here to prevent service startup
			// For now, we'll log and continue
		}
	}

	/**
	 * Generate lease agreement PDF
	 */
	async generateLeasePDF(leaseData: Record<string, unknown>): Promise<Buffer> {
		const result = await this.generateLeasePdf(
			String(leaseData.id || ''),
			String(leaseData.userId || ''),
			leaseData
		)
		return result.buffer
	}

	/**
	 * Generate lease agreement (alias for test compatibility)
	 */
	async generateLeaseAgreement(
		leaseData: Record<string, unknown>
	): Promise<Buffer> {
		return this.generateLeasePDF(leaseData)
	}

	/**
	 * Generate lease PDF with ID and user context (for controller compatibility)
	 */
	async generateLeasePdf(
		leaseId: string,
		userId: string,
		options: Record<string, unknown>
	): Promise<{
		buffer: Buffer
		filename: string
		mimeType: string
		size: number
	}> {
		this.logger.log(
			'Generating lease PDF for lease:',
			leaseId,
			'user:',
			userId
		)

		try {
			// Generate HTML content for the lease
			const htmlContent = this.generateLeaseHTML(options as unknown as LeaseFormData)

			// Convert to PDF
			const pdfBuffer = await this.pdfGenerator.generatePDF(htmlContent, {
				format: 'A4',
				margin: {
					top: '50px',
					bottom: '50px',
					left: '50px',
					right: '50px'
				}
			})

			const filename = `lease-${leaseId}.pdf`

			this.logger.log('Lease PDF generated successfully')
			return {
				buffer: pdfBuffer,
				filename,
				mimeType: 'application/pdf',
				size: pdfBuffer.length
			}
		} catch (error) {
			this.logger.error('Error generating lease PDF:', error)
			throw new InternalServerErrorException('Failed to generate lease PDF')
		}
	}

	/**
	 * Generate HTML content for lease agreement using Handlebars template
	 */
	private generateLeaseHTML(leaseData: LeaseFormData): string {
		try {
			// Get the compiled template
			const template = this.templateCache.get('lease-agreement')
			if (!template) {
				// Try to reload the template if not in cache
				this.loadTemplates()
				const reloadedTemplate = this.templateCache.get('lease-agreement')
				if (!reloadedTemplate) {
					throw new Error('Lease agreement template not found')
				}
				return this.renderTemplate(reloadedTemplate, leaseData)
			}
			
			return this.renderTemplate(template, leaseData)
		} catch (error) {
			this.logger.error('Error generating lease HTML:', error)
			throw new InternalServerErrorException('Failed to generate lease agreement HTML')
		}
	}

	/**
	 * Render template with data and enhancements
	 */
	private renderTemplate(
		template: HandlebarsTemplateDelegate,
		leaseData: LeaseFormData
	): string {
		// Extract state from property address for state-specific requirements
		const state = this.extractState(leaseData)
		const propertyYear = this.extractPropertyYear(leaseData)
		
		// Prepare template context with all necessary data
		const context = {
			...leaseData,
			// Add generated metadata
			leaseId: (leaseData as LeaseFormData & { id?: string }).id || this.generateLeaseId(),
			generatedDate: new Date().toISOString(),
			documentVersion: '1.0',
			
			// Add state-specific requirements
			stateCompliance: true,
			stateNotice: getStateRequirements(state),
			requiredDisclosures: getRequiredDisclosures(state, propertyYear),
			
			// Ensure nested objects exist with defaults
			property: this.ensurePropertyData(leaseData.property),
			landlord: this.ensureLandlordData(leaseData.landlord),
			tenants: this.ensureTenantsData(leaseData.tenants),
			leaseTerms: this.ensureLeaseTerms(leaseData.leaseTerms),
			policies: this.ensurePolicies(leaseData.policies),
			customTerms: leaseData.customTerms || [],
			
			// Add flags for conditional rendering
			requiresWitness: this.requiresWitness(state),
			includeStateDisclosures: (leaseData.options as Record<string, unknown>)?.includeStateDisclosures as boolean ?? true,
			includeFederalDisclosures: (leaseData.options as Record<string, unknown>)?.includeFederalDisclosures as boolean ?? true
		}
		
		// Render the template with the context
		return template(context)
	}

	/**
	 * Extract state from lease data
	 */
	private extractState(leaseData: LeaseFormData): string {
		const property = leaseData.property
		return property?.address?.state || 'CA' // Default to California
	}

	/**
	 * Extract property year for disclosure requirements
	 */
	private extractPropertyYear(leaseData: LeaseFormData): number | undefined {
		const property = leaseData.property
		return (property as LeaseFormData['property'] & { yearBuilt?: number })?.yearBuilt
	}

	/**
	 * Generate a unique lease ID
	 */
	private generateLeaseId(): string {
		const timestamp = Date.now().toString(36)
		const random = Math.random().toString(36).substring(2, 9)
		return `LEASE-${timestamp.toUpperCase()}-${random.toUpperCase()}`
	}

	/**
	 * Check if state requires witnesses
	 */
	private requiresWitness(state: string): boolean {
		const witnessStates = ['FL', 'SC'] // Some states require witnesses
		return witnessStates.includes(state)
	}

	/**
	 * Ensure property data has all required fields
	 */
	private ensurePropertyData(property: LeaseFormData['property']): LeaseFormData['property'] {
		return {
			address: {
				street: property?.address?.street || 'Property Address',
				unit: property?.address?.unit,
				city: property?.address?.city || 'City',
				state: property?.address?.state || 'CA',
				zipCode: property?.address?.zipCode || '00000'
			},
			type: property?.type || 'apartment',
			bedrooms: property?.bedrooms || 1,
			bathrooms: property?.bathrooms || 1,
			squareFeet: property?.squareFeet,
			parking: property?.parking,
			amenities: property?.amenities || []
		}
	}

	/**
	 * Ensure landlord data has all required fields
	 */
	private ensureLandlordData(landlord: LeaseFormData['landlord']): LeaseFormData['landlord'] {
		return {
			name: landlord?.name || 'Landlord Name',
			isEntity: landlord?.isEntity || false,
			entityType: landlord?.entityType,
			address: {
				street: landlord?.address?.street || 'Landlord Address',
				city: landlord?.address?.city || 'City',
				state: landlord?.address?.state || 'CA',
				zipCode: landlord?.address?.zipCode || '00000'
			},
			phone: landlord?.phone || '(000) 000-0000',
			email: landlord?.email || 'landlord@example.com',
			agent: landlord?.agent
		}
	}

	/**
	 * Ensure tenants data is properly formatted
	 */
	private ensureTenantsData(tenants: LeaseFormData['tenants']): LeaseFormData['tenants'] {
		if (!Array.isArray(tenants) || tenants.length === 0) {
			return [{
				name: 'Tenant Name',
				email: 'tenant@example.com',
				phone: '(000) 000-0000',
				isMainTenant: true
			}]
		}
		
		// Ensure at least one main tenant
		const hasMainTenant = tenants.some(t => t.isMainTenant)
		if (!hasMainTenant && tenants.length > 0 && tenants[0]) {
			tenants[0].isMainTenant = true
		}
		
		return tenants
	}

	/**
	 * Ensure lease terms have all required fields
	 */
	private ensureLeaseTerms(terms: LeaseFormData['leaseTerms']): LeaseFormData['leaseTerms'] {
		const startDate = terms?.startDate || new Date().toISOString()
		const type = terms?.type || 'month_to_month'
		
		// Calculate end date for fixed term leases
		let endDate = terms?.endDate
		if (type === 'fixed_term' && !endDate) {
			const start = new Date(startDate)
			start.setFullYear(start.getFullYear() + 1) // Default to 1 year
			endDate = start.toISOString()
		}
		
		return {
			type,
			startDate,
			endDate,
			rentAmount: terms?.rentAmount || 150000, // Default $1500 in cents
			currency: 'USD',
			dueDate: terms?.dueDate || 1,
			lateFee: {
				enabled: terms?.lateFee?.enabled ?? true,
				amount: terms?.lateFee?.amount,
				gracePeriod: terms?.lateFee?.gracePeriod || 5,
				percentage: terms?.lateFee?.percentage || 5
			},
			securityDeposit: {
				amount: terms?.securityDeposit?.amount || terms?.rentAmount || 150000,
				monthsRent: terms?.securityDeposit?.monthsRent || 1,
				holdingAccount: terms?.securityDeposit?.holdingAccount || false
			},
			additionalFees: terms?.additionalFees || []
		}
	}

	/**
	 * Ensure policies have proper structure
	 */
	private ensurePolicies(policies: LeaseFormData['policies']): LeaseFormData['policies'] {
		return {
			pets: policies?.pets || {
				allowed: false
			},
			smoking: policies?.smoking || {
				allowed: false
			},
			guests: policies?.guests || {},
			maintenance: policies?.maintenance || {
				tenantResponsibilities: [
					'Keep the premises clean and sanitary',
					'Report maintenance issues promptly',
					'Replace light bulbs and batteries',
					'Maintain proper temperature to prevent pipe freezing'
				],
				landlordResponsibilities: [
					'Maintain structural integrity',
					'Ensure all systems are in working order',
					'Address reported maintenance issues timely',
					'Comply with all housing codes'
				]
			}
		}
	}
}
