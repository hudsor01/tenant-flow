import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

// Billing controller temporarily simplified for compilation
// Will be fully restored after basic build is working

@ApiTags('billing')
@Controller('billing')
export class BillingController {
	@Get('health')
	@ApiOperation({ summary: 'Billing health check' })
	@ApiResponse({ status: 200, description: 'Billing service is healthy' })
	getBillingHealth() {
		return {
			status: 'healthy',
			service: 'billing',
			timestamp: new Date().toISOString()
		}
	}
}
