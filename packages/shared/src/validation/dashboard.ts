import { z } from 'zod'

export const billingInsightsSchema = z.object({
	totalRevenue: z.number().nonnegative(),
	churnRate: z.number().min(0).max(1),
	mrr: z.number().nonnegative()
})

export const activitySchema = z.object({
	id: z.string(),
	activity_type: z.enum(['lease', 'payment', 'maintenance', 'unit']),
	entity_id: z.string(),
	property_id: z.string().nullable(),
	tenant_id: z.string().nullable(),
	unit_id: z.string().nullable(),
	owner_id: z.string().nullable(),
	status: z.string().nullable(),
	priority: z.string().nullable(),
	action: z.string(),
	amount: z.number().nullable(),
	activity_timestamp: z.string(),
	details: z.record(z.string(), z.unknown())
})

export const dashboardActivityResponseSchema = z.object({
	activities: z.array(activitySchema)
})
