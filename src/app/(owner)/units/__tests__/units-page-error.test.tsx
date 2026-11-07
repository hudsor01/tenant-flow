/**
 * The units page's error box holds the p-4 it declares (66.2-39 fix round 3,
 * G2): its message is the box's last child, where the base `p` margin cannot
 * collapse past the padding, so it stood 16px under the text (33px to the
 * box's edge in Chrome instead of 17).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";

vi.mock("@tanstack/react-query", async (original) => ({
	...(await original<typeof import("@tanstack/react-query")>()),
	useQuery: () => ({
		data: undefined,
		isLoading: false,
		error: new Error("network"),
	}),
}));
vi.mock("#hooks/api/use-unit", () => ({
	useDeleteUnitMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import UnitsPage from "#app/(owner)/units/page";

describe("the units page error box", () => {
	it("leaves no base paragraph margin under its message", () => {
		render(<UnitsPage />);
		const message = screen.getByText("Failed to load units");
		const { neutralized, baseline } = computeParagraphCascade(message);
		expect(baseline.marginBottom).toBe("16px");
		expect(neutralized.marginBottom).toBe("0px");
	});
});
