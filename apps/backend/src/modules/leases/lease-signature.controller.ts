/**
 * Lease Signature Controller
 *
 * Handles all lease e-signature workflow endpoints:
 * - POST /leases/:id/send-for-signature
 * - POST /leases/:id/sign/owner
 * - POST /leases/:id/sign/tenant
 * - GET /leases/:id/signature-status
 * - GET /leases/:id/signing-url
 * - POST /leases/:id/cancel-signature
 * - POST /leases/:id/resend-signature
 * - GET /leases/:id/signed-document
 *
 * Extracted from LeasesController to maintain <300 line limit per CLAUDE.md
 */

import {
	Body,
	Controller,
	Get,
	Header,
	Param,
	ParseUUIDPipe,
	Post,
	Req
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeaseSignatureService } from './lease-signature.service'

@Controller('leases')
export class LeaseSignatureController {
	constructor(private readonly signatureService: LeaseSignatureService) {}

	/**
	 * Owner sends lease for signature (draft -> pending_signature)
	 * Generates PDF and creates e-signature request if DocuSeal is configured
	 */
	@Post(':id/send-for-signature')
	@Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 sends per hour
	async sendForSignature(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string,
		@Body()
		body?: {
			message?: string
			missingFields?: {
				immediate_family_members?: string
				landlord_notice_address?: string
			}
		}
	) {
		const options: {
			token: string
			message?: string
			missingFields?: {
				immediate_family_members?: string
				landlord_notice_address?: string
			}
		} = { token }

		if (body?.message !== undefined) options.message = body.message
		if (body?.missingFields !== undefined)
			options.missingFields = body.missingFields

		await this.signatureService.sendForSignature(req.user.id, id, options)
		return { success: true }
	}

	/**
	 * Owner signs the lease
	 */
	@Post(':id/sign/owner')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 signature attempts per hour
	async signAsOwner(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signatureIp = req.ip || 'unknown'
		await this.signatureService.signLeaseAsOwner(req.user.id, id, signatureIp)
		return { success: true }
	}

	/**
	 * Tenant signs the lease
	 */
	@Post(':id/sign/tenant')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 signature attempts per hour
	async signAsTenant(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signatureIp = req.ip || 'unknown'
		await this.signatureService.signLeaseAsTenant(req.user.id, id, signatureIp)
		return { success: true }
	}

	/**
	 * Get signature status for a lease
	 * Authorization: Only owner or assigned tenant can view
	 *
	 * Note: SSE provides real-time updates. This endpoint is now
	 * a fallback for missed events or initial page load only.
	 */
	@Get(':id/signature-status')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute (fallback only, SSE is primary)
	@Header('Cache-Control', 'private, max-age=30') // 30s cache for CDN/browser
	async getSignatureStatus(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		return this.signatureService.getSignatureStatus(id, req.user.id)
	}

	/**
	 * Get DocuSeal signing URL for the current user
	 * Returns embed URL for e-signature if DocuSeal submission exists
	 */
	@Get(':id/signing-url')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
	async getSigningUrl(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signingUrl = await this.signatureService.getSigningUrl(
			id,
			req.user.id
		)
		return { signing_url: signingUrl }
	}

	/**
	 * Cancel/revoke signature request
	 * Reverts lease to draft status and archives DocuSeal submission
	 */
	@Post(':id/cancel-signature')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 cancellations per hour
	async cancelSignatureRequest(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		await this.signatureService.cancelSignatureRequest(req.user.id, id)
		return { success: true }
	}

	@Post(':id/resend-signature')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 resends per hour
	async resendSignatureRequest(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@Body() body?: { message?: string }
	) {
		// Build options object only with defined values for exactOptionalPropertyTypes
		const options: { message?: string } = {}
		if (body?.message !== undefined) {
			options.message = body.message
		}
		await this.signatureService.resendSignatureRequest(req.user.id, id, options)
		return { success: true }
	}

	/**
	 * Get signed document URL for download
	 * Only available for active leases with completed signatures
	 */
	@Get(':id/signed-document')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
	async getSignedDocument(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const documentUrl = await this.signatureService.getSignedDocumentUrl(
			id,
			req.user.id
		)
		return { document_url: documentUrl }
	}
}
