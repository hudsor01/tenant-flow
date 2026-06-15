"use client";

/**
 * Auth Mutation Hooks
 * TanStack Query mutation hooks for authentication operations
 *
 * Split from use-auth.ts for the 300-line file size rule.
 * Query hooks and authKeys remain in use-auth.ts per CLAUDE.md rule.
 */

import { mutationOptions, useMutation } from "@tanstack/react-query";
import { logger } from "#lib/frontend-logger";
import {
	handleMutationError,
	handleMutationSuccess,
} from "#lib/mutation-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { mutationKeys } from "./mutation-keys";
import { useAuthCacheUtils } from "./use-auth";

const authMutationFactories = {
	logout: () =>
		mutationOptions<void, unknown, void>({
			mutationKey: mutationKeys.auth.logout,
			mutationFn: async () => {
				const supabase = createClient();
				const { error } = await supabase.auth.signOut();
				if (error) throw error;
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
 * Sign out mutation with comprehensive cache clearing
 */
export function useSignOutMutation() {
	const { clearAuthData } = useAuthCacheUtils();

	return useMutation({
		...authMutationFactories.logout(),
		onSuccess: () => {
			clearAuthData();
			logger.info("User signed out successfully - all cache cleared", {
				action: "sign_out_success",
			});
		},
		onError: (error) => {
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
