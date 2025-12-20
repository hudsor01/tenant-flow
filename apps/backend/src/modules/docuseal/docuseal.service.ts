/**
 * DocuSeal Service
 *
 * Integrates with self-hosted DocuSeal instance for e-signature workflows.
 * Base URL: https://sign.thehudsonfam.com/api
 *
 * Uses native fetch - no SDK wrapper needed (KISS principle)
 */

import { Injectable } from '@nestjs/common'
import { AppConfigService } from '../../config/app-config.service'
import { AppLogger } from '../../logger/app-logger.service'

export interface DocuSealTemplate {
	id: number
	name: string
	created_at: string
	updated_at?: string
	fields?: Array<{
		name: string
		type: string
		required?: boolean
	}>
}

export interface DocuSealSubmitter {
	id?: number
	email: string
	name?: string
	role: string
	status?: 'pending' | 'opened' | 'completed'
	completed_at?: string
	embed_src?: string
	fields?: Array<{
		name: string
		default_value: string
	}>
}

export interface DocuSealSubmission {
	id: number
	slug?: string
	status: 'pending' | 'completed' | 'expired' | 'archived'
	submitters: DocuSealSubmitter[]
	documents?: Array<{
		name: string
		url: string
	}>
	created_at?: string
	completed_at?: string
	archived_at?: string
	metadata?: Record<string, string>
}

export interface CreateSubmissionParams {
	templateId: number
	submitters: Array<{
		role: string
		email: string
		name?: string
		fields?: Array<{ name: string; default_value: string }>
	}>
	sendEmail?: boolean
	metadata?: Record<string, string>
}

export interface CreateLeaseSubmissionParams {
	templateId: number
	leaseId: string
	ownerEmail: string
	ownerName: string
	tenantEmail: string
	tenantName: string
	propertyAddress: string
	rentAmount: number
	startDate: string
	endDate: string
	unitNumber?: string | undefined
}

export interface CreateSubmissionFromPdfParams {
	leaseId: string
	pdfUrl: string
	ownerEmail: string
	ownerName: string
	tenantEmail: string
	tenantName: string
	sendEmail?: boolean
}

@Injectable()
export class DocuSealService {

	constructor(private readonly config: AppConfigService, private readonly logger: AppLogger) {}

	/**
	 * Check if DocuSeal is enabled (API key configured)
	 */
	isEnabled(): boolean {
		return this.config.isDocuSealEnabled()
	}

	/**
	 * List available templates from DocuSeal
	 */
	async listTemplates(): Promise<DocuSealTemplate[]> {
		this.ensureEnabled()

		return this.fetch<DocuSealTemplate[]>('/templates', {
			method: 'GET'
		})
	}

	/**
	 * Create a new submission (signing request)
	 */
	async createSubmission(params: CreateSubmissionParams): Promise<DocuSealSubmission> {
		this.ensureEnabled()

		const body = {
			template_id: params.templateId,
			submitters: params.submitters.map(s => ({
				role: s.role,
				email: s.email,
				name: s.name,
				fields: s.fields
			})),
			send_email: params.sendEmail,
			metadata: params.metadata
		}

		return this.fetch<DocuSealSubmission>('/submissions', {
			method: 'POST',
			body: JSON.stringify(body)
		})
	}

	/**
	 * Get submission details by ID
	 */
	async getSubmission(submissionId: number): Promise<DocuSealSubmission> {
		this.ensureEnabled()

		return this.fetch<DocuSealSubmission>(`/submissions/${submissionId}`, {
			method: 'GET'
		})
	}

	/**
	 * Get the signing URL for a specific submitter
	 */
	async getSubmitterSigningUrl(submissionId: number, email: string): Promise<string | null> {
		this.ensureEnabled()

		const submitters = await this.fetch<DocuSealSubmitter[]>(
			`/submissions/${submissionId}/submitters`,
			{ method: 'GET' }
		)

		const submitter = submitters.find(s => s.email === email)
		return submitter?.embed_src || null
	}

	/**
	 * Archive (cancel) a submission
	 */
	async archiveSubmission(submissionId: number): Promise<void> {
		this.ensureEnabled()

		await this.fetch(`/submissions/${submissionId}/archive`, {
			method: 'POST'
		})
	}


