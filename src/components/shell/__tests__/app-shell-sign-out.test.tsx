/**
 * Where the shell's "Sign out" lands (66.2-39 fix round 4, Part 8l).
 *
 * Main session: every control that runs the general "Sign out" goes to
 * /login with `router.replace` as soon as it succeeds, once, after the auth
 * data is cleared. The shell's user menu and its command palette stayed on
 * the owner page with no session. The real `useSignOutMutation` runs here;
 * only the Supabase client, the router and the shell's data hooks are stubs.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const { router, clearAuthData, getUser, signOut } = vi.hoisted(() => ({
	router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
	clearAuthData: vi.fn(),
	getUser: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
	useRouter: () => router,
}));

vi.mock("#hooks/api/use-auth", () => ({
	useSupabaseUser: () => ({
		data: {
			id: "test-user-id",
			email: "owner@example.com",
			user_metadata: { full_name: "Jane Smith" },
		},
	}),
	useAuthCacheUtils: () => ({ clearAuthData }),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ auth: { getUser, signOut } }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("#hooks/api/use-properties", () => ({
	usePropertyList: () => ({ data: [] }),
}));
vi.mock("#hooks/api/use-tenant", () => ({
	useTenantList: () => ({ data: { data: [] } }),
}));
vi.mock("../main-nav", () => ({
	MainNav: () => <nav data-testid="main-nav" />,
}));
vi.mock("../quick-actions-dock", () => ({ QuickActionsDock: () => null }));
vi.mock("#components/ui/global-sync-indicator", () => ({
	GlobalSyncIndicator: () => null,
}));
vi.mock("#components/notifications/notification-bell", () => ({
	NotificationBell: () => null,
}));

import { AppShell } from "../app-shell";

beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

function renderShell() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return render(<AppShell>Content</AppShell>, { wrapper });
}

async function signOutFromMenu() {
	const user = userEvent.setup();
	const { container } = renderShell();
	await user.click(
		container.querySelector('button[aria-haspopup="menu"]') as HTMLElement,
	);
	await user.click(screen.getByRole("menuitem", { name: /^sign out$/i }));
}

async function signOutFromPalette() {
	const user = userEvent.setup();
	renderShell();
	await user.keyboard("{Meta>}k{/Meta}");
	await user.click(await screen.findByRole("option", { name: /^sign out/i }));
}

beforeEach(() => {
	vi.clearAllMocks();
	getUser.mockResolvedValue({ data: { user: { id: "u" } }, error: null });
	signOut.mockResolvedValue({ error: null });
});

afterEach(() => {
	vi.clearAllMocks();
});

describe.each([
	["the user menu", signOutFromMenu],
	["the command palette", signOutFromPalette],
])("the shell's Sign out, from %s", (_label, press) => {
	it("lands on /login once, after the auth data is cleared", async () => {
		await press();

		await waitFor(() => expect(router.replace).toHaveBeenCalled());
		expect(router.replace).toHaveBeenCalledTimes(1);
		expect(router.replace).toHaveBeenCalledWith("/login");
		expect(router.push).not.toHaveBeenCalled();
		expect(clearAuthData).toHaveBeenCalledTimes(1);
		expect(clearAuthData.mock.invocationCallOrder[0]).toBeLessThan(
			router.replace.mock.invocationCallOrder[0] ?? 0,
		);
	});

	it("stays after a failed first request, whose session is kept", async () => {
		signOut.mockResolvedValueOnce({ error: new Error("Failed to fetch") });

		await press();

		await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
		expect(router.replace).not.toHaveBeenCalled();
		expect(router.push).not.toHaveBeenCalled();
		expect(clearAuthData).not.toHaveBeenCalled();
	});

	it("lands on /login after a failed second request, whose browser is signed out", async () => {
		signOut
			.mockResolvedValueOnce({ error: null })
			.mockResolvedValueOnce({ error: new Error("server error") });

		await press();

		await waitFor(() => expect(router.replace).toHaveBeenCalled());
		expect(router.replace).toHaveBeenCalledTimes(1);
		expect(router.replace).toHaveBeenCalledWith("/login");
		expect(clearAuthData).toHaveBeenCalledTimes(1);
	});
});
