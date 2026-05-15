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

	it("renders no CTA while the query is pending AND a cookie is present (defers to query for the signed-in branch)", async () => {
		setAuthCookie();
		useSupabaseSessionMock.mockReturnValue({
			data: undefined,
			isPending: true,
		});

		await renderNavbar();

		// Mount runs useEffect → hasAuthCookie=true → authResolved gates on
		// !authPending → renders nothing while the query is still pending.
		expect(screen.queryByRole("link", { name: /Sign In/i })).toBeNull();
		expect(screen.queryByRole("link", { name: /Get Started/i })).toBeNull();
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
