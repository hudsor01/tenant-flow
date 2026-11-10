"use client";

/**
 * Auth Mutation Hooks
 * TanStack Query mutation hooks for authentication operations
 *
 * Split from use-auth.ts for the 300-line file size rule.
 * Query hooks and authKeys remain in use-auth.ts per CLAUDE.md rule.
 */

import {
	type AuthError,
	isAuthApiError,
	isAuthSessionMissingError,
} from "@supabase/supabase-js";
import { mutationOptions, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { logger } from "#lib/frontend-logger";
import {
	handleMutationError,
	handleMutationSuccess,
} from "#lib/mutation-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { mutationKeys } from "./mutation-keys";
import { useAuthCacheUtils } from "./use-auth";

/** What a failed first request of "Sign out" tells the owner (shell and profile toast). */
const SIGN_OUT_FAILED = "Sign out failed. Check your connection and try again.";

/**
 * A sign-out request failed after auth-js had already removed this browser's
 * session: auth-js 2.118.0 `_signOut` does on any error other than
 * 401/403/404 unless the scope is `others`. That is "Sign out"'s second
 * request (`scope: "local"`, after the first ended every other session) and
 * the session row's "Sign out this device" (`use-sessions.ts`). This
 * browser's session may still be open on the server, and a retry cannot
 * reach it, because the browser no longer holds its token. Once signed in
 * again, the owner sees it as another session under Active Sessions and ends
 * it there. One wording serves both: it names neither the other devices,
 * which the session row never signs out, nor a sign-out that would end them.
 */
const SIGN_OUT_INCOMPLETE_TITLE = "Sign out did not finish";
const SIGN_OUT_INCOMPLETE_DETAIL =
	"You are signed out of this browser, but its session may still be open on our server. Sign in again and end it under Active Sessions in Settings.";

/**
 * "Sign out" found this browser's session already ended on the server
 * (another device signed out everywhere, or revoked it under Active
 * Sessions). The logout endpoint then answers 403 `session_not_found` (or 401
 * for a JWT it rejects), which auth-js treats as success, so the two requests
 * would report "signed out everywhere" while the other sessions stayed open:
 * the server cannot tell whose sessions to end from a session it no longer
 * has. Signing in again gives the browser a live session, and "Sign out"
 * then ends the others through its first request.
 */
const SIGN_OUT_SESSION_ENDED_DETAIL =
	"This browser was already signed out, so your other devices could not be signed out from here. Sign in and sign out again to end their sessions.";

export class SignOutIncompleteError extends Error {
	readonly title = SIGN_OUT_INCOMPLETE_TITLE;
	readonly detail: string;
	constructor(cause: unknown, detail: string = SIGN_OUT_INCOMPLETE_DETAIL) {
		super(`${SIGN_OUT_INCOMPLETE_TITLE}. ${detail}`, { cause });
		this.name = "SignOutIncompleteError";
		this.detail = detail;
	}
}

/**
 * `getUser()`'s answer for a browser whose session the server no longer
 * accepts (auth-js 2.118.0, proven against a stubbed fetch, 66.2-39 fix
 * round 4, Part 8l): a 403 `session_not_found`, or no session in the browser
 * at all, is `AuthSessionMissingError`, and auth-js has removed the session
 * and fired SIGNED_OUT; a 401 (a JWT the server rejects) is an
 * `AuthApiError` with status 401, and the session is still stored. A live
 * session answers with the user; a 404 means the user no longer exists, and
 * with it every session, so there is nothing left to end.
 */
function sessionAlreadyEnded(error: AuthError): boolean {
	return (
		isAuthSessionMissingError(error) ||
		(isAuthApiError(error) && (error.status === 401 || error.status === 403))
	);
}

const authMutationFactories = {
	/**
	 * "Sign out" ends every session of the account, on every device (sessions
	 * here never expire, so the general sign-out is global). It does so in two
	 * requests, because one `scope: "global"` request that fails has already
	 * cleared this browser's session (auth-js 2.118.0 `_signOut`), and the page
	 * then said the owner was signed out while every other session stayed open
	 * (66.2-39 fix round 4, Part 8k):
	 *   1. `scope: "others"` ends every other session. On failure auth-js keeps
	 *      this browser's session, so the owner stays signed in, sees the error
	 *      and can try again.
	 *   2. `scope: "local"` then ends this session, on the server and in the
	 *      browser. Its failure is `SignOutIncompleteError`.
	 * Before them, one `getUser()` request asks the server whether it still
	 * accepts this browser's session. When it does not, neither request could
	 * end the other sessions, and both would report success (auth-js treats a
	 * 401, 403 or 404 from the logout endpoint as signed out), so the sign-out
	 * stops with the incomplete outcome and says why (Part 8l). Any other
	 * `getUser()` failure (offline, a 5xx) is left to the first request, which
	 * fails the same way or succeeds.
	 * `networkMode: "always"`: under the app's default `"online"` an offline
	 * press paused the mutation ("Signing out..." until the browser came back)
	 * and then signed out on reconnect; now it fails at once.
	 */
	logout: () =>
		mutationOptions<void, unknown, void>({
			mutationKey: mutationKeys.auth.logout,
			networkMode: "always",
			mutationFn: async () => {
				const supabase = createClient();
				const { error: userError } = await supabase.auth.getUser();
				if (userError && sessionAlreadyEnded(userError)) {
					// After a 403 getUser() has removed the session, so this sends
					// nothing; after a 401 the rejected session is still stored, and
					// this removes it (a local sign-out removes it whatever its
					// request is answered).
					await supabase.auth.signOut({ scope: "local" });
					throw new SignOutIncompleteError(
						userError,
						SIGN_OUT_SESSION_ENDED_DETAIL,
					);
				}
				const others = await supabase.auth.signOut({ scope: "others" });
				if (others.error) throw others.error;
				const local = await supabase.auth.signOut({ scope: "local" });
				if (local.error) throw new SignOutIncompleteError(local.error);
			},
		}),

	resetPassword: () =>
		mutationOptions<void, unknown, string>({
			mutationKey: mutationKeys.auth.resetPassword,
			mutationFn: async (email: string) => {
				const supabase = createClient();
				const { error } = await supabase.auth.resetPasswordForEmail(email, {
					redirectTo: `${window.location.origin}/auth/update-password`,
				});
				if (error) throw error;
			},
		}),

	changePassword: () =>
		mutationOptions({
			mutationKey: mutationKeys.auth.updatePassword,
			mutationFn: async ({
				currentPassword,
				newPassword,
			}: {
				currentPassword: string;
				newPassword: string;
			}) => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user?.email) {
					throw new Error("User not authenticated");
				}

				const { error: signInError } = await supabase.auth.signInWithPassword({
					email: user.email,
					password: currentPassword,
				});
				if (signInError) {
					throw new Error("Current password is incorrect");
				}

				const { data, error } = await supabase.auth.updateUser({
					password: newPassword,
				});
				if (error) throw error;
				return data;
			},
		}),
};

