import { Module } from '@nestjs/common'
import { RentPaymentsController } from './rent-payments.controller'
import { RentPaymentsService } from './rent-payments.service'

@Module({
	controllers: [RentPaymentsController],
	providers: [RentPaymentsService],
	exports: [RentPaymentsService]
})
export class RentPaymentsModule {}
