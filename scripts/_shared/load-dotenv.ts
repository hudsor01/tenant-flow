import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Load `.env.local` (then `.env.development.local`, `.env`) into `process.env`.
 * bun's auto-load and `@next/env` both proved unreliable for a standalone
 * `bun scripts/...` run, so parse the files directly (first file wins; existing
 * process.env values are never overwritten).
 */
export function loadDotenv(root: string): string[] {
	const loaded: string[] = [];
	for (const f of [".env.local", ".env.development.local", ".env"]) {
		const p = join(root, f);
		if (!existsSync(p)) continue;
		loaded.push(f);
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
	return loaded;
}
