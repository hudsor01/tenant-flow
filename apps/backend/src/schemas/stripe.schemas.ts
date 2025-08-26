/**
 * Stripe/Billing Schemas
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> origin/main
 * JSON Schema definitions for Stripe and billing endpoints.
 * Replaces class-validator DTOs with type-safe schema definitions.
 */

<<<<<<< HEAD
import type { JSONSchema } from '../shared/types/fastify-type-provider'

// Plan ID enum schema based on shared types
const planIdSchema: JSONSchema = {
=======
import { 
	createTypedSchema, 
	schemaRegistry, 
	type TypedJSONSchema 
} from '../shared/types/fastify-type-provider'

// Plan ID enum schema based on shared types
const planIdSchema: TypedJSONSchema = {
>>>>>>> origin/main
	type: 'string',
	enum: ['STARTER', 'GROWTH', 'TENANTFLOW_MAX'],
	description: 'Subscription plan identifier'
}

// Billing interval schema
<<<<<<< HEAD
const billingIntervalSchema: JSONSchema = {
=======
const billingIntervalSchema: TypedJSONSchema = {
>>>>>>> origin/main
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

<<<<<<< HEAD
export const createCheckoutSchema: JSONSchema = {
=======
export const createCheckoutSchema = createTypedSchema<CreateCheckoutRequest>({
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

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

<<<<<<< HEAD
export const createEmbeddedCheckoutSchema: JSONSchema = {
=======
export const createEmbeddedCheckoutSchema = createTypedSchema<CreateEmbeddedCheckoutRequest>({
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Create customer portal session request
 */
export interface CreatePortalRequest {
	returnUrl?: string
}

<<<<<<< HEAD
export const createPortalSchema: JSONSchema = {
=======
export const createPortalSchema = createTypedSchema<CreatePortalRequest>({
>>>>>>> origin/main
	type: 'object',
	additionalProperties: false,
	properties: {
		returnUrl: {
			type: 'string',
			format: 'uri',
			description: 'URL to return to from customer portal'
		}
	}
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Checkout session response
 */
export interface CheckoutResponse {
	sessionId: string
	url?: string
	clientSecret?: string
}

<<<<<<< HEAD
export const checkoutResponseSchema: JSONSchema = {
=======
export const checkoutResponseSchema = createTypedSchema<CheckoutResponse>({
>>>>>>> origin/main
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
<<<<<<< HEAD
}

/**
 * Create subscription with confirmation token request
 */
export interface CreateSubscriptionDto {
	planType: string
	billingInterval: 'monthly' | 'annual'
	confirmationTokenId: string
}

export const createSubscriptionSchema: JSONSchema = {
	type: 'object',
	required: ['planType', 'billingInterval', 'confirmationTokenId'],
	additionalProperties: false,
	properties: {
		planType: planIdSchema,
		billingInterval: billingIntervalSchema,
		confirmationTokenId: {
			type: 'string',
			pattern: '^cnf_[a-zA-Z0-9_]+$',
			description: 'Stripe confirmation token ID for embedded checkout'
		}
	}
}
=======
})
>>>>>>> origin/main

/**
 * Customer portal response
 */
export interface PortalResponse {
	url: string
}

<<<<<<< HEAD
export const portalResponseSchema: JSONSchema = {
=======
export const portalResponseSchema = createTypedSchema<PortalResponse>({
>>>>>>> origin/main
	type: 'object',
	required: ['url'],
	properties: {
		url: {
			type: 'string',
			format: 'uri',
			description: 'Customer portal URL'
		}
	}
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

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

<<<<<<< HEAD
export const subscriptionStatusResponseSchema: JSONSchema = {
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
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

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

<<<<<<< HEAD
export const stripeWebhookEventSchema: JSONSchema = {
	type: 'object',
	required: [
		'id',
		'object',
		'type',
		'created',
		'data',
		'livemode',
		'pending_webhooks',
		'request'
	],
=======
export const stripeWebhookEventSchema = createTypedSchema<StripeWebhookEvent>({
	type: 'object',
	required: ['id', 'object', 'type', 'created', 'data', 'livemode', 'pending_webhooks', 'request'],
>>>>>>> origin/main
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
<<<<<<< HEAD
					description:
						'The object that was created, updated, or deleted'
				},
				previous_attributes: {
					type: 'object',
					description:
						'Previous attributes if this was an update event'
=======
					description: 'The object that was created, updated, or deleted'
				},
				previous_attributes: {
					type: 'object',
					description: 'Previous attributes if this was an update event'
>>>>>>> origin/main
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
<<<<<<< HEAD
}

// Schemas are exported directly for use in NestJS controllers
// No custom registry needed - use Fastify's native addSchema() if sharing is required
=======
})

// Register schemas
schemaRegistry.register('create-checkout', createCheckoutSchema)
schemaRegistry.register('create-embedded-checkout', createEmbeddedCheckoutSchema)
schemaRegistry.register('create-portal', createPortalSchema)
schemaRegistry.register('checkout-response', checkoutResponseSchema)
schemaRegistry.register('portal-response', portalResponseSchema)
schemaRegistry.register('subscription-status-response', subscriptionStatusResponseSchema)
schemaRegistry.register('stripe-webhook-event', stripeWebhookEventSchema)
>>>>>>> origin/main

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
<<<<<<< HEAD
} as const
=======
} as const
>>>>>>> origin/main
