import { z } from 'zod'

/**
 * Zod schemas for validating database RPC function responses
 * These schemas ensure type safety for Supabase RPC calls
 */

// Schema for activate_tenant_from_auth_user RPC response
// Function returns: SELECT tenant_record.id, activated
export const activateTenantResultSchema = z.array(
	z.object({
		id: z.string().uuid(),
		activated: z.boolean()
	})
)

export type ActivateTenantResult = z.infer<typeof activateTenantResultSchema>

// Schema for property stats RPC response
export const propertyStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	occupied: z.number().int().nonnegative(),
	vacant: z.number().int().nonnegative(),
	occupancyRate: z.number().min(0).max(100),
	totalMonthlyRent: z.number().nonnegative(),
	averageRent: z.number().nonnegative()
})

export type PropertyStatsRpc = z.infer<typeof propertyStatsSchema>
