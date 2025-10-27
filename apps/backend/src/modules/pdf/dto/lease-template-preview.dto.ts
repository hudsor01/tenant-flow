/**
 * Lease Template Preview DTO using nestjs-zod
 *
 * **Pattern**: Zod Schema → createZodDto → NestJS DTO
 * - Runtime validation via ZodValidationPipe
 * - Compile-time TypeScript types preserved
 * - No type assertions needed
 *
 * **Why nestjs-zod**:
 * - Maintains TypeScript strict mode (no `as` assertions)
 * - Compatible with CLAUDE.md Ultra-Native NestJS architecture
 * - Provides both validation AND type safety
 *
 * @see {@link https://github.com/BenLorantfy/nestjs-zod nestjs-zod Documentation}
 */

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// US State codes - matches USState type from shared package
const usStateEnum = z.enum([
	'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
	'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
	'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
	'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
	'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
	'DC'
])

// Custom clause schema
const customClauseSchema = z.object({
	id: z.string().min(1, 'Clause ID is required'),
	title: z.string().min(1, 'Clause title is required'),
	body: z.string().min(1, 'Clause body is required')
})

// Lease template selections schema
const leaseTemplateSelectionsSchema = z.object({
	state: usStateEnum,
	selectedClauses: z.array(z.string()),
	includeStateDisclosures: z.boolean(),
	includeFederalDisclosures: z.boolean(),
	customClauses: z.array(customClauseSchema).optional().default([])
})

// ISO 8601 datetime string validation
const isoDateTimeString = z
	.string()
	.regex(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
		'Must be ISO 8601 datetime format (e.g., 2025-01-01T00:00:00Z)'
	)

// Positive integer for rent/deposit amounts in cents
const positiveMoneyAmount = z
	.number()
	.int('Amount must be an integer (cents)')
	.min(0, 'Amount must be non-negative')
	.max(1_000_000_00, 'Amount exceeds maximum limit ($1,000,000)')

// Rent due day (1-31)
const rentDueDay = z
	.number()
	.int('Day must be an integer')
	.min(1, 'Day must be between 1-31')
	.max(31, 'Day must be between 1-31')

// Lease template context schema
const leaseTemplateContextSchema = z.object({
	landlordName: z.string().min(1, 'Landlord name is required'),
	landlordAddress: z.string().min(1, 'Landlord address is required'),
	tenantNames: z.string().min(1, 'Tenant name(s) are required'),
	propertyAddress: z.string().min(1, 'Property address is required'),
	propertyState: usStateEnum,
	rentAmountCents: positiveMoneyAmount,
	rentAmountFormatted: z.string().min(1, 'Formatted rent amount is required'),
	rentDueDay: rentDueDay,
	rentDueDayOrdinal: z.string().min(1, 'Rent due day ordinal is required'),
	securityDepositCents: positiveMoneyAmount,
	securityDepositFormatted: z.string().min(1, 'Formatted security deposit is required'),
	leaseStartDateISO: isoDateTimeString,
	leaseEndDateISO: isoDateTimeString.optional(),
	leaseStartDateFormatted: z.string().min(1, 'Formatted start date is required'),
	leaseEndDateFormatted: z.string().optional(),
	lateFeeAmountCents: positiveMoneyAmount.optional(),
	lateFeeAmountFormatted: z.string().optional(),
	gracePeriodDays: z.number().int().min(0).max(30).optional(),
	formattedDateGenerated: z.string().min(1, 'Generated date is required')
})

// Main lease template preview request schema
const leaseTemplatePreviewRequestSchema = z.object({
	selections: leaseTemplateSelectionsSchema,
	context: leaseTemplateContextSchema
})

/**
 * Lease Template Preview DTO
 *
 * Generated from Zod schema using createZodDto()
 * - Provides runtime validation via ZodValidationPipe
 * - Preserves TypeScript type information (no type assertions)
 * - Compatible with @Body() decorator in NestJS controllers
 *
 * @example
 * ```typescript
 * @Post('lease/template/preview')
 * async generateLeaseTemplatePreview(@Body() body: LeaseTemplatePreviewDto) {
 *   // body is fully typed and validated - no `as` needed!
 *   const { selections, context } = body
 * }
 * ```
 */
export class LeaseTemplatePreviewDto extends createZodDto(leaseTemplatePreviewRequestSchema) {}

// Export Zod schema for testing purposes
export { leaseTemplatePreviewRequestSchema }
