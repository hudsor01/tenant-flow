/**
 * @vitest-environment jsdom
 * Abandoning the two-factor challenge ends this half-signed-in session only
 * (66.2-39 fix round 4, Part 8k).
 *
 * `handleMfaCancel` called `signOut()`, whose default scope is "global": an
 * owner who closed the code prompt ended every session of the account, on
 * every device, when they had only abandoned this sign-in. `scope: "local"`
 * ends this session on the server and in the browser.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

const { signOut } = vi.hoisted(() => ({
	signOut: vi.fn().mockResolvedValue({ error: null }),
}));

// The proxy sent an aal1 session of an MFA-enrolled owner here: the page opens
// the code prompt on mount (SEC-01).
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: { id: "owner-1" } },
				error: null,
			}),
			mfa: {
				getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
					data: { currentLevel: "aal1", nextLevel: "aal2" },
					error: null,
				}),
				listFactors: vi.fn().mockResolvedValue({
					data: { totp: [{ id: "factor-1", status: "verified" }] },
					error: null,
				}),
			},
			signOut,
		},
	}),
}));

import LoginPage from "../page";

function renderLogin() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		createElement(
			QueryClientProvider,
			{ client: queryClient },
			createElement(LoginPage),
		),
	);
}

describe("login: cancelling the two-factor challenge", () => {
	beforeAll(() => {
		// input-otp reads the caret's position; jsdom has no layout to answer.
		if (typeof document.elementFromPoint !== "function") {
			Object.defineProperty(document, "elementFromPoint", {
				configurable: true,
				value: () => null,
			});
		}
	});

	it("signs out this session only (scope local), never every session", async () => {
		renderLogin();
		const dialog = await screen.findByRole("dialog");
		await userEvent.click(
			within(dialog).getByRole("button", { name: /^cancel$/i }),
		);

		await waitFor(() => expect(signOut).toHaveBeenCalled());
		for (const call of signOut.mock.calls) {
			expect(call).toEqual([{ scope: "local" }]);
		}
		expect(
			await screen.findByText(
				"Two-factor authentication is required to sign in.",
			),
		).toBeInTheDocument();
	});
});
