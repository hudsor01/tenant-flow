// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://tenantflow.app/"}
/**
 * T-COOKIE Secure branch (66.2-31). dom-utils' `secureCookie.set` adds the
 * Secure attribute when `options.secure ?? (window.location.protocol ===
 * "https:")` holds, and `persistSidebarOpen` passes no `secure` key, so on
 * https the auto-detect decides. CI and local E2E serve http, so this file,
 * whose jsdom URL is https, is the only automated proof of that branch. The
 * real writer is the unit under test: `secureCookie` is not mocked.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { persistSidebarOpen } from "#lib/sidebar-state";

afterEach(() => {
	vi.restoreAllMocks();
	Reflect.deleteProperty(document, "cookie");
});

function captureCookieWrites() {
	const cookieSetter = vi.fn();
	Object.defineProperty(document, "cookie", {
		configurable: true,
		get: () => "",
		set: cookieSetter,
	});
	return cookieSetter;
}

describe("persistSidebarOpen over https", () => {
	it("runs under the https jsdom URL", () => {
		expect(window.location.protocol).toBe("https:");
	});

	it("adds Secure when writing false", () => {
		const cookieSetter = captureCookieWrites();
		persistSidebarOpen(false);
		expect(cookieSetter).toHaveBeenCalledTimes(1);
		expect(cookieSetter).toHaveBeenCalledWith(
			"sidebar_state=false; path=/; max-age=604800; SameSite=Lax; Secure",
		);
	});

	it("adds Secure when writing true", () => {
		const cookieSetter = captureCookieWrites();
		persistSidebarOpen(true);
		expect(cookieSetter).toHaveBeenCalledTimes(1);
		expect(cookieSetter).toHaveBeenCalledWith(
			"sidebar_state=true; path=/; max-age=604800; SameSite=Lax; Secure",
		);
	});
});
