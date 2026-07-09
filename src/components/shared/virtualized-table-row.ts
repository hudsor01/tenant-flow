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
export function getVirtualRowStyle(virtualRow: VirtualItem): CSSProperties {
	return {
		height: `${virtualRow.size}px`,
		transform: `translateY(${virtualRow.start}px)`,
	};
}
