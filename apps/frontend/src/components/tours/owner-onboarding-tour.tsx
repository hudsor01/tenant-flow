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

const TOUR_KEY: TourKey = 'owner-onboarding'
const TOUR_AUTO_START_DELAY_MS = 1000
const logger = createLogger({ component: 'OwnerOnboardingTour' })

interface OwnerOnboardingTourProps {
	/** Force show the tour even if previously completed */
	forceShow?: boolean
}

export function OwnerOnboardingTour({
	forceShow = false
}: OwnerOnboardingTourProps) {
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
				<TourStep target="[data-testid='dashboard-stats']" side="bottom">
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Welcome to TenantFlow</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'View your portfolio overview: revenue, occupancy, and tenant status.'
								: 'Your property management dashboard gives you a complete overview of your portfolio. See revenue, occupancy, and tenant status at a glance.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 2: Trends Section */}
				<TourStep
					target="[data-tour='trends-section']"
					side={isMobile ? 'bottom' : 'top'}
				>
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Track Your Performance</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'Monitor occupancy, revenue, and maintenance trends.'
								: 'Monitor key metrics like occupancy rate, revenue trends, and maintenance activity. Compare performance against previous periods to spot trends.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 3: Quick Actions */}
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
								? 'Add properties, create leases, invite tenants, and more.'
								: 'Quickly add properties, create leases, invite tenants, or handle maintenance requests. These shortcuts help you manage your portfolio efficiently.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 4: Charts */}
				<TourStep
					target="[data-tour='charts-section']"
					side={isMobile ? 'bottom' : 'top'}
				>
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Portfolio Analytics</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'View revenue, occupancy, and payment trends over time.'
								: 'Visualize your revenue, occupancy, and payment collection over time. Use these insights to make data-driven decisions.'}
						</TourDescription>
					</TourHeader>
				</TourStep>

				{/* Step 5: Sidebar Navigation */}
				<TourStep
					target="[data-tour='sidebar-nav']"
					side={isMobile ? 'bottom' : 'right'}
				>
					<TourClose />
					<TourArrow />
					<TourHeader>
						<TourTitle>Navigate Your Portal</TourTitle>
						<TourDescription className={isMobile ? 'text-sm' : ''}>
							{isMobile
								? 'Access Properties, Tenants, Leases, and more from the menu.'
								: "Use the sidebar to access Properties, Tenants, Leases, Maintenance, Financials, and Reports. You're all set to manage your properties!"}
						</TourDescription>
					</TourHeader>
				</TourStep>
			</TourPortal>
		</Tour>
	)
}

/** Button to restart the tour manually */
export function OwnerTourTrigger() {
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

			{open && <OwnerOnboardingTour forceShow />}
		</>
	)
}
