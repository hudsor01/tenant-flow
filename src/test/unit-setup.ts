/**
 * Unit Test Setup
 *
 * Minimal setup for unit tests - no MSW or integration features.
 * Used for component tests, store tests, and pure utility tests.
 */

import { format } from "node:util";
import { afterAll, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { currentNavigationClaim } from "#test/utils/expect-navigation";

// Configure React Testing Library for better async handling
configure({
	// Increase default async timeout for property-based tests
	asyncUtilTimeout: 5000,
});

// Skip @t3-oss/env-nextjs validation in tests
// This must be set BEFORE any env.ts imports
process.env.SKIP_ENV_VALIDATION = "true";

// Set up required environment variables for tests
process.env.NEXT_PUBLIC_APP_URL =
	process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_mock";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_mock";
process.env.NEXT_PUBLIC_JWT_ALGORITHM =
	process.env.NEXT_PUBLIC_JWT_ALGORITHM || "ES256";

// Additional environment variables for server-side validation (optional in tests)
process.env.STRIPE_STARTER_MONTHLY =
	process.env.STRIPE_STARTER_MONTHLY || "price_starter_monthly";
process.env.STRIPE_STARTER_ANNUAL =
	process.env.STRIPE_STARTER_ANNUAL || "price_starter_annual";
process.env.STRIPE_GROWTH_MONTHLY =
	process.env.STRIPE_GROWTH_MONTHLY || "price_growth_monthly";
process.env.STRIPE_GROWTH_ANNUAL =
	process.env.STRIPE_GROWTH_ANNUAL || "price_growth_annual";
process.env.STRIPE_MAX_MONTHLY =
	process.env.STRIPE_MAX_MONTHLY || "price_max_monthly";
process.env.STRIPE_MAX_ANNUAL =
	process.env.STRIPE_MAX_ANNUAL || "price_max_annual";

// Mark as unit test mode
process.env.SKIP_INTEGRATION_TESTS = "true";

// A `// @vitest-environment node` file in the unit project (tailwind-theme-integrity.test.ts) has no window/document; everything in this block exists only for jsdom.
if (typeof window !== "undefined") {
	// Mock window.matchMedia for media-query hooks (useReducedMotion, useMediaQuery, etc.)
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});

	// Mock ResizeObserver for components that use it
	class ResizeObserverMock {
		observe = vi.fn();
		unobserve = vi.fn();
		disconnect = vi.fn();
	}
	Object.defineProperty(window, "ResizeObserver", {
		writable: true,
		value: ResizeObserverMock,
	});

	// Polyfill pointer-capture + scrollIntoView for Radix UI in JSDOM.
	// Radix Select / Dropdown / Popover trigger handlers call
	// `target.hasPointerCapture(...)` on the trigger element; JSDOM has no
	// PointerEvent implementation so the call throws TypeError. The empty
	// implementations below are sufficient for unit tests — we don't need
	// real pointer-capture semantics, just the methods to exist.
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = function () {
			return false;
		};
	}
	if (!Element.prototype.setPointerCapture) {
		Element.prototype.setPointerCapture = function () {};
	}
	if (!Element.prototype.releasePointerCapture) {
		Element.prototype.releasePointerCapture = function () {};
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = function () {};
	}

	// Mock IntersectionObserver for lazy loading. `configurable` lets a test replace it with
	// vi.stubGlobal (jsdom has no IntersectionObserver, so a bare defineProperty would lock it).
	class IntersectionObserverMock implements IntersectionObserver {
		readonly root: Element | null = null;
		readonly rootMargin: string = "";
		readonly scrollMargin: string = "";
		readonly thresholds: ReadonlyArray<number> = [];

		constructor(
			private callback: IntersectionObserverCallback,
			_options?: IntersectionObserverInit,
		) {}

		observe = vi.fn((target: Element) => {
			// Immediately trigger the callback with isIntersecting: true
			// This ensures components render as if they're in view
			this.callback(
				[
					{
						target,
						isIntersecting: true,
						intersectionRatio: 1,
						boundingClientRect: target.getBoundingClientRect(),
						intersectionRect: target.getBoundingClientRect(),
						rootBounds: null,
						time: Date.now(),
					},
				] as IntersectionObserverEntry[],
				this,
			);
		});
		unobserve = vi.fn();
		disconnect = vi.fn();
		takeRecords = vi.fn(() => []);
	}
	Object.defineProperty(window, "IntersectionObserver", {
		writable: true,
		configurable: true,
		value: IntersectionObserverMock,
	});
}

// Mock Next.js router hooks (needed for component rendering)
// Importing `src/lib/sentry-browser-init.ts` runs `Sentry.init` with the
// production config. `#lib/sentry-lazy` imports it before its first report;
// in tests that would initialise whatever `@sentry/nextjs` mock the test set
// up. Tests that check the config import its actual module.
vi.mock("#lib/sentry-browser-init", () => ({}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
	useParams: () => ({}),
}));

