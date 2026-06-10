/**
 * Admin blog approve/reject mutation hooks (BLOG-07b).
 *
 * mutationFn invokes the admin-gated server actions from #app/actions/blog-publish
 * and throws on a `{ ok: false }` result so the standard onError path fires (no
 * silent success). On success the whole blog cache is invalidated so the review
 * queue and public lists refresh.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { publishBlogPost, rejectBlogPost } from "#app/actions/blog-publish";
import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";
import { blogQueries } from "./query-keys/blog-keys";

interface ApproveVariables {
	id: string;
	slug: string;
}

interface RejectVariables {
	id: string;
}

/** Approve a draft: publish + revalidate via publishBlogPost. */
export function useApproveBlogMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, slug }: ApproveVariables) => {
			const result = await publishBlogPost(id, slug);
			if (!result.ok) {
				throw new Error(result.error);
			}
			return result;
		},
		...createMutationCallbacks<{ ok: true }, ApproveVariables>(queryClient, {
			invalidate: [blogQueries.all()],
			successMessage: "Post published",
			errorContext: "Approve blog post",
		}),
	});
}

/** Reject a draft: archive via rejectBlogPost. */
export function useRejectBlogMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id }: RejectVariables) => {
			const result = await rejectBlogPost(id);
			if (!result.ok) {
				throw new Error(result.error);
			}
			return result;
		},
		...createMutationCallbacks<{ ok: true }, RejectVariables>(queryClient, {
			invalidate: [blogQueries.all()],
			successMessage: "Post rejected",
			errorContext: "Reject blog post",
		}),
	});
}
