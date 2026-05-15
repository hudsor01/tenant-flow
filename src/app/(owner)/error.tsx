"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ErrorPage } from "#components/shared/error-page";

/**
 * Error boundary for owner dashboard routes
 * IMPORTANT: This error component is rendered INSIDE the owner layout which already has
 * sidebar and header. Do NOT duplicate layout components here.
 */
export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error, {
			tags: { boundary: "owner-dashboard-error" },
			extra: { digest: error.digest },
		});
	}, [error]);

	return (
		<ErrorPage error={error} resetAction={reset} dashboardHref="/dashboard" />
	);
}
