import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'

@ApiTags('pdf')
@Controller('pdf')
export class PDFController {
	constructor(private readonly logger: PinoLogger) {
		// PinoLogger context handled automatically via app-level configuration
	}

	@Get('health')
	async health() {
		this.logger.info(
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
