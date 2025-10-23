import { Controller, Get, Logger } from '@nestjs/common'

@Controller('pdf')
export class PDFController {
	private readonly logger = new Logger(PDFController.name)

	constructor() {
		// Logger initialized with Pattern 1
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
