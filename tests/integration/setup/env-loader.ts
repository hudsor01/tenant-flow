/**
 * Integration test env loader — replaces old dotenv-based env.ts.
 * Loads .env.local then .env from repo root so Supabase and E2E credentials
 * are available in process.env for RLS integration tests.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath: string) {
	try {
		const raw = readFileSync(filePath, 'utf8')
		for (const line of raw.split('\n')) {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('#')) continue
			const equalsIndex = trimmed.indexOf('=')
			if (equalsIndex === -1) continue
			const key = trimmed.slice(0, equalsIndex)
			const value = trimmed.slice(equalsIndex + 1)
			if (process.env[key] === undefined) {
				process.env[key] = value
			}
		}
	} catch {
		// Missing env file is acceptable — CI provides secrets via env vars
	}
}

// Load .env.local first (higher priority), then .env as fallback
const repoRoot = resolve(__dirname, '../../..')
loadEnvFile(resolve(repoRoot, '.env.local'))
loadEnvFile(resolve(repoRoot, '.env'))
