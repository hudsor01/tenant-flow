import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator'
import { PLAN_TYPE, PlanType } from '@repo/shared'

export class CreateCheckoutSessionDto {
	@IsEnum(Object.values(PLAN_TYPE))
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
