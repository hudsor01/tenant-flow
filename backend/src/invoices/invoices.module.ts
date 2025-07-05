import { Module } from '@nestjs/common'
import { InvoicesService } from './invoices.service'
import { InvoicesController } from './invoices.controller'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [],
	controllers: [InvoicesController],
	providers: [InvoicesService],
	exports: [InvoicesService]
})
export class InvoicesModule {}
