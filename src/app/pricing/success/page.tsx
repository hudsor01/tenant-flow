import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLayout } from "#components/layout/page-layout";
import { PageLoader } from "#components/ui/loading-spinner";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { SuccessClient } from "./success-client";

export const metadata: Metadata = createPageMetadata({
	title: "Payment Successful",
	description: "Your TenantFlow subscription is now active.",
	path: "/pricing/success",
	noindex: true,
});

export default function CheckoutSuccessPage() {
	// SuccessClient reads useSearchParams(); its own Suspense boundary keeps
	// that client bailout scoped here instead of relying on a root loading.tsx.
	return (
		<PageLayout>
			<Suspense fallback={<PageLoader text="Confirming your payment..." />}>
				<SuccessClient />
			</Suspense>
		</PageLayout>
	);
}
