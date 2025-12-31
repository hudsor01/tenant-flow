import { createZodDto } from 'nestjs-zod'
import { inviteTenantRequestSchema } from '@repo/shared/validation/tenants'

/**
 * DTO for inviting tenant to platform
 *
 * Source of truth: packages/shared/src/validation/tenants.ts
 * Uses Zod validation per CLAUDE.md guidelines
 *
 * ARCHITECTURE:
 * - Lease data context (property/unit) is REQUIRED
 * - Actual lease creation is a separate workflow after tenant accepts
 * - Stripe subscription created only when BOTH parties sign the lease
 */
export class InviteWithLeaseDto extends createZodDto(
	inviteTenantRequestSchema
) {}
