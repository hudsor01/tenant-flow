/**
 * DownloadSignedLeaseButton tests
 *
 * @vitest-environment jsdom
 */

import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type DocumentRow,
	documentQueries,
} from "#hooks/api/query-keys/document-keys";
import { expectConsole } from "#test/utils/expect-console";
import { createTestWrapper, render } from "#test/utils/test-render";
import { DownloadSignedLeaseButton } from "../download-signed-lease-button";

const {
	mockUseSignedDocumentUrl,
	finalizeMutate,
	invalidateVaultCopy,
	toastError,
} = vi.hoisted(() => ({
	mockUseSignedDocumentUrl: vi.fn(),
	finalizeMutate: vi.fn(),
	invalidateVaultCopy: vi.fn(),
	toastError: vi.fn(),
}));
const refetch = vi.fn();

vi.mock("#hooks/api/use-lease", () => ({
	useSignedDocumentUrl: (...args: unknown[]) =>
		mockUseSignedDocumentUrl(...args),
}));

vi.mock("#hooks/api/use-lease-signature-mutations", () => ({
	useFinalizeSignedLeaseMutation: () => ({ mutate: finalizeMutate }),
	invalidateSignedLeaseVaultCopy: (...args: unknown[]) =>
		invalidateVaultCopy(...args),
}));

vi.mock("sonner", () => ({
	toast: { error: (...args: unknown[]) => toastError(...args) },
}));

const PROJECT_URL = "https://abcdefgh.supabase.co";
// The shape supabase-js's createSignedUrl returns for the private bucket.
const SIGNED_URL = `${PROJECT_URL}/storage/v1/object/sign/tenant-documents/lease/l1/signed-lease.pdf?token=abc123`;

