import { All, Controller, GoneException, Param } from '@nestjs/common'
import {
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Legacy /manage controller
 *
 * All legacy routes are removed. Consumers must call the new /owner
 * layer remains to avoid stale or inconsistent behavior.
 */
@ApiTags('Legacy')
@Controller('manage')
export class DashboardController {
	constructor(private readonly logger: AppLogger) {}

	@ApiOperation({ summary: 'Legacy route handler', description: 'All /manage routes have been deprecated. Use /owner routes instead.' })
	@ApiResponse({ status: 410, description: 'Legacy routes removed - use /owner endpoints' })
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
