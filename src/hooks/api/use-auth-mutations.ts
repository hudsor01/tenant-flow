"use client";

/**
 * Auth Mutation Hooks
 * TanStack Query mutation hooks for authentication operations
 *
 * Split from use-auth.ts for the 300-line file size rule.
 * Query hooks and authKeys remain in use-auth.ts per CLAUDE.md rule.
 */

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
 * The second request of "Sign out" failed. auth-js 2.118.0 `_signOut` has
 * already removed this browser's session (it does on any error other than
 * 401/403/404 unless the scope is `others`), and the first request ended every
 * other session, so only this session may still be open on the server. A
 * retry cannot reach it, because the browser no longer holds its token;
 * signing in again and signing out ends it, through that sign-out's first
 * request.
 */
const SIGN_OUT_INCOMPLETE_TITLE = "Sign out did not finish";
const SIGN_OUT_INCOMPLETE_DETAIL =
	"You are signed out of this browser and your other devices, but this session may still be open on our server. Sign in and sign out again to close it.";

export class SignOutIncompleteError extends Error {
	readonly title = SIGN_OUT_INCOMPLETE_TITLE;
	readonly detail = SIGN_OUT_INCOMPLETE_DETAIL;
	constructor(cause: unknown) {
		super(`${SIGN_OUT_INCOMPLETE_TITLE}. ${SIGN_OUT_INCOMPLETE_DETAIL}`, {
			cause,
		});
		this.name = "SignOutIncompleteError";
	}
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
