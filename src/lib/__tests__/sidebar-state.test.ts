/**
 * Pins the `sidebar_state` cookie contract (D-36, 66.2-31). The async owner
 * layout reads the cookie on the server and passes the parsed value to the
 * sidebar provider; the vendored sidebar writes it on each desktop toggle.
 *
 * T-COOKIE: any value other than the literal false means expanded; the cookie
 * is a UI preference and is never used for access. The writer reuses
 * `secureCookie.set` from dom-utils, so there is one cookie serializer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { secureCookie } from "#lib/dom-utils";
import {
	parseSidebarOpen,
	persistSidebarOpen,
	SIDEBAR_COOKIE_MAX_AGE,
	SIDEBAR_COOKIE_NAME,
} from "#lib/sidebar-state";

afterEach(() => {
	vi.restoreAllMocks();
	Reflect.deleteProperty(document, "cookie");
});

describe("sidebar-state constants", () => {
	it("names the cookie sidebar_state", () => {
		expect(SIDEBAR_COOKIE_NAME).toBe("sidebar_state");
	});

	it("keeps the cookie for 7 days", () => {
		expect(SIDEBAR_COOKIE_MAX_AGE).toBe(604800);
	});
});

describe("parseSidebarOpen", () => {
	it.each<[string | undefined, boolean]>([
		[undefined, true],
		["true", true],
		["false", false],
		["", true],
		["False", true],
		["FALSE", true],
		["0", true],
		["false ", true],
		["<img src=x>", true],
	])("maps %j to %s", (value, expected) => {
		expect(parseSidebarOpen(value)).toBe(expected);
	});
});

describe("persistSidebarOpen", () => {
	it("writes false through secureCookie.set with the sidebar options", () => {
		const setSpy = vi
			.spyOn(secureCookie, "set")
			.mockImplementation(() => undefined);
		persistSidebarOpen(false);
		expect(setSpy).toHaveBeenCalledTimes(1);
		expect(setSpy).toHaveBeenCalledWith("sidebar_state", "false", {
			path: "/",
			maxAge: 604800,
			sameSite: "Lax",
		});
	});

	it("writes true through secureCookie.set with the sidebar options", () => {
		const setSpy = vi
			.spyOn(secureCookie, "set")
			.mockImplementation(() => undefined);
		persistSidebarOpen(true);
		expect(setSpy).toHaveBeenCalledTimes(1);
		expect(setSpy).toHaveBeenCalledWith("sidebar_state", "true", {
			path: "/",
			maxAge: 604800,
			sameSite: "Lax",
		});
	});

	it("emits the exact cookie string with the real writer over http", () => {
		// jsdom's default URL is http, so dom-utils adds no Secure attribute.
		// The https branch is pinned by sidebar-state-https.test.ts.
		expect(window.location.protocol).toBe("http:");
		const cookieSetter = vi.fn();
		Object.defineProperty(document, "cookie", {
			configurable: true,
			get: () => "",
			set: cookieSetter,
		});
		persistSidebarOpen(false);
		expect(cookieSetter).toHaveBeenCalledTimes(1);
		expect(cookieSetter).toHaveBeenCalledWith(
			"sidebar_state=false; path=/; max-age=604800; SameSite=Lax",
		);
	});
});

describe("sidebar-state module source (P11)", () => {
	it("is a non-client module with no react or next import", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/sidebar-state.ts"),
			"utf8",
		);
		expect(source).not.toMatch(/^\s*["']use client["']/m);
		expect(source).not.toMatch(/from\s+["'](react|next\/)/);
	});
});
