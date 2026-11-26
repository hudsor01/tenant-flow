"use client";

import type { ReactNode } from "react";
import { AuthStoreProvider } from "#providers/auth-provider";
import { QueryProvider } from "#providers/query-provider";

/**
 * The data and session providers for pages that work with an account: the
 * owner app, admin, login and the `/auth/*` pages.
 *
 * They used to wrap the whole site from the root `Providers`, which put
 * supabase-js, React Query's persisted cache and zod on every static
 * marketing page (2026-11-24 SEO audit S1). Marketing pages hold no session
 * and fetch nothing through the cache; the few that submit a form get a bare
 * client from `MutationScope`.
 */
export function AccountProviders({ children }: { children: ReactNode }) {
	return (
		<QueryProvider>
			<AuthStoreProvider>{children}</AuthStoreProvider>
		</QueryProvider>
	);
}
