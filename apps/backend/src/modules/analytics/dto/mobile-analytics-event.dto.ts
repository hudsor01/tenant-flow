import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const SAFE_EVENT_NAME = /^[a-zA-Z0-9_.:-]+$/

const analyticsPropertyValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null()
])

export const mobileAnalyticsEventSchema = z.object({
	eventName: z
		.string()
		.min(1, 'eventName is required')
		.max(64)
		.regex(SAFE_EVENT_NAME, 'eventName contains unsupported characters'),
	properties: z
		.record(z.string(), analyticsPropertyValueSchema)
		.optional()
		.default({}),
	timestamp: z.number().int().nonnegative(),
	userAgent: z.string().min(1).max(512),
	screenResolution: z.string().min(1).max(32),
	networkType: z.string().min(1).max(32),
	isOnline: z.boolean()
})

export type MobileAnalyticsEvent = z.infer<typeof mobileAnalyticsEventSchema>

export class MobileAnalyticsEventDto extends createZodDto(
	mobileAnalyticsEventSchema
) {}
