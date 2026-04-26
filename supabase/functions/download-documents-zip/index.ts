// Supabase Edge Function: download-documents-zip
//
// Bulk-download every document matching the caller's filter set as a
// streaming zip. Re-runs the same `search_documents` RPC server-side
// using the caller's JWT (no client-supplied trust) and pipes each
// blob into a zip via a TransformStream — only ONE document's bytes
// live in memory at a time, regardless of how many matches.
//
// Hard cap: 500 matching documents per request. Phase 64 cycle-1 may
// lower this if memory profiling shows the streaming path can't keep
// up with the upload-side allocator at higher counts.

import { ZipWriter, BlobReader } from '@zip.js/zip.js'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse, logEvent } from '../_shared/errors.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'tenant-documents'
const MAX_DOCS_PER_REQUEST = 500

interface FilterPayload {
	query?: string | null
	entityType?: string | null
	categories?: string[] | null
	from?: string | null
	to?: string | null
}

interface SearchRow {
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
	created_at: string | null
	total_count: number
}

// Match the frontend `sanitizeFilename` shape so paths inside the zip
// can't escape entity-type folders. Also strips leading dots (no
// dotfiles), control chars / NUL bytes (some POSIX archive utilities
// truncate on \0), and caps length to stay under filesystem limits.
function sanitizeFilename(name: string): string {
	return name
		.replace(/[\\/?%*:|"<>#&\x00-\x1f]+/g, '_')
		.replace(/\s+/g, '_')
		.replace(/^\.+/, '_')
		.slice(0, 200) || 'document'
}

function inferExtension(mime: string | null, filePath: string): string {
	if (mime === 'application/pdf') return 'pdf'
	if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
	if (mime === 'image/png') return 'png'
	if (mime === 'image/webp') return 'webp'
	// Fall back to the extension on the storage path.
	const dot = filePath.lastIndexOf('.')
	if (dot > 0) return filePath.slice(dot + 1)
	return 'bin'
}

Deno.serve(async (req: Request) => {
	const optionsResponse = handleCorsOptions(req)
	if (optionsResponse) return optionsResponse

	if (req.method !== 'POST') {
		return errorResponse(req, 405, new Error('method_not_allowed'), {
			action: 'method_check'
		})
	}

	let env: Record<string, string>
	try {
		env = validateEnv({
			required: [
				'SUPABASE_URL',
				'SUPABASE_SERVICE_ROLE_KEY',
				'SUPABASE_ANON_KEY'
			]
		})
	} catch (err) {
		return errorResponse(req, 500, err, { action: 'env_validation' })
	}

	try {
		const adminClient = createAdminClient(
			env.SUPABASE_URL,
			env.SUPABASE_SERVICE_ROLE_KEY
		)

		const auth = await validateBearerAuth(req, adminClient)
		if ('error' in auth) {
			return new Response(JSON.stringify({ error: auth.error }), {
				status: auth.status,
				headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) }
			})
		}
		const { token } = auth

		// Re-derive the user-scoped client so the search_documents RPC
		// runs under the caller's JWT (RLS gates the result set to their
		// own documents — never trust the client-supplied owner_id). The
		// `apikey` MUST be the anon key, not service-role: pairing the
		// service-role apikey with a user JWT in `Authorization` works
		// today only because PostgREST honors the user JWT for the role,
		// but a future client/server change could silently elevate to
		// service-role and bypass RLS. Mirror the pattern in
		// `export-user-data/index.ts` to keep this defensive.
		const userClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
			global: { headers: { Authorization: `Bearer ${token}` } },
			auth: { persistSession: false, autoRefreshToken: false }
		})

		let body: FilterPayload
		try {
			body = (await req.json()) as FilterPayload
		} catch {
			return errorResponse(req, 400, new Error('invalid_json_body'), {
				action: 'parse_body'
			})
		}

		const { data: rows, error: rpcError } = await userClient.rpc(
			'search_documents',
			{
				p_query: body.query?.trim() || null,
				p_entity_type: body.entityType ?? null,
				p_categories:
					Array.isArray(body.categories) && body.categories.length > 0
						? body.categories
						: null,
				p_from: body.from ?? null,
				p_to: body.to ?? null,
				p_limit: MAX_DOCS_PER_REQUEST,
				p_offset: 0
			}
		)
		if (rpcError) {
			return errorResponse(req, 400, rpcError, { action: 'search_documents' })
		}

		const matchingRows = (rows ?? []) as SearchRow[]
		if (matchingRows.length === 0) {
			return new Response(
				JSON.stringify({ error: 'No documents match the filter set.' }),
				{
					status: 404,
					headers: {
						'Content-Type': 'application/json',
						...getCorsHeaders(req)
					}
				}
			)
		}

		// total_count is the FULL match count (pre-LIMIT). If it exceeds the
		// per-request cap, refuse — owner needs to narrow the filter.
		const totalCount = matchingRows[0]?.total_count ?? matchingRows.length
		if (totalCount > MAX_DOCS_PER_REQUEST) {
			return new Response(
				JSON.stringify({
					error: `Filter matches ${totalCount} documents; bulk download is capped at ${MAX_DOCS_PER_REQUEST}. Narrow the filter and try again.`
				}),
				{
					status: 413,
					headers: {
						'Content-Type': 'application/json',
						...getCorsHeaders(req)
					}
				}
			)
		}

		// True streaming: TransformStream pairs a writable side (the
		// ZipWriter pumps zip bytes into it) with a readable side (the
		// Response body). Each document's blob is downloaded just-in-
		// time and added to the archive; only one document's bytes
		// live in memory at any moment.
		const transformStream = new TransformStream<Uint8Array>()
		const zipWriter = new ZipWriter(transformStream.writable)

		// Background pump — must NOT be awaited or the response would
		// only return after the entire zip is built (defeating streaming).
		void (async () => {
			try {
				const usedNames = new Set<string>()
				for (const doc of matchingRows) {
					const { data: blob, error: dlError } = await adminClient.storage
						.from(BUCKET)
						.download(doc.file_path)
					if (dlError || !blob) {
						// Skip this doc but keep going — a single missing blob
						// shouldn't void the whole archive. Sentry breadcrumb
						// surfaces the skip in any future failure trace without
						// firing a standalone event.
						logEvent('document_blob_missing', {
							docId: doc.id,
							filePath: doc.file_path,
							error: dlError?.message ?? 'no_blob_returned'
						})
						continue
					}
					const ext = inferExtension(doc.mime_type, doc.file_path)
					const baseName = sanitizeFilename(
						doc.title?.trim() || `${doc.entity_type}_${doc.id}`
					)
					// Append id when names collide so two docs titled "Lease"
					// don't overwrite each other inside the zip.
					let zipPath = `${doc.entity_type}/${baseName}.${ext}`
					if (usedNames.has(zipPath)) {
						zipPath = `${doc.entity_type}/${baseName}-${doc.id.slice(0, 8)}.${ext}`
					}
					usedNames.add(zipPath)
					await zipWriter.add(zipPath, new BlobReader(blob))
				}
				await zipWriter.close()
			} catch (err) {
				// Abort the stream so the client sees a truncated download
				// rather than a deceptively-complete-but-corrupt zip.
				try {
					await transformStream.writable.abort(
						err instanceof Error ? err : new Error('zip_pump_failed')
					)
				} catch {
					/* writable already closed */
				}
			}
		})()

		const today = new Date().toISOString().slice(0, 10)
		return new Response(transformStream.readable, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="tenantflow-documents-${today}.zip"`,
				...getCorsHeaders(req)
			}
		})
	} catch (err) {
		return errorResponse(req, 500, err, { action: 'unhandled' })
	}
})
