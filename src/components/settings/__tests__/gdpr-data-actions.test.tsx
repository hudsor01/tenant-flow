import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
	invoke: vi.fn(),
	rpc: vi.fn(),
	getUser: vi.fn().mockResolvedValue({
		data: { user: { id: "user-1", email: "owner@example.com" } },
		error: null,
	}),
	getSession: vi.fn().mockResolvedValue({
		data: { session: { access_token: "test-token" } },
		error: null,
	}),
	from: vi.fn(),
	deletionStatusData: { deletion_requested_at: null as string | null },
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: { getUser: hooks.getUser, getSession: hooks.getSession },
		functions: { invoke: hooks.invoke },
		rpc: hooks.rpc,
		from: hooks.from,
	}),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { authKeys } from "#hooks/api/use-auth";
import { expectLabelInName } from "#test/utils/label-in-name";
import { GdprDataActions } from "../gdpr-data-actions";

function renderWithClient(ui: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	queryClient.setQueryData(authKeys.deletionStatus(), hooks.deletionStatusData);
	return render(
		createElement(QueryClientProvider, { client: queryClient }, ui),
	);
}

describe("GdprDataActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		hooks.deletionStatusData = { deletion_requested_at: null };
		// Stub URL.createObjectURL / revokeObjectURL so Blob download path runs safely
		vi.stubGlobal("URL", {
			createObjectURL: vi.fn(() => "blob:test"),
			revokeObjectURL: vi.fn(),
		});
		// Stub fetch for the export-user-data Edge Function call
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ export: "ok" }), {
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Content-Disposition":
								'attachment; filename="tenantflow-data-export-2026-04-13.json"',
						},
					}),
			),
		);
	});

	it("standalone variant renders Download + Request Deletion with Danger Zone framing", () => {
		cleanup();
		renderWithClient(<GdprDataActions />);
		expect(
			screen.getByRole("button", { name: /^download my data$/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: /^delete account$/i,
			}),
		).toBeInTheDocument();
		// Standalone framing includes the Danger Zone eyebrow
		expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
	});

	it("inline variant renders actions without Danger Zone framing or BlurFade", () => {
		cleanup();
		const { container } = renderWithClient(
			<GdprDataActions variant="inline" />,
		);
		expect(
			screen.getByRole("button", { name: /^download my data$/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: /^delete account$/i,
			}),
		).toBeInTheDocument();
		// Inline variant MUST NOT render the Danger Zone eyebrow
		expect(screen.queryByText(/danger zone/i)).toBeNull();
		// Inline variant must not wrap content in bg-destructive/5 section card
		expect(container.querySelector(".bg-destructive\\/5")).toBeNull();
		// Inline variant must use space-y-4 vertical rhythm on its root
		expect(container.querySelector(".space-y-4")).not.toBeNull();
	});

	it("Export button click invokes export-user-data Edge Function", async () => {
		cleanup();
		renderWithClient(<GdprDataActions />);
		await userEvent.click(
			screen.getByRole("button", { name: /^download my data$/i }),
		);
		// The component calls fetch() against /functions/v1/export-user-data
		const fetchMock = vi.mocked(globalThis.fetch);
		expect(fetchMock).toHaveBeenCalled();
		const firstCallUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
		expect(firstCallUrl).toContain("export-user-data");
	});

	it("Request Deletion fires request_account_deletion RPC after type-to-confirm", async () => {
		cleanup();
		hooks.rpc.mockResolvedValue({
			data: { deletion_requested_at: new Date().toISOString() },
			error: null,
		});
		renderWithClient(<GdprDataActions />);

		// Open the type-to-confirm form
		const trigger = screen.getByRole("button", {
			name: /^delete account$/i,
		});
		await userEvent.click(trigger);

		// Type the confirmation word
		const confirmInput = screen.getByLabelText(
			/type delete to confirm|type ["']?DELETE["']? to confirm/i,
		);
		await userEvent.type(confirmInput, "DELETE");

		// Submit (Request Account Deletion button inside the confirm panel)
		const confirm = screen.getByRole("button", {
			name: /^request account deletion$/i,
		});
		await userEvent.click(confirm);

		expect(hooks.rpc).toHaveBeenCalled();
		expect(hooks.rpc.mock.calls[0]?.[0]).toBe("request_account_deletion");
	});

	it("pending deletion state renders Cancel Deletion button", () => {
		cleanup();
		hooks.deletionStatusData = {
			deletion_requested_at: new Date(
				Date.now() - 29 * 24 * 60 * 60 * 1000,
			).toISOString(),
		};
		renderWithClient(<GdprDataActions />);
		expect(
			screen.getByText(/account scheduled for deletion/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^cancel deletion$/i }),
		).toBeInTheDocument();
	});

	// WCAG 2.5.3 (66.2-39 sweep 2): each action carried an aria-label that did
	// not contain its visible text ("Download my data as JSON" on "Download My
	// Data", "Request permanent account deletion" on "Delete Account", and so
	// on). Every button in each state is named by what it shows.
	it("names every action by its visible text, in every state", async () => {
		cleanup();
		renderWithClient(<GdprDataActions />);
		await userEvent.click(
			screen.getByRole("button", { name: /^delete account$/i }),
		);
		for (const button of screen.getAllByRole("button")) {
			expectLabelInName(button);
		}
		cleanup();
		hooks.deletionStatusData = {
			deletion_requested_at: new Date().toISOString(),
		};
		renderWithClient(<GdprDataActions />);
		for (const button of screen.getAllByRole("button")) {
			expectLabelInName(button);
		}
	});
});
