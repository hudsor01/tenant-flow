/**
 * Lease Generation DTO using nestjs-zod
 *
 * **Pattern**: Zod Schema → createZodDto → NestJS DTO
 * - Runtime validation via ZodValidationPipe (globally configured in app.module.ts)
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
import { leaseGenerationSchema } from '@repo/shared/validation/lease-generation.schemas'

/**
 * Lease Generation DTO
 *
 * Generated from Zod schema using createZodDto()
 * - Provides runtime validation via ZodValidationPipe
 * - Preserves TypeScript type information (no type assertions)
 * - Compatible with @Body() decorator in NestJS controllers
 *
 * **Note**: Field names like "ownerName", "ownerAddress", and "ownerPhone" use
 * owner-centric terminology as defined in the schema.
 *
 * @example
 * ```typescript
 * @Post('generate')
 * async generateLease(@Body() dto: LeaseGenerationDto) {
 *   // dto is fully typed and validated - no `as` needed!
 *   const { propertyAddress, tenantName } = dto
 * }
 * ```
 */
export class LeaseGenerationDto extends createZodDto(leaseGenerationSchema) {}


