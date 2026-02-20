import { createZodDto } from 'nestjs-zod'
import { unitUpdateSchema } from '@repo/shared/validation/units'

/**
 * DTO for updating a unit
 * Wraps shared schema (single source of truth) per CLAUDE.md guidelines
 * All fields optional for PATCH semantics
 */
export class UpdateUnitDto extends createZodDto(unitUpdateSchema) {}
