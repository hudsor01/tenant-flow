import { Controller, Logger } from '@nestjs/common'
import { RentPaymentsService } from './rent-payments.service'

@Controller('rent-payments')
export class RentPaymentsController {
	private readonly logger = new Logger(RentPaymentsController.name)

	constructor(private readonly rentPaymentsService: RentPaymentsService) {}

	// Payment endpoints will be added in Phase 3
}
