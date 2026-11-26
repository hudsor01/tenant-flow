"use client";

import { useEffect } from "react";
import { ErrorPage } from "#components/shared/error-page";
import { captureException } from "#lib/sentry-lazy";

export default function AuthError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		captureException(error, {
			tags: { boundary: "auth-error" },
			extra: { digest: error.digest },
		});
	}, [error]);

	return <ErrorPage error={error} resetAction={reset} dashboardHref="/" />;
}
