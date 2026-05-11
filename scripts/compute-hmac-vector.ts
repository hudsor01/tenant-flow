// scripts/compute-hmac-vector.ts
//
// Recomputes the canonical HMAC test vector locked in
// .planning/phases/06-blog-rebuild/N8N-FLOW.md § "HMAC Test Vector".
//
// Run with Deno (no Node required):
//   deno run scripts/compute-hmac-vector.ts
//
// The hex output of this script MUST match the "Expected sha256" hex value
// embedded verbatim in N8N-FLOW.md. Drift between the two means n8n and the
// n8n-blog-ingest Edge Function are out of sync — investigate before continuing.
//
// Algorithm: HMAC-SHA256 over the EXACT body bytes (no normalization). Hex
// output is lowercase, padded to 64 chars. Identical to the verifyHmac()
// implementation in supabase/functions/n8n-blog-ingest/index.ts.

const SECRET = 'tenantflow-phase-6-test'

// Body MUST be assembled via JSON.stringify so the bytes are byte-for-byte
// reproducible. Any reformatting of this literal (e.g. spreading the object
// across multiple lines, or changing field order) will change the bytes and
// invalidate the locked hex. See N8N-FLOW.md for the canonical body shape.
const BODY = JSON.stringify({
	title: 'test',
	slug: 'test-slug',
	excerpt:
		'test excerpt about landlords with 1-15 rentals to make this 80 chars or more please ok',
	content: '# H1\n\n## H2\nlandlord',
	category: 'lease-law',
	meta_description:
		'test meta description about landlord lease law content with sufficient length here please',
})

async function hmacHex(secret: string, body: string): Promise<string> {
	const enc = new TextEncoder()
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)
	const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body))
	return Array.from(new Uint8Array(sigBuf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}

const hex = await hmacHex(SECRET, BODY)
const byteLength = new TextEncoder().encode(BODY).byteLength

console.log('Secret:', SECRET)
console.log(`Body bytes (length=${byteLength}):`)
console.log(BODY)
console.log('Expected sha256 (hex):', hex)
