import { All, Controller, GoneException, Logger, Param, Query, Redirect } from '@nestjs/common'
import { URLSearchParams } from 'url'

/**
 * Legacy /manage controller
 *
 * Permanently redirects deprecated manage endpoints to the new /owner
 * dashboard routes. This keeps backward compatibility while ensuring all
 * traffic flows through the current implementation in OwnerDashboardModule.
 */
@Controller('manage')
export class DashboardController {
	private readonly logger = new Logger(DashboardController.name)

	private static readonly routeMap: Record<string, string> = {
		'/stats': '/owner/analytics/stats',
		'/page-data': '/owner/analytics/page-data',
		'/activity': '/owner/analytics/activity',
		'/uptime': '/owner/analytics/uptime',
		'/billing/insights': '/owner/financial/billing/insights',
		'/billing/insights/available': '/owner/financial/billing/insights/available',
		'/billing/health': '/owner/financial/billing/health',
		'/property-performance': '/owner/properties/performance',
		'/maintenance-analytics': '/owner/maintenance/analytics',
		'/occupancy-trends': '/owner/tenants/occupancy-trends',
		'/revenue-trends': '/owner/financial/revenue-trends',
		'/time-series': '/owner/reports/time-series',
		'/metric-trend': '/owner/reports/metric-trend'
	}

	@All(':path(*)')
	@Redirect()
	handleLegacyRoute(
		@Param('path') path = '',
		@Query() query: Record<string, string | string[]>
	) {
		const normalizedPath = path ? `/${path.replace(/\/?$/, '')}` : '/'
		const target = DashboardController.routeMap[normalizedPath]

		if (!target) {
			this.logger.warn(`Legacy route /manage${normalizedPath} not mapped; rejecting request.`)
			throw new GoneException('Legacy /manage routes have moved to /owner')
		}

		const queryString = new URLSearchParams(
			Object.entries(query).flatMap(([key, value]) =>
				Array.isArray(value)
					? value.map((v) => [key, String(v)])
					: [[key, String(value)]]
			)
		).toString()

		const url = queryString ? `${target}?${queryString}` : target

		this.logger.log(`Redirecting /manage${normalizedPath} -> ${url}`)

		return { url, statusCode: 308 }
	}
}
