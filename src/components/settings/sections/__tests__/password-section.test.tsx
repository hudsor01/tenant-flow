/**
 * PasswordSection unit tests
 *
 * Pins the cycle-2 review P3-3 contract: the password-change settings
 * surface uses the shared PASSWORD_COMPLEXITY_RE + VALIDATION_LIMITS
 * constants — same rule as signup, /auth/update-password, and the
 * change-password dialog.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
			updateUser: vi.fn().mockResolvedValue({ error: null }),
		},
	}),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: vi.fn().mockResolvedValue({
		id: "user-123",
		email: "owner@example.com",
	}),
}));

import { PasswordSection } from "../password-section";

function renderWithProviders() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<PasswordSection />
			<Toaster />
		</QueryClientProvider>,
	);
}

describe("PasswordSection (cycle-2 P3-3)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("submit button is disabled until all four complexity rules pass", async () => {
		const user = userEvent.setup();
		renderWithProviders();

		const currentPassword = screen.getByLabelText("Current Password");
		const newPassword = screen.getByLabelText("New Password");
		const confirmPassword = screen.getByLabelText("Confirm New Password");
		const submit = screen.getByRole("button", { name: /Update Password/i });

		await user.type(currentPassword, "Current1!aa");

		// 11-char password (under the new 12-char minimum) — disabled
		await user.type(newPassword, "Short1!aabc");
		await user.type(confirmPassword, "Short1!aabc");
		expect(submit).toBeDisabled();

		// 12 chars but missing special character — still disabled
		await user.clear(newPassword);
		await user.clear(confirmPassword);
		await user.type(newPassword, "NoSpecial1aaa");
		await user.type(confirmPassword, "NoSpecial1aaa");
		expect(submit).toBeDisabled();

		// 12 chars + upper/lower/digit/special — enabled
		await user.clear(newPassword);
		await user.clear(confirmPassword);
		await user.type(newPassword, "Strong1!aaaaa");
		await user.type(confirmPassword, "Strong1!aaaaa");
		expect(submit).not.toBeDisabled();
	});

	it("new-password input has autoComplete='new-password' for password managers", () => {
		renderWithProviders();
		const newPassword = screen.getByLabelText("New Password");
		expect(newPassword).toHaveAttribute("autocomplete", "new-password");
	});

	it("helper text references the configured PASSWORD_MIN_LENGTH (12 chars)", () => {
		renderWithProviders();
		expect(
			screen.getByText(/Must be at least 12 characters/),
		).toBeInTheDocument();
	});
});
