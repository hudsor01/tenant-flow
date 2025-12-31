/**
 * Document Template DTOs using nestjs-zod
 *
 * **Pattern**: Zod Schema → createZodDto → NestJS DTO
 * - Runtime validation via ZodValidationPipe
 * - Compile-time TypeScript types preserved
 * - Sanitization for CSS injection prevention
 */

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Safe CSS color validation
 * Allows:
 * - OKLCH: oklch(0.35 0.08 250)
 * - Hex: #1f3b66 or #fff
 * - Named colors: red, blue, etc.
 *
 * Prevents CSS injection attacks through malformed color values
 */
const safeCssColorSchema = z
	.string()
	.max(100, 'Color value too long')
	.regex(
		/^(oklch\([0-9.\s/]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/,
		'Invalid color format. Use oklch(), hex (#fff), or named colors.'
	)
	.optional()
	.default('#1f3b66')

/**
 * URL validation for logos
 * Allows data URLs and https URLs
 */
const logoUrlSchema = z
	.string()
	.max(500_000, 'Logo URL too large') // Data URLs can be large
	.refine(
		val => val.startsWith('data:image/') || val.startsWith('https://'),
		'Logo must be a data URL or HTTPS URL'
	)
	.nullable()
	.optional()

/**
 * Branding information schema
 */
const brandingSchema = z
	.object({
		companyName: z.string().max(200, 'Company name too long').optional(),
		logoUrl: logoUrlSchema,
		primaryColor: safeCssColorSchema
	})
	.optional()

/**
 * Custom field schema (label-value pairs)
 */
const customFieldSchema = z.object({
	label: z.string().max(100, 'Label too long'),
	value: z.string().max(1000, 'Value too long')
})

/**
 * Clause schema for state-specific clauses
 */
const clauseSchema = z.object({
	text: z.string().max(5000, 'Clause text too long')
})

/**
 * Main document template payload schema
 */
const documentTemplatePayloadSchema = z.object({
	templateTitle: z.string().max(200, 'Template title too long').optional(),
	state: z
		.string()
		.length(2, 'State must be 2-letter code')
		.toUpperCase()
		.optional(),
	branding: brandingSchema,
	customFields: z.array(customFieldSchema).max(50, 'Too many custom fields').optional(),
	clauses: z.array(clauseSchema).max(20, 'Too many clauses').optional(),
	data: z.record(z.string(), z.unknown()).optional()
})

/**
 * Template definition fields schema
 * For persisting form builder configuration
 */
const dynamicFieldSchema = z.object({
	name: z.string().max(100),
	label: z.string().max(200),
	type: z.enum([
		'text',
		'email',
		'tel',
		'date',
		'textarea',
		'select',
		'checkbox',
		'number',
		'list'
	]),
	placeholder: z.string().max(200).optional(),
	description: z.string().max(500).optional(),
	section: z.string().max(100).optional(),
	fullWidth: z.boolean().optional(),
	rows: z.number().int().min(1).max(20).optional(),
	options: z
		.array(
			z.object({
				value: z.string().max(100),
				label: z.string().max(200)
			})
		)
		.max(50)
		.optional()
})

const templateDefinitionSchema = z.object({
	fields: z.array(dynamicFieldSchema).max(100, 'Too many fields').optional()
})

/**
 * Document Template Payload DTO
 *
 * Used for preview and export endpoints
 */
export class DocumentTemplatePayloadDto extends createZodDto(
	documentTemplatePayloadSchema
) {}

/**
 * Template Definition DTO
 *
 * Used for saving/loading form builder configuration
 */
export class TemplateDefinitionDto extends createZodDto(
	templateDefinitionSchema
) {}

// Export schemas for testing
export {
	documentTemplatePayloadSchema,
	templateDefinitionSchema,
	safeCssColorSchema,
	brandingSchema
}
