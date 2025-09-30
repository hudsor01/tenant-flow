import { FullConfig } from '@playwright/test'
import { logger } from '@repo/shared/lib/frontend-logger'

async function globalTeardown(config: FullConfig) {
	logger.info('🧹 Starting Playwright global teardown...')
	
	// Any global cleanup logic can go here
	// For now, just log that teardown is complete
	logger.info('✅ Playwright global teardown complete')
}

export default globalTeardown
