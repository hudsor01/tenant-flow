import { BadRequestException, Injectable } from '@nestjs/common'
import { DocuSealService } from '../../docuseal/docuseal.service'
import { LeasePdfMapperService } from '../../pdf/lease-pdf-mapper.service'
import { LeasePdfGeneratorService } from '../../pdf/lease-pdf-generator.service'
import { PdfStorageService } from '../../pdf/pdf-storage.service'
import { LeaseQueryService } from '../lease-query.service'
import { AppLogger } from '../../../logger/app-logger.service'
import type { SupabaseService } from '../../../database/supabase.service'

export interface SendForSignatureOptions {
	message?: string | undefined
	missingFields?:
		| {
				immediate_family_members?: string
				landlord_notice_address?: string
		  }
		| undefined
	token?: string | undefined
}

export interface LeasePdfPreparationResult {
	pdfUrl: string
	docusealSubmissionId: string | null
}

@Injectable()
export class LeasePdfHelper {
	constructor(
		private readonly leaseQueryService: LeaseQueryService,
		private readonly pdfMapper: LeasePdfMapperService,
		private readonly pdfGenerator: LeasePdfGeneratorService,
		private readonly pdfStorage: PdfStorageService,
		private readonly docuSealService: DocuSealService,
		private readonly logger: AppLogger
	) {}

	async preparePdfAndSubmission(params: {
		client: ReturnType<SupabaseService['getAdminClient']>
		leaseId: string
		ownerId: string
		lease: {
			primary_tenant_id: string | null
			owner_user_id: string | null
		}
		options?: SendForSignatureOptions
	}): Promise<LeasePdfPreparationResult> {
		const { client, leaseId, ownerId, lease, options } = params

		if (!options?.token) {
			throw new BadRequestException(
				'JWT token required for PDF generation. Please provide options.token.'
			)
		}

		const leaseData = await this.leaseQueryService.getLeaseDataForPdf(
			options.token,
			leaseId
		)

		const { fields: autoFilledFields, missing } =
			this.pdfMapper.mapLeaseToPdfFields(leaseData)

		if (!missing.isComplete) {
			if (!options.missingFields) {
				this.logger.warn('Missing required PDF fields', {
					leaseId,
					missingFields: missing.fields
				})
				throw new BadRequestException(
					`Cannot send for signature: missing required fields: ${missing.fields.join(', ')}. Please provide these in options.missingFields.`
				)
			}

			const validation = this.pdfMapper.validateMissingFields(
				options.missingFields as { [key: string]: string }
			)
			if (!validation.isValid) {
				throw new BadRequestException(
					`Invalid missing fields: ${validation.errors.join(', ')}`
				)
			}
		}

		const completeFields = this.pdfMapper.mergeMissingFields(
			autoFilledFields,
			(options.missingFields as { [key: string]: string }) || {}
		)

		if (!leaseData) {
			this.logger.error('Lease data is null or undefined', {
				leaseId,
				ownerId
			})
			throw new BadRequestException(
				'Lease data not found. Please ensure the lease exists and try again.'
			)
		}

		let pdfBuffer: Buffer
		const state = leaseData.lease?.governing_state || undefined
		try {
			pdfBuffer = await this.pdfGenerator.generateFilledPdf(
				completeFields,
				leaseId,
				{
					state,
					throwOnUnsupportedState: false,
					validateTemplate: true
				}
			)
			this.logger.log('Generated filled lease PDF', {
				leaseId,
				state,
				sizeBytes: pdfBuffer.length
			})
		} catch (error) {
			this.logger.error('Failed to generate lease PDF', {
				error: error instanceof Error ? error.message : String(error),
				leaseId,
				state,
				leaseDataExists: !!leaseData
			})
			throw new BadRequestException(
				`Failed to generate lease PDF${state ? ` for state ${state}` : ''}. Please contact support.`
			)
		}

		let pdfUrl: string
		try {
			const uploadResult = await this.pdfStorage.uploadLeasePdf(
				leaseId,
				pdfBuffer
			)
			pdfUrl = uploadResult.publicUrl
			this.logger.log('Uploaded lease PDF to storage', {
				leaseId,
				pdfUrl,
				path: uploadResult.path
			})
		} catch (error) {
			this.logger.error('Failed to upload lease PDF to storage', {
				error: error instanceof Error ? error.message : String(error),
				leaseId
			})
			throw new BadRequestException(
				'Failed to upload lease PDF. Please try again.'
			)
		}

		// Guard: primary_tenant_id must exist for signature workflow
		if (!lease.primary_tenant_id) {
			throw new BadRequestException(
				'Lease must have a primary tenant assigned for signature workflow.'
			)
		}

		const [tenantResult, ownerResult] = await Promise.all([
			client
				.from('tenants')
				.select('user_id, user:users(email, first_name, last_name)')
				.eq('id', lease.primary_tenant_id)
				.single(),
			lease.owner_user_id
				? client
						.from('users')
						.select('email, first_name, last_name')
						.eq('id', lease.owner_user_id)
						.single()
				: Promise.resolve({ data: null, error: null })
		])

		const tenantRecord = tenantResult.data
		const ownerUser = ownerResult.data
		const tenantUser = tenantRecord?.user as {
			email: string
			first_name: string | null
			last_name: string | null
		} | null

		if (!ownerUser?.email || !tenantUser?.email) {
			throw new BadRequestException(
				'Owner and tenant must have valid email addresses for signature workflow.'
			)
		}

		let docusealSubmissionId: string | null = null

		if (this.docuSealService.isEnabled()) {
			try {
				const submission = await this.docuSealService.createSubmissionFromPdf({
					leaseId,
					pdfUrl,
					ownerEmail: ownerUser.email,
					ownerName:
						`${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() ||
						'Property Owner',
					tenantEmail: tenantUser.email,
					tenantName:
						`${tenantUser.first_name || ''} ${tenantUser.last_name || ''}`.trim() ||
						'Tenant',
					sendEmail: false
				})

				docusealSubmissionId = String(submission.id)
				this.logger.log('Created DocuSeal submission from PDF', {
					submissionId: submission.id,
					leaseId,
					pdfUrl
				})
			} catch (error) {
				this.logger.error('Failed to create DocuSeal submission from PDF', {
					error: error instanceof Error ? error.message : String(error),
					leaseId
				})
			}
		} else {
			this.logger.warn('DocuSeal not enabled, skipping submission creation', {
				leaseId
			})
		}

		return { pdfUrl, docusealSubmissionId }
	}
}
