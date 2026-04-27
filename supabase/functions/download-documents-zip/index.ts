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

import { ZipWriter, BlobReader, TextReader } from '@zip.js/zip.js'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse, logEvent } from '../_shared/errors.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'tenant-documents'
// Hard cap on bulk-download size. Mirrors `BULK_DOWNLOAD_MAX` in
// `documents-vault.client.tsx` — keep them in lockstep.
const MAX_DOCS_PER_REQUEST = 500
// `search_documents` RPC enforces `p_limit <= 200` (see migration
// 20260426043911). Page through it to assemble up to MAX_DOCS_PER_REQUEST.
const RPC_PAGE_SIZE = 200

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
	// Fall back to the extension on the storage path. Reject trailing-dot
	// paths (`foo.`) — slicing past the dot yields '' which produces an
	// invalid filename on Windows and surprising behavior on macOS/Linux.
	const dot = filePath.lastIndexOf('.')
	if (dot > 0 && dot < filePath.length - 1) return filePath.slice(dot + 1)
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
				'SUPABASE_ANON_KEY',
				// FRONTEND_URL is required by getCorsHeaders — fail fast at
				// boot rather than silently dropping CORS on every response.
				'FRONTEND_URL'
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

		const rpcArgs = {
			p_query: body.query?.trim() || null,
			p_entity_type: body.entityType ?? null,
			p_categories:
				Array.isArray(body.categories) && body.categories.length > 0
					? body.categories
					: null,
			p_from: body.from ?? null,
			p_to: body.to ?? null
		}

		// Page through search_documents in RPC_PAGE_SIZE chunks. The RPC
		// enforces p_limit <= 200; bulk download wants up to 500. The
		// FIRST page is sufficient to read total_count and reject the
		// over-cap case before fetching subsequent pages.
		const matchingRows: SearchRow[] = []
		let totalCount = 0
		let offset = 0
		while (offset < MAX_DOCS_PER_REQUEST) {
			const { data: rows, error: rpcError } = await userClient.rpc(
				'search_documents',
				{ ...rpcArgs, p_limit: RPC_PAGE_SIZE, p_offset: offset }
			)
			if (rpcError) {
				return errorResponse(req, 400, rpcError, {
					action: 'search_documents'
				})
			}
			const page = (rows ?? []) as SearchRow[]
			if (page.length === 0) break
			if (offset === 0) {
				totalCount = page[0]?.total_count ?? page.length
				// total_count is the FULL match count (pre-LIMIT). If it
				// exceeds the per-request cap, refuse before paging the
				// rest — owner needs to narrow the filter.
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
			}
			matchingRows.push(...page)
			if (matchingRows.length >= totalCount) break
			offset += RPC_PAGE_SIZE
		}

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
				const skipped: Array<{ id: string; title: string | null }> = []
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
						skipped.push({ id: doc.id, title: doc.title })
						continue
					}
					const ext = inferExtension(doc.mime_type, doc.file_path)
					const baseName = sanitizeFilename(
						doc.title?.trim() || `${doc.entity_type}_${doc.id}`
					)
					// Append a monotonic counter when names collide so the
					// zip never has duplicate paths (zip.js throws on dup).
					// Counter beats id-prefix because two short id slices
					// can themselves collide within a 500-doc set, and the
					// suffix-collision branch only runs once.
					let zipPath = `${doc.entity_type}/${baseName}.${ext}`
					let dedupe = 1
					while (usedNames.has(zipPath)) {
						zipPath = `${doc.entity_type}/${baseName}-${dedupe}.${ext}`
						dedupe += 1
					}
					usedNames.add(zipPath)
					await zipWriter.add(zipPath, new BlobReader(blob))
				}
				// Surface partial-archive state to the user via an in-zip
				// notes file so they aren't silently shorted documents.
				if (skipped.length > 0) {
					const summary = [
						`${skipped.length} document(s) could not be included in this archive.`,
						'The original storage object was missing or unreadable.',
						'',
						'Skipped documents:',
						...skipped.map(
							s => `  - ${s.id}${s.title ? ` (${s.title})` : ''}`
						)
					].join('\n')
					await zipWriter.add(
						'_DOWNLOAD_NOTES.txt',
						new TextReader(summary)
					)
				}
				await zipWriter.close()
			} catch (err) {
				// Whole-pump failure produces a truncated download with
				// zero client-side signal — log loudly so Sentry surfaces
				// it. Mirrors the per-doc M-2 observability hook above.
				logEvent('zip_pump_failed', {
					error: err instanceof Error ? err.message : String(err)
				})
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
