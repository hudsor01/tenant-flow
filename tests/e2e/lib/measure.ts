import { expect, type Locator, type Page } from "@playwright/test";

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
 * NOT sufficient, and this repo already learned that the hard way. From the
 * `beforeEach` in `tests/e2e/tests/public/mobile-nav-375px.spec.ts`:
 *
 *   "This guards against server-rendered-but-not-yet-interactive failure modes
 *    observed on Vercel previews where toBeVisible() passes but the element
 *    still has no layout box and onClick handlers aren't attached."
 *
 * Visibility and a committed layout box are different states. `toBeVisible()`
 * can resolve during hydration, in the window before the browser has committed
 * layout, and `boundingBox()` still answers `null`. Narrowing the race is not
 * closing it.
 *
 * `expect.poll()` closes it: it re-invokes the callback until the assertion
 * passes or the timeout expires, so a late layout commit is waited out rather
 * than raced. mobile-nav-375px.spec.ts's 44x44 hit-target test first did that
 * with two hand-rolled `expect.poll` reads; this module generalises it, so that
 * test and every other measurement in the suite inherit it instead of each spec
 * re-deriving it.
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
interface MeasuredBox extends Box {
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
	//     at boxOf (tests/e2e/lib/measure.ts)
	//
	// (the frame's line number, which counted this file as 8783cbde8 had it, is
	// left out)
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

/**
 * One reading of a page state for the reflow guard (`reflow.ts`), WCAG 1.4.10
 * and the text-overrun class (66.2-39 fix round 4, Part 8e). `problems` names
 * every way the state fails at the viewport's width:
 *   - the document scrolls sideways;
 *   - an open overlay (dialog, sheet, menu, listbox, popover, tooltip) sits
 *     past the viewport (either axis: a fixed overlay does not scroll with
 *     the page), or scrolls sideways inside itself;
 *   - a control sits past the viewport and no scroller it is in reaches it;
 *   - text runs past its own box where that box does not clip it (a fixed
 *     three-column grid left a lease term 44.66px, and $1,500.00 ran 36px into
 *     the next term), or below it by more than a quarter of its font size
 *     (glyphs past a tight line box are not an overrun).
 * Visually hidden text (an `sr-only` box, through any variant), SVG and chart
 * text are not read. `settled` is the layout gate the read polls on: the main
 * landmark (or, for an overlay state, an open overlay) has a box, no skeleton
 * remains, no finite animation is running and the app header has its user
 * menu.
 */
export interface ReflowReading {
	settled: boolean;
	clientWidth: number;
	scrollWidth: number;
	problems: string[];
}

/** The open overlays a reflow reading measures, outermost only. */
export const REFLOW_OVERLAYS =
	'[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper] > *, [data-slot="tour-step"]';

function reflowSnapshot(arg: {
	scope: "page" | "overlay";
	overlays: string;
}): ReflowReading {
	const doc = document.documentElement;
	const cw = doc.clientWidth;
	const r2 = (n: number) => Math.round(n * 100) / 100;
	const shown = (el: Element) =>
		el.getClientRects().length > 0 &&
		el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
	const hidden = (el: Element) => {
		for (let a: Element | null = el, i = 0; a && i < 6; a = a.parentElement) {
			const s = getComputedStyle(a);
			if ((s.clip && s.clip !== "auto") || s.clipPath.includes("inset(50%)")) {
				return true;
			}
			const r = a.getBoundingClientRect();
			if (s.position === "absolute" && r.width <= 1.01 && r.height <= 1.01) {
				return true;
			}
			i += 1;
		}
		return false;
	};
	const label = (el: Element) => {
		const slot = el.getAttribute("data-slot");
		const role = el.getAttribute("role");
		const text = (el.getAttribute("aria-label") || el.textContent || "")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 40);
		return `${el.tagName.toLowerCase()}${slot ? `[${slot}]` : role ? `[${role}]` : ""} "${text}"`;
	};
	const open = [...document.querySelectorAll(arg.overlays)]
		.filter(shown)
		.filter((o, _, all) => !all.some((p) => p !== o && p.contains(o)));
	const main = document.querySelector("main");
	const running = document
		.getAnimations()
		.some(
			(a) =>
				a.playState === "running" &&
				a.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY,
		);
	const header = document.querySelector(
		"header:has([data-slot=sidebar-trigger])",
	);
	const headerReady =
		!header || header.querySelector('[aria-label$=" user menu"]') !== null;
	// An overlay that closed on its own (a tooltip losing focus) leaves the
	// page's state to read.
	const scope =
		arg.scope === "overlay" && open.length === 0 ? "page" : arg.scope;
	const settled =
		!running &&
		(scope === "overlay"
			? open.length > 0
			: !!main &&
				main.clientHeight > 0 &&
				main.querySelector('[data-slot="skeleton"]') === null &&
				headerReady);
	const roots: Element[] =
		scope === "overlay"
			? open
			: [
					...(main ? [main] : []),
					...[...document.querySelectorAll("header")].filter(
						(h) => !h.closest("main"),
					),
				];
	const problems: string[] = [];
	if (doc.scrollWidth > cw) {
		problems.push(`the page scrolls sideways: ${doc.scrollWidth}px wide`);
	}
	for (const o of open) {
		const r = o.getBoundingClientRect();
		const s = getComputedStyle(o);
		if (r.left < -0.5 || r.right > cw + 0.5) {
			problems.push(
				`${label(o)} sits past the viewport (${r2(r.left)} to ${r2(r.right)})`,
			);
		}
		// A fixed overlay does not scroll with the page: past the viewport's
		// height, its ends are out of reach.
		if (r.top < -0.5 || r.bottom > window.innerHeight + 0.5) {
			problems.push(
				`${label(o)} runs past the viewport's height (${r2(r.top)} to ${r2(r.bottom)} of ${window.innerHeight})`,
			);
		}
		if (s.overflowX !== "visible" && o.scrollWidth > o.clientWidth + 1) {
			problems.push(
				`${label(o)} scrolls sideways inside (${o.scrollWidth}px in ${o.clientWidth}px)`,
			);
		}
	}
	const inScroller = (el: Element) => {
		for (
			let a = el.parentElement;
			a && a !== document.body;
			a = a.parentElement
		) {
			const s = getComputedStyle(a);
			if (
				(s.overflowX === "auto" || s.overflowX === "scroll") &&
				a.scrollWidth > a.clientWidth + 1
			) {
				return true;
			}
		}
		return false;
	};
	const CONTROL =
		'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="combobox"], [role="menuitem"], [role="option"], [role="checkbox"], [role="switch"], [role="radio"], [role="slider"]';
	const isBox = (el: Element) => {
		const d = getComputedStyle(el).display;
		return d !== "inline" && d !== "contents";
	};
	for (const root of roots) {
		for (const el of root.querySelectorAll(CONTROL)) {
			if (!shown(el) || hidden(el)) continue;
			const r = el.getBoundingClientRect();
			if (r.right <= cw + 0.5 && r.left >= -0.5) continue;
			if (inScroller(el)) continue;
			problems.push(
				`${label(el)} sits past the viewport (${r2(r.left)} to ${r2(r.right)})`,
			);
		}
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let n = walker.nextNode(); n; n = walker.nextNode()) {
			const text = (n.textContent ?? "").trim();
			const parent = n.parentElement;
			if (!text || !parent) continue;
			if (
				parent.closest(
					"svg, script, style, noscript, .recharts-wrapper, [data-slot='chart']",
				) ||
				hidden(parent)
			) {
				continue;
			}
			let box: Element | null = parent;
			while (box && !isBox(box)) box = box.parentElement;
			if (!box) continue;
			// Preserved whitespace at a line's end hangs past the box without
			// ink (white-space: pre-wrap), so there only the words are read.
			const words = getComputedStyle(parent).whiteSpace.startsWith("pre")
				? [...(n.textContent ?? "").matchAll(/\S+/g)].map((m) => [
						m.index,
						m.index + m[0].length,
					])
				: [[0, (n.textContent ?? "").length]];
			const rects = words
				.flatMap(([start, end]) => {
					const range = document.createRange();
					range.setStart(n, start ?? 0);
					range.setEnd(n, end ?? 0);
					return [...range.getClientRects()];
				})
				.filter((r) => r.width > 0.5 && r.height > 0.5);
			if (rects.length === 0) continue;
			const b = box.getBoundingClientRect();
			if (b.width <= 0) continue;
			const s = getComputedStyle(box);
			const left = b.left + Number.parseFloat(s.borderLeftWidth);
			const right = b.right - Number.parseFloat(s.borderRightWidth);
			const bottom = b.bottom - Number.parseFloat(s.borderBottomWidth);
			const dx = Math.max(
				Math.max(...rects.map((r) => r.right)) - right,
				left - Math.min(...rects.map((r) => r.left)),
			);
			const dy = Math.max(...rects.map((r) => r.bottom)) - bottom;
			const size = Number.parseFloat(getComputedStyle(parent).fontSize) || 16;
			const overX = dx > 1 && s.overflowX === "visible";
			const overY = dy > Math.max(4, size / 4) && s.overflowY === "visible";
			if (!overX && !overY) continue;
			problems.push(
				`"${text.slice(0, 40)}" runs ${r2(overX ? dx : dy)}px ${overX ? "past" : "below"} its box, ${label(box)}`,
			);
		}
	}
	return {
		settled,
		clientWidth: cw,
		scrollWidth: doc.scrollWidth,
		problems: [...new Set(problems)],
	};
}

/**
 * The settled reflow reading of the page's current state (`ReflowReading`):
 * `scope` "overlay" measures the open overlays, "page" the main landmark and
 * the app header. Polled until the layout gate holds; the caller asserts
 * `problems` after.
 */
export async function readReflow(
	page: Page,
	scope: "page" | "overlay",
	timeout = 20_000,
): Promise<ReflowReading> {
	return polledRead(
		() => page.evaluate(reflowSnapshot, { scope, overlays: REFLOW_OVERLAYS }),
		(value) => value.settled,
		timeout,
	);
}
