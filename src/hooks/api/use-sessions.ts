import {
	mutationOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
	handleMutationError,
	handleMutationSuccess,
} from "#lib/mutation-error-handler";
import { createClient } from "#lib/supabase/client";
import { mutationKeys } from "./mutation-keys";
import {
	decodeSessionIdFromAccessToken,
	sessionKeys,
	sessionQueries,
	type UserSession,
} from "./query-keys/session-keys";
import { useAuthCacheUtils } from "./use-auth";
import { SignOutIncompleteError } from "./use-auth-mutations";

export interface RevokeSessionInput {
	/** auth.sessions.id UUID returned by get_user_sessions RPC. */
	id: string;
	/**
	 * UI hint from the listing's `is_current` flag (decoded at list time).
	 * The mutation re-derives the current-session match from a fresh JWT
	 * decode at fire time — this field is advisory only, used for fast-path
	 * UX (e.g. confirmation prompt). Never the sole signal.
	 */
	isCurrent: boolean;
}

const sessionMutationFactories = {
	/**
	 * `networkMode: "always"`, as "Sign out" has (Part 8k): under the app's
	 * default `"online"` an offline press paused the mutation, the dialog
	 * stayed loading, and the session ended on reconnect; now it runs at once
	 * and fails, this device's row with the incomplete outcome (66.2-39 fix
	 * round 4, Part 8l).
	 */
	revoke: () =>
		mutationOptions({
			mutationKey: mutationKeys.sessions.revoke,
			networkMode: "always",
			mutationFn: async (input: RevokeSessionInput) => {
				const supabase = createClient();

				const {
					data: { session },
				} = await supabase.auth.getSession();

				// Re-derive whether `input.id` is the browser's current session at
				// fire time. The listing's `is_current` is computed from the same
				// decode, but if `decodeSessionIdFromAccessToken` returned null on
				// the listing fetch (rare — custom_access_token_hook stripping
				// claims, or other JWT-shape changes), every row would carry
				// is_current=false even for the actual current session. Using
				// `input.isCurrent || sessionMatchesCurrent` covers both:
				//  - normal: is_current=true → fast-path signOut
				//  - decode-failed-at-list-time: row carries false but the fresh
				//    decode here matches → still routed to signOut
				const currentSessionId = session
					? decodeSessionIdFromAccessToken(session.access_token)
					: null;
				const isOwnCurrentSession =
					input.isCurrent ||
					(currentSessionId !== null && currentSessionId === input.id);

				if (isOwnCurrentSession) {
					// Current session: signOut({ scope: "local" }) deletes this
					// session server-side (gotrue removes its auth.sessions row) and
					// clears the client (localStorage tokens + cookies + caches). The
					// default scope is "global", which ended EVERY session of the user,
					// while the row and its confirmation sign out this device only
					// (66.2-39 fix round 4, Part 8h).
					const { error } = await supabase.auth.signOut({ scope: "local" });
					// On failure auth-js 2.118.0 has already removed this browser's
					// session (it does on any error other than 401/403/404 unless the
					// scope is `others`), so the row's error and its retry offered
					// what could not work: the incomplete outcome of "Sign out"
					// instead (Part 8l).
					if (error) throw new SignOutIncompleteError(error);
					return { success: true, message: "Session terminated" };
				}

				// Non-current sessions: SECURITY DEFINER RPC validates auth.uid() ==
				// session.user_id and deletes the row from auth.sessions. The user's
				// other device will fail its next token refresh.
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();
				if (userError) throw userError;
				if (!user) throw new Error("Not authenticated");

				const { error } = await supabase.rpc("revoke_user_session", {
					p_user_id: user.id,
					p_session_id: input.id,
				});
				if (error) throw error;

				// Defense-in-depth: if the JWT decode failed both at list-fetch
				// time AND in the fast-path check above, the user may have just
				// deleted their OWN current session via the RPC path — the
				// auth.sessions row is gone server-side but local tokens persist
				// until the next refresh. Re-decode one more time after the
				// successful RPC and signOut() if a match is now visible.
				const {
					data: { session: postSession },
				} = await supabase.auth.getSession();
				const postCurrent = postSession
					? decodeSessionIdFromAccessToken(postSession.access_token)
					: null;
				if (postCurrent !== null && postCurrent === input.id) {
					await supabase.auth.signOut({ scope: "local" });
				}

				return { success: true, message: "Session terminated" };
			},
		}),
};

export function useUserSessions() {
	return useQuery(sessionQueries.list());
}

export function useRevokeSessionMutation() {
	const queryClient = useQueryClient();
	const { clearAuthData } = useAuthCacheUtils();
	const router = useRouter();

	return useMutation({
		...sessionMutationFactories.revoke(),
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: sessionKeys.all });

			const previous = queryClient.getQueryData<UserSession[]>(sessionKeys.all);

			if (previous) {
				queryClient.setQueryData<UserSession[]>(sessionKeys.all, (old) =>
					old?.filter((session) => session.id !== input.id),
				);
			}

			return { previous };
		},
		onError: (error, _variables, context) => {
			// "Sign out this device" failed after this browser was signed out:
			// no row to restore and no retry. Clear what a sign-out clears, say
			// what happened and go to sign in, as "Sign out" does (Part 8l).
			if (error instanceof SignOutIncompleteError) {
				clearAuthData();
				handleMutationError(error, "Revoke session");
				router.replace("/login");
				return;
			}

			// Another session's revoke failed: nothing changed in this browser,
			// so the row comes back and its button tries again.
			if (context?.previous) {
				queryClient.setQueryData(sessionKeys.all, context.previous);
			}

			handleMutationError(error, "Revoke session");
		},
		onSuccess: () => {
			handleMutationSuccess(
				"Revoke session",
				"The session has been terminated successfully",
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: sessionKeys.all });
		},
	});
}
