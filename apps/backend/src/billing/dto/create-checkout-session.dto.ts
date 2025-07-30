import { IsEnum, IsOptional, IsString, IsIn } from 'class-validator'
import { PlanType } from '@prisma/client'

export class CreateCheckoutSessionDto {
  @IsEnum(PlanType)
  planType!: PlanType

  @IsIn(['monthly', 'annual'])
  billingInterval!: 'monthly' | 'annual'

  @IsOptional()
  @IsString()
  successUrl?: string

  @IsOptional()
  @IsString()
  cancelUrl?: string

  @IsOptional()
  @IsString()
  couponId?: string
}