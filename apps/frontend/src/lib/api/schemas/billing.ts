import { z } from 'zod'

export const CheckoutSessionResponseSchema = z.object({
	url: z.string(),
	sessionId: z.string().optional()
})

export const PortalSessionResponseSchema = z.object({
	url: z.string()
})

export const SubscriptionResponseSchema = z.object({
	subscription: z.object({
		id: z.string(),
		status: z.string()
	}),
	clientSecret: z.string().optional(),
	requiresAction: z.boolean().optional()
})

export type CheckoutSessionResponse = z.infer<
	typeof CheckoutSessionResponseSchema
>
export type PortalSessionResponse = z.infer<typeof PortalSessionResponseSchema>
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>
