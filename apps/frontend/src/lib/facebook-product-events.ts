// Facebook Pixel interface for type safety
interface FacebookPixel {
	track: (
		eventName: string,
		parameters?: Record<string, string | number>
	) => void
}

interface WindowWithFbq extends Window {
	fbq?: FacebookPixel
}

declare const window: WindowWithFbq

/**
 * Facebook Dynamic Product Ads Events
 * These functions help Facebook understand user behavior for retargeting
 */
export const FacebookProductEvents = {
	// When user views pricing page
	viewCategory: () => {
		if (typeof window !== 'undefined' && window.fbq) {
			window.fbq.track('ViewCategory', {
				content_category: 'Property Management Software',
				content_name: 'TenantFlow Pricing Plans'
			})
		}
	},

	// When user selects a specific plan
	viewContent: (planId: string, planName: string, price: number) => {
		if (typeof window !== 'undefined' && window.fbq) {
			window.fbq.track('ViewContent', {
				content_ids: planId,
				content_name: planName,
				content_type: 'product',
				value: price,
				currency: 'USD'
			})
		}
	},

	// When user adds plan to cart (clicks subscribe)
	addToCart: (planId: string, planName: string, price: number) => {
		if (typeof window !== 'undefined' && window.fbq) {
			window.fbq.track('AddToCart', {
				content_ids: planId,
				content_name: planName,
				content_type: 'product',
				value: price,
				currency: 'USD'
			})
		}
	},

	// When user initiates checkout
	initiateCheckout: (planId: string, planName: string, price: number) => {
		if (typeof window !== 'undefined' && window.fbq) {
			window.fbq.track('InitiateCheckout', {
				content_ids: planId,
				content_name: planName,
				content_type: 'product',
				value: price,
				currency: 'USD',
				num_items: 1
			})
		}
	},

	// When user completes purchase
	purchase: (
		planId: string,
		planName: string,
		price: number,
		subscriptionId: string
	) => {
		if (typeof window !== 'undefined' && window.fbq) {
			window.fbq.track('Purchase', {
				content_ids: planId,
				content_name: planName,
				content_type: 'product',
				value: price,
				currency: 'USD',
				transaction_id: subscriptionId
			})
		}
	},

	// When user starts trial
	startTrial: (planId: string, planName: string, trialValue: number) => {
		if (typeof window !== 'undefined' && window.fbq) {
			window.fbq.track('StartTrial', {
				content_ids: planId,
				content_name: planName,
				predicted_ltv: trialValue,
				currency: 'USD'
			})
		}
	},

	// When user signs up (lead generation)
	lead: (source = 'organic') => {
		if (typeof window !== 'undefined' && window.fbq) {
			window.fbq.track('Lead', {
				content_name: 'TenantFlow Signup',
				content_category: 'Property Management Software',
				source: source
			})
		}
	},

	// When user completes registration
	completeRegistration: (method = 'email') => {
		if (typeof window !== 'undefined' && window.fbq) {
			window.fbq.track('CompleteRegistration', {
				content_name: 'TenantFlow Account Created',
				registration_method: method
			})
		}
	}
}
