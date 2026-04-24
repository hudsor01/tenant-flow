/**
 * Document Vault Query Keys, Options & Mutations (v2.3 Phase 57 + audit follow-ups).
 *
 * The `tenant-documents` storage bucket is **private**, so listings batch
 * `createSignedUrls` per query (1h TTL) — `getPublicUrl()` returns 403 URLs
 * for private buckets and `<a href>` / `<iframe src>` won't carry a JWT
 * header. Same pattern locked in by PR #614 for maintenance-photos.
 *
 * Path convention: ${entity_type}/${entity_id}/${timestamp}-${safeName}.
 * Path-based storage RLS (migration 20260420030000 + 20260421120000)
 * extracts entity_type + entity_id from the path and confirms ownership
 * against the parent table, with array_length/UUID-format guards.
 *
 * Phase 57 only handles entity_type === 'property'. Lease/tenant/maintenance
 * branches are additive in v2.4 — same hooks, same RLS shape, more `or`
 * clauses + more upload entry points.
 */

import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createLogger } from '#lib/frontend-logger'
import { mutationKeys } from '../mutation-keys'

const SIGNED_URL_TTL_SECONDS = 3600
// Refetch the list (and its signed URLs) well before the 1h TTL expires.
// Keeping staleTime < TTL avoids stale-cache 403s when the user returns
// within the gcTime window.
const LIST_STALE_TIME_MS = 45 * 60 * 1000 // 45 min
const LIST_GC_TIME_MS = 55 * 60 * 1000 // 55 min — still inside TTL
const STORAGE_BUCKET = 'tenant-documents'
// Hard display cap. Matches `.limit()` in the query. Surface the true count
// via `{ count: 'exact' }` so the header badge + truncation banner can show
// "Showing 100 of N" when a property accumulates more than 100 documents.
const LIST_DISPLAY_LIMIT = 100

const logger = createLogger({ component: 'document-keys' })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: string | undefined | null): boolean {
	return !!value && UUID_RE.test(value)
}

// v2.4 Phase 59 widens the vault to the full documents schema. The
// inspection branch remains deferred to v2.5.
export type DocumentEntityType =
	| 'property'
	| 'lease'
	| 'tenant'
	| 'maintenance_request'
export const DOCUMENT_ENTITY_TYPES: readonly DocumentEntityType[] = [
	'property',
	'lease',
	'tenant',
	'maintenance_request'
] as const

export interface DocumentRow {
	id: string
	entity_type: string
	entity_id: string
	document_type: string
	mime_type: string | null
	file_path: string
	storage_url: string
	file_size: number | null
	title: string | null
	tags: string[] | null
	description: string | null
	owner_user_id: string | null
	created_at: string
	signed_url: string | null
}

export interface DocumentListResult {
	rows: DocumentRow[]
	/** Total number of documents that match the query, before the display limit. */
	totalCount: number
}

export interface DocumentUploadInput {
	entityType: DocumentEntityType
	entityId: string
	file: File
	/** Browser-reported MIME type stored on the row's mime_type column. */
	mimeType?: string
	/** Categorical label (e.g. 'lease', 'receipt'). Defaults to 'other'. */
	category?: string
	title?: string
}

/**
 * Sanitize a filename for S3-key safety without nuking Unicode. We keep
 * letters (including non-ASCII), digits, and a small set of separators;
 * the regex only replaces characters that Supabase storage, signed-URL
 * generators, or common browsers might reject in a key path.
 */
