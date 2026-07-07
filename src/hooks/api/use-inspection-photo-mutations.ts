/**
 * Inspection Photo Mutation Hooks
 * TanStack Query mutation hooks for inspection photo management.
 *
 * Split from use-inspection-mutations.ts for the 300-line file size rule.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inspectionQueries } from "./query-keys/inspection-keys";
import { inspectionMutations } from "./query-keys/inspection-mutation-options";

/**
 * Record a photo after direct Supabase Storage upload.
 * The client uploads to inspection-photos bucket directly, then calls this
 * mutation to persist the metadata in the inspection_photos table.
 * If DB insert fails after a successful Storage upload, attempts cleanup.
 */
export function useRecordInspectionPhoto(inspectionId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...inspectionMutations.recordPhoto(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(inspectionId).queryKey,
			});
		},
		// No onError toast: the sole consumer (InspectionPhotoUpload) catches the
		// rejection in uploadOne, marks the tile as failed with retry, and shows a
		// single summary toast. A mutation-level toast here double-toasted and
		// leaked the raw Postgres message.
	});
}
