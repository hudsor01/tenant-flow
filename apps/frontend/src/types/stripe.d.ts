declare module '@/types/stripe' {
	export interface SubscriptionData {
		id: string
		status: 'active' | 'canceled' | 'incomplete' | 'past_due'
		current_period_start: number
		current_period_end: number
		planName?: string
		interval?: 'monthly' | 'annual'
		plan: {
			id: string
			amount: number
			currency: string
			interval: 'month' | 'year'
		}
	}
	
	
	export interface StripeEnvironmentConfig {
		publishableKey: string
		webhookSecret?: string
		apiVersion?: string
		prices?: {
			starter_monthly: string
			starter_annual: string
			growth_monthly: string
			growth_annual: string
			max_monthly: string
			max_annual: string
		}
		products?: {
			starter: string
			growth: string
			max: string
		}
	}
}
