// shadcn registry fetch + hash tool for the Tailwind v4 / shadcn remediation (wave 5 onward).
// Downloads new-york-v4 registry items over HTTPS, writes the raw JSON and each shipped file to an
// output directory OUTSIDE the repository, and records a manifest of hashes and data-slot lists.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/registry-fetch.mjs [--items a,b,...] --out <dir>
//        [--manifest <file>] [--allow-missing]
//   node .planning/tailwind-shadcn/audit/registry-fetch.mjs --check <manifest> --out <dir>
//        [--items a,b,...] [--allow-missing]
//
// Never commit the fetched source: registry files contain color literals and are third-party
// text. --out is asserted to resolve outside the repository root. The manifest holds only hashes,
// line counts, headers and data-slot value lists.
//
// Fetched content is untrusted data: it is parsed with JSON.parse only, never imported, evaluated
// or executed. Requests carry no cookie, token or authorization header; the only header sent is
// `user-agent: tenantflow-audit`. No environment variable is read.
//
// Manifest: { fetchedAt, base, items: { <name>: { url, status, lastModified, etag, jsonSha256,
//   dependencies, registryDependencies, files: [{ path, sha256, lines, dataSlots }] } } }.
//   dataSlots = ordered, de-duplicated values of /data-slot="([a-z0-9-]+)"/g in the file content.
//   With --allow-missing a 404 item is recorded as { url, status: 404 } and does not fail the run.
// --check: re-fetches the manifest's items (or --items) and prints
//   { checkedAt, drift: [{ item, field, old, new }] } comparing jsonSha256, lastModified and each
//   file's sha256 / dataSlots. Exit 0 whether or not drift exists.
// Exit: 1 on a non-200 status (404 without --allow-missing included) or a network failure,
//   2 on a usage error, 0 otherwise.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE = "https://ui.shadcn.com/r/styles/new-york-v4";
const DEFAULT_ITEMS = [
	"alert",
	"alert-dialog",
	"badge",
	"breadcrumb",
	"button",
	"button-group",
	"calendar",
	"card",
	"chart",
	"checkbox",
	"collapsible",
	"command",
	"dropdown-menu",
	"input",
	"input-group",
	"input-otp",
	"popover",
	"progress",
	"select",
	"sheet",
	"slider",
	"sonner",
	"tabs",
	"textarea",
	"tooltip",
];
const SLOT_RE = /data-slot="([a-z0-9-]+)"/g;

const usage = () => {
	console.error(
		"usage: registry-fetch.mjs [--items a,b] --out <dir> [--manifest <file>] [--allow-missing] | --check <manifest> --out <dir>",
	);
	process.exit(2);
};

const argv = process.argv.slice(2);
let items = null;
let out = null;
let manifestPath = null;
let checkPath = null;
let allowMissing = false;
for (let i = 0; i < argv.length; i++) {
	const a = argv[i];
	if (a === "--items") items = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
	else if (a === "--out") out = argv[++i];
	else if (a === "--manifest") manifestPath = argv[++i];
	else if (a === "--check") checkPath = argv[++i];
	else if (a === "--allow-missing") allowMissing = true;
	else usage();
}
if (!out) usage();
const outAbs = path.resolve(out);
if (outAbs === ROOT || outAbs.startsWith(ROOT + path.sep)) {
	console.error(`registry-fetch: --out must resolve outside the repository (${outAbs})`);
	process.exit(2);
}
for (const name of items ?? []) {
	if (!/^[a-z0-9-]+$/.test(name)) {
		console.error(`registry-fetch: invalid item name ${name}`);
		process.exit(2);
	}
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const slotsOf = (text) => {
	const seen = [];
	for (const m of text.matchAll(SLOT_RE)) if (!seen.includes(m[1])) seen.push(m[1]);
	return seen;
};
const lineCount = (text) => (text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0));

