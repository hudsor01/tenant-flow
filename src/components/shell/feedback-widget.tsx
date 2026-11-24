"use client";

import * as Sentry from "@sentry/nextjs";
import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * The Sentry "Report a Bug" button, shown only inside the owner app.
 *
 * `src/instrumentation-client.ts` registers the feedback integration with
 * `autoInject: false`, so the button appears on no page by default: signed-in
 * owners are the people who hit real bugs and can describe them, while on the
 * marketing pages a floating bug button reads as an unfinished product. This
 * component adds it while the owner shell is mounted and takes it off the page
 * when the shell unmounts. It renders nothing itself; the widget lives in its
 * own shadow root on <body>, in the bottom-right corner, clear of the
 * bottom-center quick-actions dock and the top-right toasts.
 *
 * The widget follows the app's resolved theme, not the OS: its colors are the
 * app's tokens in both schemes, but its borders come only from its own light
 * or dark preset, and the light preset's borders vanish on a dark background.
 */
export function FeedbackWidget() {
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		// `getFeedback` exists only in the browser build of @sentry/nextjs; the
		// Node build (what unit tests resolve) has none, so it is called optionally.
		const widget = Sentry.getFeedback?.()?.createWidget();
		return () => widget?.removeFromDom();
	}, []);

	useEffect(() => {
		Sentry.getFeedback?.()?.setTheme(
			resolvedTheme === "dark" ? "dark" : "light",
		);
	}, [resolvedTheme]);

	return null;
}
