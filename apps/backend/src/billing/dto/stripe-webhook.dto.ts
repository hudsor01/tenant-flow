/**
 * Strategic DTOs for External API Boundaries
 *
 * These DTOs provide type safety for external data sources where we don't control the schema.
 * Internal APIs continue using shared types directly for maximum simplicity.
 */

import { StripeWebhookEventType } from '@repo/shared'
import { Type } from 'class-transformer'
import {
	IsEnum,
	IsObject,
	IsOptional,
	IsString,
	ValidateNested
} from 'class-validator'

// Stripe object for webhook payload data
export class StripeWebhookDataDto {
	@IsObject()
	object!: Record<string, unknown>

	@IsOptional()
	@IsObject()
	previous_attributes?: Record<string, unknown>
}

// Main Stripe webhook DTO - validates external Stripe data
export class StripeWebhookDto {
	@IsString()
	id!: string

	@IsEnum(StripeWebhookEventType)
	type!: StripeWebhookEventType

	@ValidateNested()
	@Type(() => StripeWebhookDataDto)
	data!: StripeWebhookDataDto

	@IsString()
	api_version!: string

	@IsString()
	created!: string

	@IsOptional()
	@IsString()
	pending_webhooks?: string

	@IsOptional()
	@IsObject()
	request?: {
		id?: string
		idempotency_key?: string
	}
}
