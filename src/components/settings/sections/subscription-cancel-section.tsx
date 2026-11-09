"use client";

import { AlertTriangle, Clock, Loader2, Lock, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { GdprDataActions } from "#components/settings/gdpr-data-actions";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#components/ui/alert-dialog";
import { BlurFade } from "#components/ui/blur-fade";
import { Button } from "#components/ui/button";
import { useSubscriptionStatus } from "#hooks/api/use-billing";
import {
	useCancelSubscriptionMutation,
	useReactivateSubscriptionMutation,
} from "#hooks/api/use-billing-mutations";
import { formatCount } from "#lib/formatters/count";

function formatPlanEndDate(iso: string | null): string {
	if (!iso) return "your next billing date";
	return new Date(iso).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function daysUntil(iso: string | null): number {
	if (!iso) return 0;
	const end = new Date(iso).getTime();
	return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function SubscriptionCancelSection() {
	const status = useSubscriptionStatus();
	const [dialogOpen, setDialogOpen] = useState(false);

	const cancelMutation = useCancelSubscriptionMutation();
	const reactivateMutation = useReactivateSubscriptionMutation();

	if (status.isLoading) {
		return (
			<div
				className="h-32 rounded-lg border bg-muted animate-pulse"
				role="status"
				aria-label="Loading subscription status"
			/>
		);
	}

	if (status.isError || !status.data) {
		return (
			<section className="rounded-lg border bg-card p-6">
				<p className="mb-0 text-sm text-muted-foreground">
					Subscription status unavailable.{" "}
					<button
						type="button"
						onClick={() => status.refetch()}
						className="underline underline-offset-4 hover:text-foreground"
					>
						Retry
					</button>
				</p>
			</section>
		);
	}

	const {
		subscriptionStatus,
		cancelAtPeriodEnd,
		currentPeriodEnd,
		stripeCustomerId,
	} = status.data;

	// Gate ladder — the component opts out whenever there is no cancelable
	// Stripe subscription (per UI-SPEC "Loading & error substates"). ORDER IS
	// LOAD-BEARING: the DB-trial opt-out must run BEFORE the State 2 gate so a
	// trialing+cancel-scheduled Stripe subscriber (BILL-09) isn't swallowed.
	if (subscriptionStatus === null) return null;
	if (subscriptionStatus === "past_due" || subscriptionStatus === "unpaid")
		return null;
	// Expired trial (written by expire_trials()) — no Stripe subscription to
	// cancel (BILL-11); BillingSettings offers the resubscribe path above.
	if (subscriptionStatus === "expired") return null;
	// DB-managed trial (or abandoned-checkout customer): a trial with no Stripe
	// customer definitely has no subscription; a Stripe-checkout trial always
	// has subscription_current_period_end synced by the webhook, so its absence
	// marks the DB-trial variant. Confirming a cancel here would 404
	// ("No subscription to modify") — opt out instead (BILL-16). Trialing WITH
	// Stripe evidence continues into States 1/2 below (required by BILL-09).
	if (
		subscriptionStatus === "trialing" &&
		(!stripeCustomerId || !currentPeriodEnd)
	) {
		return null;
	}

	const endDate = formatPlanEndDate(currentPeriodEnd);
	const daysLeft = daysUntil(currentPeriodEnd);

	// ───────────── State 3: Canceled (terminal) ─────────────
	// Nothing deletes an owner's data when a plan ends, at any age: no job reads
	// subscription_status to delete or anonymize (Part 8i). Only the owner's
	// own deletion request does (ACCOUNT_DELETION_COPY).
	if (subscriptionStatus === "canceled") {
		return (
			<BlurFade delay={0.55}>
				<section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
					<h3 className="mb-1 text-sm font-medium text-destructive-text uppercase tracking-wider flex items-center gap-2">
						<Lock className="h-4 w-4" aria-hidden="true" />
						Subscription Ended
					</h3>
					<p className="text-base font-medium mt-2 mb-0">
						Your plan ended on <strong>{endDate}</strong>
					</p>
					<p className="text-sm text-muted-foreground mt-2">
						Your properties, tenants and leases are kept.
					</p>
					<div className="mt-8 space-y-4">
						<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
							Your Data
						</h4>
						<p className="text-sm text-muted-foreground">
							Under GDPR and CCPA, you can download a copy of your data or
							request account deletion.
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
		);
	}

	// ───────────── State 2: Cancel-scheduled (grace window) ─────────────
	// Stripe keeps status: 'trialing' when cancel_at_period_end is set during a
	// trial, so both active AND trialing (with Stripe evidence, per the gate
	// ladder above) route here (BILL-09).
	if (
		(subscriptionStatus === "active" || subscriptionStatus === "trialing") &&
		cancelAtPeriodEnd
	) {
		const onReactivate = () => {
			// FORMFIX-08: no onError override — the mutation's built-in onError owns the
			// single error toast (with a friendly fallback message); a second handler
			// here would double-toast + double-Sentry the same failure.
			reactivateMutation.mutate(undefined, {
				onSuccess: () => toast.success("Your subscription is active again."),
			});
		};
		return (
			<BlurFade delay={0.55}>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
						<Clock className="h-4 w-4" aria-hidden="true" />
						Subscription
					</h3>
					<div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 mb-4">
						<Clock
							className="h-5 w-5 text-warning-text mt-0.5 shrink-0"
							aria-hidden="true"
						/>
						<div>
							<p className="mb-0 text-sm font-medium text-warning-text">
								Subscription ends {endDate}
							</p>
							<p className="mt-1 mb-0 text-sm text-muted-foreground">
								Your plan will end on <strong>{endDate}</strong> (
								<strong>{formatCount(daysLeft, "day")} remaining</strong>). You
								can keep your plan active by reactivating before then.
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						onClick={onReactivate}
						disabled={reactivateMutation.isPending}
						className="gap-2"
					>
						{reactivateMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
						) : (
							<Undo2 className="h-4 w-4" aria-hidden="true" />
						)}
						{reactivateMutation.isPending
							? "Reactivating..."
							: "Reactivate Plan"}
					</Button>
					<p className="text-xs text-muted-foreground mt-4 mb-0">
						Your properties, tenants and leases are kept after your plan ends.
					</p>
				</section>
			</BlurFade>
		);
	}

	// ───────────── State 1: Active (default) ─────────────
	const onConfirmCancel = () => {
		// FORMFIX-08: no onError override — the mutation's built-in onError owns the
		// single error toast (with a friendly fallback message); a second handler
		// here would double-toast + double-Sentry the same failure.
		cancelMutation.mutate(undefined, {
			onSuccess: () => {
				toast.success(`Subscription set to cancel on ${endDate}.`);
				setDialogOpen(false);
			},
		});
	};

	return (
		<BlurFade delay={0.55}>
			<section className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
				<h3 className="mb-4 text-sm font-medium text-destructive-text uppercase tracking-wider flex items-center gap-2">
					<AlertTriangle className="h-4 w-4" aria-hidden="true" />
					Danger Zone
				</h3>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium">Cancel Subscription</p>
						{/* Nothing deletes an owner's data when a plan ends: the proxy sends a
						    lapsed account to /pricing, and its records stay. */}
						<p className="mb-0 text-xs text-muted-foreground">
							Your properties, tenants and leases are kept after your plan ends.
							You can reactivate anytime before your period ends.
						</p>
					</div>
					<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<AlertDialogTrigger asChild>
							<Button
								variant="outline"
								className="text-destructive-text border-destructive/20 hover:bg-destructive/10 hover:text-destructive-text dark:border-destructive/20 dark:hover:bg-destructive/20 dark:hover:text-destructive-text"
							>
								Cancel Plan
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
								<AlertDialogDescription className="mb-0">
									Your plan stays active until <strong>{endDate}</strong>, and
									you can reactivate it until then. After that, you choose a
									plan to open the app again; your properties, tenants and
									leases are kept.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={cancelMutation.isPending}>
									Keep my plan
								</AlertDialogCancel>
								<AlertDialogAction
									type="button"
									onClick={(event) => {
										event.preventDefault();
										onConfirmCancel();
									}}
									disabled={cancelMutation.isPending}
									variant="destructive"
								>
									{cancelMutation.isPending && (
										<Loader2
											className="h-4 w-4 animate-spin"
											aria-hidden="true"
										/>
									)}
									{cancelMutation.isPending
										? "Canceling..."
										: "Yes, cancel plan"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</section>
		</BlurFade>
	);
}
