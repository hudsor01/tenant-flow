/**
 * Pins N2 (66.2-16): an unpinned DataTable cell sets a transparent
 * background, so the TableRow hover and selected fills show through it and the
 * base stylesheet's header-cell fill stays masked; only a pinned cell paints
 * the page surface, through the theme token var(--color-background). The
 * pinned edge shadows read var(--color-border). Under the `@theme inline`
 * token structure the bare var(--background) is defined, so painting it on
 * every cell would cover the row fills.
 */
import {
	type ColumnDef,
	createTable,
	getCoreRowModel,
} from "@tanstack/react-table";
import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";

import { getCommonPinningStyles } from "#lib/data-table";

type Row = { a: string; b: string; c: string };

const columns: ColumnDef<Row>[] = [
	{ id: "a", accessorKey: "a" },
	{ id: "b", accessorKey: "b" },
	{ id: "c", accessorKey: "c" },
];

function buildTable() {
	const table = createTable<Row>({
		data: [
			{ a: "a1", b: "b1", c: "c1" },
			{ a: "a2", b: "b2", c: "c2" },
		],
		columns,
		getCoreRowModel: getCoreRowModel(),
		state: {},
		onStateChange: () => {},
		renderFallbackValue: null,
	});
	table.setOptions((prev) => ({
		...prev,
		state: {
			...table.initialState,
			columnPinning: { left: ["a"], right: ["c"] },
		},
	}));
	return table;
}

function column(id: string) {
	const found = buildTable().getColumn(id);
	if (found === undefined) throw new Error(`column ${id} not found`);
	return found;
}

function stringValues(style: CSSProperties): string[] {
	return Object.values(style).filter(
		(value): value is string => typeof value === "string",
	);
}

function expectNoBareTokens(style: CSSProperties) {
	for (const value of stringValues(style)) {
		expect(value).not.toContain("var(--background)");
		expect(value).not.toContain("var(--border)");
	}
}

describe("getCommonPinningStyles", () => {
	it("sets a transparent background on an unpinned column", () => {
		const style = getCommonPinningStyles({ column: column("b") });
		expect(style.background).toBe("transparent");
		expect(style.position).toBe("relative");
		expect(style.opacity).toBe(1);
		expect(style.zIndex).toBeUndefined();
		expect(style.boxShadow).toBeUndefined();
		expectNoBareTokens(style);
	});

	it("paints the theme background on a left-pinned column", () => {
		const style = getCommonPinningStyles({ column: column("a") });
		expect(style.background).toBe("var(--color-background)");
		expect(style.position).toBe("sticky");
		expect(style.left).toBe("0px");
		expect(style.opacity).toBe(0.97);
		expect(style.zIndex).toBe(1);
		expectNoBareTokens(style);
	});

	it("draws the last left-pinned edge with the theme border token", () => {
		const style = getCommonPinningStyles({
			column: column("a"),
			withBorder: true,
		});
		expect(style.boxShadow).toBe("-4px 0 4px -4px var(--color-border) inset");
		expectNoBareTokens(style);
	});

	it("draws the first right-pinned edge with the theme border token", () => {
		const style = getCommonPinningStyles({
			column: column("c"),
			withBorder: true,
		});
		expect(style.boxShadow).toBe("4px 0 4px -4px var(--color-border) inset");
		expect(style.right).toBe("0px");
		expect(style.background).toBe("var(--color-background)");
		expectNoBareTokens(style);
	});

	it("sets no edge shadow on an unpinned column with withBorder", () => {
		const style = getCommonPinningStyles({
			column: column("b"),
			withBorder: true,
		});
		expect(style.boxShadow).toBeUndefined();
		expect(style.background).toBe("transparent");
		expectNoBareTokens(style);
	});
});
