import 'reflect-metadata'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import type { ExecutionContext } from '@nestjs/common'
import { ClassSerializerInterceptor, RequestMethod } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AppModule } from '../src/app.module'
import { JwtAuthGuard } from '../src/shared/auth/jwt-auth.guard'
import { SubscriptionGuard } from '../src/shared/guards/subscription.guard'
import { RolesGuard } from '../src/shared/guards/roles.guard'
import { ThrottlerProxyGuard } from '../src/shared/guards/throttler-proxy.guard'
import { AppConfigService } from '../src/config/app-config.service'
import { registerExpressMiddleware } from '../src/config/express.config'
import { HEALTH_PATHS, WEBHOOK_PATHS } from '../src/shared/constants/routes'

describe('Full backend analytics metrics smoke', () => {
	it('hits analytics endpoint and prints /metrics supabase signals', async () => {
		process.env.ENABLE_METRICS = 'true'
		process.env.PROMETHEUS_REQUIRE_AUTH = 'true'
		process.env.PROMETHEUS_BEARER_TOKEN =
			process.env.PROMETHEUS_BEARER_TOKEN ?? 'test_prometheus_token'

		JwtAuthGuard.prototype.canActivate = async function (context: ExecutionContext) {
			const req = context.switchToHttp().getRequest()
			if (req && !req.user) {
				req.user = { id: 'user-123', app_metadata: { user_type: 'OWNER' } }
			}
			return true
		}
		SubscriptionGuard.prototype.canActivate = async () => true
		RolesGuard.prototype.canActivate = async () => true
		ThrottlerProxyGuard.prototype.canActivate = async () => true

		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		})
			.compile()

		const app = moduleRef.createNestApplication<NestExpressApplication>({
			rawBody: true,
			bufferLogs: true,
			bodyParser: false
		})

		app.set('trust proxy', 1)
		const appConfigService = app.get(AppConfigService)
		await registerExpressMiddleware(app, appConfigService)

		const GLOBAL_PREFIX = 'api/v1'
		app.setGlobalPrefix(GLOBAL_PREFIX, {
			exclude: [
				...HEALTH_PATHS.map(path => ({ path, method: RequestMethod.ALL })),
				...WEBHOOK_PATHS.map(path => ({ path, method: RequestMethod.ALL })),
				{ path: '/', method: RequestMethod.ALL },
				{ path: '/metrics', method: RequestMethod.ALL }
			]
		})

		app.useGlobalInterceptors(
			new ClassSerializerInterceptor(app.get(Reflector))
		)
		app.useGlobalPipes(new ZodValidationPipe())

		await app.init()

		const httpServer = app.getHttpServer()

		await request(httpServer).get('/api/v1/analytics/financial/page-data')
		await request(httpServer).get('/api/v1/analytics/financial/page-data')

		const metricsResponse = await request(httpServer)
			.get('/metrics')
			.set('Authorization', `Bearer ${process.env.PROMETHEUS_BEARER_TOKEN}`)

		const supabaseMetrics = (metricsResponse.text ?? '')
			.split('\n')
			.filter(line => line.startsWith('tenantflow_supabase_'))

		process.stdout.write(supabaseMetrics.join('\n'))
		process.stdout.write('\n')

		await app.close()
	}, 60000)
})
