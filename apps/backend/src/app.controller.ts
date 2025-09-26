import { Controller, Get, SetMetadata } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	/**
	 * API test endpoint
	 */
	@Get('api')
	@SetMetadata('isPublic', true)
	getHello(): string {
		return this.appService.getHello()
	}

	/**
	 * Note: Health check is handled as a raw Express route in main.ts
	 * for maximum reliability on Railway.
	 */
}
