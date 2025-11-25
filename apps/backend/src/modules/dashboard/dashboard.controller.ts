import { All, Controller, GoneException, Logger, Param } from '@nestjs/common'

/**
 * Legacy /manage controller
 *
 * All legacy routes are removed. Consumers must call the new /owner
 * layer remains to avoid stale or inconsistent behavior.
 */
@Controller('manage')
export class DashboardController {
	private readonly logger = new Logger(DashboardController.name)

	@All('*path')
	handleLegacyRoute(@Param('path') path = ''): never {
		const normalizedPath = path ? `/${path.replace(/\/?$/, '')}` : '/'
		this.logger.warn(
			`Legacy /manage${normalizedPath} route invoked; legacy layer removed. Use /owner routes instead.`
		)
		throw new GoneException('Legacy /manage routes have been removed. Use /owner/... endpoints.')
	}
}
