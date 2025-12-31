import {	BadRequestException,	ForbiddenException,	Injectable,	NotFoundException
} from '@nestjs/common'
import {	LEASE_SIGNATURE_ERROR_CODES,	LEASE_SIGNATURE_ERROR_MESSAGES
} from '@repo/shared/constants/lease-signature-errors'

@Injectable()
export class SignatureValidationHelper {
	ensureLeaseOwner(
		lease: { owner_user_id: string | null },
		ownerId: string
	): void {
		if (!lease.owner_user_id) {
			throw new NotFoundException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NO_OWNER
				]
			)
		}
		if (lease.owner_user_id !== ownerId) {
			throw new ForbiddenException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.NOT_LEASE_OWNER
				]
			)
		}
	}

	ensureLeaseStatus(
		lease: { lease_status: string },
		expectedStatus: 'draft' | 'pending_signature',
		errorCode:
			| typeof LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_DRAFT
			| typeof LEASE_SIGNATURE_ERROR_CODES.LEASE_NOT_PENDING_SIGNATURE
	): void {
		if (lease.lease_status !== expectedStatus) {
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[errorCode]
			)
		}
	}

	ensureTenantAssigned(
		lease: { primary_tenant_id: string | null },
		tenantId: string
	): void {
		if (lease.primary_tenant_id !== tenantId) {
			throw new ForbiddenException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.NOT_ASSIGNED_TO_LEASE
				]
			)
		}
	}
}
