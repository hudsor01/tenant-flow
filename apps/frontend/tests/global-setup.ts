import { FullConfig } from '@playwright/test'
import { logger } from '@repo/shared/lib/frontend-logger'

async function globalSetup(config: FullConfig) {
	logger.info('Starting Playwright global setup...')

	// Any global setup logic can go here
	// For now, just log that setup is complete
	logger.info('Playwright global setup complete')
}

export default globalSetup
