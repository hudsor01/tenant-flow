import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator'
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
	@IsEnum(Object.values(PLAN_TYPE), {
		message: 'planId must be one of: STARTER, GROWTH, TENANTFLOW_MAX'
	})
	planId!: string

	@IsEnum(['monthly', 'annual'], {
		message: 'interval must be either monthly or annual'
	})
	interval!: 'monthly' | 'annual'
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
