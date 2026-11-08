/**
 * A failed rename toasts copy, never the mapper's diagnostic (66.2-39 fix
 * round 4, Part 5d).
 *
 * THE DEFECT. When PostgREST answered a rename with a row the boundary mapper
 * rejects, `documentCategoryMutations.update()` threw a plain `Error` whose
 * message names the mapper and the field, and `handleMutationError` toasted
 * it: the owner read "mapDocumentCategoryRow: NOT NULL field 'slug' missing
 * or non-string from PostgREST response" (Part 5c's rendered sweep). The
 * mapper now throws a `DiagnosticError`, which `userFacingErrorMessage` never
 * shows. This drives the real mutation, mapper and error handler; only the
 * Supabase client, the categories read and the toast are stand-ins.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoriesSettings } from "#components/settings/categories-settings";
import { TooltipProvider } from "#components/ui/tooltip";
import { createQueryChain } from "#test/mocks/supabase-query-mock";

const mocks = vi.hoisted(() => ({
	from: vi.fn(),
	toastError: vi.fn(),
	toastSuccess: vi.fn(),
	category: {
		slug: "warranty",
		label: "Warranty",
		sort_order: 100,
		is_default: false,
		owner_user_id: "owner-1",
		created_at: "2026-04-27T00:00:00Z",
		updated_at: "2026-04-27T00:00:00Z",
	},
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mocks.from }),
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: mocks.toastError,
		success: mocks.toastSuccess,
		warning: vi.fn(),
		info: vi.fn(),
	},
}));

const CATEGORY = mocks.category;

vi.mock("#hooks/api/use-document-categories", () => ({
	useDocumentCategories: () => ({
		categories: [
			{
				id: "cat-other",
				...mocks.category,
				slug: "other",
				label: "Other",
				sort_order: 70,
				is_default: true,
			},
			{ id: "cat-custom", ...mocks.category },
		],
		isLoading: false,
		isError: false,
	}),
}));

function renderSettings() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	render(
		<QueryClientProvider client={queryClient}>
			<CategoriesSettings />
		</QueryClientProvider>,
		{ wrapper: TooltipProvider },
	);
}

async function rename(label: string) {
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: /rename warranty/i }));
	const input = await screen.findByLabelText("Label");
	await user.clear(input);
	await user.type(input, label);
	await user.click(screen.getByRole("button", { name: /^save$/i }));
}

describe("a failed category rename toasts copy, never the mapper's diagnostic", () => {
	beforeEach(() => {
		mocks.from.mockReset();
		mocks.toastError.mockReset();
		mocks.toastSuccess.mockReset();
	});

	it("toasts the generic copy when the updated row has no slug", async () => {
		// The row PostgREST answered with, missing the NOT NULL `slug`.
		mocks.from.mockReturnValue(
			createQueryChain({
				data: {
					id: "cat-custom",
					...CATEGORY,
					slug: undefined,
					label: "Home Warranty",
				},
				error: null,
			}),
		);
		renderSettings();
		await rename("Home Warranty");
		await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1));
		const [shown] = mocks.toastError.mock.calls[0] ?? [];
		expect(shown).toBe("Something went wrong. Please try again.");
		expect(mocks.toastSuccess).not.toHaveBeenCalled();
	});

	it("still toasts the success copy for a well-formed row (positive control)", async () => {
		mocks.from.mockReturnValue(
			createQueryChain({
				data: { id: "cat-custom", ...CATEGORY, label: "Home Warranty" },
				error: null,
			}),
		);
		renderSettings();
		await rename("Home Warranty");
		await waitFor(() =>
			expect(mocks.toastSuccess).toHaveBeenCalledWith("Category renamed."),
		);
		expect(mocks.toastError).not.toHaveBeenCalled();
	});
});
