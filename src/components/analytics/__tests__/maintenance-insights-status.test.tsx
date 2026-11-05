/**
 * @vitest-environment jsdom
 * The maintenance insights' status card (get_maintenance_analytics'
 * by_status, 66.2-39 fix round 3, cycle 2, F31).
 *
 * The PR showed each row's status through its label ("In Progress") but the
 * column still filtered on the stored slug, so typing the visible "In
 * Progress" into "Search status..." hid that row ("in_progress" does not
 * contain "in progress").
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { type ReactNode, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import type { MaintenanceInsightsPageData } from "#types/analytics-page-data";

vi.unmock("nuqs");

const { pageData } = vi.hoisted(() => ({
	pageData: {
		current: {
			categoryBreakdown: [
				{ category: "open", count: 2 },
				{ category: "in_progress", count: 3 },
				{ category: "on_hold", count: 1 },
			],
			costs: null,
			costBreakdown: [],
			trends: null,
		} as MaintenanceInsightsPageData,
	},
}));
vi.mock("#hooks/api/use-analytics", () => ({
	analyticsQueries: {
		maintenancePageData: () => ({
			queryKey: ["analytics", "maintenance", "status-card-test"],
			queryFn: async () => pageData.current,
		}),
	},
}));

import { MaintenanceInsightsSection } from "#components/analytics/maintenance-insights-section";

function Wrapper({ children }: { children: ReactNode }) {
	return (
		<NuqsTestingAdapter hasMemory>
			<Suspense fallback={null}>{children}</Suspense>
		</NuqsTestingAdapter>
	);
}

async function statusCard() {
	const search = await screen.findByPlaceholderText("Search status...");
	return search.closest(".bg-card") as HTMLElement;
}

describe("the maintenance insights' status card", () => {
	it("finds a status by the label it shows", async () => {
		render(<MaintenanceInsightsSection />, { wrapper: Wrapper });
		const card = await statusCard();
		fireEvent.change(within(card).getByPlaceholderText("Search status..."), {
			target: { value: "In Progress" },
		});
		const rows = within(card).getAllByRole("row").slice(1);
		expect(rows.map((row) => row.textContent)).toEqual(["In Progress3"]);
	});
});
