import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { InspectionsController } from './inspections.controller'
import { InspectionsService } from './inspections.service'

@Module({
  imports: [SupabaseModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService]
})
export class InspectionsModule {}
