/**
 * @vitest-environment jsdom
 * The 2FA setup dialog starts one enrollment per opening (66.2-39 fix round 4,
 * Part 8b).
 *
 * The start effect fired whenever no enrollment was pending, so a failed
 * enrollment started the next as soon as it settled: on the served build, a
 * rejected `POST /auth/v1/factors` was posted again about seven times in the
 * few seconds the dialog stayed open, the body flickering between the spinner
 * and "Failed to start 2FA setup". Here the real enroll mutation runs against
 * a rejecting client, and one opening must post once and keep the error up.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// A rejection that takes a network round trip's time: the pending state
// renders before the error, as it does in the browser.
const auth = vi.hoisted(() => ({
	enroll: vi.fn(
		() =>
			new Promise((resolve) => {
				setTimeout(
					() =>
						resolve({
							data: null,
							error: Object.assign(new Error("enroll rejected"), {
								status: 422,
							}),
						}),
					20,
				);
			}),
	),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ auth: { mfa: { enroll: auth.enroll } } }),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { TwoFactorSetupDialog } from "../two-factor-setup-dialog";

afterEach(() => {
	cleanup();
	auth.enroll.mockClear();
});

function renderOpen(open: boolean) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const view = (isOpen: boolean) =>
		createElement(
			QueryClientProvider,
			{ client },
			createElement(TwoFactorSetupDialog, {
				open: isOpen,
				onOpenChange: vi.fn(),
			}),
		);
	const rendered = render(view(open));
	return {
		...rendered,
		reopen: (isOpen: boolean) => rendered.rerender(view(isOpen)),
	};
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 300));

describe("TwoFactorSetupDialog enrollment", () => {
	it("posts one enrollment per opening when it fails, and keeps the error up", async () => {
		renderOpen(true);
		expect(
			await screen.findByText("Failed to start 2FA setup. Please try again."),
		).toBeInTheDocument();
		await settle();
		expect(auth.enroll).toHaveBeenCalledTimes(1);
		expect(
			screen.getByText("Failed to start 2FA setup. Please try again."),
		).toBeInTheDocument();
	});

	it("posts again when it is closed and opened again", async () => {
		const { reopen } = renderOpen(true);
		await screen.findByText("Failed to start 2FA setup. Please try again.");
		reopen(false);
		await settle();
		reopen(true);
		await screen.findByText("Failed to start 2FA setup. Please try again.");
		await settle();
		expect(auth.enroll).toHaveBeenCalledTimes(2);
	});
});