function sanitizeFilename(name: string): string {
	return name.replace(/[\\/?%*:|"<>#&\s]+/g, '_')
}

// Call `all()` — factory pattern matches propertyQueries, tenantQueries,
// leaseQueries, etc. (see src/hooks/api/query-keys/*.ts). Never a bare
// tuple — that diverges from the rest of the project and bites consumers
// copy-pasting an invalidation target.
export const documentQueries = {
	all: () => ['documents'] as const,
	lists: () => [...documentQueries.all(), 'list'] as const,

	list: (params: { entityType: DocumentEntityType; entityId: string }) =>
		queryOptions({
			queryKey: [
				...documentQueries.lists(),
				params.entityType,
				params.entityId
			] as const,
			queryFn: async (): Promise<DocumentListResult> => {
				const supabase = createClient()

				const { data, error, count } = await supabase
					.from('documents')
					.select(
						'id, entity_type, entity_id, document_type, mime_type, file_path, storage_url, file_size, title, tags, description, owner_user_id, created_at',
						{ count: 'exact' }
					)
					.eq('entity_type', params.entityType)
					.eq('entity_id', params.entityId)
					.order('created_at', { ascending: false })
					.limit(LIST_DISPLAY_LIMIT)

				if (error) handlePostgrestError(error, 'documents')

				const rows = (data ?? []) as Omit<DocumentRow, 'signed_url'>[]
				const totalCount = count ?? rows.length
				if (rows.length === 0) {
					return { rows: [], totalCount }
				}

				const paths = rows.map(r => r.file_path)
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
					rows: rows.map(r => ({
						...r,
						signed_url: urlByPath.get(r.file_path) ?? null
					})),
					totalCount
				}
			},
			staleTime: LIST_STALE_TIME_MS,
			gcTime: LIST_GC_TIME_MS,
			// Guard against `undefined`/`"undefined"`/`"null"` route params so a
			// bogus URL doesn't fire a PostgREST query that returns a UUID
			// format error.
			enabled: isUuid(params.entityId)
		})
}

export { LIST_DISPLAY_LIMIT }

export const documentMutations = {
	upload: () =>
		mutationOptions<DocumentRow, Error, DocumentUploadInput>({
			mutationKey: mutationKeys.documents.upload,
			mutationFn: async ({
				entityType,
				entityId,
				file,
				mimeType,
				category,
				title
			}): Promise<DocumentRow> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				// Path: {entity_type}/{entity_id}/{timestamp}-{safeName}.
				// Path-based storage RLS inspects the first two segments to
				// verify ownership of the parent entity.
				const timestamp = Date.now()
				const safeName = sanitizeFilename(file.name)
				const storagePath = `${entityType}/${entityId}/${timestamp}-${safeName}`

				const { error: uploadError } = await supabase.storage
					.from(STORAGE_BUCKET)
					.upload(storagePath, file, {
						contentType: file.type,
						upsert: false
					})
				if (uploadError) {
					logger.error('Document upload failed at storage layer', {
						path: storagePath,
						error: uploadError
					})
					throw new Error("We couldn't save that file. Please try again.")
				}

				const { data: row, error: dbError } = await supabase
					.from('documents')
					.insert({
						entity_type: entityType,
						entity_id: entityId,
						document_type: category ?? 'other',
						mime_type: mimeType ?? file.type,
						file_path: storagePath,
						storage_url: storagePath,
						file_size: file.size,
						title: title ?? file.name,
						owner_user_id: ownerId
					})
					.select(
						'id, entity_type, entity_id, document_type, mime_type, file_path, storage_url, file_size, title, tags, description, owner_user_id, created_at'
					)
					.single()

				if (dbError || !row) {
					// Roll back the storage upload so we don't orphan blobs
					// when the DB insert fails (RLS mismatch, FK violation).
					await supabase.storage
						.from(STORAGE_BUCKET)
						.remove([storagePath])
						.catch(storageErr => {
							logger.warn('Storage rollback failed; manual reconciliation needed', {
								path: storagePath,
								error: storageErr
							})
						})
					if (dbError) handlePostgrestError(dbError, 'documents')
					throw new Error('Failed to record document')
				}

				return { ...(row as Omit<DocumentRow, 'signed_url'>), signed_url: null }
			}
		}),

	delete: () =>
		mutationOptions<void, Error, { id: string; storagePath: string }>({
			mutationKey: mutationKeys.documents.delete,
			mutationFn: async ({ id, storagePath }) => {
				const supabase = createClient()

				// DB-first delete. If RLS blocks the row (zero affected rows)
				// we abort before touching storage, so the user can retry or
				// get help without having a broken preview of a deleted blob.
				// If storage remove fails AFTER a successful DB delete, the
				// orphan-cleanup cron eventually GCs the blob (per the
				// cleanup_orphan_documents function scope).
				const { data: deletedRows, error: dbError } = await supabase
					.from('documents')
					.delete()
					.eq('id', id)
					.select('id')
				if (dbError) handlePostgrestError(dbError, 'documents')
				if (!deletedRows || deletedRows.length === 0) {
					throw new Error(
						'Document not found or you do not have permission to delete it.'
					)
				}

				const { error: storageError } = await supabase.storage
					.from(STORAGE_BUCKET)
					.remove([storagePath])
				if (storageError) {
					// DB row is gone; orphaned blob now — log for operator
					// visibility but don't surface to the user (the row is
					// already gone from their view).
					logger.warn('Storage remove failed after DB delete; blob is now orphaned', {
						path: storagePath,
						error: storageError
					})
				}
			}
		})
}
