/**
 * User Preferences Query Keys & Options
 *
 * queryOptions() factories for the `user_preferences` domain. Timezone and
 * Language live on `user_preferences` (NOT `users`) — this is the read side
 * for General Settings (FORMFIX-06). Mirrors the notification-settings
 * pattern: createClient inside the queryFn, getCachedUser for the user id,
 * a typed boundary mapper (no `as unknown as`), and no barrel re-export.
 */

import { queryOptions } from "@tanstack/react-query";
import { QUERY_CACHE_TIMES } from "#lib/constants/query-config";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { Database } from "#types/supabase";

export interface UserPreferences {
	timezone: string;
	language: string;
}

type UserPreferencesRow =
	Database["public"]["Tables"]["user_preferences"]["Row"];

// Fallbacks match the General Settings select defaults so the form always
// shows a valid selected option even before a user_preferences row exists.
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
	timezone: "America/Chicago",
	language: "en-US",
};

// Typed boundary mapper (no `as unknown as`): coalesces the nullable
// timezone/language columns to the UI defaults.
export function mapUserPreferencesRow(
	row: Pick<UserPreferencesRow, "timezone" | "language">,
): UserPreferences {
	return {
		timezone: row.timezone ?? DEFAULT_USER_PREFERENCES.timezone,
		language: row.language ?? DEFAULT_USER_PREFERENCES.language,
	};
}

export const userPreferencesKeys = {
	all: ["user-preferences"] as const,
};

export const userPreferencesQueries = {
	detail: () =>
		queryOptions({
			queryKey: userPreferencesKeys.all,
			queryFn: async (): Promise<UserPreferences> => {
				const supabase = createClient();
				const user = await getCachedUser();

				if (!user) throw new Error("Not authenticated");

				const { data, error } = await supabase
					.from("user_preferences")
					.select("timezone, language")
					.eq("user_id", user.id)
					.maybeSingle();

				if (error) throw error;

				if (data === null) return DEFAULT_USER_PREFERENCES;

				return mapUserPreferencesRow(data);
			},
			...QUERY_CACHE_TIMES.DETAIL,
		}),
};
