import { createZodDto } from 'nestjs-zod'
import { inviteTenantRequestSchema } from '@repo/shared/validation/tenants'

/**
 * DTO for inviting tenant to platform
 *
 * Source of truth: packages/shared/src/validation/tenants.ts
 * Uses Zod validation per CLAUDE.md guidelines
 *
 * ARCHITECTURE:
 * - Lease data context (property/unit) is OPTIONAL
 * - Tenants can be invited without property assignment
 * - Property/unit can be assigned later when creating a lease
 * - Stripe subscription created only when BOTH parties sign the lease
 */
export class InviteWithLeaseDto extends createZodDto(
	inviteTenantRequestSchema
) {}