async function get(url) {
	let lastErr;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const res = await fetch(url, {
				headers: { "user-agent": "tenantflow-audit" },
				redirect: "follow",
				signal: AbortSignal.timeout(20000),
			});
			const body = await res.text();
			return { status: res.status, body, lastModified: res.headers.get("last-modified"), etag: res.headers.get("etag") };
		} catch (e) {
			lastErr = e;
		}
	}
	throw lastErr;
}

async function fetchItem(name) {
	const url = `${BASE}/${name}.json`;
	let r;
	try {
		r = await get(url);
	} catch (e) {
		throw new Error(`${name}: network failure: ${String(e?.message ?? e)}`);
	}
	if (r.status === 404 && allowMissing) return { url, status: 404 };
	if (r.status !== 200) throw new Error(`${name}: HTTP ${r.status}`);
	const json = JSON.parse(r.body);
	if (!json || !Array.isArray(json.files)) throw new Error(`${name}: body has no files array`);
	fs.mkdirSync(path.join(outAbs, name), { recursive: true });
	fs.writeFileSync(path.join(outAbs, `${name}.json`), r.body);
	const files = json.files.map((f) => {
		const content = typeof f.content === "string" ? f.content : "";
		const base = path.basename(String(f.path ?? ""));
		if (!base || base === "." || base === "..") throw new Error(`${name}: bad file path ${f.path}`);
		fs.writeFileSync(path.join(outAbs, name, base), content);
		return { path: String(f.path), sha256: sha256(content), lines: lineCount(content), dataSlots: slotsOf(content) };
	});
	return {
		url,
		status: r.status,
		lastModified: r.lastModified,
		etag: r.etag,
		jsonSha256: sha256(r.body),
		dependencies: json.dependencies ?? [],
		registryDependencies: json.registryDependencies ?? [],
		files,
	};
}

async function fetchAll(names) {
	const result = {};
	for (const name of names) result[name] = await fetchItem(name);
	return result;
}

fs.mkdirSync(outAbs, { recursive: true });
try {
	if (checkPath) {
		const old = JSON.parse(fs.readFileSync(checkPath, "utf8"));
		const names = items ?? Object.keys(old.items ?? {});
		const now = await fetchAll(names);
		const drift = [];
		const push = (item, field, a, b) => {
			if (JSON.stringify(a) !== JSON.stringify(b)) drift.push({ item, field, old: a ?? null, new: b ?? null });
		};
		for (const name of names) {
			const a = old.items?.[name] ?? {};
			const b = now[name];
			push(name, "status", a.status, b.status);
			push(name, "jsonSha256", a.jsonSha256, b.jsonSha256);
			push(name, "lastModified", a.lastModified, b.lastModified);
			const paths = [...new Set([...(a.files ?? []).map((f) => f.path), ...(b.files ?? []).map((f) => f.path)])];
			for (const p of paths) {
				const fa = (a.files ?? []).find((f) => f.path === p);
				const fb = (b.files ?? []).find((f) => f.path === p);
				push(name, `files[${p}].sha256`, fa?.sha256, fb?.sha256);
				push(name, `files[${p}].dataSlots`, fa?.dataSlots, fb?.dataSlots);
			}
		}
		console.log(JSON.stringify({ checkedAt: new Date().toISOString(), drift }, null, 2));
	} else {
		const names = items ?? DEFAULT_ITEMS;
		const fetched = await fetchAll(names);
		const manifest = { fetchedAt: new Date().toISOString(), base: BASE, items: fetched };
		if (manifestPath) {
			fs.mkdirSync(path.dirname(path.resolve(manifestPath)), { recursive: true });
			fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
		}
		for (const name of names) {
			const it = fetched[name];
			console.log(`${name}: ${it.status}${it.files ? ` files=${it.files.length} slots=${it.files.reduce((n, f) => n + f.dataSlots.length, 0)}` : ""}`);
		}
	}
} catch (e) {
	console.error(`registry-fetch: ${String(e?.message ?? e)}`);
	process.exit(1);
}
