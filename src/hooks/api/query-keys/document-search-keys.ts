/**
 * Global /documents/vault search query factory (v2.4 Phase 60 + v2.5 Phase 63).
 *
 * Wraps the search_documents RPC. Returns the same DocumentRow shape as
 * the per-entity list factory in `document-keys.ts`, so consumers can
 * reuse <DocumentRow> rendering.
 *
 * Phase 60 shipped query/entity/category/limit/offset filters.
 * Phase 63 widened category from scalar to array (multi-select) and
 * added p_from / p_to timestamptz date-range bounds.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import {
	documentQueries,
	mapDocumentRow,
	type DocumentEntityType,
	type DocumentRow
} from './document-keys'
import type { DocumentCategory } from '#lib/validation/documents'

const SIGNED_URL_TTL_SECONDS = 3600
const LIST_STALE_TIME_MS = 45 * 60 * 1000
const LIST_GC_TIME_MS = 55 * 60 * 1000
const STORAGE_BUCKET = 'tenant-documents'

export const SEARCH_PAGE_SIZE = 50

export interface DocumentSearchParams {
	query?: string
	entityType?: DocumentEntityType
	/** Phase 63: multi-select. Empty array is treated as "no filter" by the RPC. */
	categories?: DocumentCategory[]
	/**
	 * Phase 63: date-range bounds in `YYYY-MM-DD` form (URL shape). The
	 * factory expands these to local-zone start-of-day / end-of-day ISO
	 * timestamps at the RPC boundary so a US-Pacific user picking "Apr 30"
	 * gets documents through 23:59 PT on Apr 30, not 16:59 PT (which is
	 * what naive UTC slicing would produce). The RPC raises if from > to.
	 */
	from?: string
	to?: string
	page?: number
}

/**
 * Expand a `YYYY-MM-DD` URL date to an ISO timestamp at the boundary of
 * the user's LOCAL day. Returns null on malformed input — the caller's
 * H2-style URL guard scrubs the invalid value separately.
 */
export function expandDateBoundary(
	ymd: string | undefined,
	end: boolean
): string | null {
	if (!ymd) return null
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
	if (!m) return null
	const y = Number(m[1])
	const mo = Number(m[2])
	const d = Number(m[3])
	const local = end
		? new Date(y, mo - 1, d, 23, 59, 59, 999)
		: new Date(y, mo - 1, d, 0, 0, 0, 0)
	if (Number.isNaN(local.getTime())) return null
	// JS Date silently wraps overflow (e.g. 2026-13-99 → April 9, 2027).
	// Reject the parse if the constructed Date doesn't match the input
	// components — otherwise the URL guard hides the bug from the user.
	if (
		local.getFullYear() !== y ||
		local.getMonth() !== mo - 1 ||
		local.getDate() !== d
	) {
		return null
	}
	return local.toISOString()
}

export interface DocumentSearchResult {
	rows: DocumentRow[]
	totalCount: number
	page: number
	pageSize: number
}

export const documentSearchQueries = {
	all: () => [...documentQueries.all(), 'search'] as const,

	list: (params: DocumentSearchParams) => {
		// Normalize once so both queryKey and queryFn agree on the shape.
		// Empty array → null so the RPC treats it as "no filter" (matches
		// the array_length null branch in the RPC body) and the queryKey
		// stays canonical: same set in different orders shouldn't
		// fragment the cache.
		const sortedCategories =
			params.categories && params.categories.length > 0
				? [...params.categories].sort()
				: null
		return queryOptions({
			queryKey: [
				...documentSearchQueries.all(),
				params.query ?? '',
				params.entityType ?? null,
				sortedCategories,
				params.from ?? null,
				params.to ?? null,
				params.page ?? 0
			] as const,
			queryFn: async (): Promise<DocumentSearchResult> => {
				const supabase = createClient()
				const page = params.page ?? 0

				const { data, error } = await supabase.rpc('search_documents', {
					p_query: params.query?.trim() || null,
					p_entity_type: params.entityType ?? null,
					p_categories: sortedCategories,
					// Expand YYYY-MM-DD to local-zone start/end-of-day ISO so
					// the user's chosen end day is INCLUDED in results.
					p_from: expandDateBoundary(params.from, false),
					p_to: expandDateBoundary(params.to, true),
					p_limit: SEARCH_PAGE_SIZE,
					p_offset: page * SEARCH_PAGE_SIZE
				})
				if (error) handlePostgrestError(error, 'documents')

				const rawRows = (data ?? []) as Array<Record<string, unknown>>
				if (rawRows.length === 0) {
					return { rows: [], totalCount: 0, page, pageSize: SEARCH_PAGE_SIZE }
				}

				// Every row carries the same `total_count` — the RPC computes
				// the full match count in a separate scalar query before
				// applying LIMIT/OFFSET, then attaches it to each returned
				// row. Read the value from the first row; mapDocumentRow
				// reads only the named DocumentRow fields, so total_count
				// is naturally dropped when the rows are mapped below.
				//
				// Defense order:
				// 1. Reject null/undefined explicitly. `Number(null) === 0`
				//    and `Number.isFinite(0) === true`, so a bare finite-
				//    check would silently let a missing count through as 0
				//    — which silently breaks pagination math.
				// 2. Then numeric coerce + finite-check to catch strings
				//    that don't parse, NaN, Infinity.
				const totalCountRaw = rawRows[0]!.total_count
				if (totalCountRaw === null || totalCountRaw === undefined) {
					throw new Error(
						'search_documents RPC contract: total_count is null/undefined'
					)
				}
				const totalCountNumeric =
					typeof totalCountRaw === 'number'
						? totalCountRaw
						: Number(totalCountRaw)
				if (!Number.isFinite(totalCountNumeric)) {
					throw new Error(
						'search_documents RPC contract: total_count is not a finite number'
					)
				}
				const totalCount = totalCountNumeric

				const mappedRows = rawRows.map(mapDocumentRow)
				const paths = mappedRows.map(r => r.file_path)
				const { data: signed } = await supabase.storage
					.from(STORAGE_BUCKET)
					.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

				const urlByPath = new Map<string, string>()
				for (const entry of signed ?? []) {
					if (entry.path && entry.signedUrl) {
						urlByPath.set(entry.path, entry.signedUrl)
					}
				}

				return {
					rows: mappedRows.map(r => ({
						...r,
						signed_url: urlByPath.get(r.file_path) ?? null
					})),
					totalCount,
					page,
					pageSize: SEARCH_PAGE_SIZE
				}
			},
			staleTime: LIST_STALE_TIME_MS,
			gcTime: LIST_GC_TIME_MS
		})
	}
}
