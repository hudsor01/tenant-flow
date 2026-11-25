"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

/**
 * A bare React Query client for marketing pages whose forms run
 * `useMutation` (newsletter signup, the lead-capture modal, the pricing
 * cards). The account providers, with their persisted cache and session
 * store, mount only on account pages (`AccountProviders`); these mutations
 * need neither, and each handles its own errors.
 *
 * Mounted by the blog, pricing and compare layouts. A page outside them that
 * renders one of those forms fails its prerender ("No QueryClient set"), so a
 * missing scope can't reach production silently.
 */
export function MutationScope({ children }: { children: ReactNode }) {
	const [client] = useState(
		() => new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
	);
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
