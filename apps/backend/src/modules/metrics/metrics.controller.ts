import { Controller, Get, Req, Res, UnauthorizedException, SetMetadata, Logger } from '@nestjs/common'
import { PrometheusController as BasePrometheusController } from '@willsoto/nestjs-prometheus'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'crypto'
import type { Request, Response } from 'express'

/**
 * Metrics Controller - Exposes Prometheus metrics with bearer token authentication
 *
 * Uses @Public() decorator to bypass JWT authentication,
 * then manually validates bearer token from Prometheus scraper
 */
@Controller('metrics')
export class MetricsController {
	private readonly logger = new Logger(MetricsController.name)

	constructor(
		private readonly prometheusController: BasePrometheusController,
		private readonly configService: ConfigService
	) {}

	@SetMetadata('isPublic', true)
	@Get()
	async getMetrics(@Req() req: Request, @Res() res: Response) {
		// Validate bearer token
		const authHeader = req.headers.authorization
		const expectedToken = this.configService.get('PROMETHEUS_BEARER_TOKEN')

		// Fail fast if token not configured
		if (!expectedToken) {
			this.logger.error('PROMETHEUS_BEARER_TOKEN not configured')
			throw new UnauthorizedException('Metrics endpoint not configured')
		}

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			this.logger.warn('Metrics access attempt without Bearer token', {
				ip: req.ip,
				headers: req.headers
			})
			throw new UnauthorizedException('Bearer token required')
		}

		const token = authHeader.substring(7) // Remove 'Bearer ' prefix

		// Use timing-safe comparison to prevent timing attacks
		const tokenBuffer = Buffer.from(token)
		const expectedBuffer = Buffer.from(expectedToken)

		const isValid =
			tokenBuffer.length === expectedBuffer.length &&
			timingSafeEqual(tokenBuffer, expectedBuffer)

		if (!isValid) {
			this.logger.warn('Metrics access attempt with invalid token', {
				ip: req.ip,
				tokenLength: token.length
			})
			throw new UnauthorizedException('Invalid bearer token')
		}

		// Delegate to Prometheus controller
		return this.prometheusController.index(res)
	}
}
