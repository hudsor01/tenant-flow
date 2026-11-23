import type { Metadata } from "next";
import { PageLayout } from "#components/layout/page-layout";
import { NotFoundPage } from "#components/shared/not-found-page";

// Without this the 404 inherits the root layout's indexable robots tag, so it
// carried both that and the noindex Next injects for a 404. The 410 Gone body
// for a deleted blog post (src/app/api/blog-gone/route.ts) is this page too.
export const metadata: Metadata = {
	title: "Page Not Found",
	robots: { index: false, follow: true },
};

// Public 404: renders the marketing navbar + footer so a signed-out
// visitor who mistypes a URL can recover into Features / Pricing /
// Compare / Sign In instead of being stranded with one "Back to Home"
// button.
export default function NotFound() {
	return (
		<PageLayout>
			<NotFoundPage dashboardHref="/" />
		</PageLayout>
	);
}
