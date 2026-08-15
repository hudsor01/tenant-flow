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
 *
 * THAT SENTENCE WAS ALREADY HERE AND WAS ALREADY IGNORED. The commit that wrote
 * it converted E-1 and left thirteen one-shot reads standing across four spec
 * files, and one of them failed on the very next CI run — run 31331577238,
 * `apply-token.spec.ts` E-6, `expect(right).toBeLessThan(0)` receiving exactly
 * `0`. `right === 0` is the signature of an ALL-ZERO rect, which a node has when
 * it holds no layout box: `display: none`, or — the case that actually bit — a
 * node React detached between the locator resolving and the read landing.
 *
 * TWO CONSEQUENCES, AND THE SECOND IS THE SERIOUS ONE.
 *   1. `expect(<number>)` does NOT auto-retry. Only `expect(<locator>)`,
 *      `expect.poll` and `toPass` do. Wrapping a one-shot read in an ordinary
 *      `expect` inherits nothing.
 *   2. An all-zero rect is ALSO what a genuinely regressed element produces, so
 *      the racy assertion cannot tell "layout not committed yet" from "the thing
 *      under test broke". `retries: 2` then turns the race green and launders the
 *      regression along with it.
 *
 * `tests/e2e/lib/__tests__/measure-is-the-only-geometry-read.test.ts` now
 * enforces the rule mechanically, so the next bare read fails a unit test on the
 * commit that adds it rather than a browser test three runs later.
 *
 * THE MULTI-ELEMENT AND COMPOSITE READS BELOW EXIST BECAUSE `boxOf` ALONE COULD
 * NOT ABSORB THEM. Most of the surviving reads were `evaluateAll` sweeps ("every
 * input is 48px", "every field shares one x") or one composite `evaluate` mixing
 * `scrollWidth` with a `Range` measurement. Measuring those element-by-element
 * through `boxOf` would be both slow and WRONG — reading twenty boxes at twenty
 * different moments cannot support an assertion about their relationship. So the
 * atomic single-snapshot read is kept and the POLL is moved around it.
 */

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** A `Box` plus the element's id, so an offender can name itself in a failure. */
export interface MeasuredBox extends Box {
	/** The empty string when the element carries no `id`. */
	id: string;
}

/** Internal: a `MeasuredBox` plus whether the browser gave the node a box at all. */
interface ProbedBox extends MeasuredBox {
	laidOut: boolean;
}

/** Sentinel for "the poll callback never ran", distinguishable from any result. */
const NOT_READ = Symbol("measure/not-read");

/**
 * Reads an element's layout box, polling until the browser has actually
 * committed one.
 *
 * Fails with Playwright's own poll diagnostics (which include the last observed
 * value) rather than a hand-rolled "not rendered" throw that discards it.
 */
export async function boxOf(locator: Locator, timeout = 15_000): Promise<Box> {
	// RETURN THE SNAPSHOT THAT SATISFIED THE POLL. DO NOT RE-READ.
	//
	// The first version of this function polled for a non-null box and then called
	// `boundingBox()` a SECOND time, discarding the observation it had just waited
	// for. It carried a comment asserting the second read could not fail —
	// "Unreachable in practice: the poll above just observed a non-null box."
	//
	// That comment was wrong in exactly the way this whole module exists to warn
	// about: non-null at time T says nothing about time T+epsilon. The two reads
	// are separate round trips to the browser, and a React commit between them
	// makes the second answer `null`. So the helper written to close the
	// poll-then-race hole reopened it inside itself, one line below the poll.
	//
	// It was not hypothetical. On commit 8783cbde8 — the commit that shipped this
	// file — CI run 31393429771 job 93470421874 recorded:
	//
	//   E-5 and E-14: the card caps at 672px and pairs the name fields at 1280px
	//   Error: boundingBox() returned null immediately after polling observed a box
	//     at boxOf (tests/e2e/lib/measure.ts:117:9)
	//
	// and the required `e2e-smoke` check still reported SUCCESS, because
	// `retries: 2` reclassified it as one of "3 flaky". That is the precise
	// laundering this module's header names — produced by the module's own code.
	//
	// `boxesOf` and `polledRead` below never had this defect: both capture inside
	// the poll callback and return what they captured. This now matches them.
	//
	// Poll on a non-null box rather than on a dimension: an element can legitimately
	// measure 0 wide (a collapsed rail is a real layout outcome worth asserting),
	// so polling on `width > 0` would hang on a case the caller wants to observe.
	let captured: Box | null = null;

	await expect
		.poll(
			async () => {
				captured = await locator.boundingBox();
				return captured !== null;
			},
			{ timeout },
		)
		.toBe(true);

	if (captured === null) {
		// Genuinely unreachable — `expect.poll` resolving true means the callback
		// returned true, which requires `captured` to be non-null at that moment,
		// and nothing reassigns it afterwards. Kept because `boundingBox()`'s type
		// is nullable and a cast here would hide a real regression behind a crash
		// somewhere further away. Unlike the version this replaced, the invariant
		// is now established by the same statement that returns the value.
		throw new Error("boxOf: the poll resolved without capturing a box");
	}

	return captured;
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

/**
 * Reads EVERY matched element's box in ONE atomic snapshot, polling until the
 * browser has committed a layout box for all of them.
 *
 * `min` is REQUIRED rather than defaulted, and that is the point. Every
 * "all of them are X" assertion is satisfied vacuously by zero elements, so the
 * caller has to state the count it expects before it can measure anything. A
 * page that rendered nothing times out here instead of passing.
 *
 * The layout probe is `getClientRects().length > 0`, not `width > 0`. An element
 * can legitimately measure zero wide — a collapsed rail is a real layout outcome
 * worth asserting — but an element with NO client rects has no box at all, which
 * is precisely the `display: none` / detached-node state that yields the all-zero
 * rect described in the header. This distinguishes the two.
 *
 * The snapshot returned is the exact one that satisfied the poll, not a second
 * read taken afterwards, so nothing can shift between the check and the answer.
 */
export async function boxesOf(
	locator: Locator,
	options: { min: number; timeout?: number },
): Promise<MeasuredBox[]> {
	const { min, timeout = 15_000 } = options;
	let captured: MeasuredBox[] = [];

	await expect
		.poll(
			async () => {
				const probed: ProbedBox[] = await locator.evaluateAll((nodes) =>
					nodes.map((node) => {
						const rect = node.getBoundingClientRect();
						return {
							id: node.id,
							x: rect.x,
							y: rect.y,
							width: rect.width,
							height: rect.height,
							laidOut: node.getClientRects().length > 0,
						};
					}),
				);
				captured = probed.map((entry) => ({
					id: entry.id,
					x: entry.x,
					y: entry.y,
					width: entry.width,
					height: entry.height,
				}));
				return probed.length >= min && probed.every((entry) => entry.laidOut);
			},
			{ timeout },
		)
		.toBe(true);

	return captured;
}

/**
 * Polls an arbitrary composite measurement until layout has committed, then
 * returns the snapshot that satisfied the gate.
 *
 * For the reads `boxesOf` cannot express: E-22 mixes `scrollWidth`,
 * `clientWidth` and a `Range` measurement of each label's rendered text in one
 * `evaluate`, and all of it has to come from a single moment to mean anything.
 *
 * `hasLayout` MUST be a layout-commitment predicate — "the box has a width",
 * "the text measured non-zero" — and MUST NOT be the property under test.
 * Polling until an assertion passes is how a test stops being able to fail;
 * polling until the browser has finished laying out is how it stops being flaky.
 * In practice `hasLayout` is the test's own positive controls, and the real
 * assertions stay outside as assertions.
 */
export async function polledRead<T>(
	read: () => Promise<T>,
	hasLayout: (value: T) => boolean,
	timeout = 15_000,
): Promise<T> {
	let captured: T | typeof NOT_READ = NOT_READ;

	await expect
		.poll(
			async () => {
				const value = await read();
				captured = value;
				return hasLayout(value);
			},
			{ timeout },
		)
		.toBe(true);

	if (captured === NOT_READ) {
		// Unreachable: `expect.poll` resolving true means the callback ran at least
		// once. Kept so the narrowing below is real rather than an assertion.
		throw new Error("polledRead: the poll resolved without ever reading");
	}
	return captured;
}
