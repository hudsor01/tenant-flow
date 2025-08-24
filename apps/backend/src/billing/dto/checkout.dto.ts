import { IsEnum, IsNumber, IsObject, IsOptional, IsString, IsUrl, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { PLAN_TYPE } from '@repo/shared'

export class CreateCheckoutDto {
	@IsEnum(Object.values(PLAN_TYPE), {
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
}

export class CreateEmbeddedCheckoutDto {
  @IsString({ message: 'priceId must be a valid string' })
  priceId!: string

  @IsOptional()
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Type(() => Number)
  quantity?: number

  @IsOptional()
  @IsString({ message: 'customerId must be a valid string' })
  customerId?: string

  @IsOptional()
  @IsNumber({}, { message: 'trialPeriodDays must be a number' })
  @Min(0, { message: 'trialPeriodDays cannot be negative' })
  @Type(() => Number)
  trialPeriodDays?: number

  @IsOptional()
  @IsString({ message: 'couponId must be a valid string' })
  couponId?: string

  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, string>
}

export class CreatePortalDto {
	@IsOptional()
	@IsUrl({}, { message: 'returnUrl must be a valid URL' })
	returnUrl?: string
}

export class CreateSubscriptionDto {
	@IsString({ message: 'confirmationTokenId must be a string' })
	confirmationTokenId!: string

	@IsEnum(Object.values(PLAN_TYPE), {
		message: 'planType must be one of: STARTER, GROWTH, TENANTFLOW_MAX'
	})
	planType!: string

	@IsEnum(['month', 'year'], {
		message: 'billingInterval must be either month or year'
	})
	billingInterval!: 'month' | 'year'
}
