import { Controller, Get } from '@nestjs/common'
import { Public } from './auth/decorators/public.decorator'
import { ModuleRef } from '@nestjs/core'

@Controller()
export class AppController {
	constructor(private readonly moduleRef: ModuleRef) {}

	@Get('api')
	@Public()
	getHello(): string {
		return 'TenantFlow Backend API - Core Routes Working'
	}

	@Get('ping')
	@Public()
	ping() {
		return {
			pong: true,
			timestamp: Date.now(),
			message: 'AppController routes working without service dependencies'
		}
	}

	@Get('debug/services')
	@Public()
	getServiceDebug() {
		return {
			message: 'AppController instantiated successfully',
			timestamp: new Date().toISOString(),
			environment: process.env.NODE_ENV || 'unknown',
			nodeVersion: process.version,
			pid: process.pid
		}
	}

	@Get('debug/modules')
	@Public()
	getModules() {
		try {
			const modules = []

			// Test if key services are available
			const testServices = [
				'AuthService',
				'UsersService',
				'PropertiesService',
				'TenantsService',
				'PrismaService'
			]

			for (const serviceName of testServices) {
				try {
					const service = this.moduleRef.get(serviceName, {
						strict: false
					})
					modules.push({
						name: serviceName,
						status: service ? 'loaded' : 'not_found',
						available: !!service
					})
				} catch (error) {
					modules.push({
						name: serviceName,
						status: 'error',
						error:
							error instanceof Error ? error.message : 'unknown',
						available: false
					})
				}
			}

			return {
				timestamp: new Date().toISOString(),
				environment: process.env.NODE_ENV,
				modules
			}
		} catch (error) {
			return {
				error: 'Failed to check modules',
				message: error instanceof Error ? error.message : 'unknown'
			}
		}
	}
}
