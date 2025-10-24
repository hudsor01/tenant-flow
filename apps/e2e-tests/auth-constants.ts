/**
 * Authentication constants for E2E tests
 * Separate from auth.setup.ts to allow importing in test files
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Storage paths for different user roles
export const STORAGE_STATE = {
	OWNER: path.join(__dirname, '.auth', 'owner.json'),
	TENANT: path.join(__dirname, '.auth', 'tenant.json'),
	ADMIN: path.join(__dirname, '.auth', 'admin.json')
}
