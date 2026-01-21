/**
 * Financial Query DTOs
 *
 * Provides runtime validation for financial query parameters using Zod.
 * SEC-003: Proper input validation for financial endpoints.
 */

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const DateRangeQuerySchema = z.object({
	start_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
		.optional(),
	end_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
		.optional(),
	property_id: z.string().uuid('Invalid property ID').optional(),
	unit_id: z.string().uuid('Invalid unit ID').optional()
})

export class DateRangeQueryDto extends createZodDto(DateRangeQuerySchema) {}

export const ExpenseFilterQuerySchema = z.object({
	start_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
		.optional(),
	end_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
		.optional(),
	property_id: z.string().uuid('Invalid property ID').optional(),
	category: z
		.enum(['maintenance', 'utilities', 'insurance', 'taxes', 'other'])
		.optional(),
	min_amount: z.coerce.number().positive().optional(),
	max_amount: z.coerce.number().positive().optional()
})

export class ExpenseFilterQueryDto extends createZodDto(
	ExpenseFilterQuerySchema
) {}

export const FinancialPeriodSchema = z.object({
	period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
	year: z.coerce.number().int().min(2000).max(2100).optional(),
	month: z.coerce.number().int().min(1).max(12).optional()
})

export class FinancialPeriodDto extends createZodDto(FinancialPeriodSchema) {}
