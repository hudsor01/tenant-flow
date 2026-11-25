/**
 * The "Report a Bug" integration, registered on demand by the owner shell
 * (2026-11-24 SEO audit S1 moved it out of the site-wide Sentry init).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
	getFeedback: vi.fn(),
	addIntegration: vi.fn(),
	feedbackIntegration: vi.fn((options: Record<string, unknown>) => ({
		name: "Feedback",
		options,
	})),
}));
vi.mock("@sentry/nextjs", () => sentry);

import { ensureFeedbackIntegration } from "../feedback-integration";

function optionsOf(integration: unknown) {
	return (integration as { options: Record<string, unknown> }).options;
}

describe("ensureFeedbackIntegration", () => {
	afterEach(() => vi.clearAllMocks());

	it("adds the integration once and reuses the registered one", () => {
		const added = ensureFeedbackIntegration();
		expect(sentry.addIntegration).toHaveBeenCalledWith(added);

		sentry.getFeedback.mockReturnValue(added);
		expect(ensureFeedbackIntegration()).toBe(added);
		expect(sentry.feedbackIntegration).toHaveBeenCalledTimes(1);
	});

	it("never places the button on its own, and asks for no PII", () => {
		const options = optionsOf(ensureFeedbackIntegration());
		// FeedbackWidget places it, inside the owner shell only.
		expect(options.autoInject).toBe(false);
		expect(options.showEmail).toBe(false);
		expect(options.showName).toBe(false);
	});

	it("themes the widget without naming a variable the widget defines", () => {
		const options = optionsOf(ensureFeedbackIntegration()) as {
			themeLight?: Record<string, string>;
			themeDark?: Record<string, string>;
		};
		// The widget sets --foreground, --background, --border, ... from these
		// values; `var(--foreground)` there is a cycle, and the icon's SVG fill
		// (no inheritance to fall back on) rendered black on the dark button.
		const widgetVars =
			/var\(--(?:foreground|background|accent-foreground|accent-background|success-color|error-color|border|input-border|box-shadow|outline|interactive-filter)\)/;
		for (const theme of [options.themeLight, options.themeDark]) {
			expect(theme).toBeDefined();
			for (const value of Object.values(theme ?? {})) {
				expect(value).not.toMatch(widgetVars);
			}
		}
	});
});
