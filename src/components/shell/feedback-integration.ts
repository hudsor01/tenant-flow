import {
	addIntegration,
	feedbackIntegration,
	getFeedback,
} from "@sentry/nextjs";

/**
 * The Sentry "Report a Bug" integration, registered on demand.
 *
 * Only the owner shell shows the button (`FeedbackWidget`), so the
 * integration is built and added the first time that shell mounts, and this
 * module loads through a dynamic `import()`. Registered in
 * `src/instrumentation-client.ts` instead, its UI code shipped to every
 * marketing page (2026-11-24 SEO audit S1).
 */

// The widget's colors: the app's tokens, which switch with `.dark`. No value
// may name a variable the widget itself defines from this object
// (--foreground, --background, --border...): `foreground: "var(--foreground)"`
// becomes `--foreground: var(--foreground)` inside the widget, a cycle CSS
// treats as invalid. Text then inherited the page color and looked right, but
// the icon's SVG fill has no inheritance and fell back to black, invisible on
// the dark button. The popover pair is the widget's surface and text.
const FEEDBACK_THEME = {
	foreground: "var(--popover-foreground)",
	background: "var(--popover)",
	accentForeground: "var(--primary-foreground)",
	accentBackground: "var(--primary)",
	successColor: "var(--success-text)",
	errorColor: "var(--destructive-text)",
	outline: "1px auto var(--ring)",
};

export type FeedbackApi = ReturnType<typeof feedbackIntegration>;

/**
 * The registered feedback integration, adding it on the first call.
 *
 * `autoInject: false`: `FeedbackWidget` places the button. Name and email
 * fields are hidden: the reporter is a signed-in owner, identified by the user
 * id the auth provider sets, and asking for an email would send PII the rest
 * of the Sentry config keeps out. Both schemes read the app's own color
 * tokens (CSS custom properties reach into the widget's shadow root);
 * `FeedbackWidget` switches the scheme with the app's resolved theme.
 */
export function ensureFeedbackIntegration(): FeedbackApi {
	const registered = getFeedback();
	if (registered) return registered;
	const integration = feedbackIntegration({
		autoInject: false,
		colorScheme: "light",
		themeLight: FEEDBACK_THEME,
		themeDark: FEEDBACK_THEME,
		showName: false,
		showEmail: false,
		isNameRequired: false,
		isEmailRequired: false,
		showBranding: false,
		buttonLabel: "Report a Bug",
		submitButtonLabel: "Send Report",
		formTitle: "Report a Problem",
		messagePlaceholder:
			"Describe what happened and what you expected to happen...",
		successMessageText: "Thank you for your report!",
	});
	addIntegration(integration);
	return integration;
}
