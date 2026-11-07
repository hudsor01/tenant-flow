/**
 * @vitest-environment jsdom
 * The leases page (66.2-39 fix round 3).
 *
 * Its error box holds the p-6 it declares (the G2 sweep): the message is the
 * box's last child, where the base `p` margin cannot collapse past the
 * padding, so it stood 16px under the text (41px to the box's edge in Chrome
 * against 25 above). And its selection bar exports every selected lease, one
 * the search hides included (cycle 2, F57).
 */
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
		const row = (id: string, tenant: string, property: string) => ({
			...DEFAULT_LEASE,
			id,
			end_date: "2099-12-31",
			tenant: { id: `t-${id}`, name: tenant },
			unit: {
				id: `u-${id}`,
				unit_number: "1",
				property: { id: `p-${id}`, name: property, address_line1: "" },
			},
		});
		leaseList.current = {
			data: {
				data: [
					row("l1", "Ann North", "North Court"),
					row("l2", "Bo South", "South House"),
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
		expect(rows.slice(1).map((r) => r[0])).toEqual(["Ann North", "Bo South"]);
	});
});

afterEach(() => {
	useLeasesStore.getState().reset();
	vi.restoreAllMocks();
});
