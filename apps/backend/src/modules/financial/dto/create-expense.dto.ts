/**
 * Create Expense DTO
 *
 * Provides runtime validation for expense creation requests using Zod.
 * SEC-003: Proper input validation for financial endpoints.
 */

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const CreateExpenseSchema = z.object({
	amount: z
		.number()
		.positive('Amount must be positive')
		.max(10_000_000, 'Amount exceeds maximum allowed value'),
	expense_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
	maintenance_request_id: z.string().uuid('Invalid maintenance request ID'),
	vendor_name: z
		.string()
		.max(255, 'Vendor name too long')
		.optional()
		.nullable()
})

export class CreateExpenseDto extends createZodDto(CreateExpenseSchema) {}

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>
