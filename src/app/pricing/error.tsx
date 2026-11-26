"use client";

import { useEffect } from "react";
import { ErrorPage } from "#components/shared/error-page";
import { captureException } from "#lib/sentry-lazy";

export default function PricingError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		captureException(error, {
			tags: { boundary: "pricing-error" },
			extra: { digest: error.digest },
		});
	}, [error]);

	return <ErrorPage error={error} resetAction={reset} dashboardHref="/" />;
}
