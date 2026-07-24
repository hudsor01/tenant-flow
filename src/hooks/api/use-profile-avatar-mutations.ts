/**
 * Profile Avatar Mutation Hooks
 * TanStack Query mutation hooks for avatar upload and removal.
 *
 * Split from use-profile-mutations.ts for the 300-line file size rule.
 */

import {
	mutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { logger } from "#lib/frontend-logger";
import {
	handleMutationError,
	handleMutationSuccess,
	showStorageQuotaUpgradeToast,
} from "#lib/mutation-error-handler";
import { wouldExceedStorageQuota } from "#lib/storage-plan-limit";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { AvatarUploadResponse, UserProfile } from "#types/api-contracts";
import { mutationKeys } from "./mutation-keys";
import { usageQueries } from "./query-keys/usage-keys";

import { profileKeys } from "./use-profile";

const avatarMutationFactories = {
	upload: () =>
		mutationOptions({
			mutationKey: mutationKeys.profile.uploadAvatar,
			mutationFn: async (file: File): Promise<AvatarUploadResponse> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const ext = file.name.split(".").pop() ?? "jpg";
				const path = `${user.id}/avatar.${ext}`;

				const { error: uploadError } = await supabase.storage
					.from("avatars")
					.upload(path, file, { upsert: true, contentType: file.type });
				if (uploadError) throw uploadError;

				const {
					data: { publicUrl },
				} = supabase.storage.from("avatars").getPublicUrl(path);

				// Deterministic path + upsert overwrites the same object in place (no
				// orphans), so bake a version token into the stored URL to bust the
				// CDN/browser cache key and force React to re-render the new src.
				const versionedUrl = `${publicUrl}?v=${Date.now()}`;

				const { error: updateError } = await supabase
					.from("users")
					.update({ avatar_url: versionedUrl })
					.eq("id", user.id);
				if (updateError) throw updateError;

				return { avatar_url: versionedUrl };
			},
		}),

	remove: () =>
		mutationOptions<{ success: boolean; message: string }, unknown, void>({
			mutationKey: mutationKeys.profile.deleteAvatar,
			mutationFn: async (): Promise<{ success: boolean; message: string }> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const { error } = await supabase
					.from("users")
					.update({ avatar_url: null })
					.eq("id", user.id);
				if (error) throw error;

				try {
					const { data: files } = await supabase.storage
						.from("avatars")
						.list(user.id);
					if (files && files.length > 0) {
						const paths = files
							.filter((f) => f.name.startsWith("avatar."))
							.map((f) => `${user.id}/${f.name}`);
						if (paths.length > 0) {
							await supabase.storage.from("avatars").remove(paths);
						}
					}
				} catch {
					// Storage cleanup is best-effort
				}

				return { success: true, message: "Avatar removed" };
			},
		}),
};

/**
 * Upload avatar image
 */
export function useUploadAvatarMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...avatarMutationFactories.upload(),

		onMutate: async (file: File) => {
			await queryClient.cancelQueries({ queryKey: profileKeys.detail() });

			// PROACTIVE pre-check: surface the Upgrade prompt before uploading when
			// the avatar would push the owner at/over a finite storage quota.
			// NON-destructive — still proceed so a grandfathered / Max / flag-off
			// owner's upload succeeds (the DB trigger is authoritative). Ignore
			// usage-read failures so the pre-check can never block an upload.
			try {
				const usage = await queryClient.ensureQueryData(usageQueries.storage());
				if (wouldExceedStorageQuota(usage, file.size)) {
					showStorageQuotaUpgradeToast();
				}
			} catch {
				/* pre-check is a non-authoritative UX nicety; ignore read failures */
			}

			const previousProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail(),
			);

			return { previousProfile };
		},

		onError: (err, _variables, context) => {
			if (context?.previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), context.previousProfile);
			}

			logger.error("Failed to upload avatar", {
				action: "upload_avatar",
				metadata: { error: err },
			});
			handleMutationError(err, "Upload avatar");
		},

		onSuccess: (data) => {
			const currentProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail(),
			);
			if (currentProfile) {
				queryClient.setQueryData(profileKeys.detail(), {
					...currentProfile,
					avatar_url: data.avatar_url,
				});
			}

			// The avatar upload changed the owner's storage SUM — refresh the
			// Settings usage bar (Plan 05) so it reflects the new bytes.
			queryClient.invalidateQueries({
				queryKey: usageQueries.storage().queryKey,
			});

			handleMutationSuccess("Upload avatar", "Your avatar has been updated");
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
		},
	});
}

/**
 * Remove avatar image
 */
export function useRemoveAvatarMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...avatarMutationFactories.remove(),

		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: profileKeys.detail() });

			const previousProfile = queryClient.getQueryData<UserProfile>(
				profileKeys.detail(),
			);

			if (previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), {
					...previousProfile,
					avatar_url: null,
				});
			}

			return { previousProfile };
		},

		onError: (err, _variables, context) => {
			if (context?.previousProfile) {
				queryClient.setQueryData(profileKeys.detail(), context.previousProfile);
			}

			logger.error("Failed to remove avatar", {
				action: "remove_avatar",
				metadata: { error: err },
			});
			handleMutationError(err, "Remove avatar");
		},

		onSuccess: () => {
			handleMutationSuccess("Remove avatar", "Your avatar has been removed");
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
		},
	});
}
