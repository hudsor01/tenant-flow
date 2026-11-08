/**
 * @vitest-environment jsdom
 * The leases page (66.2-39 fix round 3).
 *
 * Its error box holds the p-6 it declares (the G2 sweep): the message is the
 * box's last child, where the base `p` margin cannot collapse past the
 * padding, so it stood 16px under the text (41px to the box's edge in Chrome
 * against 25 above). And its selection bar exports every selected lease, one
 * the search hides included (cycle 2, F57), in the order the table lists
 * them: the rows' end dates sort against their fetch order, so an export that
 * wrote the fetched list unsorted would read the other way round (66.2-39 fix
 * round 4, G2).
 */
import type { VirtualItem } from "@tanstack/react-virtual";
import { act, fireEvent, screen } from "@testing-library/react";
import Papa from "papaparse";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLeasesStore } from "#stores/leases-store";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { DEFAULT_LEASE } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

const { leaseList } = vi.hoisted(() => ({
	leaseList: {
		current: {
			data: undefined as unknown,
			isLoading: false,
			error: null as Error | null,
		},
	},
}));
vi.mock("#hooks/api/use-lease", () => ({
	useLeaseList: () => leaseList.current,
}));
// jsdom lays nothing out, so the real virtualizer renders no row; this one
// renders every row, in the table's order.
vi.mock("@tanstack/react-virtual", () => ({
	useVirtualizer: ({ count }: { count: number }) => ({
		getTotalSize: () => count * 64,
		getVirtualItems: (): VirtualItem[] =>
			Array.from({ length: count }, (_, index) => ({
				index,
				start: index * 64,
				size: 64,
				end: index * 64 + 64,
				key: index,
				lane: 0,
			})),
		measureElement: () => undefined,
	}),
}));

import LeasesPage from "#app/(owner)/leases/page";

describe("the leases page", () => {
	it("leaves no base paragraph margin under its error message", () => {
		leaseList.current = {
			data: undefined,
			isLoading: false,
			error: new Error("network"),
		};
		render(<LeasesPage />);
		const { neutralized, baseline } = computeParagraphCascade(
			screen.getByText("Failed to load leases"),
		);
		expect(baseline.marginBottom).toBe("16px");
		expect(neutralized.marginBottom).toBe("0px");
	});

	it("exports a selected lease the search hides, in table order", async () => {
		const row = (
			id: string,
			tenant: string,
			property: string,
			endDate: string,
		) => ({
			...DEFAULT_LEASE,
			id,
			end_date: endDate,
			tenant: { id: `t-${id}`, name: tenant },
			unit: {
				id: `u-${id}`,
				unit_number: "1",
				property: { id: `p-${id}`, name: property, address_line1: "" },
			},
		});
		// Fetched Ann first; the table's default sort (end date, ascending)
		// lists Bo first.
		leaseList.current = {
			data: {
				data: [
					row("l1", "Ann North", "North Court", "2099-12-31"),
					row("l2", "Bo South", "South House", "2098-12-31"),
				],
				total: 2,
			},
			isLoading: false,
			error: null,
		};
		const blobs: Blob[] = [];
		vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
			blobs.push(blob as Blob);
			return "blob:leases";
		});
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
			() => undefined,
		);
		render(<LeasesPage />);
		const tableOrder = screen
			.getAllByRole("row")
			.map((tr) => tr.textContent ?? "")
			.flatMap((text) =>
				["Ann North", "Bo South"].filter((name) => text.includes(name)),
			);
		expect(tableOrder).toEqual(["Bo South", "Ann North"]);
		act(() => {
			useLeasesStore.setState({
				selectedRows: new Set(["l1", "l2"]),
				searchQuery: "north",
			});
		});
		expect(screen.queryByText("Bo South")).not.toBeInTheDocument();
		expect(screen.getByText("2 selected")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		const rows = Papa.parse<string[]>((await blobs[0]?.text()) ?? "", {
			newline: "\r\n",
		}).data;
		expect(rows.slice(1).map((r) => r[0])).toEqual(tableOrder);
	});
});

afterEach(() => {
	useLeasesStore.getState().reset();
	vi.restoreAllMocks();
});
