#!/usr/bin/env bun
// Deploys all Edge Functions via Supabase Management API.
//
// Why this exists: the supabase CLI's `functions deploy` returned 401 on
// 2026-05-29 even with a valid PAT (`supabase projects list` succeeded in the
// same shell). The MCP server's deploy_edge_function works against the same
// backend, so the auth path the CLI takes is broken specifically for functions
// deploy. This script bypasses the CLI and hits the Management API directly.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_... bun scripts/deploy-edge-functions.ts
//
// Optional: pass function names to deploy a subset, e.g.
//   bun scripts/deploy-edge-functions.ts newsletter-subscribe resend-webhook

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "bshjmbshupiibfiewpxb";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(SCRIPT_DIR, "..", "supabase", "functions");
const DENO_JSON = join(FUNCTIONS_ROOT, "deno.json");

// verify_jwt matrix matches supabase/config.toml at HEAD `665c34cad`.
// Only download-documents-zip runs with verify_jwt=true.
const FUNCTIONS: Array<{
	slug: string;
	entrypoint: string;
	verify_jwt: boolean;
}> = [
	{ slug: "auth-email-send", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "download-documents-zip", entrypoint: "index.ts", verify_jwt: true },
	{ slug: "export-report", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "export-user-data", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "generate-pdf", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "lease-signature", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "n8n-blog-ingest", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "newsletter-subscribe", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "resend-webhook", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "send-contact-email", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "send-lease-reminders", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "sign-lease-token", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "stripe-billing-portal", entrypoint: "index.ts", verify_jwt: false },
	{
		slug: "stripe-cancel-subscription",
		entrypoint: "index.ts",
		verify_jwt: false,
	},
	{ slug: "stripe-checkout", entrypoint: "index.ts", verify_jwt: false },
	{ slug: "stripe-webhooks", entrypoint: "index.ts", verify_jwt: false },
];

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
	console.error("SUPABASE_ACCESS_TOKEN is not set.");
	process.exit(1);
}

/**
 * Walk relative imports starting from a single entry file.
 * Returns the set of absolute paths reachable from the entry. Does NOT
 * follow bare specifiers (those resolve through deno.json at runtime).
 */
function walkImports(entryAbs: string): Set<string> {
	const seen = new Set<string>();
	const stack = [entryAbs];
	const importRe = /from\s+["']([^"']+)["']/g;

	while (stack.length) {
		const current = stack.pop();
		if (!current || seen.has(current)) continue;
		seen.add(current);
		const src = readFileSync(current, "utf8");
		const here = dirname(current);
		for (const match of src.matchAll(importRe)) {
			const spec = match[1];
			if (!spec) continue;
			if (!spec.startsWith(".") && !spec.startsWith("/")) continue;
			const resolved = resolve(here, spec);
			if (existsSync(resolved)) {
				stack.push(resolved);
			} else if (existsSync(`${resolved}.ts`)) {
				// Some imports omit the .ts extension if a tsconfig allows it;
				// the Edge Function source is always .ts so try appending.
				stack.push(`${resolved}.ts`);
			} else {
				console.warn(`  warn: unresolved import "${spec}" in ${current}`);
			}
		}
	}
	return seen;
}

async function deployOne(fn: {
	slug: string;
	entrypoint: string;
	verify_jwt: boolean;
}): Promise<{ ok: boolean; message: string }> {
	const fnRoot = join(FUNCTIONS_ROOT, fn.slug);
	const entryAbs = join(fnRoot, fn.entrypoint);
	if (!existsSync(entryAbs)) {
		return { ok: false, message: `entrypoint not found: ${entryAbs}` };
	}

	const reachable = walkImports(entryAbs);
	reachable.add(entryAbs);
	// deno.json is always included so bare specifiers resolve.
	reachable.add(DENO_JSON);

	const form = new FormData();
	form.append(
		"metadata",
		new Blob(
			[
				JSON.stringify({
					name: fn.slug,
					entrypoint_path: `source/functions/${fn.slug}/${fn.entrypoint}`,
					import_map_path: "source/functions/deno.json",
					verify_jwt: fn.verify_jwt,
				}),
			],
			{ type: "application/json" },
		),
		"metadata",
	);

	for (const abs of reachable) {
		const rel = relative(FUNCTIONS_ROOT, abs);
		const apiPath = `source/functions/${rel}`;
		form.append(
			"file",
			new Blob([readFileSync(abs)], { type: "application/typescript" }),
			apiPath,
		);
	}

	const url =
		`https://api.supabase.com/v1/projects/${PROJECT_REF}` +
		`/functions/deploy?slug=${encodeURIComponent(fn.slug)}`;

	const res = await fetch(url, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: form,
	});

	if (res.ok) {
		const body = (await res.json().catch(() => ({}))) as {
			version?: number;
			status?: string;
		};
		return {
			ok: true,
			message: `v${body.version ?? "?"} ${body.status ?? "DEPLOYED"}`,
		};
	}
	const errText = await res.text().catch(() => res.statusText);
	return { ok: false, message: `HTTP ${res.status}: ${errText}` };
}

async function main() {
	const filter = new Set(process.argv.slice(2));
	const targets = FUNCTIONS.filter((f) => !filter.size || filter.has(f.slug));
	if (!targets.length) {
		console.error("No matching functions to deploy.");
		process.exit(1);
	}

	console.log(`Deploying ${targets.length} function(s) to ${PROJECT_REF}\n`);

	const results: Array<{ slug: string; ok: boolean; message: string }> = [];
	for (const fn of targets) {
		process.stdout.write(
			`  ${fn.slug.padEnd(28)} (verify_jwt=${fn.verify_jwt}) ... `,
		);
		const r = await deployOne(fn);
		console.log(r.ok ? `✓ ${r.message}` : `✗ ${r.message}`);
		results.push({ slug: fn.slug, ...r });
	}

	const failed = results.filter((r) => !r.ok);
	console.log(
		`\n${results.length - failed.length}/${results.length} succeeded`,
	);
	if (failed.length) {
		console.log("\nFailed:");
		for (const f of failed) console.log(`  ${f.slug}: ${f.message}`);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("fatal:", err);
	process.exit(1);
});
