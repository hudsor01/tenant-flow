import type { Metadata } from "next";

import { CheckoutSuccessCard } from "#components/billing/checkout-success-card";

export const metadata: Metadata = {
	title: "Checkout Complete",
	description: "Your plan's activation after Stripe Checkout",
	robots: "noindex, nofollow",
};

/**
 * Stripe Checkout's success URL. It carries `?session_id=`, which the page
 * does not show: anyone can link here with any value, so printing it would
 * put their text on tenantflow.app, and the id means nothing to an owner.
 * The card says whether the plan is active yet, by the owner's status
 * (`CheckoutSuccessCard`, 66.2-39 fix round 4, Part 8m).
 */
export default function CheckoutSuccessPage() {
	return (
		<div className="container flex min-h-[60vh] items-center justify-center py-12">
			<CheckoutSuccessCard />
		</div>
	);
}
