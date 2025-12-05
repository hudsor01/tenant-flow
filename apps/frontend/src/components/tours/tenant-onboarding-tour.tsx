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
	TourArrow,
} from '#components/ui/tour'
import { HelpCircle } from 'lucide-react'
import { Button } from '#components/ui/button'

const TOUR_STORAGE_KEY = 'tenant-onboarding-tour-completed'

interface TenantOnboardingTourProps {
	/** Force show the tour even if previously completed */
	forceShow?: boolean
}

export function TenantOnboardingTour({ forceShow = false }: TenantOnboardingTourProps) {
	const [open, setOpen] = useState(false)
	const [_hasCheckedStorage, setHasCheckedStorage] = useState(false)

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
						<TourDescription>
							This is your dashboard where you can see your lease status, upcoming payments,
							and maintenance requests at a glance.
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 2: Quick Actions */}
				<TourStep target="[data-tour='quick-actions']" side="top">
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Quick Actions</TourTitle>
						<TourDescription>
							Use these shortcuts to quickly pay rent, submit maintenance requests,
							view your lease, or update your profile.
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 3: Pay Rent */}
				<TourStep target="[data-tour='pay-rent']" side="right">
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Pay Rent</TourTitle>
						<TourDescription>
							Click here to make a rent payment. You can pay with a credit card or bank account,
							and set up autopay for convenience.
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 4: Maintenance */}
				<TourStep target="[data-tour='maintenance']" side="right">
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Submit Maintenance Requests</TourTitle>
						<TourDescription>
							Need something fixed? Submit a maintenance request here and track its progress.
							Your property manager will be notified immediately.
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 5: Recent Activity */}
				<TourStep target="[data-tour='recent-activity']" side="top">
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Track Your Activity</TourTitle>
						<TourDescription>
							View your recent payments and maintenance requests here.
							You're all set! Explore your portal anytime.
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
			<Button
				variant="ghost"
				size="sm"
				onClick={startTour}
				className="gap-2"
			>
				<HelpCircle className="size-4" />
				Take a Tour
			</Button>

			{open && <TenantOnboardingTour forceShow />}
		</>
	)
}
