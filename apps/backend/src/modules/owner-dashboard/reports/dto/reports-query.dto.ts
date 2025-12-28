import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Valid metrics for dashboard reports
 */
export const MetricType = {
	OCCUPANCY_RATE: 'occupancy_rate',
	ACTIVE_TENANTS: 'active_tenants',
	MONTHLY_REVENUE: 'monthly_revenue',
	OPEN_MAINTENANCE: 'open_maintenance',
	TOTAL_MAINTENANCE: 'total_maintenance'
} as const

export type MetricTypeValue = (typeof MetricType)[keyof typeof MetricType]

const metricValues = Object.values(MetricType) as [
	MetricTypeValue,
	...MetricTypeValue[]
]

/**
 * Valid periods for trend comparisons
 */
export const PeriodType = {
	DAY: 'day',
	WEEK: 'week',
	MONTH: 'month',
	YEAR: 'year'
} as const

export type PeriodTypeValue = (typeof PeriodType)[keyof typeof PeriodType]

const periodValues = Object.values(PeriodType) as [
	PeriodTypeValue,
	...PeriodTypeValue[]
]

/**
 * Query params for time series endpoint
 */
export const timeSeriesQuerySchema = z.object({
	metric: z.enum(metricValues),
	days: z.coerce
		.number()
		.int()
		.min(1, 'days must be at least 1')
		.max(365, 'days must be at most 365')
		.default(30)
})

export class TimeSeriesQueryDto extends createZodDto(timeSeriesQuerySchema) {}

/**
 * Query params for metric trend endpoint
 */
export const metricTrendQuerySchema = z.object({
	metric: z.enum(metricValues),
	period: z.enum(periodValues).optional().default('month')
})

export class MetricTrendQueryDto extends createZodDto(metricTrendQuerySchema) {}
