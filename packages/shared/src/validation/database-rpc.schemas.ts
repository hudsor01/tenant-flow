import { z } from 'zod'

/**
 * Zod schemas for validating database RPC function responses
 * These schemas ensure type safety for Supabase RPC calls
 */

// Generic RPC error schema
export const rpcErrorSchema = z
	.object({
		message: z.string().optional()
	})
	.nullable()
	.optional()

// Generic RPC result wrapper
export const createRpcResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		data: dataSchema.nullable(),
		error: rpcErrorSchema
	})

// Schema for get_user_id_by_stripe_customer RPC response
export const userIdByStripeCustomerSchema = createRpcResultSchema(z.string().uuid())
export type UserIdByStripeCustomerResult = z.infer<
	typeof userIdByStripeCustomerSchema
>

// Schema for activate_tenant_from_auth_user RPC response
// Function returns: SELECT tenant_record.id, activated
export const activateTenantResultSchema = z.array(
	z.object({
		id: z.string().uuid(),
		activated: z.boolean()
	})
)

export type ActivateTenantResult = z.infer<typeof activateTenantResultSchema>

// Schema for property stats RPC response
export const propertyStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	occupied: z.number().int().nonnegative(),
	vacant: z.number().int().nonnegative(),
	occupancyRate: z.number().min(0).max(100),
	totalMonthlyRent: z.number().nonnegative(),
	averageRent: z.number().nonnegative()
})

export type PropertyStatsRpc = z.infer<typeof propertyStatsSchema>

// Zod schemas for database table validation
// These schemas validate data returned from direct table queries

// Stripe Customers table schema
export const stripeCustomerSchema = z.object({
	id: z.string(),
	email: z.string().email().nullable(),
	name: z.string().nullable(),
	phone: z.string().nullable(),
	balance: z.number().nullable(),
	currency: z.string().nullable(),
	delinquent: z.boolean().nullable(),
	description: z.string().nullable(),
	livemode: z.boolean().nullable(),
	metadata: z.any().nullable(), // Json type from Supabase
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable()
})

export type StripeCustomerDBValidated = z.infer<typeof stripeCustomerSchema>

// Stripe Subscriptions table schema
export const stripeSubscriptionSchema = z.object({
	id: z.string(),
	customer_id: z.string().nullable(),
	status: z.string(),
	current_period_start: z.string().nullable(),
	current_period_end: z.string().nullable(),
	cancel_at_period_end: z.boolean().nullable(),
	canceled_at: z.string().nullable(),
	trial_start: z.string().nullable(),
	trial_end: z.string().nullable(),
	metadata: z.any().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable()
})

export type StripeSubscriptionDBValidated = z.infer<typeof stripeSubscriptionSchema>

// Stripe Prices table schema
export const stripePriceSchema = z.object({
	id: z.string(),
	product_id: z.string().nullable(),
	active: z.boolean().nullable(),
	currency: z.string().nullable(),
	unit_amount: z.number().nullable(),
	recurring_interval: z.string().nullable(),
	recurring_interval_count: z.number().nullable(),
	type: z.string().nullable(),
	metadata: z.any().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable()
})

export type StripePriceDBValidated = z.infer<typeof stripePriceSchema>

// Stripe Products table schema
export const stripeProductSchema = z.object({
	id: z.string(),
	name: z.string(),
	active: z.boolean().nullable(),
	description: z.string().nullable(),
	images: z.array(z.string()).nullable(),
	unit_label: z.string().nullable(),
	metadata: z.any().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable()
})

export type StripeProductDBValidated = z.infer<typeof stripeProductSchema>

// Stripe Payment Intents table schema
export const stripePaymentIntentSchema = z.object({
	id: z.string(),
	amount: z.number(),
	currency: z.string().nullable(),
	customer_id: z.string().nullable(),
	status: z.string(),
	description: z.string().nullable(),
	receipt_email: z.string().nullable(),
	metadata: z.any().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable()
})

export type StripePaymentIntentDBValidated = z.infer<typeof stripePaymentIntentSchema>

// Generic array validation helpers
export const createValidatedArray = <T extends z.ZodTypeAny>(schema: T) =>
	z.array(schema)

export const validateDatabaseResponse = <T>(
	data: unknown,
	schema: z.ZodType<T>
): T => {
	const result = schema.safeParse(data)
	if (!result.success) {
		throw new Error(`Database response validation failed: ${result.error.message}`)
	}
	return result.data
}

export const validateProductsData = (data: unknown) => {
	return validateDatabaseResponse(
		data || [],
		createValidatedArray(stripeProductSchema)
	)
}
