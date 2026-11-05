/**
 * @vitest-environment jsdom
 * The leases page (66.2-39 fix round 3).
 *
 * Its error box holds the p-6 it declares (the G2 sweep): the message is the
 * box's last child, where the base `p` margin cannot collapse past the
 * padding, so it stood 16px under the text (41px to the box's edge in Chrome
 * against 25 above).
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
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
});