describe("DownloadSignedLeaseButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT_URL);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("renders a Retry button and refetches on a storage failure", () => {
		mockUseSignedDocumentUrl.mockReturnValue({
			data: null,
			isLoading: false,
			error: new Error("boom"),
			refetch,
		});
		render(<DownloadSignedLeaseButton leaseId="l1" />);

		const btn = screen.getByTestId("download-signed-lease-error");
		expect(btn).toBeInTheDocument();
		fireEvent.click(btn);
		expect(toastError).toHaveBeenCalled();
		expect(refetch).toHaveBeenCalled();
	});

	it("opens the signed PDF when a URL is available", () => {
		const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
		mockUseSignedDocumentUrl.mockReturnValue({
			data: { document_url: SIGNED_URL },
			isLoading: false,
			error: null,
			refetch,
		});
		render(<DownloadSignedLeaseButton leaseId="l1" />);

		fireEvent.click(screen.getByTestId("download-signed-lease-button"));
		expect(openSpy).toHaveBeenCalledWith(
			SIGNED_URL,
			"_blank",
			"noopener,noreferrer",
		);
		expect(toastError).not.toHaveBeenCalled();
		openSpy.mockRestore();
	});

	it.each([
		"https://storage.example/doc.pdf",
		"https://otherproject.supabase.co/storage/v1/object/sign/tenant-documents/a.pdf?token=t",
		`${PROJECT_URL}/rest/v1/leases`,
		"javascript:alert(document.cookie)",
	])("does not open %s, and toasts instead", (url) => {
		const consoleError = expectConsole("error");
		const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
		mockUseSignedDocumentUrl.mockReturnValue({
			data: { document_url: url },
			isLoading: false,
			error: null,
			refetch,
		});
		render(<DownloadSignedLeaseButton leaseId="l1" />);

		fireEvent.click(screen.getByTestId("download-signed-lease-button"));
		expect(openSpy).not.toHaveBeenCalled();
		expect(toastError).toHaveBeenCalledTimes(1);
		expect(toastError).toHaveBeenCalledWith("Signed document not available");
		expect(consoleError).toHaveBeenCalledTimes(1);
		expect(consoleError).toHaveBeenCalledWith(
			"[mutation] Download signed lease failed",
			expect.objectContaining({
				action: "download_signed_lease",
				error:
					"supabaseStorageUrl: refused a URL outside this project's Storage",
			}),
		);
		openSpy.mockRestore();
	});

	it("auto-fires the idempotent finalize once on mount in the Finalizing state", () => {
		mockUseSignedDocumentUrl.mockReturnValue({
			data: { document_url: null, finalizing: true },
			isLoading: false,
			error: null,
			refetch,
		});
		render(<DownloadSignedLeaseButton leaseId="l1" />);

		expect(
			screen.getByTestId("download-signed-lease-finalizing"),
		).toBeInTheDocument();
		// Auto-heal: the finalize mutation fires once per mount, ref-guarded.
		expect(finalizeMutate).toHaveBeenCalledTimes(1);
		expect(finalizeMutate).toHaveBeenCalledWith("l1");
	});

	it("re-triggers finalize and refetch when the Finalizing button is clicked", () => {
		mockUseSignedDocumentUrl.mockReturnValue({
			data: { document_url: null, finalizing: true },
			isLoading: false,
			error: null,
			refetch,
		});
		render(<DownloadSignedLeaseButton leaseId="l1" />);

		finalizeMutate.mockClear();
		const btn = screen.getByTestId("download-signed-lease-finalizing");
		fireEvent.click(btn);
		expect(finalizeMutate).toHaveBeenCalledWith("l1");
		expect(refetch).toHaveBeenCalled();
	});

	describe("refreshing the lease's Documents list once the signed PDF exists", () => {
		const signedSnapshotAt = 2_000_000;
		const signedState = {
			data: { document_url: SIGNED_URL },
			dataUpdatedAt: signedSnapshotAt,
			isLoading: false,
			error: null,
			refetch,
		};
		function leaseDocument(id: string, filePath: string): DocumentRow {
			return {
				id,
				entity_type: "lease",
				entity_id: "l1",
				document_type: "lease",
				mime_type: "application/pdf",
				file_path: filePath,
				storage_url: filePath,
				file_size: 1024,
				title: id,
				tags: null,
				description: null,
				owner_user_id: "owner-1",
				created_at: "2026-11-14T00:00:00Z",
				signed_url: null,
			};
		}
		const uploaded = leaseDocument("d1", "lease/l1/123-addendum.pdf");
		const signedCopy = leaseDocument("d2", "lease/l1/signed-lease.pdf");

		// RTL's render, not the shared helper: the helper nests its own
		// QueryClientProvider inside any wrapper, which would hide this cache.
		function renderWithCachedList(rows: DocumentRow[], listUpdatedAt: number) {
			const queryClient = new QueryClient();
			queryClient.setQueryData(
				documentQueries.list({ entityType: "lease", entityId: "l1" }).queryKey,
				{ rows, totalCount: rows.length },
				{ updatedAt: listUpdatedAt },
			);
			const { Wrapper } = createTestWrapper(queryClient);
			const { rerender } = rtlRender(
				<DownloadSignedLeaseButton leaseId="l1" />,
				{ wrapper: Wrapper },
			);
			return { queryClient, rerender };
		}

		it("refetches a list cached before the signed PDF that lacks its filed copy", () => {
			mockUseSignedDocumentUrl.mockReturnValue(signedState);
			const { queryClient } = renderWithCachedList(
				[uploaded],
				signedSnapshotAt - 1,
			);

			expect(invalidateVaultCopy).toHaveBeenCalledTimes(1);
			expect(invalidateVaultCopy).toHaveBeenCalledWith(queryClient, "l1");
		});

		it("refetches only once while later snapshots still find the copy missing", () => {
			mockUseSignedDocumentUrl.mockReturnValue(signedState);
			const { rerender } = renderWithCachedList(
				[uploaded],
				signedSnapshotAt - 1,
			);
			expect(invalidateVaultCopy).toHaveBeenCalledTimes(1);

			// A later signed-document refetch while the cached list is unchanged.
			mockUseSignedDocumentUrl.mockReturnValue({
				...signedState,
				dataUpdatedAt: signedSnapshotAt + 10_000,
			});
			rerender(<DownloadSignedLeaseButton leaseId="l1" />);

			expect(invalidateVaultCopy).toHaveBeenCalledTimes(1);
		});

		it("leaves a cached list that already shows the filed copy", () => {
			mockUseSignedDocumentUrl.mockReturnValue(signedState);
			renderWithCachedList([signedCopy, uploaded], signedSnapshotAt - 1);

			expect(invalidateVaultCopy).not.toHaveBeenCalled();
		});

		it("leaves a list fetched after the signed PDF, so it cannot loop", () => {
			mockUseSignedDocumentUrl.mockReturnValue(signedState);
			renderWithCachedList([uploaded], signedSnapshotAt + 1);

			expect(invalidateVaultCopy).not.toHaveBeenCalled();
		});
	});

	it("renders nothing when no document is available yet", () => {
		mockUseSignedDocumentUrl.mockReturnValue({
			data: { document_url: null },
			isLoading: false,
			error: null,
			refetch,
		});
		render(<DownloadSignedLeaseButton leaseId="l1" />);

		expect(
			screen.queryByTestId("download-signed-lease-button"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("download-signed-lease-error"),
		).not.toBeInTheDocument();
	});
});
