import { useCallback } from 'react'
import {
	trackPricingPageView,
	trackInitiateCheckout,
	trackPlanSelection,
	trackViewContent,
	trackCustomEvent,
	trackPurchase,
	trackCompleteRegistration,
	trackLead,
	trackAddToCart,
	trackSearch,
	trackStartTrial
} from '@/lib/facebook-pixel'

export const useFacebookPixel = () => {
	const trackPricingPageViewCallback = useCallback(
		(planSelected?: string, billingPeriod?: string) => {
			trackPricingPageView(planSelected, billingPeriod)
		},
		[]
	)

	const trackInitiateCheckoutCallback = useCallback(
		(value: number, currency = 'USD', contentIds?: string[]) => {
			trackInitiateCheckout(value, currency, contentIds)
		},
		[]
	)

	const trackPlanSelectionCallback = useCallback(
		(
			planId: string,
			planName: string,
			price: number,
			billingPeriod: string
		) => {
			trackPlanSelection(planId, planName, price, billingPeriod)
		},
		[]
	)

	const trackViewContentCallback = useCallback(
		(contentName: string, contentType = 'product', value?: number) => {
			trackViewContent(contentName, contentType, value)
		},
		[]
	)

	const trackCustomEventCallback = useCallback(
		(
			eventName: string,
			parameters: Record<string, string | number | boolean> = {}
		) => {
			trackCustomEvent(eventName, parameters)
		},
		[]
	)

	const trackPurchaseCallback = useCallback(
		(value: number, currency = 'USD', contentIds?: string[]) => {
			trackPurchase(value, currency, contentIds)
		},
		[]
	)

	const trackCompleteRegistrationCallback = useCallback(
		(registrationMethod?: string) => {
			trackCompleteRegistration(registrationMethod)
		},
		[]
	)

	const trackLeadCallback = useCallback(
		(contentName?: string, value?: number) => {
			trackLead(contentName, value)
		},
		[]
	)

	const trackAddToCartCallback = useCallback(
		(contentName: string, value: number, currency = 'USD') => {
			trackAddToCart(contentName, value, currency)
		},
		[]
	)

	const trackSearchCallback = useCallback(
		(searchTerm: string, contentCategory?: string) => {
			trackSearch(searchTerm, contentCategory)
		},
		[]
	)

	const trackStartTrialCallback = useCallback(
		(trialType: string, value?: number) => {
			trackStartTrial(trialType, value)
		},
		[]
	)

	return {
		trackPricingPageView: trackPricingPageViewCallback,
		trackInitiateCheckout: trackInitiateCheckoutCallback,
		trackPlanSelection: trackPlanSelectionCallback,
		trackViewContent: trackViewContentCallback,
		trackCustomEvent: trackCustomEventCallback,
		trackPurchase: trackPurchaseCallback,
		trackCompleteRegistration: trackCompleteRegistrationCallback,
		trackLead: trackLeadCallback,
		trackAddToCart: trackAddToCartCallback,
		trackSearch: trackSearchCallback,
		trackStartTrial: trackStartTrialCallback
	}
}
