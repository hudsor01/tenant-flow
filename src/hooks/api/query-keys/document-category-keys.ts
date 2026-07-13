/**
 * Document Categories Query Keys (v2.6 Phase 65).
 *
 * Wraps the `document_categories` table — per-owner taxonomy that
 * replaced the compile-time DOCUMENT_CATEGORIES tuple. Existing
 * users were seeded with the seven v2.5 defaults at migration time;
 * new users get them via the `seed_default_categories_on_user_insert`
 * trigger.
 *
 * Categories change rarely (only when an owner adds/renames/deletes
 * via Phase 66's settings UI), so a 5-minute staleTime is plenty.
 */

import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { requireOwnerUserId } from "#lib/require-owner-user-id";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { documentCategorySlugSchema } from "#lib/validation/documents";
import { mutationKeys } from "../mutation-keys";

const LIST_STALE_TIME_MS = 5 * 60 * 1000; // 5 min — categories change rarely
const LIST_GC_TIME_MS = 30 * 60 * 1000;
// Generous cap: per-owner category counts are tiny (7 seeded defaults + customs).
const CATEGORY_LIST_LIMIT = 100;

export interface DocumentCategoryRow {
	id: string;
	slug: string;
	label: string;
	sort_order: number;
	is_default: boolean;
	owner_user_id: string;
	// Both timestamps are NOT NULL (DEFAULT now() + set_updated_at trigger).
	// Typed as string here to surface schema drift if a future migration
	// makes them legitimately nullable.
	created_at: string;
	updated_at: string;
}

// Module-level helpers — hoisted so they're not recreated per call.
function requireString(raw: Record<string, unknown>, field: string): string {
	const value = raw[field];
	if (typeof value !== "string") {
		throw new Error(
			`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-string from PostgREST response`,
		);
	}
	return value;
}
function requireBool(raw: Record<string, unknown>, field: string): boolean {
	const value = raw[field];
	if (typeof value !== "boolean") {
		throw new Error(
			`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-boolean from PostgREST response`,
		);
	}
	return value;
}
function requireNumber(raw: Record<string, unknown>, field: string): number {
	const value = raw[field];
	if (typeof value !== "number") {
		throw new Error(
			`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-number from PostgREST response`,
		);
	}
	return value;
}

/**
 * Maps a PostgREST row into the strictly-typed `DocumentCategoryRow`.
 * Rejects rows whose slug doesn't match the format constraint (a
 * defense against future schema drift; the DB already enforces this
 * at the CHECK constraint level). NOT NULL fields throw if absent.
 */
export function mapDocumentCategoryRow(
	raw: Record<string, unknown>,
): DocumentCategoryRow {
	const slug = requireString(raw, "slug");
	const slugCheck = documentCategorySlugSchema.safeParse(slug);
	if (!slugCheck.success) {
		throw new Error(
			`mapDocumentCategoryRow: row '${requireString(raw, "id")}' has malformed slug '${slug}'`,
		);
	}
	return {
		id: requireString(raw, "id"),
		slug,
		label: requireString(raw, "label"),
		sort_order: requireNumber(raw, "sort_order"),
		is_default: requireBool(raw, "is_default"),
		owner_user_id: requireString(raw, "owner_user_id"),
		created_at: requireString(raw, "created_at"),
		updated_at: requireString(raw, "updated_at"),
	};
}

export const documentCategoryQueries = {
	// Bare-tuple shape matches sibling factories (propertyQueries.all,
	// tenantQueries.all, etc.) so consumers can do
	// `invalidateQueries({ queryKey: documentCategoryQueries.all() })`
	// without unwrapping `.queryKey`.
	all: () => ["documentCategories"] as const,
	list: () =>
		queryOptions({
			queryKey: ["documentCategories", "list"] as const,
			queryFn: async (): Promise<DocumentCategoryRow[]> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("document_categories")
					.select(
						"id, slug, label, sort_order, is_default, owner_user_id, created_at, updated_at",
					)
					.order("sort_order", { ascending: true })
					.order("label", { ascending: true })
					.limit(CATEGORY_LIST_LIMIT);
				if (error) handlePostgrestError(error, "document categories list");
				return ((data ?? []) as Record<string, unknown>[]).map(
					mapDocumentCategoryRow,
				);
			},
			staleTime: LIST_STALE_TIME_MS,
			gcTime: LIST_GC_TIME_MS,
		}),
} as const;

