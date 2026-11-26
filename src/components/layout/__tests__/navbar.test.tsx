/**
 * The marketing navbar's auth CTA comes from the Supabase auth cookie alone
 * (2026-11-24 SEO audit S1): no session query, so supabase-js and React
 * Query stay off marketing pages. It renders outside any QueryClient, as it
 * does on a marketing page.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock, useNavigationMock } = vi.hoisted(() => ({
	usePathnameMock: vi.fn(),
	useNavigationMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => usePathnameMock(),
}));

vi.mock("#stores/navigation-store", () => ({
	useNavigationStore: () => useNavigationMock(),
}));

vi.mock("#lib/supabase/cookie-name", () => ({
	SUPABASE_AUTH_COOKIE_NAME: "sb-test-project-auth-token",
}));

function renderNavbar() {
	return import("../navbar").then(({ Navbar }) => render(<Navbar />));
}

function clearAuthCookie(name = "sb-test-project-auth-token") {
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function setAuthCookie(name = "sb-test-project-auth-token") {
	document.cookie = `${name}=stub-token; path=/`;
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
		clearAuthCookie("sb-test-project-auth-token.0");
	});

	it("renders Sign In + Start free when there is no auth cookie", async () => {
		await renderNavbar();

		expect(screen.getByRole("link", { name: /Sign In/i })).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Start free/i }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Dashboard/i })).toBeNull();
	});

	it.each([
		["a whole cookie", "sb-test-project-auth-token"],
		["a chunked cookie", "sb-test-project-auth-token.0"],
	])("renders Dashboard for %s", async (_label, name) => {
		setAuthCookie(name);

		await renderNavbar();

		expect(
			await screen.findByRole("link", { name: /Dashboard/i }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^Sign In$/i })).toBeNull();
	});

	// Owner, 2026-11-09 (66.2-39 fix round 4, Part 8k): the proxy sends an owner
	// whose subscription has lapsed to /pricing from every owner page but
	// Settings; the signed-in navbar is how they reach it from there.
	it("links a signed-in visitor to Settings beside Dashboard, and a signed-out one to neither", async () => {
		setAuthCookie();
		const { unmount } = await renderNavbar();
		expect(
			await screen.findByRole("link", { name: /^Settings$/ }),
		).toHaveAttribute("href", "/settings");
		unmount();

		clearAuthCookie();
		await renderNavbar();
		expect(screen.queryByRole("link", { name: /^Settings$/ })).toBeNull();
	});
});
