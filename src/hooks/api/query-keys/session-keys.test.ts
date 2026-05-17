/**
 * parseUserAgent table-driven tests.
 *
 * Pins the browser/OS/device parser the Active Sessions UI relies on
 * after PR #725 cycle-1 review (Session 12 P3 "Unknown Browser on
 * Unknown OS" fix). Each case mirrors a real UA string the synthetic
 * test accounts plus common platforms emit.
 */

import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./session-keys";

describe("parseUserAgent", () => {
	describe("browser detection", () => {
		it.each<[string, string, string]>([
			// Edge desktop — must override Chrome
			[
				"edge-desktop",
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
				"Edge",
			],
			// Edge mobile on Android — EdgA/ token
			[
				"edge-android",
				"Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EdgA/120.0.0.0",
				"Edge",
			],
			// Edge mobile on iOS — EdgiOS/ token
			[
				"edge-ios",
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/120.0.0.0 Mobile/15E148 Safari/604.1",
				"Edge",
			],
			// Opera — OPR/ token
			[
				"opera-desktop",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/105.0.0.0",
				"Opera",
			],
			// Firefox
			[
				"firefox-linux",
				"Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
				"Firefox",
			],
			// Chrome
			[
				"chrome-mac",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Chrome",
			],
			// Safari desktop — requires BOTH Safari/ and Version/
			[
				"safari-mac",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
				"Safari",
			],
			// Safari iPhone
			[
				"safari-iphone",
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
				"Safari",
			],
		])("identifies %s as %s", (_label, ua, expectedBrowser) => {
			expect(parseUserAgent(ua).browser).toBe(expectedBrowser);
		});

		it("returns null browser for an obscure WebView UA with no recognised browser token", () => {
			expect(
				parseUserAgent(
					"Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Mobile",
				).browser,
			).toBeNull();
		});

		it("returns null browser for a Safari UA that lacks the Version/ token (rare WebKit shells)", () => {
			expect(
				parseUserAgent(
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
				).browser,
			).toBeNull();
		});
	});

	describe("OS + device detection", () => {
		it("routes iPad UA to iPadOS/tablet even when 'Mac OS X' is also present", () => {
			const ua =
				"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
			const result = parseUserAgent(ua);
			expect(result.os).toBe("iPadOS");
			expect(result.device).toBe("tablet");
		});

		it("routes iPhone UA to iOS/mobile", () => {
			const ua =
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
			const result = parseUserAgent(ua);
			expect(result.os).toBe("iOS");
			expect(result.device).toBe("mobile");
		});

		it("distinguishes Android mobile (has 'Mobile' token) from Android tablet", () => {
			const mobile =
				"Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
			const tablet =
				"Mozilla/5.0 (Linux; Android 13; SM-T970) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
			expect(parseUserAgent(mobile).device).toBe("mobile");
			expect(parseUserAgent(tablet).device).toBe("tablet");
		});

		it("routes macOS UA to macOS/desktop", () => {
			const ua =
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
			const result = parseUserAgent(ua);
			expect(result.os).toBe("macOS");
			expect(result.device).toBe("desktop");
		});

		it("routes Windows UA to Windows/desktop", () => {
			const ua =
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
			const result = parseUserAgent(ua);
			expect(result.os).toBe("Windows");
			expect(result.device).toBe("desktop");
		});

		it("routes Linux/X11 UA to Linux/desktop", () => {
			const ua =
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
			const result = parseUserAgent(ua);
			expect(result.os).toBe("Linux");
			expect(result.device).toBe("desktop");
		});
	});

	describe("edge cases", () => {
		it("returns all-nulls for null input", () => {
			expect(parseUserAgent(null)).toEqual({
				browser: null,
				os: null,
				device: null,
			});
		});

		it("returns all-nulls for empty string", () => {
			expect(parseUserAgent("")).toEqual({
				browser: null,
				os: null,
				device: null,
			});
		});

		it("returns nulls (not 'Unknown' literals) when nothing matches", () => {
			const result = parseUserAgent("Foo/1.0 (some-headless-thing)");
			expect(result.browser).toBeNull();
			expect(result.os).toBeNull();
			expect(result.device).toBeNull();
		});

		it("does not throw on a UA with no Mozilla/ prefix", () => {
			expect(() => parseUserAgent("curl/8.4.0")).not.toThrow();
		});
	});
});
