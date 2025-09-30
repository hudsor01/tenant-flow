import { FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const shouldLog = process.env.PLAYWRIGHT_VERBOSE === 'true'
const logInfo = (message: string) => {
	if (!shouldLog) return
	process.stdout.write(`${message}\n`)
}
const logError = (message: string, error: unknown) => {
	if (!shouldLog) return
	const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
	process.stderr.write(`${message}: ${details}\n`)
}

/**
 * Global teardown for Playwright tests
 * Cleans up auth state and test artifacts
 */
async function globalTeardown(config: FullConfig) {
	logInfo('Running global teardown...')

	// Only clean up auth files in CI environment
	if (process.env.CI) {
		const authDir = path.join(__dirname, '../../playwright/.auth')

		try {
			if (fs.existsSync(authDir)) {
				const files = fs.readdirSync(authDir)
				for (const file of files) {
					if (file.endsWith('.json')) {
						fs.unlinkSync(path.join(authDir, file))
						logInfo(`Cleaned up auth file: ${file}`)
					}
				}
			}
		} catch (error) {
			logError('Failed to clean up auth files', error)
			throw error
		}
	} else {
		logInfo('Keeping auth files for local development')
	}

	logInfo('Global teardown complete')
}

export default globalTeardown
