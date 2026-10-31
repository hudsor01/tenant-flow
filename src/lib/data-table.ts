import type { Column } from "@tanstack/react-table";
import type { CSSProperties } from "react";

/**
 * Style object for a DataTable header or body cell, keyed to the column's
 * pinning state.
 *
 * An unpinned column sets no background, so the TableRow hover and selected
 * fills show through its cells (N2, 66.2-16). A pinned column paints the page
 * surface with var(--color-background), so rows scrolled under it do not
 * show through, and with `withBorder` its inner edge gets an inset shadow
 * in var(--color-border).
 *
 * @param column - TanStack table column instance
 * @param withBorder - Whether the last left-pinned and first right-pinned
 *   columns get the inner edge shadow
 * @returns the cell's style properties
 */
export function getCommonPinningStyles<TData>({
	column,
	withBorder = false,
}: {
	column: Column<TData>;
	withBorder?: boolean;
}): CSSProperties {
	const isPinned = column.getIsPinned();
	const isLastLeftPinnedColumn =
		isPinned === "left" && column.getIsLastColumn("left");
	const isFirstRightPinnedColumn =
		isPinned === "right" && column.getIsFirstColumn("right");

	return {
		boxShadow: withBorder
			? isLastLeftPinnedColumn
				? "-4px 0 4px -4px var(--color-border) inset"
				: isFirstRightPinnedColumn
					? "4px 0 4px -4px var(--color-border) inset"
					: undefined
			: undefined,
		left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
		right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
		opacity: isPinned ? 0.97 : 1,
		position: isPinned ? "sticky" : "relative",
		background: isPinned ? "var(--color-background)" : undefined,
		width: column.getSize(),
		zIndex: isPinned ? 1 : undefined,
	};
}
