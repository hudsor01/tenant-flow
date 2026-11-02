/**
 * Both "Download my data" buttons save through the shared `downloadBlob`.
 *
 * GdprDataActions and AccountDataSection each carried a copy of the export
 * fetch plus a hand-rolled anchor download that revoked the object URL on the
 * line after `click()`, and each read the file name from
 * `response.headers.get("Content-Disposition")`. That read can never return a
 * value in a browser: export-user-data is cross-origin and `_shared/cors.ts`
 * sends no `Access-Control-Expose-Headers`. jsdom does not enforce CORS, so the
 * stub below DOES expose a different name -- the assertion that the
 * client-built name wins proves the dead read is gone, not merely unreachable.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
	downloadBlob: vi.fn(),
	getSession: vi.fn(),
}));

vi.mock("#lib/reports/download-blob", () => ({
	downloadBlob: hooks.downloadBlob,
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
			getSession: hooks.getSession,
		},
		rpc: vi.fn(),
		from: vi.fn(),
	}),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { authKeys } from "#hooks/api/use-auth";
import { AccountDataSection } from "../account-data-section";
import { accountDataExportFilename } from "../download-account-data";
import { GdprDataActions } from "../gdpr-data-actions";

function renderWithClient(ui: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Infinity },
			mutations: { retry: false },
		},
	});
	queryClient.setQueryData(authKeys.deletionStatus(), {
		deletion_requested_at: null,
	});
	return render(
		createElement(QueryClientProvider, { client: queryClient }, ui),
	);
}

describe.each([
	["GdprDataActions", () => createElement(GdprDataActions)],
	["AccountDataSection", () => createElement(AccountDataSection)],
])("%s export download", (_name, element) => {
	beforeEach(() => {
		hooks.downloadBlob.mockReset();
		hooks.getSession.mockResolvedValue({
			data: { session: { access_token: "test-token" } },
			error: null,
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ export: "ok" }), {
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Content-Disposition": 'attachment; filename="from-header.json"',
						},
					}),
			),
		);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("saves via downloadBlob under the name export-user-data sends", async () => {
		renderWithClient(element());
		await userEvent.click(
			screen.getByRole("button", { name: /^download my data$/i }),
		);
		await waitFor(() => expect(hooks.downloadBlob).toHaveBeenCalledTimes(1));
		const [blob, filename] = hooks.downloadBlob.mock.calls[0] ?? [];
		expect(blob).toBeInstanceOf(Blob);
		expect(filename).toBe(accountDataExportFilename());
		expect(filename).not.toBe("from-header.json");
	});
});

describe("accountDataExportFilename", () => {
	it("uses the UTC date, as export-user-data does", () => {
		expect(accountDataExportFilename(new Date("2026-04-13T23:30:00Z"))).toBe(
			"tenantflow-data-export-2026-04-13.json",
		);
	});
});
