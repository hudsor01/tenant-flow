import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the mutation hook so the dialog renders without a live Supabase auth
// client. The dialog only reads `isPending` and `mutateAsync` from it.
vi.mock("#hooks/api/use-auth-mutations", () => ({
	useChangePasswordMutation: () => ({
		mutate: vi.fn(),
		mutateAsync: vi.fn(),
		reset: vi.fn(),
		isPending: false,
		isError: false,
		isSuccess: false,
		error: null,
		data: undefined,
		status: "idle" as const,
	}),
}));

vi.mock("#lib/frontend-logger", () => ({
	logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { ChangePasswordDialog } from "../change-password-dialog";

function renderWithClient(ui: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return render(
		createElement(QueryClientProvider, { client: queryClient }, ui),
	);
}

describe("ChangePasswordDialog — A11Y-01 programmatic labels", () => {
	afterEach(() => {
		cleanup();
	});

	it("associates each password field with its visible label via htmlFor/id", () => {
		const { getByLabelText } = renderWithClient(
			createElement(ChangePasswordDialog, {
				open: true,
				onOpenChange: vi.fn(),
			}),
		);

		// getByLabelText resolves ONLY when the FieldLabel's htmlFor matches the
		// password input's id (the axe "label" rule, deterministically).
		const current = getByLabelText("Current Password *");
		const next = getByLabelText("New Password *");
		const confirm = getByLabelText("Confirm New Password *");

		expect(current).toBeInstanceOf(HTMLInputElement);
		expect(current).toHaveAttribute("type", "password");
		expect(next).toBeInstanceOf(HTMLInputElement);
		expect(next).toHaveAttribute("type", "password");
		expect(confirm).toBeInstanceOf(HTMLInputElement);
		expect(confirm).toHaveAttribute("type", "password");

		// Each input must have a non-empty, unique id (the association anchor).
		const ids = [current.id, next.id, confirm.id];
		expect(ids.every((id) => id.length > 0)).toBe(true);
		expect(new Set(ids).size).toBe(3);
	});

	it("keeps the icon-only show/hide toggle aria-labels intact", () => {
		const { getByRole } = renderWithClient(
			createElement(ChangePasswordDialog, {
				open: true,
				onOpenChange: vi.fn(),
			}),
		);

		expect(
			getByRole("button", { name: "Show current password" }),
		).toBeInTheDocument();
		expect(
			getByRole("button", { name: "Show new password" }),
		).toBeInTheDocument();
		expect(
			getByRole("button", { name: "Show confirm password" }),
		).toBeInTheDocument();
	});
});
