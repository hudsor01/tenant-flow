/**
 * Stripe/Billing Schemas
 * 
 * JSON Schema definitions for Stripe and billing endpoints.
 * Replaces class-validator DTOs with type-safe schema definitions.
 */

import { 
	createTypedSchema, 
	schemaRegistry, 
	type TypedJSONSchema 
} from '../shared/types/fastify-type-provider'

// Plan ID enum schema based on shared types
const planIdSchema: TypedJSONSchema = {
	type: 'string',
	enum: ['STARTER', 'GROWTH', 'TENANTFLOW_MAX'],
	description: 'Subscription plan identifier'
}

// Billing interval schema
const billingIntervalSchema: TypedJSONSchema = {
	type: 'string',
	enum: ['monthly', 'annual'],
	description: 'Billing interval for subscription'
}

/**
 * Create checkout session request
 */
export interface CreateCheckoutRequest {
	planId: string
	interval: 'monthly' | 'annual'
	successUrl?: string
	cancelUrl?: string
}

export const createCheckoutSchema = createTypedSchema<CreateCheckoutRequest>({
	type: 'object',
	required: ['planId', 'interval'],
	additionalProperties: false,
	properties: {
		planId: planIdSchema,
		interval: billingIntervalSchema,
		successUrl: {
			type: 'string',
			format: 'uri',
			description: 'URL to redirect to after successful checkout'
		},
		cancelUrl: {
			type: 'string',
			format: 'uri',
			description: 'URL to redirect to after cancelled checkout'
		}
	}
})

/**
 * Create embedded checkout session request
 */
export interface CreateEmbeddedCheckoutRequest {
	priceId: string
	quantity?: number
	customerId?: string
	trialPeriodDays?: number
	couponId?: string
	metadata?: Record<string, string>
}

export const createEmbeddedCheckoutSchema = createTypedSchema<CreateEmbeddedCheckoutRequest>({
	type: 'object',
	required: ['priceId'],
	additionalProperties: false,
	properties: {
		priceId: {
			type: 'string',
			pattern: '^price_[a-zA-Z0-9_]+$',
			description: 'Stripe price ID'
		},
		quantity: {
			type: 'integer',
			minimum: 1,
			maximum: 1000,
			default: 1,
			description: 'Quantity of items to purchase'
		},
		customerId: {
			type: 'string',
			pattern: '^cus_[a-zA-Z0-9_]+$',
			description: 'Existing Stripe customer ID'
		},
		trialPeriodDays: {
			type: 'integer',
			minimum: 0,
			maximum: 365,
			description: 'Number of days for free trial'
		},
		couponId: {
			type: 'string',
			pattern: '^[a-zA-Z0-9_-]+$',
			description: 'Stripe coupon ID to apply'
		},
		metadata: {
			type: 'object',
			additionalProperties: {
				type: 'string'
			},
			maxProperties: 50,
			description: 'Additional metadata for the checkout session'
		}
	}
})

/**
 * Create customer portal session request
 */
export interface CreatePortalRequest {
	returnUrl?: string
}

export const createPortalSchema = createTypedSchema<CreatePortalRequest>({
	type: 'object',
	additionalProperties: false,
	properties: {
		returnUrl: {
			type: 'string',
			format: 'uri',
			description: 'URL to return to from customer portal'
		}
	}
})

/**
 * Checkout session response
 */
export interface CheckoutResponse {
	sessionId: string
	url?: string
	clientSecret?: string
}

export const checkoutResponseSchema = createTypedSchema<CheckoutResponse>({
	type: 'object',
	required: ['sessionId'],
	properties: {
		sessionId: {
			type: 'string',
			pattern: '^cs_[a-zA-Z0-9_]+$',
			description: 'Stripe checkout session ID'
		},
		url: {
			type: 'string',
			format: 'uri',
			description: 'Checkout session URL (for hosted checkout)'
		},
		clientSecret: {
			type: 'string',
			description: 'Client secret for embedded checkout'
		}
	}
})

/**
 * Customer portal response
 */
export interface PortalResponse {
	url: string
}

export const portalResponseSchema = createTypedSchema<PortalResponse>({
	type: 'object',
	required: ['url'],
	properties: {
		url: {
			type: 'string',
			format: 'uri',
			description: 'Customer portal URL'
		}
	}
})

/**
 * Subscription status response
 */
export interface SubscriptionStatusResponse {
	id: string
	status: string
	planId: string
	planName: string
	interval: string
	currentPeriodStart: string
	currentPeriodEnd: string
	cancelAtPeriodEnd: boolean
	trialEnd?: string
	amount: number
	currency: string
}

