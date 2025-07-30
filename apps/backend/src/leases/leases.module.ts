import { Module } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseRepository } from './lease.repository'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [LeasesController],
  providers: [LeasesService, LeaseRepository],
  exports: [LeasesService, LeaseRepository]
})
export class LeasesModule {}
