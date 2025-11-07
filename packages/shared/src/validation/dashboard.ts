import { z } from 'zod'

export const billingInsightsSchema = z.object({
	totalRevenue: z.number().nonnegative(),
	churnRate: z.number().min(0).max(1),
	mrr: z.number().nonnegative()
})

export const activitySchema = z.object({
	id: z.string(),
	type: z.string(),
	description: z.string().optional(),
	timestamp: z.union([z.string().datetime(), z.date()])
})

export const dashboardActivityResponseSchema = z.object({
	activities: z.array(activitySchema)
})
