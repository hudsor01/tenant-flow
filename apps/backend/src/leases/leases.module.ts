import { Module } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseRepository } from './lease.repository'
import { LeasePDFService } from './services/lease-pdf.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PDFModule } from '../common/pdf/pdf.module'
import { ErrorModule } from '../common/errors/error.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ZodValidationModule } from '../common/validation/zod-validation.module'

@Module({
  imports: [PrismaModule, PDFModule, ErrorModule, SubscriptionsModule, ZodValidationModule],
  controllers: [LeasesController],
  providers: [LeasesService, LeaseRepository, LeasePDFService],
  exports: [LeasesService, LeaseRepository, LeasePDFService]
})
export class LeasesModule {}
