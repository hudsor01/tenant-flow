"use client";

import { AlertTriangle, Clock, Info, Lock } from "lucide-react";
import Link from "next/link";
import { useSubscriptionStatus } from "#hooks/api/use-billing";

/**
 * SubscriptionStatusBanner — shows warning/lock banner for subscription issues.
 *
 * - trialing: primary banner with days-remaining counter + upgrade CTA
 * - active: renders nothing (null)
 * - past_due: warning banner with link to /settings?tab=billing (portal launcher)
 * - unpaid/canceled/expired: destructive lock banner with link to /billing/plans;
 *   it says what the proxy does: every other owner page needs an active plan,
 *   and Settings stays open (owner, 2026-11-09)
 * - null (no subscription): info banner with link to /pricing
 *
 * Include in owner layout to show across all owner pages.
 *
 * Each link names its banner's -text color: the base `a` rule (globals.css)
 * colors a text link primary, which beat the banner color it was meant to
 * inherit. In the rendered app "Reactivate" read 3.99:1 (primary on
 * destructive/10) and "Upgrade" 4.13:1 (primary on primary/10), light theme
 * (66.2-39 fix round 4, Part 8i).
 */
export function SubscriptionStatusBanner() {
	const { data: subscription, isLoading, isError } = useSubscriptionStatus();

	if (isLoading) return null;

	// Battle-test Session 9 P1: when the subscription query errors (auth
	// hiccup, RLS rejection, transient DB), the previous fall-through
	// rendered the "Start your subscription" banner to paid users —
	// misleading them into thinking they had no subscription. Skip the
	// banner on error; BillingSettings owns the explicit error UI.
	if (isError) return null;

	// No subscription at all — user needs to subscribe. Only render when
	// the query SUCCEEDED with no subscription on file (genuine new-user
	// state), not when the lookup couldn't resolve a status.
	if (!subscription || subscription.subscriptionStatus === null) {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm text-info-text">
				<Info className="size-5 shrink-0" />
				<p className="mb-0 flex-1">
					Start your subscription to unlock all property management features.
				</p>
				<Link
					href="/pricing"
					className="shrink-0 font-medium text-info-text underline underline-offset-4 hover:text-foreground"
				>
					View plans
				</Link>
			</div>
		);
	}

	const status = subscription.subscriptionStatus;

	// Trialing: days-remaining banner with upgrade CTA. Fall back to a generic
	// trial-active message if trial_ends_at is missing (data gap we still want
	// to surface rather than render nothing).
	if (status === "trialing") {
		const daysLeft = calculateDaysRemaining(subscription.trialEndsAt);
		const dayWord = daysLeft === 1 ? "day" : "days";
		const message =
			daysLeft === null
				? "You're on a free trial — upgrade to keep access."
				: daysLeft <= 0
					? "Your trial ended. Upgrade to keep access."
					: `${daysLeft} ${dayWord} left in your trial — upgrade to keep access.`;

		return (
			<div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary-text">
				<Clock className="size-5 shrink-0" />
				<p className="mb-0 flex-1">{message}</p>
				<Link
					href="/billing/plans?source=trial_banner"
					className="shrink-0 font-medium text-primary-text underline underline-offset-4 hover:text-foreground"
				>
					Upgrade
				</Link>
			</div>
		);
	}

	// Active subscriptions need no banner
	if (status === "active") {
		return null;
	}

	// Past due: yellow warning
	if (status === "past_due") {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-text">
				<AlertTriangle className="size-5 shrink-0" />
				<p className="mb-0 flex-1">
					Your subscription payment failed. Please update your payment method to
					avoid losing access when your subscription is canceled.
				</p>
				<Link
					href="/settings?tab=billing"
					className="shrink-0 font-medium text-warning-text underline underline-offset-4 hover:text-foreground"
				>
					Update billing
				</Link>
			</div>
		);
	}

	// Unpaid, canceled, expired: red lock banner. Links to /billing/plans,
	// which is proxy-allowlisted (reachable for these gate-locked statuses) and
	// shows Manage Subscription for unpaid (live sub → portal) or a fresh
	// checkout for canceled/expired (no live sub → resubscribe). It said only
	// premium features were off, but the proxy closes every owner page except
	// Settings and the plan pages, and the banner shows on Settings too
	// (66.2-39 fix round 4, Part 8l).
	return (
		<div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text">
			<Lock className="size-5 shrink-0" />
			<p className="mb-0 flex-1">
				Your subscription is inactive. Other pages need an active plan; Settings
				stays open so you can download your data, request account deletion or
				resubscribe.
			</p>
			<Link
				href="/billing/plans"
				className="shrink-0 font-medium text-destructive-text underline underline-offset-4 hover:text-foreground"
			>
				Reactivate
			</Link>
		</div>
	);
}

function calculateDaysRemaining(trialEndsAt: string | null): number | null {
	if (!trialEndsAt) return null;
	const endMs = Date.parse(trialEndsAt);
	if (Number.isNaN(endMs)) return null;
	const diffMs = endMs - Date.now();
	return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
