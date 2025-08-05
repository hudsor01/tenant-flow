import { IsEnum, IsIn } from 'class-validator'
import { PlanType } from '@repo/database'

export class PreviewSubscriptionUpdateDto {
  @IsEnum(PlanType)
  newPlanType!: PlanType

  @IsIn(['monthly', 'annual'])
  newBillingInterval!: 'monthly' | 'annual'
}