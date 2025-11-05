import { z } from 'zod'

export const billingInsightsSchema = z.object({
	totalRevenue: z.number(),
	churnRate: z.number(),
	mrr: z.number()
})

export const activitySchema = z.object({
	id: z.string(),
	type: z.string(),
	description: z.string().optional(),
	timestamp: z.union([z.string(), z.date()])
})

export const dashboardActivityResponseSchema = z.object({
	activities: z.array(activitySchema)
})
