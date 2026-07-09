import type { VirtualItem } from "@tanstack/react-virtual";
import type { CSSProperties } from "react";

/**
 * Static layout classes for a virtualized flex-row `<tr>`.
 *
 * The row is absolutely positioned inside its `position: relative` `<tbody>`
 * spacer, spans the full table width, and is a flex container so its `<td>`s can
 * carry explicit per-column widths that line up with the flex `<thead>` cells.
 * The property and tenant tables share this so their row virtualization stays in
 * lockstep — both must move together.
 */
export const VIRTUAL_ROW_CLASS =
	"absolute left-0 top-0 flex w-full items-center";

/**
 * Dynamic per-row positioning style driven by the virtualizer.
 *
 * `height` (from `virtualRow.size`) and the `translateY(virtualRow.start)` offset
 * are computed at runtime, so they must be inline style rather than Tailwind
 * utilities — the same reason the `<tbody>` spacer sets its total height inline.
 */
export function getVirtualRowStyle(
	virtualRow: VirtualItem,
	opts?: { measured?: boolean },
): CSSProperties {
	// Measured rows (variable height via `measureElement` — e.g. the leases table,
	// whose tenant cell stacks a 3rd line below `lg`) must NOT be pinned to a fixed
	// height, or measurement reads the pinned value and rows overlap. Fixed rows
	// (uniform content) keep the exact estimateSize height.
	if (opts?.measured) {
		return { transform: `translateY(${virtualRow.start}px)` };
	}
	return {
		height: `${virtualRow.size}px`,
		transform: `translateY(${virtualRow.start}px)`,
	};
}
