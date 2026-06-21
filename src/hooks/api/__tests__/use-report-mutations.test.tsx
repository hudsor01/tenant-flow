/**
 * Report Mutation Hooks Tests
 *
 * Covers the paywall-aware error handler, the exported PDF-from-HTML helper,
 * and the four download mutation hooks that delegate to reportMutations.*.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real PaywallError class shared between the mocked module and the assertions,
// so `instanceof PaywallError` inside the hook resolves to the same constructor.
const { PaywallError } = vi.hoisted(() => {
	class PaywallError extends Error {
		readonly upgradeUrl: string;
		readonly feature: string;
		constructor(message: string, upgradeUrl: string, feature: string) {
			super(message);
			this.name = "PaywallError";
			this.upgradeUrl = upgradeUrl;
			this.feature = feature;
		}
	}
	return { PaywallError };
});

const {
	mockGetSession,
	mockToastError,
	mockToastSuccess,
	mockHandleMutationError,
	mockDownloadYearEndPdfFn,
	mockDownloadTaxDocumentPdfFn,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockToastError: vi.fn(),
	mockToastSuccess: vi.fn(),
	mockHandleMutationError: vi.fn(),
	mockDownloadYearEndPdfFn: vi.fn(),
	mockDownloadTaxDocumentPdfFn: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: { getSession: mockGetSession },
	}),
}));

vi.mock("sonner", () => ({
	toast: { error: mockToastError, success: mockToastSuccess },
}));

vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: mockHandleMutationError,
	handleMutationSuccess: vi.fn(),
}));

vi.mock("../query-keys/report-keys", () => ({
	PaywallError,
	reportMutations: {
		downloadYearEndPdf: () => ({
			mutationKey: ["reports", "download-year-end-pdf"],
			mutationFn: mockDownloadYearEndPdfFn,
		}),
		downloadTaxDocumentPdf: () => ({
			mutationKey: ["reports", "download-tax-document-pdf"],
			mutationFn: mockDownloadTaxDocumentPdfFn,
		}),
	},
}));

import {
	callGeneratePdfFromHtml,
	useDownloadTaxDocumentPdf,
	useDownloadYearEndPdf,
} from "../use-report-mutations";

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return createElement(
			QueryClientProvider,
			{ client: queryClient },
			children,
		);
	};
}

describe("callGeneratePdfFromHtml", () => {
	const originalFetch = globalThis.fetch;
	const originalCreateObjectURL = globalThis.URL.createObjectURL;
	const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://test-supabase");
		globalThis.URL.createObjectURL = vi.fn(() => "blob:fake-url");
		globalThis.URL.revokeObjectURL = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		globalThis.URL.createObjectURL = originalCreateObjectURL;
		globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
		vi.unstubAllEnvs();
		vi.useRealTimers();
	});

	it("rejects 'Not authenticated' when there is no session access_token", async () => {
		mockGetSession.mockResolvedValue({ data: { session: null } });

		await expect(
			callGeneratePdfFromHtml("<html></html>", "report.pdf"),
		).rejects.toMatchObject({
			message: expect.stringContaining("Not authenticated"),
		});
	});

	it("POSTs to generate-pdf with Bearer token and {html, filename} body", async () => {
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: "test-token" } },
		});
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			blob: async () => new Blob(["pdf-bytes"], { type: "application/pdf" }),
		});
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		// Mock the real anchor click so the success path's link.click() does not
		// trigger jsdom's "Not implemented: navigation" on the blob: href.
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});

		await callGeneratePdfFromHtml("<h1>Report</h1>", "year-end.pdf");

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("http://test-supabase/functions/v1/generate-pdf");
		expect(init.method).toBe("POST");
		expect((init.headers as Record<string, string>).Authorization).toBe(
			"Bearer test-token",
		);
		expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
			"application/json",
		);
		expect(JSON.parse(init.body as string)).toEqual({
			html: "<h1>Report</h1>",
			filename: "year-end.pdf",
		});

		clickSpy.mockRestore();
	});

	it("rejects with 'PDF generation failed: <errText>' when fetch is not ok", async () => {
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: "test-token" } },
		});
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			statusText: "Internal Server Error",
			text: async () => "edge boom",
		}) as unknown as typeof fetch;

		await expect(
			callGeneratePdfFromHtml("<html></html>", "report.pdf"),
		).rejects.toMatchObject({
			message: expect.stringContaining("PDF generation failed: edge boom"),
		});
	});

	it("falls back to statusText when reading the error body throws", async () => {
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: "test-token" } },
		});
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			statusText: "Bad Gateway",
			text: async () => {
				throw new Error("stream consumed");
			},
		}) as unknown as typeof fetch;

		await expect(
			callGeneratePdfFromHtml("<html></html>", "report.pdf"),
		).rejects.toMatchObject({
			message: expect.stringContaining("PDF generation failed: Bad Gateway"),
		});
	});

	it("creates an object URL, clicks an <a download=filename>, and revokes after 100ms", async () => {
		vi.useFakeTimers();
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: "test-token" } },
		});
		const blob = new Blob(["pdf-bytes"], { type: "application/pdf" });
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			blob: async () => blob,
		}) as unknown as typeof fetch;

		const appendSpy = vi.spyOn(document.body, "appendChild");
		const removeSpy = vi.spyOn(document.body, "removeChild");
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});

		await callGeneratePdfFromHtml("<html></html>", "tax-2024.pdf");

		expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(blob);

		const appendedNode = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
		expect(appendedNode).toBeInstanceOf(HTMLAnchorElement);
		expect(appendedNode.download).toBe("tax-2024.pdf");
		expect(appendedNode.href).toBe("blob:fake-url");
		expect(clickSpy).toHaveBeenCalledTimes(1);
		expect(removeSpy).toHaveBeenCalledWith(appendedNode);

		// Revoke is deferred behind a 100ms timer.
		expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(
			"blob:fake-url",
		);

		appendSpy.mockRestore();
		removeSpy.mockRestore();
		clickSpy.mockRestore();
	});
});

describe("useDownloadYearEndPdf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("delegates to reportMutations.downloadYearEndPdf and toasts success", async () => {
		mockDownloadYearEndPdfFn.mockResolvedValue(undefined);

		const { result } = renderHook(() => useDownloadYearEndPdf(), {
			wrapper: createWrapper(),
		});

		await result.current.mutateAsync(2024);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(mockDownloadYearEndPdfFn).toHaveBeenCalledWith(
			2024,
			expect.anything(),
		);
		expect(mockToastSuccess).toHaveBeenCalledWith("Year-end report downloaded");
	});

	it("surfaces a PaywallError upgrade toast", async () => {
		mockDownloadYearEndPdfFn.mockRejectedValue(
			new PaywallError(
				"Upgrade to export PDFs.",
				"/billing/plans?source=reports_gate",
				"reports",
			),
		);

		const { result } = renderHook(() => useDownloadYearEndPdf(), {
			wrapper: createWrapper(),
		});

		await expect(result.current.mutateAsync(2024)).rejects.toMatchObject({
			message: expect.stringContaining("Upgrade to export PDFs."),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockToastError).toHaveBeenCalledWith(
			"Upgrade required",
			expect.objectContaining({ description: "Upgrade to export PDFs." }),
		);
		expect(mockToastSuccess).not.toHaveBeenCalled();
	});
});

describe("useDownloadTaxDocumentPdf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("delegates to reportMutations.downloadTaxDocumentPdf and toasts success", async () => {
		mockDownloadTaxDocumentPdfFn.mockResolvedValue(undefined);

		const { result } = renderHook(() => useDownloadTaxDocumentPdf(), {
			wrapper: createWrapper(),
		});

		await result.current.mutateAsync(2025);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(mockDownloadTaxDocumentPdfFn).toHaveBeenCalledWith(
			2025,
			expect.anything(),
		);
		expect(mockToastSuccess).toHaveBeenCalledWith("Tax documents downloaded");
	});

	it("routes a non-paywall error through handleMutationError", async () => {
		mockDownloadTaxDocumentPdfFn.mockRejectedValue(
			new Error("pdf service 500"),
		);

		const { result } = renderHook(() => useDownloadTaxDocumentPdf(), {
			wrapper: createWrapper(),
		});

		await expect(result.current.mutateAsync(2025)).rejects.toMatchObject({
			message: expect.stringContaining("pdf service 500"),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(mockHandleMutationError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "pdf service 500" }),
			"Download tax documents PDF",
		);
		expect(mockToastError).not.toHaveBeenCalled();
	});
});
