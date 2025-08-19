import { PLAN_TYPE } from '@repo/shared'

export interface BillingPlan {
	id: string
	name: string
	price: number
	propertyLimit: number
	stripePriceId?: string | null
	stripePriceIds: {
		monthly: string | null
		annual: string | null
	}
}

class BillingPlansManager {
	private _plans?: Record<string, BillingPlan>

	get plans(): Record<string, BillingPlan> {
		if (!this._plans) {
			this._plans = {
				[PLAN_TYPE.FREETRIAL]: {
					id: PLAN_TYPE.FREETRIAL,
					name: 'Free Trial',
					price: 0,
					propertyLimit: 2,
					stripePriceId: null,
					stripePriceIds: {
						monthly: null,
						annual: null
					}
				},
				[PLAN_TYPE.STARTER]: {
					id: PLAN_TYPE.STARTER,
					name: 'Starter',
					price: 19,
					propertyLimit: 10,
					stripePriceId: process.env.STRIPE_STARTER_MONTHLY ?? null,
					stripePriceIds: {
						monthly: process.env.STRIPE_STARTER_MONTHLY ?? null,
						annual: process.env.STRIPE_STARTER_ANNUAL ?? null
					}
				},
				[PLAN_TYPE.GROWTH]: {
					id: PLAN_TYPE.GROWTH,
					name: 'Growth',
					price: 49,
					propertyLimit: 50,
					stripePriceId: process.env.STRIPE_GROWTH_MONTHLY ?? null,
					stripePriceIds: {
						monthly: process.env.STRIPE_GROWTH_MONTHLY ?? null,
						annual: process.env.STRIPE_GROWTH_ANNUAL ?? null
					}
				},
				[PLAN_TYPE.TENANTFLOW_MAX]: {
					id: PLAN_TYPE.TENANTFLOW_MAX,
					name: 'TenantFlow Max',
					price: 99,
					propertyLimit: 200,
					stripePriceId: process.env.STRIPE_MAX_MONTHLY ?? null,
					stripePriceIds: {
						monthly: process.env.STRIPE_MAX_MONTHLY ?? null,
						annual: process.env.STRIPE_MAX_ANNUAL ?? null
					}
				}
			}
		}
		return this._plans
	}
}

const billingPlansManager = new BillingPlansManager()

export const getBillingPlans = () => billingPlansManager.plans

export const getPlanById = (planId: string): BillingPlan | undefined => {
	return getBillingPlans()[planId]
}

export const getDefaultPlan = (): BillingPlan => {
	const plan = getBillingPlans()[PLAN_TYPE.FREETRIAL]
	if (!plan) {
		throw new Error('Default plan not found')
	}
	return plan
}
