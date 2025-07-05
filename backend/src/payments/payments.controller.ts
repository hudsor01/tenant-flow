import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Put,
	Delete,
	Query,
	UseGuards
} from '@nestjs/common'
import type { PaymentsService } from './payments.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type {
	CreatePaymentDto,
	UpdatePaymentDto,
	PaymentQuery
} from './dto/create-payment.dto'

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}

	@Post()
	create(@Body() createPaymentDto: CreatePaymentDto) {
		return this.paymentsService.create(createPaymentDto)
	}

	@Get()
	findAll(@Query() query: PaymentQuery) {
		return this.paymentsService.findAll(query)
	}

	@Get('stats')
	getStats() {
		return this.paymentsService.getStats()
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.paymentsService.findOne(id)
	}

	@Put(':id')
	update(
		@Param('id') id: string,
		@Body() updatePaymentDto: UpdatePaymentDto
	) {
		return this.paymentsService.update(id, updatePaymentDto)
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.paymentsService.remove(id)
	}
}
