import {
	Controller,
	Get,
	Req,
	Res,
	UnauthorizedException,
	SetMetadata
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PrometheusController } from '@willsoto/nestjs-prometheus'
import { timingSafeEqual } from 'crypto'
import type { Request, Response } from 'express'
import { createThrottleDefaults } from '../../config/throttle.config'
import { AppConfigService } from '../../config/app-config.service'
import { AppLogger } from '../../logger/app-logger.service'

const METRICS_THROTTLE = createThrottleDefaults({
	envTtlKey: 'METRICS_THROTTLE_TTL',
	envLimitKey: 'METRICS_THROTTLE_LIMIT',
	defaultTtl: 60000,
	defaultLimit: 60
})

/**
 * Metrics Controller - Exposes Prometheus metrics with bearer token authentication
 *
 * Extends PrometheusController to add custom authentication logic.
 * Uses @Public() decorator to bypass JWT authentication,
 * then manually validates bearer token from Prometheus scraper.
 *
 * Pattern: https://github.com/willsoto/nestjs-prometheus#custom-controller
 */
@Controller() // Define explicit route paths inside decorators
export class MetricsController extends PrometheusController {
	constructor(
		private readonly appConfigService: AppConfigService,
		private readonly logger: AppLogger
	) {
		super()
	}

	@SetMetadata('isPublic', true)
	@Throttle({ default: METRICS_THROTTLE })
	@Get(['metrics', 'metric'])
	async getMetrics(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) {
		const requireAuth = this.appConfigService.isPrometheusAuthRequired()
		const expectedToken = this.appConfigService.getPrometheusBearerToken()

		if (requireAuth) {
			if (!expectedToken) {
				this.logger.error(
					'PROMETHEUS_REQUIRE_AUTH=true but PROMETHEUS_BEARER_TOKEN is missing'
				)
				throw new UnauthorizedException(
					'Metrics endpoint requires PROMETHEUS_BEARER_TOKEN or disable auth via PROMETHEUS_REQUIRE_AUTH=false'
				)
			}

			this.validateBearerToken(req, expectedToken)
		} else {
			this.logger.debug(
				'Serving /metrics without bearer auth (PROMETHEUS_REQUIRE_AUTH=false)'
			)
		}

		return super.index(res)
	}

	private validateBearerToken(req: Request, expectedToken: string): void {
		const authHeader = req.headers.authorization

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			this.logger.warn('Metrics access attempt without Bearer token', {
				ip: req.ip,
				headers: req.headers
			})
			throw new UnauthorizedException('Bearer token required')
		}

		const token = authHeader.substring(7)
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
	}
}
