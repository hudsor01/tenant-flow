import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ActivityItem } from "#types/activity";
import { DashboardActivityCard } from "../dashboard-activity-card";

const { mockUseDashboardActivity } = vi.hoisted(() => ({
	mockUseDashboardActivity: vi.fn(),
}));

vi.mock("#hooks/api/use-dashboard-hooks", () => ({
	useDashboardActivity: () => mockUseDashboardActivity(),
}));

function makeActivity(
	overrides: Partial<ActivityItem> & { id: string },
): ActivityItem {
	return {
		user_id: "owner-1",
		action: "Lease signed",
		entityType: "lease",
		entityId: "lease-1",
		entityName: "Owner signed lease agreement",
		created_at: new Date().toISOString(),
		...overrides,
	};
}

describe("DashboardActivityCard", () => {
	it("renders at most 10 activity rows from useDashboardActivity", () => {
		const items = Array.from({ length: 12 }, (_, i) =>
			makeActivity({ id: `a-${i}`, action: `Action number ${i}` }),
		);
		mockUseDashboardActivity.mockReturnValue({ data: items, isLoading: false });

		render(<DashboardActivityCard />);

		expect(screen.getAllByRole("listitem")).toHaveLength(10);
		expect(screen.getByText(/Action number 0/)).toBeInTheDocument();
		// The 11th and 12th rows are sliced off.
		expect(screen.queryByText(/Action number 10/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Action number 11/)).not.toBeInTheDocument();
	});

	it("renders activity rows with NO unread dot, chevron, or mark-read control (ACT-02 asymmetry)", () => {
		mockUseDashboardActivity.mockReturnValue({
			data: [makeActivity({ id: "a-1" })],
			isLoading: false,
		});

		const { container } = render(<DashboardActivityCard />);

		// No deep-link chevron (notification rows have it; activity rows do not).
		expect(container.querySelector("svg.lucide-chevron-right")).toBeNull();
		// No unread dot (notification unread signal = bg-primary rounded-full dot).
		expect(container.querySelector(".bg-primary.rounded-full")).toBeNull();
		// No mark-read affordance and no navigational link — pure audit trail.
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.queryByRole("link")).toBeNull();
		expect(screen.queryByText(/mark/i)).toBeNull();
	});

	it("renders the Empty compound with 'No activity yet' when there is no activity", () => {
		mockUseDashboardActivity.mockReturnValue({ data: [], isLoading: false });

		render(<DashboardActivityCard />);

		expect(screen.getByText("No activity yet")).toBeInTheDocument();
	});

	it("maps the document entity type to the FileUp glyph (ACT-02 launch palette)", () => {
		mockUseDashboardActivity.mockReturnValue({
			data: [
				makeActivity({
					id: "d-1",
					entityType: "document",
					action: "Document uploaded",
				}),
			],
			isLoading: false,
		});

		const { container } = render(<DashboardActivityCard />);

		expect(container.querySelector("svg.lucide-file-up")).not.toBeNull();
	});
});