export const subscriptionStatusResponseSchema = createTypedSchema<SubscriptionStatusResponse>({
	type: 'object',
	required: [
		'id', 
		'status', 
		'planId', 
		'planName', 
		'interval', 
		'currentPeriodStart', 
		'currentPeriodEnd', 
		'cancelAtPeriodEnd', 
		'amount', 
		'currency'
	],
	properties: {
		id: {
			type: 'string',
			pattern: '^sub_[a-zA-Z0-9_]+$',
			description: 'Stripe subscription ID'
		},
		status: {
			type: 'string',
			enum: [
				'incomplete',
				'incomplete_expired',
				'trialing',
				'active',
				'past_due',
				'canceled',
				'unpaid'
			],
			description: 'Current subscription status'
		},
		planId: planIdSchema,
		planName: {
			type: 'string',
			description: 'Human-readable plan name'
		},
		interval: billingIntervalSchema,
		currentPeriodStart: {
			type: 'string',
			format: 'date-time',
			description: 'Start of current billing period'
		},
		currentPeriodEnd: {
			type: 'string',
			format: 'date-time',
			description: 'End of current billing period'
		},
		cancelAtPeriodEnd: {
			type: 'boolean',
			description: 'Whether subscription will cancel at period end'
		},
		trialEnd: {
			type: 'string',
			format: 'date-time',
			description: 'End of trial period if applicable'
		},
		amount: {
			type: 'integer',
			minimum: 0,
			description: 'Subscription amount in cents'
		},
		currency: {
			type: 'string',
			pattern: '^[A-Z]{3}$',
			default: 'USD',
			description: 'Currency code (ISO 4217)'
		}
	}
})

/**
 * Webhook event schema for Stripe webhooks
 */
export interface StripeWebhookEvent {
	id: string
	object: string
	type: string
	created: number
	data: {
		object: Record<string, unknown>
		previous_attributes?: Record<string, unknown>
	}
	livemode: boolean
	pending_webhooks: number
	request: {
		id: string | null
		idempotency_key: string | null
	}
}

export const stripeWebhookEventSchema = createTypedSchema<StripeWebhookEvent>({
	type: 'object',
	required: ['id', 'object', 'type', 'created', 'data', 'livemode', 'pending_webhooks', 'request'],
	properties: {
		id: {
			type: 'string',
			pattern: '^evt_[a-zA-Z0-9_]+$',
			description: 'Stripe event ID'
		},
		object: {
			type: 'string',
			enum: ['event'],
			description: 'Object type (always "event")'
		},
		type: {
			type: 'string',
			description: 'Event type'
		},
		created: {
			type: 'integer',
			description: 'Unix timestamp when event was created'
		},
		data: {
			type: 'object',
			required: ['object'],
			properties: {
				object: {
					type: 'object',
					description: 'The object that was created, updated, or deleted'
				},
				previous_attributes: {
					type: 'object',
					description: 'Previous attributes if this was an update event'
				}
			}
		},
		livemode: {
			type: 'boolean',
			description: 'Whether this event was sent in live mode'
		},
		pending_webhooks: {
			type: 'integer',
			description: 'Number of pending webhook deliveries'
		},
		request: {
			type: 'object',
			required: ['id', 'idempotency_key'],
			properties: {
				id: {
					type: ['string', 'null'],
					description: 'Request ID that created this event'
				},
				idempotency_key: {
					type: ['string', 'null'],
					description: 'Idempotency key for the request'
				}
			}
		}
	}
})

// Register schemas
schemaRegistry.register('create-checkout', createCheckoutSchema)
schemaRegistry.register('create-embedded-checkout', createEmbeddedCheckoutSchema)
schemaRegistry.register('create-portal', createPortalSchema)
schemaRegistry.register('checkout-response', checkoutResponseSchema)
schemaRegistry.register('portal-response', portalResponseSchema)
schemaRegistry.register('subscription-status-response', subscriptionStatusResponseSchema)
schemaRegistry.register('stripe-webhook-event', stripeWebhookEventSchema)

// Export route schemas for controller usage
export const stripeRouteSchemas = {
	createCheckout: {
		body: createCheckoutSchema,
		response: {
			200: checkoutResponseSchema,
			400: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			}
		}
	},
	createEmbeddedCheckout: {
		body: createEmbeddedCheckoutSchema,
		response: {
			200: checkoutResponseSchema
		}
	},
	createPortal: {
		body: createPortalSchema,
		response: {
			200: portalResponseSchema
		}
	},
	getSubscriptionStatus: {
		response: {
			200: subscriptionStatusResponseSchema,
			404: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			}
		}
	},
	stripeWebhook: {
		body: stripeWebhookEventSchema,
		response: {
			200: {
				type: 'object',
				properties: {
					received: { type: 'boolean' }
				}
			}
		}
	}
} as const