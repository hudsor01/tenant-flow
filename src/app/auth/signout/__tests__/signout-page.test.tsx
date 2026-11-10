/**
 * `/auth/signout` lands on /login at once and has no timer (66.2-39 fix
 * round 4, Part 8l).
 *
 * Main session: a successful "Sign out" goes to /login with `router.replace`,
 * once. The page waited 3 seconds and then pushed /login, a time limit the
 * owner could not turn off or extend (WCAG 2.2.1), and said "You will be
 * redirected to the login page shortly". The "Signed Out" state stays for an
 * arrival with no session: it says so, offers Sign In and promises nothing.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { router, getSession, getUser, signOut } = vi.hoisted(() => ({
	router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
	getSession: vi.fn(),
	getUser: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ auth: { getSession, getUser, signOut } }),
}));

import SignOutPage from "../page";

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return render(<SignOutPage />, { wrapper });
}

const navigations = () =>
	router.push.mock.calls.length + router.replace.mock.calls.length;

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers({ shouldAdvanceTime: true });
	getSession.mockResolvedValue({
		data: { session: { access_token: "token", user: { id: "u" } } },
	});
	getUser.mockResolvedValue({ data: { user: { id: "u" } }, error: null });
	signOut.mockResolvedValue({ error: null });
});

afterEach(() => {
	vi.useRealTimers();
});

describe("/auth/signout", () => {
	it("a successful sign-out lands on /login once", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		renderPage();

		await user.click(
			await screen.findByRole("button", { name: /^sign out$/i }),
		);

		await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
		expect(router.replace).toHaveBeenCalledTimes(1);
		expect(router.push).not.toHaveBeenCalled();
	});

	it("no timer navigates after a successful sign-out (fake timers, 10 s)", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		renderPage();

		await user.click(
			await screen.findByRole("button", { name: /^sign out$/i }),
		);
		await waitFor(() => expect(signOut).toHaveBeenCalledTimes(2));
		await screen.findByText("Signed Out");
		const before = navigations();

		await act(async () => {
			vi.advanceTimersByTime(10_000);
		});
		expect(router.push).not.toHaveBeenCalled();
		expect(navigations()).toBe(before);
		expect(screen.queryByText(/redirected/i)).toBeNull();
	});

	it("an arrival with no session says so, offers Sign In and never navigates on its own", async () => {
		getSession.mockResolvedValue({ data: { session: null } });
		renderPage();

		expect(await screen.findByText("Signed Out")).toBeInTheDocument();
		expect(
			screen.getByText("You are not signed in on this browser."),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^sign in$/i })).toBeVisible();
		expect(screen.queryByText(/redirected/i)).toBeNull();
		expect(screen.queryByText(/signed out successfully/i)).toBeNull();

		await act(async () => {
			vi.advanceTimersByTime(10_000);
		});
		expect(navigations()).toBe(0);
	});

	it("centers every state at the other auth pages' width (max-w-md)", async () => {
		const { container, unmount } = renderPage();
		await screen.findByRole("button", { name: /^sign out$/i });
		const frame = container.querySelector('[data-slot="card"]')?.parentElement;
		expect(frame?.className.split(/\s+/)).toEqual(["w-full", "max-w-md"]);
		unmount();

		getSession.mockResolvedValue({ data: { session: null } });
		const signedOut = renderPage();
		await screen.findByText("Signed Out");
		expect(
			signedOut.container.querySelector('[data-slot="card"]')?.parentElement
				?.className,
		).toBe("w-full max-w-md");
	});
});
