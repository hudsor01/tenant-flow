import { expect, type Locator } from "@playwright/test";

/**
 * Canonical layout measurement for this suite.
 *
 * WHY THIS EXISTS, AND WHY `toBeVisible()` IS NOT ENOUGH.
 *
 * `Locator.boundingBox()` is a ONE-SHOT query. It answers `null` whenever the
 * element does not currently have a layout box, and — unlike every `expect()`
 * in Playwright — it does NOT retry. A measurement written as
 *
 *     const box = await locator.boundingBox();
 *     if (!box) throw new Error("element has no bounding box (not rendered)");
 *
 * therefore fails the instant it is called a few milliseconds early, and the
 * error message blames the element for "not rendering" when the element is
 * perfectly fine. That exact message took down CI twice in this repo: Phase 65's
 * `documents-hub.spec.ts` medallion ladder (which failed 3/3 attempts on `main`
 * from 2026-08-05, because it measured immediately after `beforeEach` navigated
 * with no wait at all), and Phase 66's `apply-token.spec.ts` E-1 (which
 * Playwright classed FLAKY in the same run, since a later attempt read the very
 * same element successfully).
 *
 * The obvious fix — gate the read on `await expect(locator).toBeVisible()` — is
 * NOT sufficient, and this repo already learned that the hard way. From
 * `tests/e2e/tests/public/mobile-nav-375px.spec.ts:8-11`:
 *
 *   "This guards against server-rendered-but-not-yet-interactive failure modes
 *    observed on Vercel previews where toBeVisible() passes but boundingBox()
 *    returns null and onClick handlers aren't attached."
 *
 * Visibility and a committed layout box are different states. `toBeVisible()`
 * can resolve during hydration, in the window before the browser has committed
 * layout, and `boundingBox()` still answers `null`. Narrowing the race is not
 * closing it.
 *
 * `expect.poll()` closes it: it re-invokes the callback until the assertion
 * passes or the timeout expires, so a late layout commit is waited out rather
 * than raced. That is the pattern mobile-nav-375px.spec.ts:57-64 already uses
 * for the 44x44 hit-target reads, and this module generalises it so every
 * measurement in the suite inherits it instead of each spec re-deriving it.
 *
 * Use these helpers for ALL geometry reads. A bare `boundingBox()` in a spec is
 * a latent CI failure, not a style preference.
 */

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Reads an element's layout box, polling until the browser has actually
 * committed one.
 *
 * Fails with Playwright's own poll diagnostics (which include the last observed
 * value) rather than a hand-rolled "not rendered" throw that discards it.
 */
export async function boxOf(locator: Locator, timeout = 15_000): Promise<Box> {
	// Poll on a non-null box rather than on a dimension: an element can legitimately
	// measure 0 wide (a collapsed rail is a real layout outcome worth asserting),
	// so polling on `width > 0` would hang on a case the caller wants to observe.
	await expect
		.poll(async () => (await locator.boundingBox()) !== null, { timeout })
		.toBe(true);

	const box = await locator.boundingBox();
	if (!box) {
		// Unreachable in practice: the poll above just observed a non-null box. Kept
		// because boundingBox()'s type is nullable and a narrowing cast here would
		// hide a genuine regression behind a runtime crash somewhere further away.
		throw new Error(
			"boundingBox() returned null immediately after polling observed a box",
		);
	}
	return box;
}

/** Rendered width in CSS pixels, measured after layout has committed. */
export async function widthOf(
	locator: Locator,
	timeout = 15_000,
): Promise<number> {
	return (await boxOf(locator, timeout)).width;
}

/** Rendered height in CSS pixels, measured after layout has committed. */
export async function heightOf(
	locator: Locator,
	timeout = 15_000,
): Promise<number> {
	return (await boxOf(locator, timeout)).height;
}
