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
	type DocumentEntityType,
	type DocumentRow
} from './document-keys'

const SIGNED_URL_TTL_SECONDS = 3600
const LIST_STALE_TIME_MS = 45 * 60 * 1000
const LIST_GC_TIME_MS = 55 * 60 * 1000
const STORAGE_BUCKET = 'tenant-documents'

export const SEARCH_PAGE_SIZE = 50

export interface DocumentSearchParams {
	query?: string
	entityType?: DocumentEntityType
	category?: string
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

				const rpcRows = (data ?? []) as Array<
					Omit<DocumentRow, 'signed_url'> & { total_count: number }
				>
				if (rpcRows.length === 0) {
					return { rows: [], totalCount: 0, page, pageSize: SEARCH_PAGE_SIZE }
				}

				// Every row carries the same `total_count` — the RPC computes
				// the full match count in a separate scalar query before
				// applying LIMIT/OFFSET, then attaches it to each returned
				// row. Pull from the first row, then strip it from the shape
				// so the rest of the pipeline matches the per-entity list.
				const totalCount = rpcRows[0]!.total_count

				const paths = rpcRows.map(r => r.file_path)
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
					rows: rpcRows.map(r => ({
						id: r.id,
						entity_type: r.entity_type,
						entity_id: r.entity_id,
						document_type: r.document_type,
						mime_type: r.mime_type,
						file_path: r.file_path,
						storage_url: r.storage_url,
						file_size: r.file_size,
						title: r.title,
						tags: r.tags,
						description: r.description,
						owner_user_id: r.owner_user_id,
						created_at: r.created_at,
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
