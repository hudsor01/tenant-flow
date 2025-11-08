import { ConfigurableModuleBuilder } from '@nestjs/common'

export interface PrometheusModuleOptions {
	/**
	 * Bearer token for /metrics endpoint authentication
	 * Set via PROMETHEUS_BEARER_TOKEN environment variable
	 */
	bearerToken?: string

	/**
	 * Enable default metrics (CPU, memory, event loop, etc.)
	 * @default true
	 */
	enableDefaultMetrics?: boolean

	/**
	 * Prefix for all metrics
	 * @default 'tenantflow'
	 */
	prefix?: string
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
	new ConfigurableModuleBuilder<PrometheusModuleOptions>()
		.setClassMethodName('forRoot')
		.setExtras(
			{
				isGlobal: true
			},
			(definition, extras) => ({
				...definition,
				global: extras.isGlobal
			})
		)
		.build()
