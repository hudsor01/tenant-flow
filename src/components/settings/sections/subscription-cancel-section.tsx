'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertTriangle, Clock, Loader2, Lock, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { BlurFade } from '#components/ui/blur-fade'
import { Button, buttonVariants } from '#components/ui/button'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/alert-dialog'
import { cn } from '#lib/utils'
import { useSubscriptionStatus } from '#hooks/api/use-billing'
import {
	useCancelSubscriptionMutation,
	useReactivateSubscriptionMutation
} from '#hooks/api/use-billing-mutations'
import { GdprDataActions } from '#components/settings/gdpr-data-actions'

function formatPlanEndDate(iso: string | null): string {
	if (!iso) return 'your next billing date'
	return new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

function daysUntil(iso: string | null): number {
	if (!iso) return 0
	const end = new Date(iso).getTime()
	return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)))
}

function addDaysFormatted(iso: string | null, days: number): string {
	if (!iso) return 'your data retention date'
	const base = new Date(iso).getTime() + days * 24 * 60 * 60 * 1000
	return new Date(base).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

export function SubscriptionCancelSection() {
	const status = useSubscriptionStatus()
	const [dialogOpen, setDialogOpen] = useState(false)

	const cancelMutation = useCancelSubscriptionMutation()
	const reactivateMutation = useReactivateSubscriptionMutation()

	if (status.isLoading) {
		return (
			<div
				className="h-32 rounded-lg border bg-muted animate-pulse"
				aria-label="Loading subscription status"
			/>
		)
	}

	if (status.isError || !status.data) {
		return (
			<section className="rounded-lg border bg-card p-6">
				<p className="text-sm text-muted-foreground">
					Subscription status unavailable.{' '}
					<button
						type="button"
						onClick={() => status.refetch()}
						className="underline underline-offset-4 hover:text-foreground"
					>
						Retry
					</button>
				</p>
			</section>
		)
	}

	const { subscriptionStatus, cancelAtPeriodEnd, currentPeriodEnd } = status.data

	// Gates — component opts out when not applicable (per UI-SPEC "Loading & error substates")
	if (subscriptionStatus === null) return null
	if (subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') return null

	const endDate = formatPlanEndDate(currentPeriodEnd)
	const daysLeft = daysUntil(currentPeriodEnd)

	// ───────────── State 3: Canceled (terminal) ─────────────
	if (subscriptionStatus === 'canceled' || subscriptionStatus === 'cancelled') {
		const dataDeleteDate = addDaysFormatted(currentPeriodEnd, 30)
		return (
			<BlurFade delay={0.55} inView>
				<section className="rounded-lg border border-red-300 bg-red-50 p-6 dark:border-red-700 dark:bg-red-950/50">
					<h3 className="mb-1 text-sm font-medium text-red-800 dark:text-red-200 uppercase tracking-wider flex items-center gap-2">
						<Lock className="h-4 w-4" aria-hidden="true" />
						Subscription Ended
					</h3>
					<p className="text-base font-medium mt-2">
						Your plan ended on <strong>{endDate}</strong>
					</p>
					<p className="text-sm text-muted-foreground mt-2">
						Your data will be deleted on <strong>{dataDeleteDate}</strong> unless you request deletion or export it sooner.
					</p>
					<div className="mt-8 space-y-4">
						<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
							Your Data
						</h4>
						<p className="text-sm text-muted-foreground">
							Under GDPR and CCPA, you have the right to download or delete your data before the 30-day retention window ends.
						</p>
						<GdprDataActions variant="inline" />
					</div>
					<div className="mt-6">
						<Link
							href="/pricing"
							className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
						>
							Need to come back? View plans
						</Link>
					</div>
				</section>
			</BlurFade>
		)
	}

	// ───────────── State 2: Cancel-scheduled (grace window) ─────────────
	if (subscriptionStatus === 'active' && cancelAtPeriodEnd) {
		const onReactivate = () => {
			reactivateMutation.mutate(undefined, {
				onSuccess: () => toast.success('Your subscription is active again.'),
				onError: () => toast.error("Couldn't reactivate. Please try again.")
			})
		}
		return (
			<BlurFade delay={0.55} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
						<Clock className="h-4 w-4" aria-hidden="true" />
						Subscription
					</h3>
					<div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
						<Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
						<div>
							<p className="text-sm font-medium text-amber-700">
								Subscription ends {endDate}
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								Your plan will end on <strong>{endDate}</strong> (<strong>{daysLeft} days remaining</strong>). You can keep your plan active by reactivating before then.
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						onClick={onReactivate}
						disabled={reactivateMutation.isPending}
						aria-label="Reactivate subscription"
						className="gap-2"
					>
						{reactivateMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
						) : (
							<Undo2 className="h-4 w-4" aria-hidden="true" />
						)}
						{reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Plan'}
					</Button>
					<p className="text-xs text-muted-foreground mt-4">
						Your data stays for 30 days after your plan ends per our privacy policy.
					</p>
				</section>
			</BlurFade>
		)
	}

	// ───────────── State 1: Active (default) ─────────────
	const onConfirmCancel = () => {
		cancelMutation.mutate(undefined, {
			onSuccess: () => {
				toast.success(`Subscription set to cancel on ${endDate}.`)
				setDialogOpen(false)
			},
			onError: () => {
				toast.error("Couldn't cancel your subscription. Please try again or contact support.")
			}
		})
	}

	return (
		<BlurFade delay={0.55} inView>
			<section className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
				<h3 className="mb-4 text-sm font-medium text-destructive uppercase tracking-wider flex items-center gap-2">
					<AlertTriangle className="h-4 w-4" aria-hidden="true" />
					Danger Zone
				</h3>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium">Cancel Subscription</p>
						<p className="text-xs text-muted-foreground">
							Your data stays for 30 days after cancellation. You can reactivate anytime before your period ends.
						</p>
					</div>
					<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<AlertDialogTrigger asChild>
							<Button
								variant="outline"
								aria-label="Cancel my subscription"
								className="text-destructive border-destructive/20 hover:bg-destructive/10"
							>
								Cancel Plan
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
								<AlertDialogDescription>
									Your plan will stay active until <strong>{endDate}</strong>. Your data stays for 30 days after that per our privacy policy.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={cancelMutation.isPending}>
									Keep my plan
								</AlertDialogCancel>
								<AlertDialogAction
									type="button"
									onClick={(event) => {
										event.preventDefault()
										onConfirmCancel()
									}}
									disabled={cancelMutation.isPending}
									aria-label="Confirm subscription cancellation"
									className={cn(buttonVariants({ variant: 'destructive' }), 'gap-2')}
								>
									{cancelMutation.isPending && (
										<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
									)}
									{cancelMutation.isPending ? 'Canceling...' : 'Yes, cancel plan'}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</section>
		</BlurFade>
	)
}
