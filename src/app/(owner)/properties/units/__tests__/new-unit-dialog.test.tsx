/**
 * The Add Unit dialog's Cancel closes it.
 *
 * Cancel was a `type="button"` Button with no handler and no DialogClose, so
 * clicking it did nothing; the create path "closed" the dialog by clicking the
 * same button through `closeButtonRef`, so a successful create left the dialog
 * open too. Cancel is now a DialogClose, which both paths reach.
 */

import {
	QueryClient,
	QueryClientProvider,
	queryOptions,
} from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock("next/dynamic", () => ({
	default: () => () => createElement("div", { "data-testid": "chart" }),
}));
vi.mock("#hooks/api/query-keys/unit-keys", () => ({
	unitQueries: {
		list: () =>
			queryOptions({
				queryKey: ["test", "units"],
				queryFn: async () => ({ data: [], total: 0 }),
			}),
		stats: () =>
			queryOptions({
				queryKey: ["test", "unit-stats"],
				queryFn: async () => ({
					total: 0,
					occupied: 0,
					vacant: 0,
					maintenance: 0,
					occupancyRate: 0,
				}),
			}),
	},
}));
vi.mock("#hooks/api/query-keys/property-keys", () => ({
	propertyQueries: {
		list: () =>
			queryOptions({
				queryKey: ["test", "properties"],
				queryFn: async () => ({ data: [{ id: "p1", name: "Maple Court" }] }),
			}),
	},
}));
vi.mock("#hooks/api/use-unit", () => ({
	useCreateUnitMutation: () => ({
		mutateAsync: hooks.mutateAsync,
		isPending: false,
	}),
}));

import UnitsPage from "../page";

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	return render(
		createElement(QueryClientProvider, { client }, createElement(UnitsPage)),
	);
}

describe("Add Unit dialog", () => {
	it("closes on Cancel", async () => {
		const user = userEvent.setup();
		renderPage();
		await user.click(await screen.findByRole("button", { name: "Add Unit" }));
		const dialog = await screen.findByRole("dialog", { name: "Add New Unit" });
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(dialog).not.toBeInTheDocument());
	});
});
