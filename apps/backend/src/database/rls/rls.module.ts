import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RLSService } from './rls.service'
import { RLSController } from './rls.controller'
import { SupabaseModule } from '../../common/supabase/supabase.module'

@Module({
	imports: [ConfigModule, SupabaseModule],
	providers: [RLSService],
	controllers: [RLSController],
	exports: [RLSService]
})
export class RLSModule {}
