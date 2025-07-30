import { IsEnum, IsIn } from 'class-validator'
import { PlanType } from '@prisma/client'

export class PreviewSubscriptionUpdateDto {
  @IsEnum(PlanType)
  newPlanType!: PlanType

  @IsIn(['monthly', 'annual'])
  newBillingInterval!: 'monthly' | 'annual'
}