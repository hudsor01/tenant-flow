/**
 * @vitest-environment jsdom
 * AccountDataSection label in name (66.2-39 sweep 2).
 *
 * "Download My Data" carried aria-label="Download my data as JSON" and
 * "Cancel Deletion" carried aria-label="Cancel account deletion"; neither
 * label contained the visible text (WCAG 2.5.3). Every button, in both the
 * default and the scheduled-deletion state, is named by what it shows.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { describe, it, vi } from "vitest";
import { authKeys } from "#hooks/api/use-auth";
import { expectLabelInName } from "#test/utils/label-in-name";

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
			getSession: vi.fn(),
		},
		rpc: vi.fn(),
		from: vi.fn(),
	}),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { AccountDataSection } from "../account-data-section";

function renderWithStatus(deletionRequestedAt: string | null) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	queryClient.setQueryData(authKeys.deletionStatus(), {
		deletion_requested_at: deletionRequestedAt,
	});
	const ui: ReactNode = createElement(AccountDataSection);
	return render(
		createElement(QueryClientProvider, { client: queryClient }, ui),
	);
}

describe("AccountDataSection", () => {
	it("names every action by its visible text, in every state", async () => {
		renderWithStatus(null);
		expectLabelInName(
			screen.getByRole("button", { name: /^download my data$/i }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: /^delete my account$/i }),
		);
		for (const button of screen.getAllByRole("button")) {
			expectLabelInName(button);
		}
		cleanup();
		renderWithStatus(new Date().toISOString());
		const cancel = screen.getByRole("button", { name: /^cancel deletion$/i });
		expectLabelInName(cancel);
	});
});
