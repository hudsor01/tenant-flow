import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { FAQController } from './faq.controller'
import { FAQService } from './faq.service'

@Module({
	imports: [SupabaseModule],
	controllers: [FAQController],
	providers: [FAQService],
	exports: [FAQService]
})
export class FAQModule {}