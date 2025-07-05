import ReactPixel from 'react-facebook-pixel'

// Facebook Pixel configuration
export const initFacebookPixel = () => {
	const pixelId = import.meta.env.VITE_FACEBOOK_PIXEL_ID

	if (
		typeof window !== 'undefined' &&
		pixelId &&
		pixelId !== 'YOUR_FACEBOOK_PIXEL_ID'
	) {
		ReactPixel.init(pixelId, undefined, {
			autoConfig: true,
			debug: import.meta.env.DEV // Enable debug mode in development
		})

		ReactPixel.pageView() // Track initial page view

		console.log('Facebook Pixel initialized:', pixelId)
	} else if (import.meta.env.DEV) {
		console.log(
			'Facebook Pixel not initialized - missing VITE_FACEBOOK_PIXEL_ID'
		)
	}
}

// Track page views
export const trackPageView = () => {
	if (typeof window !== 'undefined') {
		ReactPixel.pageView()
	}
}

// Standard Events - Facebook's predefined events
export const trackPurchase = (
	value: number,
	currency = 'USD',
	contentIds?: string[]
) => {
	ReactPixel.track('Purchase', {
		value,
		currency,
		content_ids: contentIds,
		content_type: 'product'
	})
}

export const trackCompleteRegistration = (registrationMethod?: string) => {
	ReactPixel.track('CompleteRegistration', {
		registration_method: registrationMethod || 'email'
	})
}

export const trackLead = (contentName?: string, value?: number) => {
	ReactPixel.track('Lead', {
		content_name: contentName,
		value,
		currency: 'USD'
	})
}

export const trackInitiateCheckout = (
	value: number,
	currency = 'USD',
	contentIds?: string[]
) => {
	ReactPixel.track('InitiateCheckout', {
		value,
		currency,
		content_ids: contentIds,
		content_type: 'product'
	})
}

export const trackAddToCart = (
	contentName: string,
	value: number,
	currency = 'USD'
) => {
	ReactPixel.track('AddToCart', {
		content_name: contentName,
		value,
		currency,
		content_type: 'product'
	})
}

export const trackViewContent = (
	contentName: string,
	contentType = 'product',
	value?: number
) => {
	ReactPixel.track('ViewContent', {
		content_name: contentName,
		content_type: contentType,
		value,
		currency: 'USD'
	})
}

export const trackSearch = (searchTerm: string, contentCategory?: string) => {
	ReactPixel.track('Search', {
		search_string: searchTerm,
		content_category: contentCategory
	})
}

export const trackStartTrial = (trialType: string, value?: number) => {
	ReactPixel.track('StartTrial', {
		predicted_ltv: value,
		content_name: trialType,
		currency: 'USD'
	})
}

// Custom Events - TenantFlow specific
export const trackCustomEvent = (
	eventName: string,
	parameters: Record<string, string | number | boolean> = {}
) => {
	ReactPixel.trackCustom(eventName, parameters)
}

export const trackLeaseGenerated = (
	format: string,
	requiresPayment: boolean,
	value?: number
) => {
	trackCustomEvent('LeaseGenerated', {
		format,
		requires_payment: requiresPayment,
		value: value || 0
	})
}

export const trackPricingPageView = (
	planSelected?: string,
	billingPeriod?: string
) => {
	trackCustomEvent('PricingPageView', {
		plan_selected: planSelected || 'none',
		billing_period: billingPeriod || 'monthly'
	})
}

export const trackPlanSelection = (
	planId: string,
	planName: string,
	price: number,
	billingPeriod: string
) => {
	trackCustomEvent('PlanSelected', {
		plan_id: planId,
		plan_name: planName,
		price,
		billing_period: billingPeriod
	})
}

export const trackFeatureUsage = (
	featureName: string,
	featureCategory?: string
) => {
	trackCustomEvent('FeatureUsed', {
		feature_name: featureName,
		feature_category: featureCategory || 'general'
	})
}

export const trackSubscriptionCancellation = (
	planId: string,
	reason?: string
) => {
	trackCustomEvent('SubscriptionCancelled', {
		plan_id: planId,
		cancellation_reason: reason || 'not_specified'
	})
}

export const trackUpgrade = (
	fromPlan: string,
	toPlan: string,
	value: number
) => {
	trackCustomEvent('PlanUpgrade', {
		from_plan: fromPlan,
		to_plan: toPlan,
		value
	})
}

export const trackDowngrade = (fromPlan: string, toPlan: string) => {
	trackCustomEvent('PlanDowngrade', {
		from_plan: fromPlan,
		to_plan: toPlan
	})
}
