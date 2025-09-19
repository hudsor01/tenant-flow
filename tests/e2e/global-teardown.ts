import { FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Global teardown for Playwright tests
 * Cleans up auth state and test artifacts
 */
async function globalTeardown(config: FullConfig) {
	console.log('Running global teardown...')

	// Only clean up auth files in CI environment
	if (process.env.CI) {
		const authDir = path.join(__dirname, '../../playwright/.auth')

		try {
			if (fs.existsSync(authDir)) {
				const files = fs.readdirSync(authDir)
				for (const file of files) {
					if (file.endsWith('.json')) {
						fs.unlinkSync(path.join(authDir, file))
						console.log(`Cleaned up auth file: ${file}`)
					}
				}
			}
		} catch (error) {
			console.error('Failed to clean up auth files:', error)
		}
	} else {
		console.log('Keeping auth files for local development')
	}

	console.log('✅ Global teardown complete')
}

export default globalTeardown