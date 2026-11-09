"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "#components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { subscriptionStatusQuery } from "#hooks/api/query-keys/subscription-keys";
import { PROXY_ADMITTED_SUBSCRIPTION_STATUSES } from "#lib/routes/private-routes";

/** How often the page reads the status until the proxy would admit it. */
const ACTIVATION_POLL_MS = 3_000;
/** How long it keeps reading before it says activation is taking longer. */
const ACTIVATION_BOUND_MS = 60_000;

const BILLING_SETTINGS_HREF = "/settings?tab=billing";

/**
 * Stripe Checkout's success page, by the owner's subscription status (main
 * session, 66.2-39 fix round 4, Part 8m). Stripe sends the owner here before
 * its webhook has written `users.subscription_status`, and the page offered
 * "Go to Dashboard" at once: pressed then, the link reached the proxy with the
 * old status, and a lapsed owner landed on /pricing.
 *
 * The page reads the status through the existing query, at mount and then
 * every `ACTIVATION_POLL_MS` until `ACTIVATION_BOUND_MS` has passed, and
 * trusts only a read it made (a status cached before it loaded may be the old
 * one). It offers the dashboard once a read returns a status the proxy admits
 * (`PROXY_ADMITTED_SUBSCRIPTION_STATUSES`), and Billing Settings, which the
 * proxy never gates by subscription, until then and after the bound. The
 * header is a status region, so the change is announced.
 */
export function CheckoutSuccessCard() {
	const [mountedAt] = useState(() => Date.now());
	const [boundReached, setBoundReached] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setBoundReached(true), ACTIVATION_BOUND_MS);
		return () => clearTimeout(timer);
	}, []);

	const { data, dataUpdatedAt } = useQuery({
		...subscriptionStatusQuery.subscriptionStatus(),
		refetchOnMount: "always",
		refetchInterval: (query) =>
			boundReached ||
			isAdmittedRead(
				query.state.data?.subscriptionStatus ?? null,
				query.state.dataUpdatedAt,
				mountedAt,
			)
				? false
				: ACTIVATION_POLL_MS,
	});

	const admitted = isAdmittedRead(
		data?.subscriptionStatus ?? null,
		dataUpdatedAt,
		mountedAt,
	);

	if (admitted) {
		return (
			<CheckoutCard
				icon={<CheckCircle2 className="size-8 text-success" />}
				iconTint="bg-success/10"
				title="Subscription Activated!"
				description="Your subscription is now active, with every feature your plan includes."
				primary={{ href: "/dashboard", label: "Go to Dashboard" }}
			>
				Thank you for subscribing to TenantFlow. You can manage your
				subscription at any time from your billing settings.
			</CheckoutCard>
		);
	}

	if (boundReached) {
		return (
			<CheckoutCard
				icon={<Clock className="size-8 text-warning" />}
				iconTint="bg-warning/10"
				title="Activation is taking longer than usual"
				description="Your plan is not active yet. Billing Settings shows its current status."
				primary={{
					href: BILLING_SETTINGS_HREF,
					label: "Go to Billing Settings",
				}}
			>
				If it does not change, please{" "}
				<Link
					href="/contact"
					className="text-primary-text hover:underline underline-offset-4"
				>
					contact support
				</Link>
				.
			</CheckoutCard>
		);
	}

	return (
		<CheckoutCard
			icon={<Loader2 className="size-8 animate-spin text-primary" />}
			iconTint="bg-primary/10"
			title="Activating your plan"
			description="Thank you for subscribing. Your plan is being activated, and this page updates when it is."
			primary={{ href: BILLING_SETTINGS_HREF, label: "Go to Billing Settings" }}
		>
			You can manage your subscription at any time from your billing settings.
		</CheckoutCard>
	);
}

/** Whether a read this page made returned a status the proxy admits. */
function isAdmittedRead(
	status: string | null,
	updatedAt: number,
	mountedAt: number,
): boolean {
	return (
		updatedAt >= mountedAt &&
		status !== null &&
		PROXY_ADMITTED_SUBSCRIPTION_STATUSES.has(status)
	);
}

function CheckoutCard({
	icon,
	iconTint,
	title,
	description,
	primary,
	children,
}: {
	icon: ReactNode;
	iconTint: string;
	title: string;
	description: string;
	primary: { href: string; label: string };
	children: ReactNode;
}) {
	return (
		<Card className="w-full max-w-md text-center">
			<CardHeader className="pb-4" role="status">
				<div
					className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${iconTint}`}
					aria-hidden="true"
				>
					{icon}
				</div>
				<CardTitle className="text-2xl">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="mb-0 text-sm text-muted-foreground">{children}</p>
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				<Button asChild className="w-full">
					<Link href={primary.href}>{primary.label}</Link>
				</Button>
				<Button asChild variant="outline" className="w-full">
					<Link href="/billing/plans">View Plans</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
