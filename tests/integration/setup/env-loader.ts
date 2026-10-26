/**
 * Integration test env loader — replaces old dotenv-based env.ts.
 * Loads .env.local then .env from the repo root so Supabase and E2E credentials
 * are available in process.env for RLS integration tests. Imported by both the
 * integration setupFiles (each test worker) and global-auth-setup.ts (the main
 * process), because vitest.config.ts loads no env file for any project.
 *
 * Parsing is node:util's parseEnv, so quoted values and inline comments follow
 * dotenv syntax. A variable already in the environment (CI secrets) wins.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

function loadEnvFile(filePath: string) {
	let raw: string;
	try {
		raw = readFileSync(filePath, "utf8");
	} catch {
		// Missing env file is acceptable — CI provides secrets via env vars
		return;
	}
	for (const [key, value] of Object.entries(parseEnv(raw))) {
		if (process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}

// Load .env.local first (higher priority), then .env as fallback
const repoRoot = resolve(import.meta.dirname, "../../..");
loadEnvFile(resolve(repoRoot, ".env.local"));
loadEnvFile(resolve(repoRoot, ".env"));
