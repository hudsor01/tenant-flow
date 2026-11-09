import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "#components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#components/ui/card";

export const metadata: Metadata = {
	title: "Subscription Activated",
	description: "Your subscription is now active",
	robots: "noindex, nofollow",
};

/**
 * Stripe Checkout's success URL. It carries `?session_id=`, which the page
 * does not show: anyone can link here with any value, so printing it would
 * put their text on tenantflow.app, and the id means nothing to an owner.
 */
export default function CheckoutSuccessPage() {
	return (
		<div className="container flex min-h-[60vh] items-center justify-center py-12">
			<Card className="w-full max-w-md text-center">
				<CardHeader className="pb-4">
					<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
						<CheckCircle2 className="size-8 text-success" />
					</div>
					<CardTitle className="text-2xl">Subscription Activated!</CardTitle>
					<CardDescription>
						Your subscription is now active, with every feature your plan
						includes.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="mb-0 text-sm text-muted-foreground">
						Thank you for subscribing to TenantFlow. You can manage your
						subscription at any time from your billing settings.
					</p>
				</CardContent>
				<CardFooter className="flex flex-col gap-2">
					<Button asChild className="w-full">
						<Link href="/dashboard">Go to Dashboard</Link>
					</Button>
					<Button asChild variant="outline" className="w-full">
						<Link href="/billing/plans">View Plans</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
