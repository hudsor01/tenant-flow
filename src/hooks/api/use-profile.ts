import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_CACHE_TIMES } from "#lib/constants/query-config";
import { createClient } from "#lib/supabase/client";
import type { UserProfile } from "#types/api-contracts";

export const profileKeys = {
	all: ["profile"] as const,
	detail: () => [...profileKeys.all, "detail"] as const,
	company: () => [...profileKeys.all, "company"] as const,
};

export const PROFILE_SELECT =
	"id, email, first_name, last_name, full_name, phone, avatar_url, is_admin, status, created_at, updated_at, stripe_customer_id";

// Signature matches the live public.users column nullability.
// full_name + status are NOT NULL columns; created_at + updated_at are
// nullable. Earlier signatures had this inverted -- corrected during the
// post-#749 typed-client review.
export function mapUserProfile(row: {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	full_name: string;
	phone: string | null;
	avatar_url: string | null;
	is_admin: boolean;
	status: string;
	created_at: string | null;
	updated_at: string | null;
	stripe_customer_id: string | null;
}): UserProfile {
	return {
		id: row.id,
		email: row.email,
		first_name: row.first_name,
		last_name: row.last_name,
		full_name: row.full_name,
		phone: row.phone,
		avatar_url: row.avatar_url,
		is_admin: row.is_admin,
		status: row.status,
		created_at: row.created_at,
		updated_at: row.updated_at,
	} satisfies UserProfile;
}

export const profileQueries = {
	all: () => ["profile"] as const,
	detail: () =>
		queryOptions({
			queryKey: profileKeys.detail(),
			queryFn: async (): Promise<UserProfile> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("users")
					.select(PROFILE_SELECT)
					.single();
				if (error) throw error;
				return mapUserProfile(data!);
			},
			...QUERY_CACHE_TIMES.DETAIL,
		}),
};

export function useProfile() {
	return useQuery(profileQueries.detail());
}
