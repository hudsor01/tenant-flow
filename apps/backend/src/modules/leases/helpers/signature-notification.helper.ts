import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SseService } from '../../notifications/sse/sse.service'
import type { LeaseSignatureUpdatedEvent } from '@repo/shared/events/sse-events'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import { AppLogger } from '../../../logger/app-logger.service'

@Injectable()
export class SignatureNotificationHelper {
	constructor(
		private readonly eventEmitter: EventEmitter2,
		private readonly sseService: SseService,
		private readonly logger: AppLogger
	) {}

	emitLeaseSentForSignature(params: {
		leaseId: string
		tenantId: string | null
		message?: string
		docusealSubmissionId: string | null
		pdfUrl: string
	}): void {
		this.eventEmitter.emit('lease.sent_for_signature', {
			lease_id: params.leaseId,
			tenant_id: params.tenantId,
			message: params.message,
			docuseal_submission_id: params.docusealSubmissionId,
			pdf_url: params.pdfUrl
		})
	}

	emitOwnerSigned(leaseId: string, signedAt: string): void {
		this.eventEmitter.emit('lease.owner_signed', {
			lease_id: leaseId,
			signed_at: signedAt
		})
	}

	emitTenantSigned(
		leaseId: string,
		tenantId: string,
		signedAt: string
	): void {
		this.eventEmitter.emit('lease.tenant_signed', {
			lease_id: leaseId,
			tenant_id: tenantId,
			signed_at: signedAt
		})
	}

	emitSignatureCancelled(leaseId: string): void {
		this.eventEmitter.emit('lease.signature_cancelled', {
			lease_id: leaseId
		})
	}

	async broadcastSignatureUpdate(
		leaseId: string,
		ownerUserId: string,
		tenantUserId: string | null,
		signedBy: 'owner' | 'tenant',
		status: LeaseSignatureUpdatedEvent['payload']['status'],
		signedAt: string
	): Promise<void> {
		const sseEvent: LeaseSignatureUpdatedEvent = {
			type: SSE_EVENT_TYPES.LEASE_SIGNATURE_UPDATED,
			timestamp: new Date().toISOString(),
			payload: {
				leaseId,
				signedBy,
				status,
				signedAt
			}
		}

		await this.sseService.broadcast(ownerUserId, sseEvent)

		if (tenantUserId) {
			await this.sseService.broadcast(tenantUserId, sseEvent)
		}

		this.logger.debug('SSE signature update broadcast', {
			leaseId,
			signedBy,
			status,
			ownerUserId,
			tenantUserId
		})
	}
}
