/**
 * @vitest-environment jsdom
 *
 * `#lib/sentry-lazy`: reports that load the SDK first (2026-11-24 SEO audit
 * S1), so marketing pages ship no Sentry in their initial JavaScript.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sentry);

const init = vi.hoisted(() => ({ ran: vi.fn() }));

describe("sentry-lazy", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.doMock("#lib/sentry-browser-init", () => {
			init.ran();
			return {};
		});
	});
	afterEach(() => {
		vi.clearAllMocks();
		vi.doUnmock("#lib/sentry-browser-init");
	});

	it("initialises the browser SDK, then forwards each report", async () => {
		const lazy = await import("#lib/sentry-lazy");
		const error = new Error("boom");
		lazy.captureException(error, { tags: { area: "test" } });
		lazy.captureMessage("hello", "warning");
		lazy.addBreadcrumb({ message: "step" });

		await vi.waitFor(() =>
			expect(sentry.captureException).toHaveBeenCalledWith(error, {
				tags: { area: "test" },
			}),
		);
		expect(sentry.captureMessage).toHaveBeenCalledWith("hello", "warning");
		expect(sentry.addBreadcrumb).toHaveBeenCalledWith({ message: "step" });
		expect(init.ran).toHaveBeenCalledTimes(1);
	});

	it("drops a report whose SDK can't load, and never throws", async () => {
		vi.doMock("#lib/sentry-browser-init", () => {
			throw new Error("chunk failed");
		});
		const lazy = await import("#lib/sentry-lazy");
		expect(() => lazy.captureException(new Error("lost"))).not.toThrow();
		await expect(lazy.loadSentry()).rejects.toBeInstanceOf(Error);
		expect(sentry.captureException).not.toHaveBeenCalled();
	});
});
