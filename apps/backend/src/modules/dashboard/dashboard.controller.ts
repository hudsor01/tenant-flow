import { All, Controller, GoneException, Param } from '@nestjs/common'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Legacy /manage controller
 *
 * All legacy routes are removed. Consumers must call the new /owner
 * layer remains to avoid stale or inconsistent behavior.
 */
@Controller('manage')
export class DashboardController {
	constructor(private readonly logger: AppLogger) {}

	@All('*path')
	handleLegacyRoute(@Param('path') path = ''): never {
		const normalizedPath = path ? `/${path.replace(/\/?$/, '')}` : '/'
		this.logger.warn(
			`Legacy /manage${normalizedPath} route invoked; legacy layer removed. Use /owner routes instead.`
		)
		throw new GoneException(
			'Legacy /manage routes have been removed. Use /owner/... endpoints.'
		)
	}
}
