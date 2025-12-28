import 'reflect-metadata'
import { config as loadEnv } from 'dotenv'
import { Test } from '@nestjs/testing'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { APP_GUARD, Reflector } from '@nestjs/core'
import { ClassSerializerInterceptor, RequestMethod } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { ZodValidationPipe } from 'nestjs-zod'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

const cwd = process.cwd()
const rootEnvPath = resolve(cwd, '.env.test')
const repoEnvPath = resolve(cwd, '..', '..', '.env.test')
const envPath = existsSync(rootEnvPath) ? rootEnvPath : repoEnvPath

loadEnv({ path: envPath })
process.env.ENABLE_METRICS = 'true'
process.env.PROMETHEUS_REQUIRE_AUTH = 'true'
process.env.PROMETHEUS_BEARER_TOKEN =
	process.env.PROMETHEUS_BEARER_TOKEN ?? 'test_prometheus_token'
process.env.SB_SECRET_KEY =
	process.env.SB_SECRET_KEY ?? 'sb_secret_test_key_for_metrics'

const backendRoot = cwd.endsWith('/apps/backend')
	? cwd
	: resolve(cwd, 'apps/backend')

const load = async <T>(relativePath: string): Promise<T> => {
	const fullPath = resolve(backendRoot, relativePath)
	return import(fullPath) as Promise<T>
}

class AllowGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		if (request && !request.user) {
			request.user = { id: 'user-123', app_metadata: { user_type: 'OWNER' } }
		}
		return true
	}
}

type Constructor<T> = new (...args: unknown[]) => T

const run = async () => {
	const { AppModule } = await load<{ AppModule: Constructor<unknown> }>(
		'src/app.module.ts'
	)
	const { AppConfigService } = await load<{
		AppConfigService: Constructor<unknown>
	}>('src/config/app-config.service.ts')
	const { registerExpressMiddleware } = await load<{
		registerExpressMiddleware: (...args: unknown[]) => Promise<void>
	}>('src/config/express.config.ts')
	const { HEALTH_PATHS, WEBHOOK_PATHS } = await load<{
		HEALTH_PATHS: string[]
		WEBHOOK_PATHS: string[]
	}>('src/shared/constants/routes.ts')
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule]
	})
		.overrideProvider(APP_GUARD)
		.useValue(new AllowGuard())
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

	app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))

	app.useGlobalPipes(new ZodValidationPipe())

	await app.init()

	const httpServer = app.getHttpServer()

	// Hit the high-traffic financial analytics endpoint twice
	await request(httpServer).get('/api/v1/analytics/financial/page-data')
	await request(httpServer).get('/api/v1/analytics/financial/page-data')

	// Inspect /metrics
	const metricsResponse = await request(httpServer)
		.get('/metrics')
		.set('Authorization', `Bearer ${process.env.PROMETHEUS_BEARER_TOKEN}`)

	const supabaseMetrics = (metricsResponse.text ?? '')
		.split('\n')
		.filter(line => line.startsWith('tenantflow_supabase_'))

	process.stdout.write(supabaseMetrics.join('\n'))
	process.stdout.write('\n')

	await app.close()
}

run().catch(error => {
	const message =
		error instanceof Error ? (error.stack ?? error.message) : String(error)
	process.stderr.write(message)
	process.exit(1)
})
