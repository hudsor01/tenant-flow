/**
 * Minimal Stripe Type Definitions
 *
 * This file contains ONLY the essential types needed by TenantFlow
 * that are not available from the official Stripe SDK.
 *
 * IMPORTANT: Always use official Stripe types directly from 'stripe' package
 * instead of creating duplicate definitions.
 */

/**
 * TenantFlow plan type enumeration
 * Maps to Supabase PlanType enum
 */
export type PlanType = 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'

/**
 * Billing period type for subscriptions
 */
export type BillingPeriod = 'monthly' | 'annual'

/**
 * Alias for compatibility
 */
export type BillingInterval = BillingPeriod

// Webhook Integration Types

/**
 * Webhook event types that TenantFlow processes
 */
export type StripeWebhookEventType =
	| 'customer.subscription.created'
	| 'customer.subscription.updated'
	| 'customer.subscription.deleted'
	| 'invoice.payment_succeeded'
	| 'invoice.payment_failed'
	| 'customer.updated'
	| 'payment_method.attached'
	| 'payment_method.detached'

/**
 * Webhook event interface for TenantFlow processing
 * Uses official Stripe.Event as base
 */
export interface StripeWebhookEvent {
	id: string
	type: StripeWebhookEventType
	data: {
		object: unknown
		previous_attributes?: Record<string, unknown>
	}
}

/**
 * Webhook notification for frontend display
 */
export interface WebhookNotification {
	id: string
	type: 'success' | 'error' | 'info' | 'warning'
	title: string
	message: string
	timestamp: Date
	metadata?: Record<string, unknown>
}

/**
 * Webhook processor function type
 */
export type WebhookProcessorFunction = (
	event: StripeWebhookEvent
) => Promise<WebhookNotification[]>

/**
 * Webhook processor configuration
 */
export interface StripeWebhookProcessor {
	event: StripeWebhookEventType
	processor: WebhookProcessorFunction
}

// Native Stripe Types Usage Guide

/**
 * ALWAYS use native Stripe types from the official SDK:
 *
 * [OK] CORRECT:
 * import type { Stripe } from 'stripe'
 * const paymentMethod: Stripe.PaymentMethod = ...
 * const customer: Stripe.Customer = ...
 * const subscription: Stripe.Subscription = ...
 *
 * [ERROR] DO NOT create custom type duplicates
 *
 * For database PaymentMethod table, use:
 * import type { PaymentMethod } from '#types/supabase'
 */

// Frontend Stripe Product Types
export interface StripePrice {
	id: string
	unit_amount: number
	currency: string
	recurring: {
		interval: 'month' | 'year'
		interval_count: number
	} | null
}

export interface StripeProductWithPricing {
	id: string
	name: string
	description: string | null
	metadata: Record<string, string>
	prices: {
		monthly: StripePrice | null
		annual: StripePrice | null
	}
	defaultPrice: StripePrice | null
}

// Tenant Payment Types

/**
 * Parameters for creating a Stripe Customer for a Tenant
 */
export interface CreateTenantCustomerParams {
	tenant_id: string
	email?: string
	name?: string
	phone?: string
	metadata?: Record<string, string>
}

/**
 * Parameters for attaching a payment method to a Tenant's Stripe Customer
 */
export interface AttachPaymentMethodParams {
	tenant_id: string
	paymentMethodId: string
	setAsDefault?: boolean
}

import type { Json } from './supabase'

/**
 * Enumerates Stripe Identity verification session states we care about.
 * We allow unknown strings to keep the compiler happy if Stripe adds more
 * states in the future.
 */
export type IdentityVerificationStatus =
	| 'created'
	| 'processing'
	| 'requires_input'
	| 'verified'
	| 'canceled'
	| 'expired'
	| 'redacted'
	| (string & {})

/**
 * Represents the identity verification status we store on the user.
 * This type is shared between backend controllers and frontend queries.
 */
export interface IdentityVerificationRecord {
	sessionId: string | null
	status: IdentityVerificationStatus | null
	verifiedAt: string | null
	lastError: string | null
	data: Json | null
}

/**
 * Payload returned when creating or resuming a verification session.
 */
export interface IdentityVerificationSessionPayload {
	sessionId: string
	clientSecret: string
	status: IdentityVerificationStatus
}

/**
 * Stripe-related type definitions
 */

export interface SubscriptionData {
	status: string
	planName: string
	currentPeriodEnd: string
	cancelAtPeriodEnd: boolean
}
