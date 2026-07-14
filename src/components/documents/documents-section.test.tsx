/**
 * DocumentsSection delete confirmation tests
 *
 * DASH-10: document deletion (DB row + storage blob, irreversible) runs only
 * from the ConfirmDialog's confirm action, not directly from the Remove click.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentRow as DocumentRowData } from "#hooks/api/query-keys/document-keys";

const { mockMutate, mockRefetch } = vi.hoisted(() => ({
	mockMutate: vi.fn(),
	mockRefetch: vi.fn(),
}));

// Return objects are created ONCE (factory closures) so every render receives
// the same references — a fresh object per render would re-trigger the
// component's memo/effect chain. Production returns stable query-cache values.
vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();
	const listResult = {
		data: {
			rows: [{ id: "d1", title: "Lease.pdf", file_path: "leases/d1.pdf" }],
			totalCount: 1,
		},
		isLoading: false,
		isError: false,
		refetch: mockRefetch,
	};
	const mutationResult = { mutateAsync: mockMutate, isPending: false };
	const queryClient = { invalidateQueries: vi.fn() };
	return {
		...actual,
		useQuery: () => listResult,
		useMutation: () => mutationResult,
		useQueryClient: () => queryClient,
	};
});

vi.mock("#hooks/api/use-document-categories", () => {
	const result = { categories: [], isLoading: false };
	return { useDocumentCategories: () => result };
});

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock DocumentRow so the delete affordance forwards the doc to `onDelete`.
vi.mock("./document-row", () => ({
	DocumentRow: ({
		doc,
		onDelete,
	}: {
		doc: DocumentRowData;
		onDelete?: (doc: DocumentRowData) => void;
	}) => (
		<button type="button" onClick={() => onDelete?.(doc)}>
			delete-{doc.id}
		</button>
	),
}));

import { DocumentsSection } from "./documents-section";

describe("DocumentsSection delete confirmation", () => {
	beforeEach(() => {
		mockMutate.mockReset().mockResolvedValue(undefined);
		mockRefetch.mockReset();
	});

	it("does not delete on the Remove click — it opens a confirm dialog", async () => {
		render(<DocumentsSection entityType="lease" entityId="lease-1" />);

		await userEvent.click(screen.getByText("delete-d1"));

		expect(mockMutate).not.toHaveBeenCalled();
		expect(screen.getByText("Remove document?")).toBeInTheDocument();
	});

	it("deletes only after confirming in the dialog", async () => {
		render(<DocumentsSection entityType="lease" entityId="lease-1" />);

		await userEvent.click(screen.getByText("delete-d1"));
		await userEvent.click(screen.getByRole("button", { name: "Remove" }));

		expect(mockMutate).toHaveBeenCalledTimes(1);
	});
});
