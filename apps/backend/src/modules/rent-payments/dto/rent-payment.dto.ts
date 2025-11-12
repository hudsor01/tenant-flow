/**
 * Rent Payment DTOs
 * Uses nestjs-zod to create DTOs from Zod schemas for automatic validation
 */

import { createZodDto } from 'nestjs-zod'
import {
	createRentPaymentSchema,
	setupAutopaySchema,
	cancelAutopaySchema
} from '@repo/shared/validation/rent-payments'

/**
 * DTO for creating a one-time rent payment
 * Validated with Zod schema via ZodValidationPipe
 */
export class CreateRentPaymentDto extends createZodDto(
	createRentPaymentSchema
) {}

/**
 * DTO for setting up autopay (recurring rent subscription)
 * Validated with Zod schema via ZodValidationPipe
 */
export class SetupAutopayDto extends createZodDto(setupAutopaySchema) {}

/**
 * DTO for canceling autopay
 * Validated with Zod schema via ZodValidationPipe
 */
export class CancelAutopayDto extends createZodDto(cancelAutopaySchema) {}
