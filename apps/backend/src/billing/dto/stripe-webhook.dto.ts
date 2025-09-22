/**
 * Strategic DTOs for External API Boundaries
 *
 * These DTOs provide type safety for external data sources where we don't control the schema.
 * Internal APIs continue using shared types directly for maximum simplicity.
 */

import { IsString, IsObject, IsOptional, IsEnum, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

// Stripe webhook event types we handle
export enum StripeWebhookEventType {
	CUSTOMER_SUBSCRIPTION_CREATED = 'customer.subscription.created',
	CUSTOMER_SUBSCRIPTION_UPDATED = 'customer.subscription.updated',
	CUSTOMER_SUBSCRIPTION_DELETED = 'customer.subscription.deleted',
	CUSTOMER_CREATED = 'customer.created',
	CUSTOMER_UPDATED = 'customer.updated',
	INVOICE_PAYMENT_SUCCEEDED = 'invoice.payment_succeeded',
	INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
	CHECKOUT_SESSION_COMPLETED = 'checkout.session.completed'
}

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