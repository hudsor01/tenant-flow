'use client'

import { useState, useEffect } from 'react'
import {
	Tour,
	TourPortal,
	TourSpotlight,
	TourStep,
	TourHeader,
	TourTitle,
	TourDescription,
	TourFooter,
	TourPrev,
	TourNext,
	TourSkip,
	TourStepCounter,
	TourClose,
	TourArrow
} from '#components/ui/tour'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { HelpCircle } from 'lucide-react'
import { Button } from '#components/ui/button'
import {
	getTourProgress,
	resetTourProgress,
	updateTourProgress,
	type TourKey
} from '#hooks/api/use-tour-progress'

const TOUR_KEY: TourKey = 'tenant-onboarding'
const TOUR_AUTO_START_DELAY_MS = 1000
const logger = createLogger({ component: 'TenantOnboardingTour' })

interface TenantOnboardingTourProps {
	/** Force show the tour even if previously completed */
	forceShow?: boolean
}

export function TenantOnboardingTour({
	forceShow = false
}: TenantOnboardingTourProps) {
	const [mounted, setMounted] = useState(false)
	const [open, setOpen] = useState(false)
	const [isMobile, setIsMobile] = useState(false)

	// Track client-side mount to prevent hydration mismatch
	useEffect(() => {
		setMounted(true)
	}, [])

	// Detect mobile viewport
	useEffect(() => {
		if (!mounted) return undefined

		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768)
		}

		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [mounted])

	// Check if tour has been completed before
	useEffect(() => {
		if (!mounted) return undefined

		let isActive = true
		let timer: ReturnType<typeof setTimeout> | null = null

		const loadProgress = async () => {
			try {
				const progress = await getTourProgress(TOUR_KEY)
				if (!isActive) return

				const isCompleted =
					progress.status === 'completed' || progress.status === 'skipped'

				if (!isCompleted || forceShow) {
					timer = setTimeout(() => setOpen(true), TOUR_AUTO_START_DELAY_MS)
				}
			} catch (error) {
				logger.error('Failed to load tour progress', { error })
				if (!isActive) return
				if (forceShow) {
					timer = setTimeout(() => setOpen(true), TOUR_AUTO_START_DELAY_MS)
				}
			}
		}

		void loadProgress()

		return () => {
			isActive = false
			if (timer) clearTimeout(timer)
		}
	}, [forceShow, mounted])

	const handleComplete = () => {
		void Promise.resolve(
			updateTourProgress(TOUR_KEY, { status: 'completed' })
		).catch(error => {
			logger.error('Failed to persist tour completion', { error })
		})
		setOpen(false)
	}

	const handleSkip = () => {
		void Promise.resolve(
			updateTourProgress(TOUR_KEY, { status: 'skipped' })
		).catch(error => {
			logger.error('Failed to persist tour skip', { error })
		})
		setOpen(false)
	}

	useEffect(() => {
		if (!open) return

		void Promise.resolve(
			updateTourProgress(TOUR_KEY, { status: 'in_progress' })
		).catch(error => {
			logger.error('Failed to mark tour in progress', { error })
		})
	}, [open])

	// Don't render until mounted on client to prevent hydration mismatch
	if (!mounted) return null

	return (
		<Tour
			open={open}
			onOpenChange={setOpen}
			onComplete={handleComplete}
			onSkip={handleSkip}
			onValueChange={step => {
				if (!open) return
				void Promise.resolve(
					updateTourProgress(TOUR_KEY, {
						status: 'in_progress',
						current_step: step
					})
				).catch(error => {
					logger.error('Failed to persist tour step', { error })
				})
			}}
			stepFooter={
				<TourFooter className="flex-between w-full">
					<TourStepCounter className="text-muted-foreground text-sm" />
					<div className="flex gap-2">
						<TourSkip variant="ghost" size="sm">
							Skip tour
						</TourSkip>
						<TourPrev size="sm" />
						<TourNext size="sm" />
					</div>
				</TourFooter>
			}
		>
			<TourPortal>
				<TourSpotlight />

				{/* Step 1: Welcome / Dashboard Stats */}
				<TourStep target="[data-testid='tenant-dashboard-stats']" side="bottom">
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Welcome to Your Tenant Portal</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'View your lease status, payments, and maintenance requests here.'
								: 'This is your dashboard where you can see your lease status, upcoming payments, and maintenance requests at a glance.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 2: Quick Actions */}
				<TourStep
					target="[data-tour='quick-actions']"
					side={isMobile ? 'bottom' : 'top'}
				>
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Quick Actions</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'Quick shortcuts to pay rent, submit requests, and more.'
								: 'Use these shortcuts to quickly pay rent, submit maintenance requests, view your lease, or update your profile.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 3: Pay Rent */}
				<TourStep
					target="[data-tour='pay-rent']"
					side={isMobile ? 'bottom' : 'right'}
				>
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Pay Rent</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'Make payments with card or bank account. Set up autopay here.'
								: 'Click here to make a rent payment. You can pay with a credit card or bank account, and set up autopay for convenience.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 4: Maintenance */}
				<TourStep
					target="[data-tour='maintenance']"
					side={isMobile ? 'bottom' : 'right'}
				>
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Submit Maintenance Requests</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'Submit and track maintenance requests. Your manager gets notified instantly.'
								: 'Need something fixed? Submit a maintenance request here and track its progress. Your property manager will be notified immediately.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 5: Payment Options */}
				<TourStep
					target="[data-tour='payment-options']"
					side={isMobile ? 'top' : 'bottom'}
				>
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Payment Options</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'Add a payment method for autopay or connect your bank for lower fees.'
								: 'Choose how you want to pay rent. You can add a payment method for quick autopay, or connect your bank directly for lower fees. Both options are secure and easy to use.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 6: Recent Activity */}
				<TourStep target="[data-tour='recent-activity']" side="top">
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Track Your Activity</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? "View recent payments and requests. You're all set!"
								: "View your recent payments and maintenance requests here. You're all set! Explore your portal anytime."}
						</TourDescription>
					</TourHeader>
				</TourStep>
			</TourPortal>
		</Tour>
	)
}

/** Button to restart the tour manually */
export function TenantTourTrigger() {
	const [open, setOpen] = useState(false)

	const startTour = () => {
		void resetTourProgress(TOUR_KEY).catch(error => {
			logger.error('Failed to reset tour progress', { error })
		})
		setOpen(true)
	}

	return (
		<>
			<Button variant="ghost" size="sm" onClick={startTour} className="gap-2">
				<HelpCircle className="size-4" />
				Take a Tour
			</Button>

			{open && <TenantOnboardingTour forceShow />}
		</>
	)
}
