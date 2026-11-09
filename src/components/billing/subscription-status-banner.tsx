"use client";

import {
	AlertTriangle,
	Clock,
	Info,
	Lock,
	type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSubscriptionStatus } from "#hooks/api/use-billing";
import { cn } from "#lib/utils";

/**
 * SubscriptionStatusBanner — shows warning/lock banner for subscription issues.
 *
 * - trialing: primary banner with days-remaining counter + upgrade CTA; a
 *   trial of a chosen plan (Stripe's) says what happens at its end instead
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
 *
 * The four banners share one layout (`StatusBanner`).
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
	// state), not when the lookup couldn't resolve a status. Settings is open
	// to it, and every other owner page needs a plan (the proxy); the plans
	// differ (Starter has no e-signature), so the copy promises the rest of the
	// app, not every feature (main session, 66.2-39 fix round 4, Part 8o).
	if (!subscription || subscription.subscriptionStatus === null) {
		return (
			<StatusBanner tone="info" icon={Info} href="/pricing" action="View plans">
				Start your subscription to use the rest of TenantFlow.
			</StatusBanner>
		);
	}

	const status = subscription.subscriptionStatus;

	// Trialing: days-remaining banner with upgrade CTA. Fall back to a generic
	// trial-active message if trial_ends_at is missing (data gap we still want
	// to surface rather than render nothing).
	if (status === "trialing") {
		const daysLeft = calculateDaysRemaining(subscription.trialEndsAt);
		const dayWord = daysLeft === 1 ? "day" : "days";
		// A trial of a chosen plan: stripe-checkout's carry-over trial, the only
		// Stripe trial, whose row names the plan (a signup trial names none).
		// It needs no upgrade: Stripe cancels it at the trial's end without a
		// payment method on file (`missing_payment_method: "cancel"`) and bills
		// the plan with one. It told this owner to "upgrade to keep access"
		// (66.2-39 fix round 4, Part 8n; the trial-ending email says the same).
		if (subscription.stripePriceId !== null) {
			const plan =
				daysLeft === null
					? "Your plan's trial is on. Without a payment method on file when the trial ends, your subscription is canceled."
					: daysLeft <= 0
						? "Your trial has ended. Without a payment method on file, your subscription is canceled."
						: `${daysLeft} ${dayWord} left in your trial. Without a payment method on file when the trial ends, your subscription is canceled.`;
			return (
				<StatusBanner
					tone="primary"
					icon={Clock}
					href="/settings?tab=billing"
					action="Update billing"
				>
					{plan}
				</StatusBanner>
			);
		}
		const message =
			daysLeft === null
				? "You're on a free trial — upgrade to keep access."
				: daysLeft <= 0
					? "Your trial ended. Upgrade to keep access."
					: `${daysLeft} ${dayWord} left in your trial — upgrade to keep access.`;

		return (
			<StatusBanner
				tone="primary"
				icon={Clock}
				href="/billing/plans?source=trial_banner"
				action="Upgrade"
			>
				{message}
			</StatusBanner>
		);
	}

	// Active subscriptions need no banner
	if (status === "active") {
		return null;
	}

	// Past due: yellow warning. Stripe's Revenue recovery settings (owner,
	// 2026-11-09) retry the payment and cancel the subscription when every
	// retry fails, which closes every page but Settings, so updating the
	// payment method keeps access. The Growth and Max paid features pause at
	// once; the paywall says so where they are used, and the banner does not:
	// every wording that kept "subscription" and added the pause ran the row
	// taller than the grid at 9 to 31 widths from a 22rem banner (66.2-39 fix
	// round 4, Part 8o; the failed-payment email lists them).
	if (status === "past_due") {
		return (
			<StatusBanner
				tone="warning"
				icon={AlertTriangle}
				href="/settings?tab=billing"
				action="Update billing"
			>
				Your subscription payment failed. Update your payment method to keep
				access.
			</StatusBanner>
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
		<StatusBanner
			tone="destructive"
			icon={Lock}
			href="/billing/plans"
			action="Reactivate"
		>
			Your subscription is inactive. Other pages need an active plan; Settings
			stays open so you can download your data, request account deletion or
			resubscribe.
		</StatusBanner>
	);
}

/** Each banner's colors: its border, fill and AA -text color, which its link repeats. */
const BANNER_TONES = {
	info: { banner: "border-info/30 bg-info/10", text: "text-info-text" },
	primary: {
		banner: "border-primary/30 bg-primary/10",
		text: "text-primary-text",
	},
	warning: {
		banner: "border-warning/30 bg-warning/10",
		text: "text-warning-text",
	},
	destructive: {
		banner: "border-destructive/30 bg-destructive/10",
		text: "text-destructive-text",
	},
} as const;

/**
 * The one layout of the four banners. Narrow, the link sits under the text,
 * beside the icon, so the text uses the width beside the icon: at 320 the
 * lapsed banner's text ran 8 lines in a 144px column beside the icon and the
 * link (main session, 66.2-39 fix round 4, Part 8m). From a 22rem banner the
 * row with the link beside the text is no taller than the text with the link
 * under it, for every banner's copy (measured on the rendered banners: the
 * lapsed one from 348px, the past_due one from 340px), and the layout is the
 * row it always was. The banner's own width decides, through its container.
 * The plan-trial copies hold it too, every day count from 1 to 14, measured
 * at every 2px from 352 to 520: worded "when it ends", the copies of 102 to
 * 104 characters ran 4 lines beside the link where the grid held 2, at
 * 410-416 (66.2-39 fix round 4, Part 8n). The no-subscription copy holds it
 * too, measured at every 2px from 320 to 520 and at 768, 1024, 1280 and 1600
 * (Part 8o).
 */
function StatusBanner({
	tone,
	icon: Icon,
	href,
	action,
	children,
}: {
	tone: keyof typeof BANNER_TONES;
	icon: LucideIcon;
	href: string;
	action: string;
	children: ReactNode;
}) {
	const colors = BANNER_TONES[tone];
	return (
		<div className="@container/status-banner">
			<div
				className={cn(
					"grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-3 text-sm @min-[22rem]/status-banner:flex",
					colors.banner,
					colors.text,
				)}
			>
				<Icon className="size-5 shrink-0" />
				<p className="mb-0 flex-1">{children}</p>
				<Link
					href={href}
					className={cn(
						"col-start-2 justify-self-start shrink-0 font-medium underline underline-offset-4 hover:text-foreground",
						colors.text,
					)}
				>
					{action}
				</Link>
			</div>
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
