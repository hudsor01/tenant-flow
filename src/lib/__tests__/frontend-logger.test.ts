/**
 * The app logger, a thin adapter over Sentry Logs (2026-11-28): info, warn
 * and error are Sentry Logs carrying the context as attributes; an error is
 * also an issue; a warning is not; debug never leaves development.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
	log: vi.fn(),
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));
vi.mock("#lib/sentry-lazy", () => sentry);

import { createLogger } from "#lib/frontend-logger";

const logger = createLogger({ component: "LeaseForm" });

describe("createLogger → Sentry", () => {
	beforeEach(() => {
		for (const fn of Object.values(sentry)) fn.mockClear();
	});

	it("writes info as a log with the context, metadata spread to the top", () => {
		logger.info("Lease saved", {
			action: "save",
			lease_id: "l1",
			metadata: { rent_amount: 1500, draft: false },
		});
		expect(sentry.log).toHaveBeenCalledWith("info", "Lease saved", {
			component: "LeaseForm",
			action: "save",
			lease_id: "l1",
			rent_amount: 1500,
			draft: false,
		});
		expect(sentry.captureMessage).not.toHaveBeenCalled();
	});

	it("writes warn as a log and opens no issue", () => {
		logger.warn("Upload slow", { metadata: { duration_ms: 3500 } });
		expect(sentry.log).toHaveBeenCalledWith("warn", "Upload slow", {
			component: "LeaseForm",
			duration_ms: 3500,
		});
		expect(sentry.captureMessage).not.toHaveBeenCalled();
		expect(sentry.captureException).not.toHaveBeenCalled();
	});

	it("writes error as a log naming the Error, and still opens an issue", () => {
		const error = new TypeError("rent is undefined");
		logger.error("Save failed", { action: "save" }, error, { attempt: 2 });
		expect(sentry.log).toHaveBeenCalledWith("error", "Save failed", {
			component: "LeaseForm",
			action: "save",
			"error.type": "TypeError",
			"error.message": "rent is undefined",
			args: [{ attempt: 2 }],
		});
		expect(sentry.captureException).toHaveBeenCalledWith(
			error,
			expect.objectContaining({
				extra: expect.objectContaining({ message: "Save failed" }),
			}),
		);
	});

	it("opens an issue from an error with no Error argument", () => {
		logger.error("Quota read failed");
		expect(sentry.log).toHaveBeenCalledWith("error", "Quota read failed", {
			component: "LeaseForm",
		});
		expect(sentry.captureMessage).toHaveBeenCalledWith(
			"Quota read failed",
			expect.objectContaining({ level: "error" }),
		);
	});

	it("sends nothing for debug outside development", () => {
		logger.debug("Cache hit");
		for (const fn of Object.values(sentry)) expect(fn).not.toHaveBeenCalled();
	});
});
