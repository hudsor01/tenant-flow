import { Module } from '@nestjs/common'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'
import { DocumentRepository } from './document.repository'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentRepository],
  exports: [DocumentsService, DocumentRepository]
})
export class DocumentsModule {}