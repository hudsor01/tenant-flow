/**
 * DocuSeal Webhook Validation Schemas
 *
 * Validates webhook payloads from self-hosted DocuSeal instance.
 * Used by NestJS backend to validate incoming webhook data.
 */

import { z } from 'zod'
import { emailSchema } from './common.js'

/**
 * Metadata can contain lease_id and other arbitrary string values
 * DocuSeal passes through metadata set when creating the submission
 */
export const docusealMetadataSchema = z
	.record(z.string(), z.string().optional())
	.optional()

/**
 * Payload received when a single submitter completes their signature
 * DocuSeal event: form.completed
 */
export const formCompletedPayloadSchema = z.object({
	id: z.number().int().positive(),
	submission_id: z.number().int().positive(),
	email: emailSchema,
	name: z.string().optional(),
	role: z.string().min(1),
	completed_at: z.string().min(1),
	metadata: docusealMetadataSchema
})

export type FormCompletedPayload = z.infer<typeof formCompletedPayloadSchema>

/**
 * Individual submitter info within a submission
 */
export const docusealSubmitterSchema = z.object({
	email: emailSchema,
	role: z.string().min(1),
	completed_at: z.string().optional()
})

/**
 * Signed document info
 */
export const docusealDocumentSchema = z.object({
	name: z.string().min(1),
	url: z.string().url()
})

/**
 * Payload received when all parties have completed signing
 * DocuSeal event: submission.completed
 */
export const submissionCompletedPayloadSchema = z.object({
	id: z.number().int().positive(),
	status: z.string().min(1),
	completed_at: z.string().min(1),
	submitters: z.array(docusealSubmitterSchema).min(1),
	documents: z.array(docusealDocumentSchema).default([]),
	metadata: docusealMetadataSchema
})

export type SubmissionCompletedPayload = z.infer<
	typeof submissionCompletedPayloadSchema
>
