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
import { HelpCircle } from 'lucide-react'
import { Button } from '#components/ui/button'

const TOUR_STORAGE_KEY = 'tenant-onboarding-tour-completed'

interface TenantOnboardingTourProps {
	/** Force show the tour even if previously completed */
	forceShow?: boolean
}

export function TenantOnboardingTour({
	forceShow = false
}: TenantOnboardingTourProps) {
	const [open, setOpen] = useState(false)
	const [_hasCheckedStorage, setHasCheckedStorage] = useState(false)
	const [isMobile, setIsMobile] = useState(false)

	// Detect mobile viewport
	useEffect(() => {
		if (typeof window === 'undefined') return undefined

		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768)
		}

		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	// Check if tour has been completed before
	useEffect(() => {
		if (typeof window === 'undefined') return undefined

		const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY)
		if (!tourCompleted || forceShow) {
			// Delay tour start to allow page to render
			const timer = setTimeout(() => setOpen(true), 1000)
			return () => clearTimeout(timer)
		}
		setHasCheckedStorage(true)
		return undefined
	}, [forceShow])

	const handleComplete = () => {
		localStorage.setItem(TOUR_STORAGE_KEY, 'true')
		setOpen(false)
	}

	const handleSkip = () => {
		localStorage.setItem(TOUR_STORAGE_KEY, 'true')
		setOpen(false)
	}

	// Don't render anything during SSR
	if (typeof window === 'undefined') return null

	return (
		<Tour
			open={open}
			onOpenChange={setOpen}
			onComplete={handleComplete}
			onSkip={handleSkip}
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
		localStorage.removeItem(TOUR_STORAGE_KEY)
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
