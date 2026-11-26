"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { FeedbackApi } from "./feedback-integration";

/**
 * The Sentry "Report a Bug" button, shown only inside the owner app.
 *
 * Signed-in owners are the people who hit real bugs and can describe them;
 * on the marketing pages a floating bug button reads as an unfinished
 * product. This component loads and registers the feedback integration when
 * the owner shell mounts (`./feedback-integration`, a dynamic import, so its
 * code never ships to marketing pages: 2026-11-24 SEO audit S1), adds the
 * button, and takes it off the page when the shell unmounts. It renders
 * nothing itself; the widget lives in its own shadow root on <body>, in the
 * bottom-right corner, clear of the bottom-center quick-actions dock and the
 * top-right toasts.
 *
 * The widget follows the app's resolved theme, not the OS: its colors are the
 * app's tokens in both schemes, but its borders come only from its own light
 * or dark preset, and the light preset's borders vanish on a dark background.
 */
export function FeedbackWidget() {
	const { resolvedTheme } = useTheme();
	const [feedback, setFeedback] = useState<FeedbackApi | null>(null);

	useEffect(() => {
		let cancelled = false;
		let widget: ReturnType<FeedbackApi["createWidget"]> | undefined;
		import("./feedback-integration")
			.then(({ ensureFeedbackIntegration }) => {
				if (cancelled) return;
				const integration = ensureFeedbackIntegration();
				if (!integration) return;
				widget = integration.createWidget();
				setFeedback(integration);
			})
			// A failed chunk load costs the bug button, never the page.
			.catch(() => undefined);
		return () => {
			cancelled = true;
			widget?.removeFromDom();
		};
	}, []);

	useEffect(() => {
		feedback?.setTheme(resolvedTheme === "dark" ? "dark" : "light");
	}, [feedback, resolvedTheme]);

	return null;
}