/**
 * Sign out mutation with comprehensive cache clearing.
 *
 * Every "Sign out" (the shell's menu and command palette, the profile page,
 * `/auth/signout`) lands on `/login` as soon as it succeeds, once, after the
 * auth data is cleared (main session, Part 8l): one landing for one action,
 * and no timed redirect, which is a time limit the owner cannot turn off or
 * extend (WCAG 2.2.1).
 *
 * A failure is shown as a toast (the shell's menu and command palette, the
 * profile page), and an incomplete sign-out, whose browser is signed out,
 * lands on `/login` too, the toast going with it. `/auth/signout` passes
 * `toastOnError: false`: it shows the failure and the incomplete outcome in
 * the page, beside its retry or its Sign In.
 */
export function useSignOutMutation({
	toastOnError = true,
}: {
	toastOnError?: boolean;
} = {}) {
	const { clearAuthData } = useAuthCacheUtils();
	const router = useRouter();

	return useMutation({
		...authMutationFactories.logout(),
		onSuccess: () => {
			clearAuthData();
			logger.info("User signed out successfully - all cache cleared", {
				action: "sign_out_success",
			});
			router.replace("/login");
		},
		onError: (error) => {
			// The browser is signed out after an incomplete sign-out too: clear
			// what a success clears, so the next user of this browser inherits
			// nothing.
			const incomplete = error instanceof SignOutIncompleteError;
			if (incomplete) clearAuthData();
			if (toastOnError) {
				handleMutationError(
					error,
					"Sign out",
					incomplete ? undefined : SIGN_OUT_FAILED,
				);
				if (incomplete) router.replace("/login");
				return;
			}
			logger.error("Sign out failed", {
				action: "sign_out_error",
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
			});
		},
	});
}

/**
 * Password reset request mutation
 */
export function useSupabasePasswordResetMutation() {
	return useMutation({
		...authMutationFactories.resetPassword(),
		onSuccess: () =>
			handleMutationSuccess(
				"Password reset",
				"Please check your email for instructions",
			),
		onError: (error) => handleMutationError(error, "Password reset"),
	});
}

/**
 * Change password mutation
 */
export function useChangePasswordMutation() {
	return useMutation({
		...authMutationFactories.changePassword(),
		onSuccess: () => {
			handleMutationSuccess(
				"Change password",
				"Your password has been updated successfully",
			);
		},
		onError: (error) => {
			handleMutationError(error, "Change password");
		},
	});
}