	/**
	 * Resend signature request email to a submitter (native DocuSeal approach)
	 * This is the recommended way to remind submitters without creating new submissions
	 */
	async resendToSubmitter(
		submitterId: number,
		options?: { message?: string; sendSms?: boolean }
	): Promise<void> {
		this.ensureEnabled()

		const body: Record<string, unknown> = {
			send_email: true
		}

		if (options?.message) {
			body.message = options.message
		}

		if (options?.sendSms) {
			body.send_sms = true
		}

		await this.fetch(`/submitters/${submitterId}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		})

		this.logger.log('Resent signature request to submitter', { submitterId })
	}

	/**
	 * Create submission from pre-filled PDF (production-ready approach)
	 * Uses DocuSeal /submissions/pdf endpoint to submit already-filled PDF
	 * for signature without template dependency
	 */
	async createSubmissionFromPdf(params: CreateSubmissionFromPdfParams): Promise<DocuSealSubmission> {
		this.ensureEnabled()

		const body = {
			documents: [
				{
					name: `Lease Agreement - ${params.leaseId}`,
					file: params.pdfUrl // DocuSeal accepts public URLs
				}
			],
			submitters: [
				{
					role: 'Property Owner',
					email: params.ownerEmail,
					name: params.ownerName,
					order: 1 // Owner signs first
				},
				{
					role: 'Tenant',
					email: params.tenantEmail,
					name: params.tenantName,
					order: 2 // Tenant signs second (sequential signing)
				}
			],
			send_email: params.sendEmail ?? false,
			order: 'preserved', // Sequential signing (owner → tenant)
			metadata: {
				lease_id: params.leaseId,
				source: 'tenantflow',
				document_type: 'lease_agreement'
			}
		}

		const submission = await this.fetch<DocuSealSubmission>('/submissions/pdf', {
			method: 'POST',
			body: JSON.stringify(body)
		})

		this.logger.log('Created DocuSeal submission from filled PDF', {
			submissionId: submission.id,
			leaseId: params.leaseId,
			pdfUrl: params.pdfUrl
		})

		return submission
	}

	/**
	 * Create a lease-specific submission with owner and tenant
	 * This is the main method for creating e-signature requests for leases
	 */
	async createLeaseSubmission(params: CreateLeaseSubmissionParams): Promise<DocuSealSubmission> {
		this.ensureEnabled()

		// Build field values for template placeholders
		const commonFields = [
			{ name: 'property_address', default_value: params.propertyAddress },
			{ name: 'rent_amount', default_value: String(params.rentAmount) },
			{ name: 'start_date', default_value: params.startDate },
			{ name: 'end_date', default_value: params.endDate }
		]

		if (params.unitNumber) {
			commonFields.push({ name: 'unit_number', default_value: params.unitNumber })
		}

		const submission = await this.createSubmission({
			templateId: params.templateId,
			submitters: [
				{
					role: 'Property Owner',
					email: params.ownerEmail,
					name: params.ownerName,
					fields: [
						...commonFields,
						{ name: 'owner_name', default_value: params.ownerName }
					]
				},
				{
					role: 'Tenant',
					email: params.tenantEmail,
					name: params.tenantName,
					fields: [
						...commonFields,
						{ name: 'tenant_name', default_value: params.tenantName }
					]
				}
			],
			sendEmail: false, // We handle emails via Resend
			metadata: {
				lease_id: params.leaseId,
				source: 'tenantflow'
			}
		})

		this.logger.log('Created DocuSeal lease submission', {
			submissionId: submission.id,
			leaseId: params.leaseId
		})

		return submission
	}

	/**
	 * Ensure DocuSeal is configured before making API calls
	 */
	private ensureEnabled(): void {
		if (!this.isEnabled()) {
			throw new Error('DocuSeal is not configured. Set DOCUSEAL_API_KEY environment variable.')
		}
	}

	/**
	 * Make an authenticated request to the DocuSeal API
	 */
	private async fetch<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const apiUrl = this.config.getDocuSealApiUrl()
		const apiKey = this.config.getDocuSealApiKey()

		if (!apiKey) {
			throw new Error('DocuSeal API key is not configured')
		}

		const url = `${apiUrl}${endpoint}`

		const response = await fetch(url, {
			...options,
			headers: {
				'X-Auth-Token': apiKey,
				'Content-Type': 'application/json',
				...options.headers
			}
		})

		if (!response.ok) {
			// Parse error response body for detailed error information
			let errorBody: unknown
			try {
				errorBody = await response.json()
			} catch (parseError) {
				// If body is not JSON, try to get text
				try {
					errorBody = await response.text()
				} catch (textError) {
					errorBody = null
				}
			}

			this.logger.error('DocuSeal API error', {
				endpoint,
				status: response.status,
				statusText: response.statusText,
				errorBody // Log the actual error response from DocuSeal
			})
			throw new Error(`DocuSeal API error: ${response.status} ${response.statusText}`)
		}

		const json = await response.json()
		return json as T
	}
}