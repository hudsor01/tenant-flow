import { createZodDto } from 'nestjs-zod'
import { onboardingUpdateSchema } from '@repo/shared/validation/users'

export class UpdateOnboardingDto extends createZodDto(onboardingUpdateSchema) {}
