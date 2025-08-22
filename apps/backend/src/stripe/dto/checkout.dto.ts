import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator'
import { PLAN_TYPES } from '@repo/shared'

export class CreateCheckoutDto {
  @IsEnum(Object.values(PLAN_TYPES), {
    message: 'planId must be one of: STARTER, GROWTH, TENANTFLOW_MAX'
  })
  planId!: string

  @IsEnum(['monthly', 'annual'], {
    message: 'interval must be either monthly or annual'
  })
  interval!: 'monthly' | 'annual'

  @IsOptional()
  @IsUrl({}, { message: 'successUrl must be a valid URL' })
  successUrl?: string

  @IsOptional()
  @IsUrl({}, { message: 'cancelUrl must be a valid URL' })
  cancelUrl?: string

  @IsOptional()
  metadata?: Record<string, any>
}

export class CreateEmbeddedCheckoutDto {
  @IsEnum(Object.values(PLAN_TYPES), {
    message: 'planId must be one of: STARTER, GROWTH, TENANTFLOW_MAX'
  })
  planId!: string

  @IsEnum(['monthly', 'annual'], {
    message: 'interval must be either monthly or annual'
  })
  interval!: 'monthly' | 'annual'

  @IsOptional()
  @IsString()
  priceId?: string

  @IsOptional()
  @IsString()
  customerId?: string

  @IsOptional()
  metadata?: Record<string, any>
}

export class CreatePortalDto {
  @IsOptional()
  @IsUrl({}, { message: 'returnUrl must be a valid URL' })
  returnUrl?: string
}
