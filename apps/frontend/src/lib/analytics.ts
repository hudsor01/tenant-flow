import { track } from '@vercel/analytics'
import type { AnalyticsEventData } from '@tenantflow/shared/types/analytics'

export const analytics = {
	// Page view tracking
	page: (name: string, properties?: AnalyticsEventData) => {
		track('page_view', {
			page: name,
			...properties
		})
	},

	// User interactions
	click: (element: string, properties?: AnalyticsEventData) => {
		track('click', {
			element,
			...properties
		})
	},

	// Invoice specific events
	invoice: {
		created: (properties?: AnalyticsEventData) => {
			track('invoice_created', properties)
		},
		downloaded: (properties?: AnalyticsEventData) => {
			track('invoice_downloaded', properties)
		},
		previewed: (properties?: AnalyticsEventData) => {
			track('invoice_previewed', properties)
		}
	},

	// Lead Magnet Events for Invoice Generator
	leadMagnet: {
		// Funnel tracking
		generatorViewed: (properties?: AnalyticsEventData) => {
			track('lead_magnet_generator_viewed', {
				funnel_step: 'awareness',
				lead_magnet_type: 'invoice_generator',
				...properties
			})
		},

		formStarted: (properties?: AnalyticsEventData) => {
			track('lead_magnet_form_started', {
				funnel_step: 'interest',
				lead_magnet_type: 'invoice_generator',
				...properties
			})
		},

		formCompleted: (properties?: AnalyticsEventData) => {
			track('lead_magnet_form_completed', {
				funnel_step: 'consideration',
				lead_magnet_type: 'invoice_generator',
				...properties
			})
		},

		emailCaptureShown: (properties?: AnalyticsEventData) => {
			track('lead_magnet_email_capture_shown', {
				funnel_step: 'intent',
				lead_magnet_type: 'invoice_generator',
				...properties
			})
		},

		emailCaptured: (properties?: AnalyticsEventData) => {
			track('lead_magnet_email_captured', {
				funnel_step: 'conversion',
				lead_magnet_type: 'invoice_generator',
				...properties
			})
		},

		pdfDownloaded: (properties?: AnalyticsEventData) => {
			track('lead_magnet_pdf_downloaded', {
				funnel_step: 'fulfillment',
				lead_magnet_type: 'invoice_generator',
				...properties
			})
		},

		upgradeClicked: (properties?: AnalyticsEventData) => {
			track('lead_magnet_upgrade_clicked', {
				funnel_step: 'monetization',
				lead_magnet_type: 'invoice_generator',
				...properties
			})
		},

		usageLimitReached: (properties?: AnalyticsEventData) => {
			track('lead_magnet_usage_limit_reached', {
				funnel_step: 'friction',
				lead_magnet_type: 'invoice_generator',
				...properties
			})
		}
	},

	// Property management events
	property: {
		created: (properties?: AnalyticsEventData) => {
			track('property_created', properties)
		},
		updated: (properties?: AnalyticsEventData) => {
			track('property_updated', properties)
		},
		deleted: (properties?: AnalyticsEventData) => {
			track('property_deleted', properties)
		}
	},

	// Tenant management events
	tenant: {
		invited: (properties?: AnalyticsEventData) => {
			track('tenant_invited', properties)
		},
		added: (properties?: AnalyticsEventData) => {
			track('tenant_added', properties)
		},
		removed: (properties?: AnalyticsEventData) => {
			track('tenant_removed', properties)
		}
	},

	// Payment events
	payment: {
		initiated: (properties?: AnalyticsEventData) => {
			track('payment_initiated', properties)
		},
		completed: (properties?: AnalyticsEventData) => {
			track('payment_completed', properties)
		},
		failed: (properties?: AnalyticsEventData) => {
			track('payment_failed', properties)
		}
	},

	// Auth events
	auth: {
		signup: (properties?: AnalyticsEventData) => {
			track('user_signup', properties)
		},
		login: (properties?: AnalyticsEventData) => {
			track('user_login', properties)
		},
		logout: (properties?: AnalyticsEventData) => {
			track('user_logout', properties)
		}
	},

	// Feature usage
	feature: {
		used: (featureName: string, properties?: AnalyticsEventData) => {
			track('feature_used', {
				feature: featureName,
				...properties
			})
		}
	},

	// Error tracking
	error: (errorType: string, properties?: AnalyticsEventData) => {
		track('error_occurred', {
			error_type: errorType,
			...properties
		})
	}
}

// Hook for easy analytics usage in components
export const useAnalytics = () => {
	return analytics
}
