import { useSyncExternalStore } from "react";

function subscribe(): () => void {
	return () => {};
}

/**
 * False during server rendering and the hydration render, true after: the
 * first render in the browser matches the server's, then React re-renders.
 *
 * Owner data loads in the browser only. A `useSuspenseQuery` that renders
 * on the server runs its queryFn there with the browser Supabase client, which
 * has no session, so PostgREST refuses it as anon (42501, logged and sent to
 * Sentry on every page load) before the browser fetches it again. A component
 * that suspends on owner data renders its skeleton until this is true.
 */
export function useIsClient(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}
