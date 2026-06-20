import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "#components/ui/loading-spinner";
import CompleteClient from "./complete-client";

// Stripe-checkout result page — verifies session and shows status. No SEO
// value, indistinguishable from `/pricing/success` to a crawler. robots.ts
// also disallows it for defense in depth.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default function CompletePage() {
	// CompleteClient reads useSearchParams(); its own Suspense boundary keeps
	// that client bailout scoped here instead of relying on a root loading.tsx.
	return (
		<Suspense fallback={<PageLoader text="Verifying your subscription..." />}>
			<CompleteClient />
		</Suspense>
	);
}
