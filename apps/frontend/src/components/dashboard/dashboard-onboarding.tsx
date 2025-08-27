'use client'
import { Building2,Users,FileText } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Onboarding progress hook
 * Extracted from massive dashboard client component
 */
function useOnboardingProgress() {
	const { data: stats } = useDashboardOverview()
	const [dismissed, setDismissed] = useState(false)

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const dismissedKey = 'onboarding-dismissed'
			setDismissed(localStorage.getItem(dismissedKey) === 'true')
		}
	}, [])

	const steps = [
		{
			id: 'property',
			label: 'Add a property',
			completed: (stats?.totalProperties ?? 0) > 0,
			href: '/properties/new',
			icon: Building2
		},
		{
			id: 'tenant',
			label: 'Add a tenant',
			completed: (stats?.totalTenants ?? 0) > 0,
			href: '/tenants/new',
			icon: Users
		},
		{
			id: 'lease',
			label: 'Create a lease',
			completed: (stats?.totalUnits ?? 0) > 0,
			href: '/leases/new',
			icon: FileText
		}
	]

	const completedSteps = steps.filter(step => step.completed).length
	const totalSteps = steps.length
	const isComplete = completedSteps === totalSteps
	const progressPercentage = (completedSteps / totalSteps) * 100

	const dismiss = () => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('onboarding-dismissed', 'true')
			setDismissed(true)
		}
	}

	return {
		steps,
		completedSteps,
		totalSteps,
		isComplete,
		progressPercentage,
		dismissed,
		dismiss
	}
}

/**
 * Onboarding Component
 * Focused component for dashboard onboarding flow
 */
export function DashboardOnboarding() {
	const {
		steps,
		completedSteps,
		totalSteps,
		isComplete,
		progressPercentage,
		dismissed,
		dismiss
	} = useOnboardingProgress()

	if (dismissed || isComplete) {
		return null
	}

	return (
		<Card className="card-modern relative overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-purple-50/60 dark:border-blue-800 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-purple-950/30">
			{/* Animated background elements */}
			<div className="absolute right-0 top-0 h-32 w-32 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 blur-2xl" />
			<div className="absolute bottom-0 left-0 h-24 w-24 animate-pulse rounded-full bg-gradient-to-tr from-indigo-400/10 to-blue-400/10 blur-xl delay-1000" />

			<CardHeader className="relative pb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 rounded-xl border border-blue-200 p-2">
							<i className="i-lucide-sparkles inline-block text-primary h-5 w-5 animate-pulse"  />
						</div>
						<div>
							<CardTitle className="text-foreground text-lg font-semibold">
								Welcome to TenantFlow!
							</CardTitle>
							<CardDescription className="text-sm font-medium">
								Let's get your property management set up in{' '}
								{totalSteps} quick steps.
							</CardDescription>
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={dismiss}
						className="btn-modern text-muted-foreground hover:text-foreground"
					>
						Dismiss
					</Button>
				</div>
			</CardHeader>
			<CardContent className="relative space-y-6">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-foreground text-sm font-semibold">
							Setup Progress
						</span>
						<span className="text-muted-foreground text-sm font-medium">
							{completedSteps} of {totalSteps} completed
						</span>
					</div>
					<div className="space-y-2">
						<Progress
							value={progressPercentage}
							className="h-3 bg-blue-100 dark:bg-blue-950/50"
						/>
						<div className="text-muted-foreground flex justify-between text-xs">
							<span>Getting started</span>
							<span>{Math.round(progressPercentage)}%</span>
						</div>
					</div>
				</div>

				<div className="grid gap-3">
					{steps.map((step, index) => {
						const Icon = step.icon
						return (
							<div
								key={step.id}
								className={cn(
									'group relative flex items-center justify-between rounded-xl p-4 transition-all duration-300',
									'border backdrop-blur-sm',
									step.completed
										? 'border-green-300 bg-green-50/80 shadow-sm'
										: 'bg-background/80 border-border hover:border-primary/30 hover:bg-muted/30 hover:-translate-y-0.5 hover:shadow-md'
								)}
							>
								{/* Step number indicator */}
								<div className="bg-background border-border absolute -left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold">
									{step.completed ? (
										<i className="i-lucide-checkcircle2 inline-block h-3 w-3 text-green-600"  />
									) : (
										<span className="text-muted-foreground">
											{index + 1}
										</span>
									)}
								</div>

								<div className="ml-4 flex items-center gap-4">
									<div
										className={cn(
											'rounded-lg p-2 transition-all duration-300',
											step.completed
												? 'border border-green-200 bg-green-100'
												: 'bg-primary/10 border-primary/20 group-hover:bg-primary/20 border'
										)}
									>
										<Icon
											className={cn(
												'h-4 w-4 transition-colors duration-300',
												step.completed
													? 'text-green-600'
													: 'text-primary group-hover:text-primary/80'
											)}
										/>
									</div>
									<div>
										<span
											className={cn(
												'text-sm font-semibold transition-colors duration-300',
												step.completed
													? 'text-green-700 dark:text-green-400'
													: 'text-foreground'
											)}
										>
											{step.label}
										</span>
										{step.completed && (
											<p className="text-xs font-medium text-green-600 dark:text-green-400">
												Completed ✓
											</p>
										)}
									</div>
								</div>

								{!step.completed && (
									<Button
										asChild
										size="sm"
										className="btn-modern bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 hover:border-primary/50"
									>
										<Link
											href={step.href}
											className="focus-modern"
										>
											Start
											<i className="i-lucide-arrow-right inline-block ml-2 h-3 w-3 transition-transform group-hover:translate-x-0.5"  />
										</Link>
									</Button>
								)}
							</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