// v2.6 Phase 66 — admin UI write path. Each mutation invalidates BOTH
// `documentCategoryQueries.all()` (the categories list) and the wider
// document/search queries (since reassign mass-rewrites document_type
// values). Wiring the invalidations into the mutation options keeps
// the consumer one-line — `useMutation(documentCategoryMutations.create())`.

export interface CreateDocumentCategoryInput {
	slug: string;
	label: string;
	sort_order?: number;
}

export interface UpdateDocumentCategoryInput {
	id: string;
	label: string;
}

export interface DeleteWithReassignInput {
	from_id: string;
	to_id: string;
}

export interface ReorderInput {
	orders: Array<{ id: string; sort_order: number }>;
	/**
	 * Pre-computed reordered list for the optimistic cache write
	 * inside `onMutate`. Optional — pure RPC callers (without UI
	 * cache work) can omit it. Cycle-3 M-2 hand-off pattern: the
	 * caller computes the row order on drag-end and the mutation's
	 * onMutate hook writes it to the cache after `cancelQueries`,
	 * keeping snapshot + optimistic write atomically ordered.
	 */
	next?: DocumentCategoryRow[];
}

export const documentCategoryMutations = {
	create: () =>
		mutationOptions<DocumentCategoryRow, Error, CreateDocumentCategoryInput>({
			mutationKey: mutationKeys.documentCategories.create,
			mutationFn: async (
				input: CreateDocumentCategoryInput,
			): Promise<DocumentCategoryRow> => {
				const supabase = createClient();
				const user = await getCachedUser();
				const ownerId = requireOwnerUserId(user?.id);
				// Slug shape is also enforced by the DB CHECK constraint, but
				// pre-validating here gives the user an immediate error
				// without burning a roundtrip.
				const slugCheck = documentCategorySlugSchema.safeParse(input.slug);
				if (!slugCheck.success) {
					throw new Error(
						"Slug must be lowercase-snake_case (a-z, 0-9, _) and 1-50 chars.",
					);
				}
				const trimmedLabel = input.label.trim();
				if (trimmedLabel.length < 1 || trimmedLabel.length > 80) {
					throw new Error("Label must be 1-80 characters.");
				}
				const { data, error } = await supabase
					.from("document_categories")
					.insert({
						owner_user_id: ownerId,
						slug: input.slug,
						label: trimmedLabel,
						sort_order: input.sort_order ?? 1000,
						is_default: false,
					})
					.select(
						"id, slug, label, sort_order, is_default, owner_user_id, created_at, updated_at",
					)
					.single();
				if (error) handlePostgrestError(error, "create document category");
				return mapDocumentCategoryRow((data ?? {}) as Record<string, unknown>);
			},
		}),
	update: () =>
		mutationOptions<DocumentCategoryRow, Error, UpdateDocumentCategoryInput>({
			mutationKey: mutationKeys.documentCategories.update,
			mutationFn: async (
				input: UpdateDocumentCategoryInput,
			): Promise<DocumentCategoryRow> => {
				const supabase = createClient();
				const trimmedLabel = input.label.trim();
				if (trimmedLabel.length < 1 || trimmedLabel.length > 80) {
					throw new Error("Label must be 1-80 characters.");
				}
				// Only `label` is mutable. Slug is canonical (cross-owner export
				// portability) and `is_default` is set by the seed function. RLS
				// gates ownership; updating someone else's row returns no rows.
				const { data, error } = await supabase
					.from("document_categories")
					.update({ label: trimmedLabel })
					.eq("id", input.id)
					.select(
						"id, slug, label, sort_order, is_default, owner_user_id, created_at, updated_at",
					)
					.single();
				if (error) handlePostgrestError(error, "update document category");
				return mapDocumentCategoryRow((data ?? {}) as Record<string, unknown>);
			},
		}),
	deleteWithReassign: () =>
		mutationOptions<void, Error, DeleteWithReassignInput>({
			mutationKey: mutationKeys.documentCategories.deleteWithReassign,
			mutationFn: async (input: DeleteWithReassignInput): Promise<void> => {
				const supabase = createClient();
				const { error } = await supabase.rpc("reassign_document_category", {
					p_from_id: input.from_id,
					p_to_id: input.to_id,
				});
				if (error) handlePostgrestError(error, "reassign document category");
			},
		}),
	reorder: () =>
		mutationOptions<void, Error, ReorderInput>({
			mutationKey: mutationKeys.documentCategories.reorder,
			mutationFn: async (input: ReorderInput): Promise<void> => {
				const supabase = createClient();
				const { error } = await supabase.rpc("reorder_document_categories", {
					p_orders: input.orders,
				});
				if (error) handlePostgrestError(error, "reorder document categories");
			},
		}),
} as const;
