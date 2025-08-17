import { IsEnum, IsIn } from 'class-validator'
import { PLAN_TYPE, PlanType } from '@repo/shared'

export class PreviewSubscriptionUpdateDto {
	@IsEnum(Object.values(PLAN_TYPE))
	newPlanType!: PlanType

	@IsIn(['monthly', 'annual'])
	newBillingInterval!: 'monthly' | 'annual'
}
