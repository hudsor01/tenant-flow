import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RLSService } from './rls.service'
import { RLSController } from './rls.controller'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [RLSService],
  controllers: [RLSController],
  exports: [RLSService]
})
export class RLSModule {}