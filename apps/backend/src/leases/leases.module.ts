import { Module } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseRepository } from './lease.repository'
import { LeasePDFService } from './services/lease-pdf.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PDFModule } from '../common/pdf/pdf.module'

@Module({
  imports: [PrismaModule, PDFModule],
  controllers: [LeasesController],
  providers: [LeasesService, LeaseRepository, LeasePDFService],
  exports: [LeasesService, LeaseRepository, LeasePDFService]
})
export class LeasesModule {}
