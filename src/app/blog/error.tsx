"use client";

import { useEffect } from "react";
import { ErrorPage } from "#components/shared/error-page";
import { captureException } from "#lib/sentry-lazy";

export default function BlogError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		captureException(error, {
			tags: { boundary: "blog-error" },
			extra: { digest: error.digest },
		});
	}, [error]);

	return <ErrorPage error={error} resetAction={reset} dashboardHref="/" />;
}
