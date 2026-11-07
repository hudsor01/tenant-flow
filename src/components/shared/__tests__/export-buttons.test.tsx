/**
 * The /analytics/financial export buttons, end to end through the real hook,
 * mutation factory and Edge Function caller (`useExportFinancialAnalytics` →
 * `reportMutations.exportFinancialAnalytics` → `callExportEdgeFunction`); only
 * the network, the Supabase client, the toasts and the file save are faked.
 *
 * export-report reads only its query string (`type`, `format`), so each button
 * must send its own format there, and nothing in a body. A 402 is the tier
 * gate and must reach the reports Upgrade toast, not the generic error toast.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";

const {
	mockGetSession,
	mockGetCachedUser,
	mockToastError,
	mockToastSuccess,
	mockHandleMutationError,
	mockDownloadBlob,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockGetCachedUser: vi.fn(),
	mockToastError: vi.fn(),
	mockToastSuccess: vi.fn(),
	mockHandleMutationError: vi.fn(),
	mockDownloadBlob: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ auth: { getSession: mockGetSession } }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));
vi.mock("sonner", () => ({
	toast: { error: mockToastError, success: mockToastSuccess },
}));
vi.mock("#lib/mutation-error-handler", async (importOriginal) => ({
	...(await importOriginal<typeof import("#lib/mutation-error-handler")>()),
	handleMutationError: mockHandleMutationError,
}));
vi.mock("#lib/reports/download-blob", () => ({
	downloadBlob: mockDownloadBlob,
}));

import { ExportButtons } from "../export-buttons";

const SUPABASE_URL = "http://test-supabase";
const TODAY = "2026-11-01";

function fileResponse(): Response {
	return new Response("file-bytes", { status: 200 });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(`${TODAY}T18:30:00Z`));
	vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
	mockGetCachedUser.mockResolvedValue({ id: "owner-1" });
	mockGetSession.mockResolvedValue({
		data: { session: { access_token: "user-jwt" } },
	});
	fetchMock = vi.fn(async () => fileResponse());
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("ExportButtons", () => {
	it("renders one button per format, labelled Export Excel, PDF and CSV", () => {
		render(<ExportButtons />);
		expect(
			screen.getAllByRole("button").map((b) => b.textContent?.trim()),
		).toEqual(["Export Excel", "Export PDF", "Export CSV"]);
	});

	for (const [label, format] of [
		["Export Excel", "xlsx"],
		["Export PDF", "pdf"],
		["Export CSV", "csv"],
	] as const) {
		it(`${label} GETs export-report with format=${format} and no body`, async () => {
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			render(<ExportButtons />);
			await user.click(screen.getByRole("button", { name: label }));

			await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			const parsed = new URL(url);
			expect(`${parsed.origin}${parsed.pathname}`).toBe(
				`${SUPABASE_URL}/functions/v1/export-report`,
			);
			expect(Object.fromEntries(parsed.searchParams)).toEqual({
				type: "financial-analytics",
				format,
			});
			expect(init.method ?? "GET").toBe("GET");
			expect(init.body).toBeUndefined();
			expect(new Headers(init.headers).get("Authorization")).toBe(
				"Bearer user-jwt",
			);

			await waitFor(() => expect(mockDownloadBlob).toHaveBeenCalledTimes(1));
			const [blob, filename] = mockDownloadBlob.mock.calls[0] as [Blob, string];
			expect(await blob.text()).toBe("file-bytes");
			expect(filename).toBe(`financial-analytics-${TODAY}.${format}`);
			expect(mockToastSuccess).toHaveBeenCalledWith(
				`Exported ${label.replace("Export ", "")}`,
			);
		});
	}

	it("decides auth with getUser and reads the session only for the token", async () => {
		mockGetCachedUser.mockResolvedValue(null);
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ExportButtons />);
		await user.click(screen.getByRole("button", { name: "Export CSV" }));

		await waitFor(() => expect(mockHandleMutationError).toHaveBeenCalled());
		expect(mockGetSession).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(mockDownloadBlob).not.toHaveBeenCalled();
	});

	it("turns the 402 into the reports Upgrade toast, not a generic error", async () => {
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
					error: "This feature requires a Growth or Max subscription.",
					upgrade_required: true,
					upgrade_url: "/billing/plans?source=reports_gate",
				}),
				{ status: 402, headers: { "Content-Type": "application/json" } },
			),
		);
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ExportButtons />);
		await user.click(screen.getByRole("button", { name: "Export Excel" }));

		await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
		const [title, options] = mockToastError.mock.calls[0] as [
			string,
			{
				description?: string;
				action?: { label?: string; onClick?: () => void };
			},
		];
		expect(title).toBe("Upgrade required");
		expect(options.description).toBe(
			"This feature requires a Growth or Max subscription.",
		);
		expect(options.action?.label).toBe("See plans");
		expect(mockHandleMutationError).not.toHaveBeenCalled();
		expect(mockDownloadBlob).not.toHaveBeenCalled();
		expect(mockToastSuccess).not.toHaveBeenCalled();

		const assign = vi.fn();
		const original = window.location;
		Object.defineProperty(window, "location", {
			configurable: true,
			value: { ...original, assign },
		});
		try {
			options.action?.onClick?.();
			expect(assign).toHaveBeenCalledWith("/billing/plans?source=reports_gate");
		} finally {
			Object.defineProperty(window, "location", {
				configurable: true,
				value: original,
			});
		}
	});

	it("sends any other failure to the shared handler, and saves nothing", async () => {
		fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ExportButtons />);
		await user.click(screen.getByRole("button", { name: "Export PDF" }));

		await waitFor(() =>
			expect(mockHandleMutationError).toHaveBeenCalledTimes(1),
		);
		expect(mockHandleMutationError.mock.calls[0]?.[1]).toBe("Export PDF");
		expect(mockToastError).not.toHaveBeenCalled();
		expect(mockDownloadBlob).not.toHaveBeenCalled();
	});

	it("disables every button while one export runs and labels the running one", async () => {
		let release: (response: Response) => void = () => {};
		fetchMock.mockImplementation(
			() =>
				new Promise<Response>((resolve) => {
					release = resolve;
				}),
		);
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ExportButtons />);
		await user.click(screen.getByRole("button", { name: "Export PDF" }));

		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Exporting…" })).toBeDisabled(),
		);
		const buttons = screen.getAllByRole("button");
		expect(buttons.map((b) => b.textContent?.trim())).toEqual([
			"Export Excel",
			"Exporting…",
			"Export CSV",
		]);
		for (const button of buttons) expect(button).toBeDisabled();

		await user.click(screen.getByRole("button", { name: "Export CSV" }));
		expect(fetchMock).toHaveBeenCalledTimes(1);

		release(fileResponse());
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled(),
		);
		for (const button of screen.getAllByRole("button")) {
			expect(button).toBeEnabled();
		}
	});
});
