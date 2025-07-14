import { IsString, IsIn, IsOptional } from 'class-validator'

export class CreateSubscriptionDto {
	@IsString()
	planId!: 'freeTrial' | 'starter' | 'growth' | 'enterprise'

	@IsString()
	@IsIn(['monthly', 'annual'])
	billingPeriod: 'monthly' | 'annual' = 'monthly'

	@IsString()
	userId!: string

	@IsOptional()
	@IsString()
	paymentMethodCollection?: 'always' | 'if_required' = 'always'
}