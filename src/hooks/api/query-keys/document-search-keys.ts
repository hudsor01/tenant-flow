/**
 * Global /documents/vault search query factory (v2.4 Phase 60).
 *
 * Wraps the search_documents RPC. Returns the same DocumentRow shape as
 * the per-entity list factory in `document-keys.ts`, so consumers can
 * reuse <DocumentRow> rendering. Split out of `document-keys.ts` to keep
 * each file under the 300-line cap.
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
	category?: DocumentCategory
	page?: number
}

export interface DocumentSearchResult {
	rows: DocumentRow[]
	totalCount: number
	page: number
	pageSize: number
}

export const documentSearchQueries = {
	all: () => [...documentQueries.all(), 'search'] as const,

	list: (params: DocumentSearchParams) =>
		queryOptions({
			queryKey: [
				...documentSearchQueries.all(),
				params.query ?? '',
				params.entityType ?? null,
				params.category ?? null,
				params.page ?? 0
			] as const,
			queryFn: async (): Promise<DocumentSearchResult> => {
				const supabase = createClient()
				const page = params.page ?? 0

				const { data, error } = await supabase.rpc('search_documents', {
					p_query: params.query?.trim() || null,
					p_entity_type: params.entityType ?? null,
					p_category: params.category ?? null,
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
				// row. Pull from the first row, then strip it from the shape
				// so the rest of the pipeline matches the per-entity list.
				// Finite-check guards against an RPC contract regression
				// where total_count goes missing — without this, NaN would
				// silently break pagination math (pageEnd < NaN === false,
				// so the Next button hides and the user can't reach later
				// pages) with no surfaced error.
				const totalCountRaw = rawRows[0]!.total_count
				const totalCountNumeric =
					typeof totalCountRaw === 'number'
						? totalCountRaw
						: Number(totalCountRaw)
				if (!Number.isFinite(totalCountNumeric)) {
					throw new Error(
						'search_documents RPC contract: total_count missing or non-numeric'
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
