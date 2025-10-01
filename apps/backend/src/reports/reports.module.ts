import { Module } from '@nestjs/common'

import { ExportService } from './export.service'
import { ReportsController } from './reports.controller'

@Module({
	controllers: [ReportsController],
	providers: [ExportService],
	exports: [ExportService]
})
export class ReportsModule {}
