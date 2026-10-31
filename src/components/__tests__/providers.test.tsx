import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "#components/providers";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#components/ui/tooltip";
import { DEFAULT_THEME_MODE, THEME_MODE_STORAGE_KEY } from "#lib/theme-utils";

const { themeProps } = vi.hoisted(() => ({
	themeProps: [] as Record<string, unknown>[],
}));

vi.mock("#providers/theme-provider", () => ({
	ThemeProvider: ({
		children,
		...props
	}: { children: ReactNode } & Record<string, unknown>) => {
		themeProps.push(props);
		return <>{children}</>;
	},
}));

vi.mock("#providers/preferences-provider", () => ({
	PreferencesStoreProvider: ({ children }: { children: ReactNode }) => (
		<>{children}</>
	),
}));

vi.mock("#providers/query-provider", () => ({
	QueryProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("#providers/auth-provider", () => ({
	AuthStoreProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("Providers", () => {
	it("supplies a tooltip provider to descendants", () => {
		render(
			<Providers>
				<Tooltip defaultOpen>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent>Tip body</TooltipContent>
				</Tooltip>
			</Providers>,
		);

		expect(screen.getByRole("tooltip")).toHaveTextContent("Tip body");
		expect(
			document.querySelector('[data-slot="tooltip-content"]'),
		).not.toBeNull();
	});

	it("keeps the ThemeProvider props that the CSP script hash depends on", () => {
		// THEME_NO_FLASH_SCRIPT_HASH in src/proxy.ts hashes the script these props produce.
		const { unmount } = render(
			<Providers>
				<span>child</span>
			</Providers>,
		);

		expect(themeProps.at(-1)).toEqual({
			attribute: "class",
			defaultTheme: DEFAULT_THEME_MODE,
			enableSystem: true,
			disableTransitionOnChange: true,
			storageKey: THEME_MODE_STORAGE_KEY,
		});
		unmount();

		render(
			<Providers initialThemeMode="dark">
				<span>child</span>
			</Providers>,
		);

		expect(themeProps.at(-1)).toEqual({
			attribute: "class",
			defaultTheme: "dark",
			enableSystem: true,
			disableTransitionOnChange: true,
			storageKey: THEME_MODE_STORAGE_KEY,
		});
	});
});
