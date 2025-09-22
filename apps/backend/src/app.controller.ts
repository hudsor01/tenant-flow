import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { Public } from './shared/decorators/public.decorator'

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	/**
	 * API test endpoint
	 */
	@Get('api')
	@Public()
	getHello(): string {
		return this.appService.getHello()
	}

	/**
	 * Note: Health check is handled as a raw Express route in main.ts
	 * for maximum reliability on Railway.
	 */

}
