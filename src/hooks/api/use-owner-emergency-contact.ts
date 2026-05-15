import {
	mutationOptions,
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { QUERY_CACHE_TIMES } from "#lib/constants/query-config";
import { logger } from "#lib/frontend-logger";
import { handleMutationError } from "#lib/mutation-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";

import { mutationKeys } from "./mutation-keys";

export interface OwnerEmergencyContact {
	name: string | null;
	phone: string | null;
	relationship: string | null;
}

export interface OwnerEmergencyContactInput {
	name?: string | null;
	phone?: string | null;
	relationship?: string | null;
}

export const ownerEmergencyContactKeys = {
	all: ["owner-emergency-contact"] as const,
	detail: () => [...ownerEmergencyContactKeys.all, "detail"] as const,
};

export const ownerEmergencyContactQueries = {
	all: () => ownerEmergencyContactKeys.all,
	detail: () =>
		queryOptions({
			queryKey: ownerEmergencyContactKeys.detail(),
			queryFn: async (): Promise<OwnerEmergencyContact | null> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const { data, error } = await supabase
					.from("users")
					.select(
						"emergency_contact_name, emergency_contact_phone, emergency_contact_relationship",
					)
					.eq("id", user.id)
					.maybeSingle();

				if (error) throw error;
				if (!data) return null;

				if (
					data.emergency_contact_name === null &&
					data.emergency_contact_phone === null &&
					data.emergency_contact_relationship === null
				) {
					return null;
				}

				return {
					name: data.emergency_contact_name,
					phone: data.emergency_contact_phone,
					relationship: data.emergency_contact_relationship,
				};
			},
			...QUERY_CACHE_TIMES.DETAIL,
		}),
};

const ownerEmergencyContactMutationFactories = {
	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.ownerEmergencyContact.update,
			mutationFn: async (
				input: OwnerEmergencyContactInput,
			): Promise<OwnerEmergencyContact> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const { data, error } = await supabase
					.from("users")
					.update({
						emergency_contact_name: input.name ?? null,
						emergency_contact_phone: input.phone ?? null,
						emergency_contact_relationship: input.relationship ?? null,
					})
					.eq("id", user.id)
					.select(
						"emergency_contact_name, emergency_contact_phone, emergency_contact_relationship",
					)
					.single();

				if (error) throw error;

				return {
					name: data.emergency_contact_name,
					phone: data.emergency_contact_phone,
					relationship: data.emergency_contact_relationship,
				};
			},
		}),

	delete: () =>
		mutationOptions<{ success: boolean }, unknown, void>({
			mutationKey: mutationKeys.ownerEmergencyContact.delete,
			mutationFn: async (): Promise<{ success: boolean }> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const { error } = await supabase
					.from("users")
					.update({
						emergency_contact_name: null,
						emergency_contact_phone: null,
						emergency_contact_relationship: null,
					})
					.eq("id", user.id);

				if (error) throw error;
				return { success: true };
			},
		}),
};

export function useOwnerEmergencyContact() {
	return useQuery(ownerEmergencyContactQueries.detail());
}

export function useUpdateOwnerEmergencyContactMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...ownerEmergencyContactMutationFactories.update(),

		onMutate: async (input) => {
			await queryClient.cancelQueries({
				queryKey: ownerEmergencyContactKeys.detail(),
			});

			const previous = queryClient.getQueryData<OwnerEmergencyContact | null>(
				ownerEmergencyContactKeys.detail(),
			);

			queryClient.setQueryData<OwnerEmergencyContact | null>(
				ownerEmergencyContactKeys.detail(),
				{
					name: input.name ?? null,
					phone: input.phone ?? null,
					relationship: input.relationship ?? null,
				},
			);

			return { previous };
		},

		onError: (err, _input, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					ownerEmergencyContactKeys.detail(),
					context.previous,
				);
			}

			logger.error("Failed to update owner emergency contact", {
				action: "update_owner_emergency_contact",
				metadata: { error: err },
			});
			handleMutationError(err, "Update emergency contact");
		},

		onSuccess: () => {
			toast.success("Emergency contact saved");
		},

		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ownerEmergencyContactKeys.detail(),
			});
		},
	});
}

export function useDeleteOwnerEmergencyContactMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...ownerEmergencyContactMutationFactories.delete(),

		onMutate: async () => {
			await queryClient.cancelQueries({
				queryKey: ownerEmergencyContactKeys.detail(),
			});

			const previous = queryClient.getQueryData<OwnerEmergencyContact | null>(
				ownerEmergencyContactKeys.detail(),
			);

			queryClient.setQueryData<OwnerEmergencyContact | null>(
				ownerEmergencyContactKeys.detail(),
				null,
			);

			return { previous };
		},

		onError: (err, _input, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					ownerEmergencyContactKeys.detail(),
					context.previous,
				);
			}

			logger.error("Failed to delete owner emergency contact", {
				action: "delete_owner_emergency_contact",
				metadata: { error: err },
			});
			handleMutationError(err, "Remove emergency contact");
		},

		onSuccess: () => {
			toast.success("Emergency contact removed");
		},

		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ownerEmergencyContactKeys.detail(),
			});
		},
	});
}
