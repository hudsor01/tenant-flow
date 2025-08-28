import { Controller, Get } from '@nestjs/common'
import { Public } from './shared/decorators/public.decorator'

@Controller()
export class AppController {
	@Get('api')
	@Public()
	getHello(): string {
		return 'TenantFlow Backend API - Core Routes Working'
	}
}
