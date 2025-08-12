import { Controller, Get } from '@nestjs/common'
import { Public } from './auth/decorators/public.decorator'

@Controller()
export class AppController {
	constructor() {}

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
}
