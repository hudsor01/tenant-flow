import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import {
	WebVitalMetricName,
	WebVitalRating
} from '@repo/shared/types/domain'
import type {
	WebVitalMetricNameValue,
	WebVitalRatingValue
} from '@repo/shared/types/domain'

const webVitalNames = Object.values(WebVitalMetricName) as [
	WebVitalMetricNameValue,
	...WebVitalMetricNameValue[]
]

const webVitalRatings = Object.values(WebVitalRating) as [
	WebVitalRatingValue,
	...WebVitalRatingValue[]
]

export const webVitalSchema = z.object({
	name: z.enum(webVitalNames),
	value: z.number(),
	rating: z.enum(webVitalRatings),
	delta: z.number(),
	id: z.string(),
	page: z.string().min(1),
	timestamp: z.string().datetime().optional(),
	sessionId: z.string().optional(),
	user_id: z.string().optional()
})

export type WebVitalMetric = z.infer<typeof webVitalSchema>

export class WebVitalDto extends createZodDto(webVitalSchema) {}
