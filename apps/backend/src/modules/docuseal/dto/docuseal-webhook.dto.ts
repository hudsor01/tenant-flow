/**
 * DocuSeal Webhook DTOs
 *
 * DTOs for validating DocuSeal webhook payloads.
 * Note: These DTOs are used for manual validation, not automatic pipe validation,
 * since webhook payloads require event-specific validation after initial parsing.
 */

import { createZodDto } from 'nestjs-zod'
import {
	formCompletedPayloadSchema,
	submissionCompletedPayloadSchema
} from '@repo/shared/validation/docuseal-webhooks'

/**
 * DTO for form.completed event payload
 */
export class FormCompletedPayloadDto extends createZodDto(formCompletedPayloadSchema) {}

/**
 * DTO for submission.completed event payload
 */
export class SubmissionCompletedPayloadDto extends createZodDto(submissionCompletedPayloadSchema) {}
