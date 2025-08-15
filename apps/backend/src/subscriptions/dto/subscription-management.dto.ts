import { IsEnum, IsOptional, IsString, MaxLength, IsIn } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { PlanType } from '@repo/database'
import type { ProrationBehavior, BillingPeriod } from '@repo/shared/types/stripe'

/**
 * Validation DTO for subscription upgrade requests
 * Aligned with Stripe Subscriptions API specifications
 */
export class UpgradeRequestDto {
  @ApiProperty({
    description: 'Target plan for the upgrade',
    enum: ['STARTER', 'GROWTH', 'TENANTFLOW_MAX'],
    example: 'GROWTH'
  })
  @IsEnum(['STARTER', 'GROWTH', 'TENANTFLOW_MAX'], {
    message: 'targetPlan must be one of: STARTER, GROWTH, TENANTFLOW_MAX'
  })
  targetPlan: PlanType = "FREETRIAL"

  @ApiProperty({
    description: 'Billing cycle for the subscription',
    enum: ['monthly', 'annual'],
    example: 'monthly'
  })
  @IsIn(['monthly', 'annual'], {
    message: 'billingCycle must be either monthly or annual'
  })
  billingCycle: BillingPeriod = "monthly"

  @ApiPropertyOptional({
    description: 'Proration behavior for the upgrade',
    enum: ['create_prorations', 'none', 'always_invoice'],
    default: 'create_prorations',
    example: 'create_prorations'
  })
  @IsOptional()
  @IsIn(['create_prorations', 'none', 'always_invoice'], {
    message: 'prorationBehavior must be one of: create_prorations, none, always_invoice'
  })
  prorationBehavior?: ProrationBehavior
}

/**
 * Validation DTO for subscription downgrade requests
 * Aligned with Stripe Subscriptions API specifications
 */
export class DowngradeRequestDto {
  @ApiProperty({
    description: 'Target plan for the downgrade',
    enum: ['FREETRIAL', 'STARTER', 'GROWTH'],
    example: 'STARTER'
  })
  @IsEnum(['FREETRIAL', 'STARTER', 'GROWTH'], {
    message: 'targetPlan must be one of: FREETRIAL, STARTER, GROWTH'
  })
  targetPlan: PlanType = "FREETRIAL"

  @ApiProperty({
    description: 'Billing cycle for the subscription',
    enum: ['monthly', 'annual'],
    example: 'monthly'
  })
  @IsIn(['monthly', 'annual'], {
    message: 'billingCycle must be either monthly or annual'
  })
  billingCycle: BillingPeriod = "monthly"

  @ApiPropertyOptional({
    description: 'When the downgrade should take effect',
    enum: ['immediate', 'end_of_period'],
    default: 'end_of_period',
    example: 'end_of_period'
  })
  @IsOptional()
  @IsIn(['immediate', 'end_of_period'], {
    message: 'effectiveDate must be either immediate or end_of_period'
  })
  effectiveDate?: 'immediate' | 'end_of_period'

  @ApiPropertyOptional({
    description: 'Reason for downgrading (max 500 characters)',
    maxLength: 500,
    example: 'Reducing usage requirements'
  })
  @IsOptional()
  @IsString({
    message: 'reason must be a string'
  })
  @MaxLength(500, {
    message: 'reason cannot exceed 500 characters'
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  reason?: string
}

/**
 * Validation DTO for subscription cancellation requests
 * Aligned with Stripe Subscriptions API specifications
 */
export class CancelRequestDto {
  @ApiProperty({
    description: 'When the cancellation should take effect',
    enum: ['immediate', 'end_of_period'],
    example: 'end_of_period'
  })
  @IsIn(['immediate', 'end_of_period'], {
    message: 'cancelAt must be either immediate or end_of_period'
  })
  cancelAt: 'immediate' | 'end_of_period' = "immediate"

  @ApiPropertyOptional({
    description: 'Reason for cancellation (max 500 characters)',
    maxLength: 500,
    example: 'No longer needed'
  })
  @IsOptional()
  @IsString({
    message: 'reason must be a string'
  })
  @MaxLength(500, {
    message: 'reason cannot exceed 500 characters'
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  reason?: string

  @ApiPropertyOptional({
    description: 'Additional feedback for cancellation (max 1000 characters)',
    maxLength: 1000,
    example: 'The service was good but too expensive for our current needs'
  })
  @IsOptional()
  @IsString({
    message: 'feedback must be a string'
  })
  @MaxLength(1000, {
    message: 'feedback cannot exceed 1000 characters'
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  feedback?: string
}

/**
 * Validation DTO for checkout session creation
 * Aligned with Stripe Checkout API specifications
 */
export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Plan type for the new subscription',
    enum: ['STARTER', 'GROWTH', 'TENANTFLOW_MAX'],
    example: 'STARTER'
  })
  @IsEnum(['STARTER', 'GROWTH', 'TENANTFLOW_MAX'], {
    message: 'planType must be one of: STARTER, GROWTH, TENANTFLOW_MAX'
  })
  planType: PlanType = "FREETRIAL"

  @ApiProperty({
    description: 'Billing cycle for the subscription',
    enum: ['monthly', 'annual'],
    example: 'monthly'
  })
  @IsIn(['monthly', 'annual'], {
    message: 'billingCycle must be either monthly or annual'
  })
  billingCycle: BillingPeriod = "monthly"

  @ApiProperty({
    description: 'URL to redirect to after successful payment',
    example: 'https://app.tenantflow.app/dashboard?success=true'
  })
  @IsString({
    message: 'successUrl must be a string'
  })
  @MaxLength(2000, {
    message: 'successUrl cannot exceed 2000 characters'
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  successUrl!: string

  @ApiProperty({
    description: 'URL to redirect to if payment is cancelled',
    example: 'https://app.tenantflow.app/pricing?cancelled=true'
  })
  @IsString({
    message: 'cancelUrl must be a string'
  })
  @MaxLength(2000, {
    message: 'cancelUrl cannot exceed 2000 characters'
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  cancelUrl!: string
}

/**
 * Validation DTO for plan change preview requests
 * Aligned with Stripe API specifications
 */
export class PreviewPlanChangeDto {
  @ApiProperty({
    description: 'Target plan for the preview',
    enum: ['STARTER', 'GROWTH', 'TENANTFLOW_MAX'],
    example: 'GROWTH'
  })
  @IsEnum(['STARTER', 'GROWTH', 'TENANTFLOW_MAX'], {
    message: 'targetPlan must be one of: STARTER, GROWTH, TENANTFLOW_MAX'
  })
  targetPlan: 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX' = "STARTER"

  @ApiProperty({
    description: 'Billing cycle for the subscription',
    enum: ['monthly', 'annual'],
    example: 'monthly'
  })
  @IsIn(['monthly', 'annual'], {
    message: 'billingCycle must be either monthly or annual'
  })
  billingCycle: BillingPeriod = "monthly"
}