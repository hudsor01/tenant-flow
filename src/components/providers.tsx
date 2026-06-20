"use client";

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
					{/*
					 * NuqsAdapter is intentionally NOT at the root. It calls
					 * useSearchParams() internally, which — wrapping the whole
					 * app from the shared root layout — forces EVERY static
					 * marketing/auth page to defer its content to the client
					 * (the page renders behind the root `app/loading.tsx`
					 * "Loading TenantFlow…" Suspense fallback until hydration).
					 * Any JS hiccup (slow network, a 503'd chunk, an ad-blocker)
					 * then leaves the user stuck on the spinner. The adapter is
					 * scoped to the only subtrees that use nuqs query state:
					 * `app/(owner)/layout.tsx` and `app/blog/layout.tsx`.
					 */}
					<AuthStoreProvider>
						{children}
						<GlobalLoadingIndicator />
					</AuthStoreProvider>
				</QueryProvider>
			</PreferencesStoreProvider>
		</ThemeProvider>
	);
}
