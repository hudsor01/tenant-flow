/**
 * Document Vault Query Keys, Options & Mutations (v2.3 Phase 57).
 *
 * The `tenant-documents` storage bucket is **private**, so listings batch
 * `createSignedUrls` per query (1h TTL) — `getPublicUrl()` returns 403 URLs
 * for private buckets and `<a href>` / `<iframe src>` won't carry a JWT
 * header. Same pattern locked in by PR #614 for maintenance-photos.
 *
 * Path convention: ${entity_type}/${entity_id}/${timestamp}-${safeName}.
 * Path-based storage RLS (migration 20260420030000) extracts entity_type +
 * entity_id from the path and confirms ownership against the parent table.
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
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { mutationKeys } from '../mutation-keys'

const SIGNED_URL_TTL_SECONDS = 3600
const STORAGE_BUCKET = 'tenant-documents'

// Phase 57 ships the property branch only.
export type DocumentEntityType = 'property'

export interface DocumentRow {
	id: string
	entity_type: string
	entity_id: string
	document_type: string
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

export interface DocumentUploadInput {
	entityType: DocumentEntityType
	entityId: string
	file: File
	documentType?: string
	title?: string
}

export const documentQueries = {
	all: () => ['documents'] as const,

	list: (params: { entityType: DocumentEntityType; entityId: string }) =>
		queryOptions({
			queryKey: [
				...documentQueries.all(),
				'list',
				params.entityType,
				params.entityId
			] as const,
			queryFn: async (): Promise<DocumentRow[]> => {
				const supabase = createClient()

				const { data, error } = await supabase
					.from('documents')
					.select(
						'id, entity_type, entity_id, document_type, file_path, storage_url, file_size, title, tags, description, owner_user_id, created_at'
					)
					.eq('entity_type', params.entityType)
					.eq('entity_id', params.entityId)
					.order('created_at', { ascending: false })
					.limit(100)

				if (error) handlePostgrestError(error, 'documents')

				const rows = (data ?? []) as Omit<DocumentRow, 'signed_url'>[]
				if (rows.length === 0) {
					return rows.map(r => ({ ...r, signed_url: null }))
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
				return rows.map(r => ({
					...r,
					signed_url: urlByPath.get(r.file_path) ?? null
				}))
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!params.entityId
		})
}

export const documentMutations = {
	upload: () =>
		mutationOptions<DocumentRow, Error, DocumentUploadInput>({
			mutationKey: mutationKeys.documents.upload,
			mutationFn: async ({
				entityType,
				entityId,
				file,
				documentType,
				title
			}): Promise<DocumentRow> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				// Path: {entity_type}/{entity_id}/{timestamp}-{safeName}.
				// Path-based storage RLS (migration 20260420030000) inspects the
				// first two segments to verify ownership of the parent entity.
				const timestamp = Date.now()
				const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
				const storagePath = `${entityType}/${entityId}/${timestamp}-${safeName}`

				const { error: uploadError } = await supabase.storage
					.from(STORAGE_BUCKET)
					.upload(storagePath, file, {
						contentType: file.type,
						upsert: false
					})
				if (uploadError) throw uploadError

				const { data: row, error: dbError } = await supabase
					.from('documents')
					.insert({
						entity_type: entityType,
						entity_id: entityId,
						document_type: documentType ?? 'other',
						file_path: storagePath,
						storage_url: storagePath,
						file_size: file.size,
						title: title ?? file.name,
						owner_user_id: ownerId
					})
					.select(
						'id, entity_type, entity_id, document_type, file_path, storage_url, file_size, title, tags, description, owner_user_id, created_at'
					)
					.single()

				if (dbError || !row) {
					// Roll back the storage upload so we don't orphan blobs when
					// the DB insert fails (RLS mismatch, FK violation, etc.).
					await supabase.storage
						.from(STORAGE_BUCKET)
						.remove([storagePath])
						.catch(() => {})
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

				// Drop the DB row first; .select() returns the affected rows so
				// we can detect RLS-blocked deletes — PostgREST returns no error
				// when an RLS policy filters the row out, just zero affected
				// rows. Without the .length check the UI would falsely report
				// "Document removed" while the row stays put.
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

				// Storage remove is best-effort. Owners can re-trigger from the
				// UI if it fails; the DB-of-record state is already consistent.
				await supabase.storage
					.from(STORAGE_BUCKET)
					.remove([storagePath])
					.catch(() => {})
			}
		})
}
