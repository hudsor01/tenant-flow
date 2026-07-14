/**
 * DownloadSignedLeaseButton tests
 *
 * @vitest-environment jsdom
 */

import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import { DownloadSignedLeaseButton } from "../download-signed-lease-button";

const mockUseSignedDocumentUrl = vi.fn();
const refetch = vi.fn();
vi.mock("#hooks/api/use-lease", () => ({
	useSignedDocumentUrl: (...args: unknown[]) =>
		mockUseSignedDocumentUrl(...args),
}));

const finalizeMutate = vi.fn();
vi.mock("#hooks/api/use-lease-signature-mutations", () => ({
	useFinalizeSignedLeaseMutation: () => ({ mutate: finalizeMutate }),
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({
	toast: { error: (...args: unknown[]) => toastError(...args) },
}));

describe("DownloadSignedLeaseButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
			data: { document_url: "https://storage.example/doc.pdf" },
			isLoading: false,
			error: null,
			refetch,
		});
		render(<DownloadSignedLeaseButton leaseId="l1" />);

		fireEvent.click(screen.getByTestId("download-signed-lease-button"));
		expect(openSpy).toHaveBeenCalledWith(
			"https://storage.example/doc.pdf",
			"_blank",
			"noopener,noreferrer",
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
