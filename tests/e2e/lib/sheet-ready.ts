import type { Locator } from "@playwright/test";
import { polledRead } from "./measure";

/**
 * Waits until a just-opened shadcn Sheet (`#components/ui/sheet`, a Radix modal
 * Dialog) is in the state a user first sees: its entrance has finished and a
 * click outside it dismisses it.
 *
 * WHY `toBeVisible()` IS NOT THAT SIGNAL (measured on a production build,
 * 66.2-39). `toBeVisible()` resolves once the content node is in the DOM with a
 * box, which is before the browser has painted a frame of it. Two things are
 * still pending at that moment:
 *   1. The entrance animation has not started. Until the next frame resolves
 *      its start time it sits at its first keyframe: the left sheet reads
 *      x = -288 and the scrim reads opacity 0, reduced motion included (the
 *      global rule shortens the animation, it does not remove it).
 *   2. Radix DismissableLayer (1.1.11, the copy react-dialog bundles) attaches
 *      its outside-pointerdown listener to `document` in a `setTimeout(0)`, so
 *      the pointerdown that opened a layer cannot dismiss it. In every
 *      measured open that timer ran only after the first frame, about 1ms after
 *      its `requestAnimationFrame` callbacks, and a scrim click Playwright sent
 *      before then was ignored: the sheet stayed open, the mousedown moved
 *      focus to `body`, and the next click dismissed it. That first frame still
 *      showed the sheet off-canvas and the scrim transparent, so no click a
 *      user aims at a visible scrim lands in the gap.
 * `page.mouse.click` at coordinates skips Playwright's actionability checks, so
 * nothing else waits for either.
 *
 * THE GATE. `data-state="open"`; no unfinished animation on the content or on
 * the sheet's overlay; and the content's inline `pointer-events: auto`, which
 * the layer renders only after it has registered in the layer stack. The effect
 * that schedules the listener's `setTimeout(0)` runs before that registration
 * effect, so once `auto` is observed the timer is queued, and a `setTimeout(0)`
 * queued after it runs after it (HTML timer initialization steps: a timer waits
 * for every earlier timer on the same global with an equal or smaller timeout).
 * That last await is the task-ordering barrier, not a delay.
 *
 * Call it only while no other layer sits above the sheet: a higher modal layer
 * renders the sheet `pointer-events: none` (see `waitForLayerStack` in
 * app-shell-sidebar.spec.ts).
 */
export async function waitForSheetReady(sheet: Locator): Promise<void> {
	await polledRead(
		() =>
			sheet.evaluate((node) => {
				const overlays = Array.from(
					document.querySelectorAll('[data-slot="sheet-overlay"]'),
				);
				const unfinished = [node, ...overlays]
					.flatMap((element) => element.getAnimations())
					.filter((animation) => animation.playState !== "finished").length;
				return {
					state: node.getAttribute("data-state"),
					pointerEvents:
						node instanceof HTMLElement ? node.style.pointerEvents : "",
					unfinished,
				};
			}),
		(read) =>
			read.state === "open" &&
			read.pointerEvents === "auto" &&
			read.unfinished === 0,
	);
	await sheet.evaluate(
		() =>
			new Promise<void>((resolve) => {
				setTimeout(resolve, 0);
			}),
	);
}
