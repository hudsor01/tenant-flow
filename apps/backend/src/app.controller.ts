import { Controller } from '@nestjs/common'

@Controller()
export class AppController {
	constructor() {}

	/**
	 * Note: Health check is handled by HealthController in health module
	 * for maximum reliability on Railway.
	 */
}
