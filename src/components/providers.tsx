"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { GlobalLoadingIndicator } from "#components/ui/global-loading-indicator";
import { DEFAULT_THEME_MODE, THEME_MODE_STORAGE_KEY } from "#lib/theme-utils";
import { AuthStoreProvider } from "#providers/auth-provider";
import { PreferencesStoreProvider } from "#providers/preferences-provider";
import { QueryProvider } from "#providers/query-provider";
import { ThemeProvider } from "#providers/theme-provider";
import type { PreferencesState } from "#stores/preferences-store";

interface ProvidersProps {
	children: ReactNode;
	initialThemeMode?: PreferencesState["themeMode"];
}

export function Providers({
	children,
	initialThemeMode = DEFAULT_THEME_MODE,
}: ProvidersProps) {
	// CISEC-02 note: next-themes injects a bare inline no-flash <script>.
	// On private routes (which carry the nonce CSP with 'strict-dynamic')
	// that script is un-nonced, so it's CSP-blocked → a one-paint flash of
	// the default theme before React hydrates the correct theme. We do NOT
	// thread a nonce here because `Providers` renders from the ROOT layout
	// (shared by static marketing routes); reading the per-request nonce via
	// `headers()` would force every marketing page dynamic — the exact
	// regression CISEC-02's route-scoping avoids. Eliminating the private-
	// route FOUC requires a private-scoped theme provider that reads the
	// nonce only under the (owner) segment — tracked as a v4.0 follow-up.
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme={initialThemeMode}
			enableSystem
			disableTransitionOnChange
			storageKey={THEME_MODE_STORAGE_KEY}
		>
			<PreferencesStoreProvider themeMode={initialThemeMode}>
				<QueryProvider>
					<NuqsAdapter>
						<AuthStoreProvider>
							{children}
							<GlobalLoadingIndicator />
						</AuthStoreProvider>
					</NuqsAdapter>
				</QueryProvider>
			</PreferencesStoreProvider>
		</ThemeProvider>
	);
}
