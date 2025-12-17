/**
 * DTO for submitting missing lease fields required for PDF generation
 */

import { createZodDto } from 'nestjs-zod'
import { leaseMissingFieldsSchema } from '@repo/shared/validation/lease-missing-fields'

/**
 * DTO for submitting missing lease PDF fields
 * Only validates fields that user must provide (not auto-filled)
 */
export class SubmitMissingLeaseFieldsDto extends createZodDto(
	leaseMissingFieldsSchema
) {}
