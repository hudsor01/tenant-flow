/**
 * Pins the server read of the persisted sidebar state (D-36, T-COOKIE).
 *
 * OwnerDashboardLayout reads `sidebar_state` with `await cookies()` and passes
 * one boolean to AppShell as `defaultSidebarOpen`. Only the literal `false`
 * collapses the rail; a missing or tampered value means expanded, the raw
 * cookie value never reaches the markup, and no function prop crosses the
 * server-to-client boundary.
 */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OwnerDashboardLayout } from "../owner-dashboard-layout";

const { mockCookies, appShellProps } = vi.hoisted(() => ({
	mockCookies: vi.fn(),
	appShellProps: vi.fn(),
}));

vi.mock("next/headers", () => ({
	cookies: () => mockCookies(),
}));

vi.mock("#components/shell/app-shell", () => ({
	AppShell: (props: { children: ReactNode; defaultSidebarOpen?: boolean }) => {
		appShellProps(props);
		return (
			<div
				data-testid="app-shell"
				data-default-sidebar-open={String(props.defaultSidebarOpen)}
			>
				{props.children}
			</div>
		);
	},
}));

// The stub test id avoids the word "script" so the markup check below can
// assert that the string is absent from the rendered HTML altogether.
vi.mock("#components/billing/subscription-status-banner", () => ({
	SubscriptionStatusBanner: () => <div data-testid="billing-banner" />,
}));

function stubCookie(value: string | undefined) {
	const get = vi
		.fn()
		.mockReturnValue(
			value === undefined ? undefined : { name: "sidebar_state", value },
		);
	mockCookies.mockResolvedValue({ get });
	return get;
}

async function renderLayout() {
	return render(
		await OwnerDashboardLayout({ children: <div data-testid="page" /> }),
	);
}

function receivedProps(): Record<string, unknown> {
	return appShellProps.mock.calls[0]?.[0] ?? {};
}

describe("OwnerDashboardLayout sidebar_state read", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("defaults to expanded when the cookie is absent", async () => {
		stubCookie(undefined);
		await renderLayout();

		expect(receivedProps().defaultSidebarOpen).toBe(true);
	});

	it.each([
		["true", true],
		["false", false],
	])("maps the cookie value %s to %s", async (value, expected) => {
		stubCookie(value);
		await renderLayout();

		expect(receivedProps().defaultSidebarOpen).toBe(expected);
		expect(screen.getByTestId("app-shell")).toHaveAttribute(
			"data-default-sidebar-open",
			String(expected),
		);
	});

	it.each(["FALSE", "0", "", '"><script>x</script>'])(
		"treats the tampered value %j as expanded and keeps it out of the markup",
		async (value) => {
			stubCookie(value);
			const { container } = await renderLayout();

			expect(receivedProps().defaultSidebarOpen).toBe(true);
			expect(container.innerHTML).not.toContain("script");
			if (value !== "") {
				expect(container.innerHTML).not.toContain(value);
			}
		},
	);

	it("reads the cookie store once, by the sidebar_state name", async () => {
		const get = stubCookie("false");
		await renderLayout();

		expect(mockCookies).toHaveBeenCalledTimes(1);
		expect(get).toHaveBeenCalledTimes(1);
		expect(get).toHaveBeenCalledWith("sidebar_state");
	});

	it("passes AppShell exactly children and one boolean", async () => {
		stubCookie("true");
		await renderLayout();

		expect(appShellProps).toHaveBeenCalledTimes(1);
		const props = receivedProps();
		expect(Object.keys(props).sort()).toEqual([
			"children",
			"defaultSidebarOpen",
		]);
		expect(typeof props.defaultSidebarOpen).toBe("boolean");
		for (const prop of Object.values(props)) {
			expect(typeof prop).not.toBe("function");
		}
	});

	it("renders the banner before the page inside the shell", async () => {
		stubCookie(undefined);
		await renderLayout();

		const shell = screen.getByTestId("app-shell");
		const banner = screen.getByTestId("billing-banner");
		const page = screen.getByTestId("page");
		expect(shell).toContainElement(banner);
		expect(shell).toContainElement(page);
		expect(
			banner.compareDocumentPosition(page) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});
