/**
 * Google Tag Manager Integration
 *
 * Provides typed interface for pushing events to GTM dataLayer
 * Works alongside PostHog and Facebook Pixel for comprehensive tracking
 */

interface GTMEvent {
	event: string
	[key: string]:
		| string
		| number
		| boolean
		| undefined
		| unknown[]
		| Record<string, unknown>
}

interface GTMDataLayer {
	push: (event: GTMEvent) => void
}

declare global {
	interface Window {
		dataLayer: GTMDataLayer
	}
}

/**
 * Initialize Google Tag Manager dataLayer if not already present
 */
export function initGTM(): void {
	if (typeof window !== 'undefined') {
		// Initialize dataLayer if not already present
		if (!window.dataLayer) {
			window.dataLayer = []
		}

		// Get GTM ID from environment
		const gtmId = import.meta.env.VITE_GTM_ID
		if (!gtmId || gtmId === 'YOUR_GTM_ID') {
			console.log(
				'GTM: Container ID not configured, events will be logged only'
			)
			window.dataLayer.push = (event: GTMEvent) => {
				if (import.meta.env.DEV) {
					console.log('GTM Event (dev):', event)
				}
			}
		} else {
			console.log('GTM: Initialized with container ID:', gtmId)
		}
	}
}

/**
 * Push event to GTM dataLayer
 */
export function pushGTMEvent(event: GTMEvent): void {
	if (typeof window !== 'undefined' && window.dataLayer) {
		window.dataLayer.push(event)
	}
}

/**
 * Track page views
 */
export function trackGTMPageView(page: string, title?: string): void {
	pushGTMEvent({
		event: 'page_view',
		page_location: window.location.href,
		page_path: page,
		page_title: title || document.title
	})
}

/**
 * Track user registration
 */
export function trackGTMSignup(method = 'email'): void {
	pushGTMEvent({
		event: 'sign_up',
		method: method
	})
}

/**
 * Track user login
 */
export function trackGTMLogin(method = 'email'): void {
	pushGTMEvent({
		event: 'login',
		method: method
	})
}

/**
 * Track subscription purchase
 */
export function trackGTMPurchase(
	transactionId: string,
	value: number,
	currency = 'USD',
	items: {
		item_id: string
		item_name: string
		price: number
		quantity: number
	}[] = []
): void {
	pushGTMEvent({
		event: 'purchase',
		transaction_id: transactionId,
		value: value,
		currency: currency,
		items: items
	})
}

/**
 * Track trial start
 */
export function trackGTMTrialStart(planName: string, value?: number): void {
	pushGTMEvent({
		event: 'begin_checkout',
		currency: 'USD',
		value: value || 0,
		plan_name: planName
	})
}

/**
 * Track lease generation
 */
export function trackGTMLeaseGenerated(
	state: string,
	outputFormat: string
): void {
	pushGTMEvent({
		event: 'generate_lead',
		lead_type: 'lease_generation',
		state: state,
		output_format: outputFormat
	})
}

/**
 * Track pricing page interactions
 */
export function trackGTMPlanView(planName: string, planPrice: number): void {
	pushGTMEvent({
		event: 'view_item',
		currency: 'USD',
		value: planPrice,
		items: [
			{
				item_id: planName.toLowerCase(),
				item_name: `TenantFlow ${planName} Plan`,
				price: planPrice,
				quantity: 1
			}
		]
	})
}

/**
 * Track custom events
 */
export function trackGTMCustomEvent(
	eventName: string,
	parameters: Record<string, string | number | boolean | undefined> = {}
): void {
	pushGTMEvent({
		event: eventName,
		...parameters
	})
}

/**
 * Track lead magnet funnel events
 */
export function trackGTMLeadMagnetEvent(
	step:
		| 'viewed'
		| 'form_started'
		| 'form_completed'
		| 'email_shown'
		| 'email_captured'
		| 'downloaded'
		| 'upgrade_clicked',
	properties: {
		invoice_total?: number
		user_tier?: string
		usage_count?: number
		email_domain?: string
		time_on_page?: number
	} = {}
): void {
	const eventName = `lead_magnet_${step}`

	pushGTMEvent({
		event: eventName,
		event_category: 'Lead Magnet',
		event_action: step,
		event_label: 'Invoice Generator',
		value: properties.invoice_total || 0,
		custom_map: {
			user_tier: properties.user_tier || 'FREE_TIER',
			usage_count: properties.usage_count || 0,
			email_domain: properties.email_domain,
			time_on_page: properties.time_on_page
		}
	})
}

/**
 * Track conversion funnel progression
 */
export function trackGTMFunnelStep(
	funnel_name: string,
	step_name: string,
	step_number: number,
	properties?: Record<string, string | number | boolean | undefined>
): void {
	pushGTMEvent({
		event: 'funnel_step',
		funnel_name,
		step_name,
		step_number,
		...properties
	})
}

/**
 * Track lead quality scoring
 */
export function trackGTMLeadQuality(
	email: string,
	score: number,
	factors: {
		company_email?: boolean
		invoice_value?: number
		completion_time?: number
		engagement_score?: number
	}
): void {
	pushGTMEvent({
		event: 'lead_quality_scored',
		lead_score: score,
		email_domain: email.split('@')[1],
		is_business_email: factors.company_email || false,
		invoice_value: factors.invoice_value || 0,
		completion_time: factors.completion_time || 0,
		engagement_score: factors.engagement_score || 0
	})
}
