"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ErrorFallback } from "#components/error-boundary/error-fallback";
import { geistMono, roboto } from "#lib/fonts";

import "./globals.css";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error, {
			tags: { boundary: "global-error" },
			extra: { digest: error.digest },
		});
	}, [error]);

	return (
		<html lang="en" className={`${roboto.variable} ${geistMono.variable}`}>
			<body className="font-sans antialiased">
				<ErrorFallback error={error} reset={reset} />
			</body>
		</html>
	);
}
