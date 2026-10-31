/**
 * Pin the {@link useIsMobile} hook (D-33, 66.2-31).
 *
 * The query is the exact complement of Tailwind's `lg` breakpoint, so the
 * JavaScript mode switch (docked rail vs sheet) and the `lg:` classes cannot
 * disagree; tailwind-theme-integrity.test.ts pins the query against the
 * compiled `--breakpoint-lg`. The hook is server-safe: it starts false and
 * reads matchMedia only in an effect, so server and first client render agree.
 */

import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

import { MOBILE_MEDIA_QUERY, useIsMobile } from "#hooks/use-mobile";

interface MockMediaQueryList {
	matches: boolean;
	media: string;
	onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null;
	addEventListener: Mock;
	removeEventListener: Mock;
	dispatchEvent: Mock;
}

type ChangeHandler = (event: Pick<MediaQueryListEvent, "matches">) => void;

function buildMatchMedia(initial: boolean): {
	matchMedia: Mock<(query: string) => MockMediaQueryList>;
	mql: MockMediaQueryList;
} {
	const mql: MockMediaQueryList = {
		matches: initial,
		media: "",
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(() => true),
	};
	const matchMedia = vi.fn((query: string) => {
		mql.media = query;
		return mql;
	});
	return { matchMedia, mql };
}

function isChangeHandler(value: unknown): value is ChangeHandler {
	return typeof value === "function";
}

function lastChangeHandler(mql: MockMediaQueryList): ChangeHandler {
	const calls = mql.addEventListener.mock.calls;
	const lastCall = calls[calls.length - 1];
	expect(lastCall?.[0]).toBe("change");
	const handler: unknown = lastCall?.[1];
	if (!isChangeHandler(handler)) {
		throw new Error("useIsMobile registered no change handler");
	}
	return handler;
}

function Probe() {
	return createElement("span", null, String(useIsMobile()));
}

describe("useIsMobile", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("queries the complement of the lg breakpoint", () => {
		expect(MOBILE_MEDIA_QUERY).toBe("(width < 64rem)");
	});

	it("renders false on the server without calling matchMedia", () => {
		const { matchMedia } = buildMatchMedia(true);
		vi.stubGlobal("matchMedia", matchMedia);

		expect(renderToStaticMarkup(createElement(Probe))).toBe(
			"<span>false</span>",
		);
		expect(matchMedia).toHaveBeenCalledTimes(0);
	});

	it("returns false when the viewport is at least lg", () => {
		const { matchMedia } = buildMatchMedia(false);
		vi.stubGlobal("matchMedia", matchMedia);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
		expect(matchMedia).toHaveBeenCalledWith("(width < 64rem)");
	});

	it("returns true after the effect when the viewport is below lg", () => {
		const { matchMedia } = buildMatchMedia(true);
		vi.stubGlobal("matchMedia", matchMedia);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	it("follows media-query change events", () => {
		const { matchMedia, mql } = buildMatchMedia(false);
		vi.stubGlobal("matchMedia", matchMedia);

		const { result } = renderHook(() => useIsMobile());
		const handler = lastChangeHandler(mql);

		act(() => {
			handler({ matches: true });
		});
		expect(result.current).toBe(true);

		act(() => {
			handler({ matches: false });
		});
		expect(result.current).toBe(false);
	});

	it("removes the same change listener on unmount", () => {
		const { matchMedia, mql } = buildMatchMedia(false);
		vi.stubGlobal("matchMedia", matchMedia);

		const { unmount } = renderHook(() => useIsMobile());
		const handler = lastChangeHandler(mql);

		unmount();

		expect(mql.removeEventListener).toHaveBeenCalledWith("change", handler);
	});
});
