/**
 * Battle-test Session 6 P1 regression guard: the marketing navbar must
 * render the signed-out CTA pair ("Sign In" + "Get Started") synchronously
 * when no auth cookie is present, regardless of the supabase-session
 * query's pending state. Pre-fix, a stuck `isPending: true` on cold-start
 * (PersistQueryClientProvider restoration race) left the CTA slot empty.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useSupabaseSessionMock, usePathnameMock, useNavigationMock } =
	vi.hoisted(() => ({
		useSupabaseSessionMock: vi.fn(),
		usePathnameMock: vi.fn(),
		useNavigationMock: vi.fn(),
	}));

vi.mock("next/navigation", () => ({
	usePathname: () => usePathnameMock(),
}));

vi.mock("#hooks/api/use-auth", () => ({
	useSupabaseSession: () => useSupabaseSessionMock(),
}));

vi.mock("#hooks/use-navigation", () => ({
	useNavigation: () => useNavigationMock(),
}));

vi.mock("#lib/supabase/cookie-name", () => ({
	SUPABASE_AUTH_COOKIE_NAME: "sb-test-project-auth-token",
}));

function renderNavbar() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return import("../navbar").then(({ Navbar }) =>
		render(
			<QueryClientProvider client={queryClient}>
				<Navbar />
			</QueryClientProvider>,
		),
	);
}

function clearAuthCookie() {
	document.cookie =
		"sb-test-project-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

function setAuthCookie() {
	document.cookie = "sb-test-project-auth-token=stub-token; path=/";
}

describe("Navbar — auth CTA branch", () => {
	beforeEach(() => {
		vi.resetModules();
		usePathnameMock.mockReturnValue("/pricing");
		useNavigationMock.mockReturnValue({
			isMobileMenuOpen: false,
			toggleMobileMenu: vi.fn(),
			closeMobileMenu: vi.fn(),
		});
	});

	afterEach(() => {
		clearAuthCookie();
	});

	it("renders Sign In + Get Started synchronously when no auth cookie (cold-start fast-path)", async () => {
		clearAuthCookie();
		// Simulate the PersistQueryClient restoration race that pre-fix
		// left isPending stuck: the query never settles.
		useSupabaseSessionMock.mockReturnValue({
			data: undefined,
			isPending: true,
		});

		await renderNavbar();

		expect(screen.getByRole("link", { name: /Sign In/i })).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Get Started/i }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Dashboard/i })).toBeNull();
	});

	it("renders Dashboard optimistically when cookie is present and query is still pending", async () => {
		// Session 10/11 P1: previously the navbar waited for the session
		// query to resolve before rendering ANY auth CTA, stranding signed-
		// in users on marketing pages whenever the query stayed pending.
		// New behavior: trust the cookie probe during the pending window so
		// the Dashboard CTA renders immediately. The query downgrades to
		// signed-out only if the cookie is present AND the resolved session
		// is null (stale/expired cookie).
		setAuthCookie();
		useSupabaseSessionMock.mockReturnValue({
			data: undefined,
			isPending: true,
		});

		await renderNavbar();

		expect(
			screen.getByRole("link", { name: /Dashboard/i }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^Sign In$/i })).toBeNull();
	});

	it("downgrades to signed-out when cookie is present but resolved session is null (stale cookie)", async () => {
		// Authoritative downgrade path: cookie is present but the query
		// resolved to no session (e.g., the cookie is stale or rejected by
		// Supabase auth). Treat the user as signed-out.
		setAuthCookie();
		useSupabaseSessionMock.mockReturnValue({
			data: null,
			isPending: false,
		});

		await renderNavbar();

		expect(screen.getByRole("link", { name: /Sign In/i })).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Get Started/i }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Dashboard/i })).toBeNull();
	});

	it("renders Dashboard when cookie present and query resolves with a session", async () => {
		setAuthCookie();
		useSupabaseSessionMock.mockReturnValue({
			data: { access_token: "stub", user: { id: "stub-user" } },
			isPending: false,
		});

		await renderNavbar();

		expect(
			screen.getByRole("link", { name: /Dashboard/i }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^Sign In$/i })).toBeNull();
	});
});
