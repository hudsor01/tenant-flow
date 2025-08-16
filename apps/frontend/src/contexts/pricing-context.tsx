'use client'

import { createContext, useContext, type ReactNode, useMemo } from 'react'
import { usePricingPageData } from '@/hooks/use-pricing-page-data'
import { useUserSubscriptionContext } from '@/hooks/use-user-subscription-context'
import { useAuth } from '@/hooks/use-auth'
import type { PlanType } from '@repo/shared'

interface UsageData {
	properties: number
	units: number
	tenants: number
	teamMembers: number
}

interface LimitsData {
	properties: number
	units: number
	tenants: number
	teamMembers: number
}

interface Recommendation {
	plan: string
	reason: string
	urgency: 'high' | 'medium' | 'low'
	savings?: number
	benefits?: string[]
}

interface PricingContextValue {
	// Current user's plan and subscription
	currentPlan: PlanType | null
	subscription: unknown | null

	// Usage data with proper field names
	usage: UsageData
	limits: LimitsData

	// Recommendations
	recommendations: Recommendation[]

	// Loading states
	isLoading: boolean
	error: Error | null

	// Pricing data
	pricingData: ReturnType<typeof usePricingPageData>['data'] | null
}

const PricingContext = createContext<PricingContextValue | undefined>(undefined)

export function PricingProvider({ children }: { children: ReactNode }) {
	const _auth = useAuth()
	const {
		data: pricingData,
		isLoading: pricingLoading,
		error: pricingError
	} = usePricingPageData()
	const {
		data: userContext,
		isLoading: contextLoading,
		error: contextError
	} = useUserSubscriptionContext()

	const contextValue = useMemo<PricingContextValue>(() => {
		// Transform usage data to match component expectations
		const usage: UsageData = {
			properties:
				userContext?.usage.properties ??
				pricingData?.usage.properties ??
				0,
			units: userContext?.usage.units ?? pricingData?.usage.units ?? 0,
			tenants: userContext?.usage.users ?? pricingData?.usage.users ?? 0,
			teamMembers:
				userContext?.usage.users ?? pricingData?.usage.users ?? 0
		}

		// Get limits based on current plan or defaults
		const currentPlan =
			userContext?.planType ??
			pricingData?.subscription?.plan_type ??
			'FREETRIAL'
		const limits: LimitsData = {
			properties: 10,
			units: 50,
			tenants: 50,
			teamMembers: 3
		}

		// Build recommendations
		const recommendations: Recommendation[] = []
		if (pricingData?.recommendations.suggested) {
			recommendations.push({
				plan: pricingData.recommendations.suggested,
				reason: pricingData.recommendations.urgentUpgrade
					? `You're approaching your ${currentPlan} limits`
					: `Unlock more features with ${pricingData.recommendations.suggested}`,
				urgency: pricingData.recommendations.urgentUpgrade
					? 'high'
					: 'medium',
				savings:
					pricingData.recommendations.annualSavings[
						pricingData.recommendations.suggested
					]
			})
		}

		return {
			currentPlan,
			subscription:
				userContext?.subscription ?? pricingData?.subscription ?? null,
			usage,
			limits,
			recommendations,
			isLoading: pricingLoading || contextLoading,
			error: pricingError || contextError,
			pricingData
		}
	}, [
		pricingData,
		userContext,
		pricingLoading,
		contextLoading,
		pricingError,
		contextError
	])

	return (
		<PricingContext.Provider value={contextValue}>
			{children}
		</PricingContext.Provider>
	)
}

export function usePricingContext() {
	const context = useContext(PricingContext)
	if (context === undefined) {
		throw new Error(
			'usePricingContext must be used within a PricingProvider'
		)
	}
	return context
}
