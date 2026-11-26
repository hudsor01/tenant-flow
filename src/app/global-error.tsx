"use client";

import { useEffect } from "react";
import { ErrorFallback } from "#components/error-boundary/error-fallback";
import { geistMono, roboto } from "#lib/fonts";
import { captureException } from "#lib/sentry-lazy";

import "./globals.css";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		captureException(error, {
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