// Mock nuqs hooks to avoid Next.js app router dependency in tests
// Returns test-friendly values without requiring Next.js app router context
vi.mock("nuqs", async () => {
	const actual = await vi.importActual<typeof import("nuqs")>("nuqs");
	return {
		...actual,
		useQueryState: () => [null, vi.fn()],
		useQueryStates: (keys: Record<string, unknown>) => {
			const state = Object.keys(keys).reduce(
				(acc, key) => ({ ...acc, [key]: null }),
				{},
			);
			return [state, vi.fn()];
		},
	};
});

/**
 * Create a mock fetch Response with proper text() and json() methods
 */
export function createMockResponse<T>(
	data: T,
	ok = true,
	status = 200,
): Response {
	const body = JSON.stringify(data);
	return {
		ok,
		status,
		statusText: ok ? "OK" : "Error",
		headers: new Headers({ "Content-Type": "application/json" }),
		text: () => Promise.resolve(body),
		json: () => Promise.resolve(data),
		clone: function () {
			return createMockResponse(data, ok, status);
		},
		body: null,
		bodyUsed: false,
		arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
		blob: () => Promise.resolve(new Blob()),
		formData: () => Promise.resolve(new FormData()),
		redirected: false,
		type: "basic" as ResponseType,
		url: "",
	} as Response;
}

/**
 * A passing test prints nothing (2026-11-27). Console output from a test is
 * either a defect (a React act() or key warning, a prop leaking to the DOM)
 * or a log the test means to cause and should assert. Any console call a
 * test did not claim fails it here, with the message. A test that expects
 * one claims it with `vi.spyOn(console, "error").mockImplementation(...)`
 * and asserts the call; the spy replaces this recorder for that test.
 */
const CONSOLE_LEVELS = ["error", "warn", "log", "info", "debug"] as const;
const unclaimed: string[] = [];
for (const level of CONSOLE_LEVELS) {
	console[level] = (...args: unknown[]) => {
		unclaimed.push(`console.${level}: ${format(...args)}`);
	};
}

// jsdom reports what it cannot do (following a link to another document,
// for one) on its own virtual console, which Vitest forwards to the outer
// console, past the recorder above. Route those reports to the recorder.
type JsdomVirtualConsole = {
	removeAllListeners: (event: string) => void;
	on: (event: string, listener: (error: Error) => void) => void;
};
const jsdomConsole = (
	globalThis as { jsdom?: { virtualConsole?: JsdomVirtualConsole } }
).jsdom?.virtualConsole;
jsdomConsole?.removeAllListeners("jsdomError");
jsdomConsole?.on("jsdomError", (error) => {
	unclaimed.push(`jsdom: ${error.message}`);
});

// jsdom queues those reports until the file's environment is torn down,
// after every hook, so catch the usual cause where it starts: a click on a
// link that would load another document. The click is cancelled after the
// app's own handlers have run, and fails the test unless the test claimed
// it with expectNavigation(), which records the destination instead.
// Kept here so a test that stubs the URL global cannot break the listener.
const RealURL = URL;
globalThis.window?.addEventListener("click", (event) => {
	if (event.defaultPrevented || !(event.target instanceof Element)) return;
	const link = event.target.closest("a[href]");
	if (!(link instanceof HTMLAnchorElement)) return;
	const to = new RealURL(link.href, window.location.href);
	const here = new RealURL(window.location.href);
	if (
		to.hash &&
		to.origin + to.pathname + to.search ===
			here.origin + here.pathname + here.search
	) {
		return;
	}
	event.preventDefault();
	const claim = currentNavigationClaim();
	if (claim) {
		claim.hrefs.push(link.getAttribute("href") ?? link.href);
		return;
	}
	unclaimed.push(
		`navigation: a click on <a href="${link.getAttribute("href")}"> would load another document`,
	);
});

/**
 * Global cleanup after each test: React Testing Library unmounts first, so
 * a warning raised while unmounting is checked too. Individual tests can
 * call cleanup() manually if needed for iteration.
 */
function failOnUnclaimed(who: string) {
	if (unclaimed.length === 0) return;
	const calls = unclaimed.splice(0);
	throw new Error(
		`${who} wrote to the console ${calls.length} time(s). Fix the cause, or spy on the console method and assert the call:\n\n${calls.join("\n\n")}`,
	);
}

afterEach(() => {
	cleanup();
	failOnUnclaimed("This test");
});

// Output that lands after a test's own teardown (a report jsdom queues, a
// timer that fires late) still fails the file.
afterAll(() => failOnUnclaimed("This file, after its last test,"));
