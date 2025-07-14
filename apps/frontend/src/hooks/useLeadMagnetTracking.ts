/**
 * Lead Magnet Tracking Hook
 * Consolidates tracking across all analytics platforms
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePostHog } from 'posthog-js/react'
import { analytics } from '@/lib/analytics'
import {
	trackGTMLeadMagnetEvent,
	trackGTMFunnelStep,
	trackGTMLeadQuality
} from '@/lib/google-tag-manager'
import { logger } from '@/lib/logger'

interface LeadMagnetTrackingProps {
	userId?: string
	sessionId: string
	userTier: 'FREE_TIER' | 'PRO_TIER'
	source?: string
}

export const useLeadMagnetTracking = ({
	userId,
	sessionId,
	userTier,
	source
}: LeadMagnetTrackingProps) => {
	const posthog = usePostHog()
	const [startTime] = useState(Date.now())
	const [funnelStep, setFunnelStep] = useState(0)
	const hasTrackedView = useRef(false)

	const getTimeOnPage = useCallback(
		() => Math.round((Date.now() - startTime) / 1000),
		[startTime]
	)

	const getBaseProperties = useCallback(
		() => ({
			user_id: userId || '',
			session_id: sessionId,
			user_tier: userTier,
			time_on_page: getTimeOnPage(),
			source: source || 'direct',
			timestamp: new Date().toISOString()
		}),
		[userId, sessionId, userTier, getTimeOnPage, source]
	)

	const trackGeneratorViewed = useCallback(() => {
		const properties = getBaseProperties()

		// Vercel Analytics
		analytics.leadMagnet.generatorViewed(properties)

		// GTM/GA4
		trackGTMLeadMagnetEvent('viewed', {
			user_tier: userTier,
			time_on_page: getTimeOnPage()
		})

		// PostHog (if available)
		posthog?.capture('lead_magnet_generator_viewed', properties)

		// Funnel tracking
		trackGTMFunnelStep('invoice_generator', 'landing', 1, properties)
		setFunnelStep(1)

		logger.userAction('Lead Magnet Viewed', userId, properties)
	}, [posthog, userTier, userId, getBaseProperties, getTimeOnPage])

	// Track page view on mount
	useEffect(() => {
		if (!hasTrackedView.current) {
			trackGeneratorViewed()
			hasTrackedView.current = true
		}
	}, [trackGeneratorViewed]) // Remove trackGeneratorViewed from deps to avoid hoisting issues

	const trackFormStarted = (invoiceData?: {
		businessName?: string
		total?: number
	}) => {
		const properties = {
			...getBaseProperties(),
			invoice_total: invoiceData?.total || 0,
			has_business_name: !!invoiceData?.businessName
		}

		analytics.leadMagnet.formStarted(properties)
		trackGTMLeadMagnetEvent('form_started', {
			invoice_total: invoiceData?.total,
			user_tier: userTier,
			time_on_page: getTimeOnPage()
		})

		posthog?.capture('lead_magnet_form_started', properties)

		trackGTMFunnelStep('invoice_generator', 'form_started', 2, properties)
		setFunnelStep(2)
	}

	const trackFormCompleted = (invoiceData: {
		total: number
		itemCount: number
		hasBusinessEmail: boolean
		hasClientEmail: boolean
	}) => {
		const properties = {
			...getBaseProperties(),
			invoice_total: invoiceData.total,
			item_count: invoiceData.itemCount,
			has_business_email: invoiceData.hasBusinessEmail,
			has_client_email: invoiceData.hasClientEmail
		}

		analytics.leadMagnet.formCompleted(properties)
		trackGTMLeadMagnetEvent('form_completed', {
			invoice_total: invoiceData.total,
			user_tier: userTier,
			time_on_page: getTimeOnPage()
		})

		posthog?.capture('lead_magnet_form_completed', properties)

		trackGTMFunnelStep('invoice_generator', 'form_completed', 3, properties)
		setFunnelStep(3)
	}

	const trackEmailCaptureShown = (invoiceTotal: number) => {
		const properties = {
			...getBaseProperties(),
			invoice_total: invoiceTotal
		}

		analytics.leadMagnet.emailCaptureShown(properties)
		trackGTMLeadMagnetEvent('email_shown', {
			invoice_total: invoiceTotal,
			user_tier: userTier,
			time_on_page: getTimeOnPage()
		})

		posthog?.capture('lead_magnet_email_capture_shown', properties)

		trackGTMFunnelStep(
			'invoice_generator',
			'email_capture_shown',
			4,
			properties
		)
		setFunnelStep(4)
	}

	const trackEmailCaptured = (emailData: {
		email: string
		firstName?: string
		lastName?: string
		invoiceTotal: number
	}) => {
		const emailDomain = emailData.email.split('@')[1]
		const isBusinessEmail = ![
			'gmail.com',
			'yahoo.com',
			'hotmail.com',
			'outlook.com'
		].includes(emailDomain)

		const properties = {
			...getBaseProperties(),
			email_domain: emailDomain,
			is_business_email: isBusinessEmail,
			has_name: !!(emailData.firstName || emailData.lastName),
			invoice_total: emailData.invoiceTotal
		}

		analytics.leadMagnet.emailCaptured(properties)
		trackGTMLeadMagnetEvent('email_captured', {
			invoice_total: emailData.invoiceTotal,
			user_tier: userTier,
			email_domain: emailDomain,
			time_on_page: getTimeOnPage()
		})

		// Lead quality scoring
		const leadScore = calculateLeadScore({
			isBusinessEmail,
			invoiceTotal: emailData.invoiceTotal,
			timeOnPage: getTimeOnPage(),
			hasName: !!(emailData.firstName || emailData.lastName)
		})

		trackGTMLeadQuality(emailData.email, leadScore, {
			company_email: isBusinessEmail,
			invoice_value: emailData.invoiceTotal,
			completion_time: getTimeOnPage(),
			engagement_score: funnelStep
		})

		posthog?.capture('lead_magnet_email_captured', properties)
		posthog?.identify(emailData.email, {
			email: emailData.email,
			firstName: emailData.firstName,
			lastName: emailData.lastName,
			lead_source: 'invoice_generator',
			lead_score: leadScore,
			first_invoice_total: emailData.invoiceTotal
		})

		trackGTMFunnelStep('invoice_generator', 'email_captured', 5, properties)
		setFunnelStep(5)

		logger.userAction('Lead Captured', emailData.email, properties)
	}

	const trackPDFDownloaded = (invoiceData: {
		invoiceNumber: string
		total: number
		email: string
	}) => {
		const properties = {
			...getBaseProperties(),
			invoice_number: invoiceData.invoiceNumber,
			invoice_total: invoiceData.total,
			email: invoiceData.email
		}

		analytics.leadMagnet.pdfDownloaded(properties)
		trackGTMLeadMagnetEvent('downloaded', {
			invoice_total: invoiceData.total,
			user_tier: userTier,
			time_on_page: getTimeOnPage()
		})

		posthog?.capture('lead_magnet_pdf_downloaded', properties)

		trackGTMFunnelStep('invoice_generator', 'pdf_downloaded', 6, properties)
		setFunnelStep(6)
	}

	const trackUpgradeClicked = (
		context: 'usage_limit' | 'watermark' | 'cta_button'
	) => {
		const properties = {
			...getBaseProperties(),
			upgrade_context: context
		}

		analytics.leadMagnet.upgradeClicked(properties)
		trackGTMLeadMagnetEvent('upgrade_clicked', {
			user_tier: userTier,
			time_on_page: getTimeOnPage()
		})

		posthog?.capture('lead_magnet_upgrade_clicked', properties)

		logger.userAction('Upgrade Clicked', userId, properties)
	}

	const trackUsageLimitReached = (currentUsage: number, limit: number) => {
		const properties = {
			...getBaseProperties(),
			current_usage: currentUsage,
			usage_limit: limit,
			usage_percentage: (currentUsage / limit) * 100
		}

		analytics.leadMagnet.usageLimitReached(properties)

		posthog?.capture('lead_magnet_usage_limit_reached', properties)

		logger.userAction('Usage Limit Reached', userId, properties)
	}

	return {
		trackFormStarted,
		trackFormCompleted,
		trackEmailCaptureShown,
		trackEmailCaptured,
		trackPDFDownloaded,
		trackUpgradeClicked,
		trackUsageLimitReached,
		currentFunnelStep: funnelStep,
		timeOnPage: getTimeOnPage()
	}
}

// Lead scoring algorithm
function calculateLeadScore({
	isBusinessEmail,
	invoiceTotal,
	timeOnPage,
	hasName
}: {
	isBusinessEmail: boolean
	invoiceTotal: number
	timeOnPage: number
	hasName: boolean
}): number {
	let score = 0

	// Email quality (30 points max)
	if (isBusinessEmail) score += 30
	else score += 10

	// Invoice value (40 points max)
	if (invoiceTotal > 1000) score += 40
	else if (invoiceTotal > 500) score += 30
	else if (invoiceTotal > 100) score += 20
	else score += 10

	// Engagement (20 points max)
	if (timeOnPage > 300)
		score += 20 // 5+ minutes
	else if (timeOnPage > 120)
		score += 15 // 2+ minutes
	else if (timeOnPage > 60)
		score += 10 // 1+ minute
	else score += 5

	// Profile completeness (10 points max)
	if (hasName) score += 10
	else score += 5

	return Math.min(score, 100)
}
