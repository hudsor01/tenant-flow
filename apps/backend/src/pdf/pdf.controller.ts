import { Controller, Get } from '@nestjs/common'
// Swagger imports removed
import { Logger } from '@nestjs/common'

// @ApiTags('pdf')
@Controller('pdf')
export class PDFController {
	constructor(private readonly logger: Logger) {
		// Logger context handled automatically via app-level configuration
	}

	@Get('health')
	async health() {
		this.logger.log(
			{
				pdf: {
					healthCheck: true,
					status: 'ok'
				}
			},
			'PDF health check requested'
		)
		return { status: 'ok', message: 'PDF service is running' }
	}
}
