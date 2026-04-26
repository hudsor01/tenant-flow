/**
 * Document Vault Query Keys, Options & Mutations.
 * Ships five entity branches: property + lease + tenant + maintenance_request
 * + inspection (v2.4 Phase 59 widened from property-only; v2.5 Phase 62 added
 * the inspection branch).
 *
 * Private bucket — listings batch `createSignedUrls` (1h TTL). Path-based
 * storage RLS (migrations 20260424140000 + 20260426040728) extracts
 * entity_type + entity_id from the path, confirms ownership against the
 * corresponding parent table, and enforces array_length + UUID-format guards
 * on every branch.
 *
 * Bucket creation, MIME allowlist, and bucket-level config ship in earlier
 * migrations (20260420030000 + 20260421120000). The two RLS migrations only
 * replace the four storage.objects policies (one per CRUD op); they don't
 * touch bucket config.
 */

import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createLogger } from '#lib/frontend-logger'
import { mutationKeys } from '../mutation-keys'
import {
	documentCategorySchema,
	type DocumentCategory
} from '#lib/validation/documents'

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

// v2.5 Phase 62 closes the loop with the inspection branch — the vault
// now covers all five `documents.entity_type` values that the schema
// has supported since 20260306140000_documents_owner_column.sql.
export type DocumentEntityType =
	| 'property'
	| 'lease'
	| 'tenant'
	| 'maintenance_request'
	| 'inspection'
export const DOCUMENT_ENTITY_TYPES: readonly DocumentEntityType[] = [
	'property',
	'lease',
	'tenant',
	'maintenance_request',
	'inspection'
] as const

export interface DocumentRow {
	id: string
	entity_type: string
	entity_id: string
	document_type: DocumentCategory
	mime_type: string | null
	file_path: string
	storage_url: string
	file_size: number | null
	title: string | null
	tags: string[] | null
	description: string | null
	owner_user_id: string | null
	// Nullable in the DB (column has DEFAULT now() but no NOT NULL).
	// In practice always populated, but typing reflects schema reality so
	// downstream consumers must handle the null branch defensively.
	created_at: string | null
	signed_url: string | null
}

export interface DocumentListResult {
	rows: DocumentRow[]
	/** Total number of documents that match the query, before the display limit. */
	totalCount: number
}

/**
 * Maps a PostgREST row (untyped at the TS level — Supabase returns
 * `document_type: string`) into the strictly-typed `DocumentRow`.
 * `document_type` is validated via the Zod enum so an out-of-band
 * value (corruption, dropped CHECK constraint, mid-migration replay)
 * degrades to `'other'` rather than poisoning downstream
 * `Record<DocumentCategory, ...>` lookups.
 *
 * NOT NULL fields throw if absent — the boundary should surface a
 * dropped column in `.select(...)` immediately rather than silently
 * producing the literal string `"undefined"` (which would break
 * signed-URL generation, date rendering, and React keys downstream).
 *
 * Applies CLAUDE.md's "RPC Return Typing" rule (typed mapper at the
 * PostgREST boundary, not `as unknown as` casts).
 */
export function mapDocumentRow(
	raw: Record<string, unknown>
): Omit<DocumentRow, 'signed_url'> {
	function requireString(field: string): string {
		const value = raw[field]
		if (typeof value !== 'string') {
			throw new Error(
				`mapDocumentRow: NOT NULL field '${field}' missing or non-string from PostgREST response`
			)
		}
		return value
	}

	const parsedCategory = documentCategorySchema.safeParse(raw.document_type)
	const document_type: DocumentCategory = parsedCategory.success
		? parsedCategory.data
		: 'other'
	return {
		id: requireString('id'),
		entity_type: requireString('entity_type'),
		entity_id: requireString('entity_id'),
		document_type,
		mime_type: (raw.mime_type as string | null) ?? null,
		file_path: requireString('file_path'),
		storage_url: requireString('storage_url'),
		file_size: (raw.file_size as number | null) ?? null,
		title: (raw.title as string | null) ?? null,
		tags: (raw.tags as string[] | null) ?? null,
		description: (raw.description as string | null) ?? null,
		owner_user_id: (raw.owner_user_id as string | null) ?? null,
		// Nullable in DB (DEFAULT now() but no NOT NULL). Don't requireString.
		created_at: (raw.created_at as string | null) ?? null
	}
}

export interface DocumentUploadInput {
	entityType: DocumentEntityType
	entityId: string
	file: File
	/** Browser-reported MIME type stored on the row's mime_type column. */
	mimeType?: string
	/** Categorical label. Defaults to 'other' at the DB column level too. */
	category?: DocumentCategory
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

				const rows = ((data ?? []) as Record<string, unknown>[]).map(
					mapDocumentRow
				)
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

// Global vault search lives in `document-search-keys.ts` (split out to
// keep this file under the 300-line cap). Import the search symbols
// directly from there — no re-export here per the project's "no barrel
// files / no re-exports" Zero Tolerance Rule.

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

				return {
					...mapDocumentRow(row as Record<string, unknown>),
					signed_url: null
				}
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
