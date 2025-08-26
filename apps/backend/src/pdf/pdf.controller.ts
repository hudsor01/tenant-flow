import { Controller, Get, Logger } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('pdf')
@Controller('pdf')
export class PDFController {
	private readonly logger = new Logger(PDFController.name)

	@Get('health')
	async health() {
		this.logger.log('PDF health check requested')
		return { status: 'ok', message: 'PDF service is running' }
	}
}
