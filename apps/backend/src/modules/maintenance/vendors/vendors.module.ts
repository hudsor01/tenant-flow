import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../../database/supabase.module'
import { VendorsController } from './vendors.controller'
import { VendorsService } from './vendors.service'

@Module({
	imports: [SupabaseModule],
	controllers: [VendorsController],
	providers: [VendorsService],
	exports: [VendorsService],
})
export class VendorsModule {}
