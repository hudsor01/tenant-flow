/**
 * @vitest-environment jsdom
 *
 * The browser Sentry SDK was never initialized while its init lived in the
 * root `sentry.client.config.ts`: only the Sentry webpack plugin injects that
 * file, and this app builds with Turbopack, which loads client setup from
 * `src/instrumentation-client.ts` alone. Nothing failed; every client-side
 * captureException silently went nowhere. These tests pin the hook in place,
 * the config it loads (`src/lib/sentry-browser-init.ts`), and when it loads
 * it: at once on account pages, on idle on marketing pages (2026-11-24 SEO
 * audit S1; owner decision 2026-11-25).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
	init: vi.fn(),
	captureRouterTransitionStart: vi.fn(),
	browserTracingIntegration: vi.fn(() => ({ name: "BrowserTracing" })),
	browserApiErrorsIntegration: vi.fn(() => ({ name: "BrowserApiErrors" })),
	consoleLoggingIntegration: vi.fn(() => ({ name: "ConsoleLogs" })),
	feedbackIntegration: vi.fn(() => ({ name: "Feedback" })),
}));
vi.mock("@sentry/nextjs", () => sentry);

const lazy = vi.hoisted(() => ({ loadSentry: vi.fn() }));

const ROOT = resolve(__dirname, "../..");

describe("Sentry browser config (src/lib/sentry-browser-init.ts)", () => {
	beforeEach(() => {
		vi.resetModules();
		// The unit setup mocks this module so other tests never run the init.
		vi.doUnmock("#lib/sentry-browser-init");
		sentry.init.mockClear();
	});
	afterEach(() => vi.unstubAllEnvs());

	it("initializes the browser SDK with the public DSN and no PII", async () => {
		vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
		await import("#lib/sentry-browser-init");
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

	it("registers no feedback integration: its UI code would ship to every page (SEO audit S1)", async () => {
		await import("#lib/sentry-browser-init");
		expect(sentry.feedbackIntegration).not.toHaveBeenCalled();
		const options = sentry.init.mock.calls.at(-1)?.[0] as {
			integrations?: { name: string }[];
		};
		expect(options.integrations?.map((i) => i.name)).not.toContain("Feedback");
	});

	it("captures console warnings and errors as Sentry Logs, scrubbed first", async () => {
		await import("#lib/sentry-browser-init");
		expect(sentry.consoleLoggingIntegration).toHaveBeenCalledWith({
			levels: ["warn", "error"],
		});
		const options = sentry.init.mock.calls.at(-1)?.[0] as {
			integrations?: { name: string }[];
			beforeSendLog?: (log: { level: string; message: string }) => unknown;
		};
		expect(options.integrations?.map((i) => i.name)).toContain("ConsoleLogs");
		expect(
			options.beforeSendLog?.({
				level: "warn",
				message: "opened https://tenantflow.app/sign/fake-token-fixture",
			}),
		).toEqual({
			level: "warn",
			message: "opened https://tenantflow.app/sign/[token]",
		});
	});
});

describe("Sentry client instrumentation (src/instrumentation-client.ts)", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.doMock("./lib/sentry-lazy", () => lazy);
		vi.doMock("../lib/sentry-lazy", () => lazy);
		lazy.loadSentry.mockReset().mockResolvedValue(sentry);
		vi.stubGlobal("requestIdleCallback", vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.doUnmock("./lib/sentry-lazy");
		vi.doUnmock("../lib/sentry-lazy");
		window.history.replaceState(null, "", "/");
	});

	it("lives where Next loads client instrumentation, not at the root", () => {
		expect(existsSync(resolve(ROOT, "src/instrumentation-client.ts"))).toBe(
			true,
		);
		expect(existsSync(resolve(ROOT, "sentry.client.config.ts"))).toBe(false);
	});

	it.each(["/dashboard", "/login", "/auth/update-password", "/admin/blog"])(
		"starts Sentry at once on the account page %s",
		async (path) => {
			window.history.replaceState(null, "", path);
			await import("../instrumentation-client");
			expect(lazy.loadSentry).toHaveBeenCalledTimes(1);
			expect(window.requestIdleCallback).not.toHaveBeenCalled();
		},
	);

	it.each(["/", "/pricing", "/blog/a-post", "/dashboards"])(
		"waits for idle on the marketing page %s",
		async (path) => {
			window.history.replaceState(null, "", path);
			await import("../instrumentation-client");
			expect(lazy.loadSentry).not.toHaveBeenCalled();
			const idle = vi.mocked(window.requestIdleCallback);
			expect(idle).toHaveBeenCalledTimes(1);
			idle.mock.calls[0]?.[0]({ didTimeout: false, timeRemaining: () => 50 });
			expect(lazy.loadSentry).toHaveBeenCalledTimes(1);
		},
	);

	it("traces App Router navigations, loading the SDK first", async () => {
		const mod = await import("../instrumentation-client");
		mod.onRouterTransitionStart("/pricing", "push");
		await vi.waitFor(() =>
			expect(sentry.captureRouterTransitionStart).toHaveBeenCalledWith(
				"/pricing",
				"push",
			),
		);
	});
});
