import { Module } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { PaymentsController } from './payments.controller'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [],
	controllers: [PaymentsController],
	providers: [PaymentsService],
	exports: [PaymentsService]
})
export class PaymentsModule {}
