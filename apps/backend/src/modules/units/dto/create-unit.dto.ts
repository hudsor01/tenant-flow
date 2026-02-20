import { createZodDto } from 'nestjs-zod'
import { unitInputSchema } from '@repo/shared/validation/units'

/**
 * DTO for creating a unit
 * Wraps shared schema (single source of truth) per CLAUDE.md guidelines
 */
export class CreateUnitDto extends createZodDto(unitInputSchema) {}
