import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// The browser Sentry SDK was never initialized while its init lived in the
// root `sentry.client.config.ts`: only the Sentry webpack plugin injects that
// file, and this app builds with Turbopack, which loads client setup from
// `src/instrumentation-client.ts` alone. Nothing failed; every client-side
// captureException silently went nowhere. These tests pin the hook in place.

const sentry = vi.hoisted(() => ({
	init: vi.fn(),
	captureRouterTransitionStart: vi.fn(),
	browserTracingIntegration: vi.fn(() => ({ name: "BrowserTracing" })),
	browserApiErrorsIntegration: vi.fn(() => ({ name: "BrowserApiErrors" })),
	feedbackIntegration: vi.fn((_options?: Record<string, unknown>) => ({
		name: "Feedback",
	})),
}));

vi.mock("@sentry/nextjs", () => sentry);

const ROOT = resolve(__dirname, "../..");

describe("Sentry client instrumentation", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
		sentry.init.mockClear();
	});

	it("lives where Next loads client instrumentation, not at the root", () => {
		expect(existsSync(resolve(ROOT, "src/instrumentation-client.ts"))).toBe(
			true,
		);
		expect(existsSync(resolve(ROOT, "sentry.client.config.ts"))).toBe(false);
	});

	it("initializes the browser SDK with the public DSN", async () => {
		vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
		await import("../instrumentation-client");
		expect(sentry.init).toHaveBeenCalledTimes(1);
		const options = sentry.init.mock.calls[0]?.[0] as {
			dsn?: string;
			replaysSessionSampleRate?: number;
			replaysOnErrorSampleRate?: number;
			dataCollection?: { userInfo?: boolean; cookies?: boolean };
		};
		expect(options.dsn).toBe("https://key@o0.ingest.sentry.io/1");
		// Replay stays off (renderer crashes, PR #730) and no PII is collected.
		expect(options.replaysSessionSampleRate).toBe(0);
		expect(options.replaysOnErrorSampleRate).toBe(0);
		expect(options.dataCollection?.userInfo).toBe(false);
		expect(options.dataCollection?.cookies).toBe(false);
	});

	it("never places the feedback button on its own, and asks for no PII", async () => {
		await import("../instrumentation-client");
		const options = sentry.feedbackIntegration.mock.calls.at(-1)?.[0] as
			| Record<string, unknown>
			| undefined;
		// Only the owner shell adds it (FeedbackWidget); marketing pages never do.
		expect(options?.autoInject).toBe(false);
		expect(options?.showEmail).toBe(false);
		expect(options?.showName).toBe(false);
	});

	it("themes the feedback widget without naming a variable the widget defines", async () => {
		await import("../instrumentation-client");
		const options = sentry.feedbackIntegration.mock.calls.at(-1)?.[0] as
			| {
					themeLight?: Record<string, string>;
					themeDark?: Record<string, string>;
			  }
			| undefined;
		// The widget sets --foreground, --background, --border, ... from these
		// values; `var(--foreground)` there is a cycle, and the icon's SVG fill
		// (no inheritance to fall back on) rendered black on the dark button.
		const widgetVars =
			/var\(--(?:foreground|background|accent-foreground|accent-background|success-color|error-color|border|input-border|box-shadow|outline|interactive-filter)\)/;
		for (const theme of [options?.themeLight, options?.themeDark]) {
			expect(theme).toBeDefined();
			for (const value of Object.values(theme ?? {})) {
				expect(value).not.toMatch(widgetVars);
			}
		}
	});

	it("traces App Router navigations", async () => {
		const mod = await import("../instrumentation-client");
		expect(mod.onRouterTransitionStart).toBe(
			sentry.captureRouterTransitionStart,
		);
	});
});
