/**
 * Fast diagnostic for the n8n-blog-ingest Edge Function (no LLM — instant).
 * Signs a synthetic VALID payload with N8N_WEBHOOK_SECRET and POSTs it, then
 * prints the full response (including any `_debug` block the function returns).
 *
 * Usage:  bun scripts/probe-ingest.ts
 */
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadDotenv(root: string): void {
	for (const f of [".env.local", ".env.development.local", ".env"]) {
		const p = join(root, f);
		if (!existsSync(p)) continue;
		for (const raw of readFileSync(p, "utf8").split("\n")) {
			const line = raw.trim();
			if (!line || line.startsWith("#")) continue;
			const m = line.match(
				/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
			);
			if (!m) continue;
			let val = (m[2] ?? "").trim();
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			if (process.env[m[1] as string] === undefined) {
				process.env[m[1] as string] = val;
			}
		}
	}
}
loadDotenv(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.N8N_WEBHOOK_SECRET;
const pub =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
	process.env.SUPABASE_PUBLISHABLE_KEY ??
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
	process.env.SUPABASE_ANON_KEY;
if (!url || !secret || !pub) {
	console.error(
		`Missing env. url:${!!url} N8N_WEBHOOK_SECRET:${!!secret} publishable:${!!pub}`,
	);
	process.exit(1);
}

let content = "";
for (let i = 1; i <= 7; i++) {
	content += `## Section ${i} for Landlords\n\n${"A landlord should evaluate every applicant carefully before signing a lease to protect their rental property investment over time. ".repeat(14)}\n\n`;
}
const payload = {
	title: "Probe Draft Please Delete",
	slug: "probe-draft-please-delete-me-now",
	excerpt:
		"This is a synthetic probe draft used to verify the ingest endpoint end to end and it should be deleted right after testing.",
	meta_description:
		"Synthetic probe draft to verify the TenantFlow blog ingest Edge Function handshake and insert path end to end for landlords.",
	category: "tenant-screening",
	content,
};
const body = JSON.stringify(payload);
const sig = createHmac("sha256", secret).update(body).digest("hex");
const res = await fetch(`${url}/functions/v1/n8n-blog-ingest`, {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		"x-n8n-signature": sig,
		apikey: pub,
		Authorization: `Bearer ${pub}`,
	},
	body,
});
console.log(`HTTP ${res.status}`);
console.log(await res.text());
