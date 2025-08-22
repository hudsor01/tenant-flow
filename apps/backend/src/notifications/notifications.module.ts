import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { SupabaseModule } from '../database/supabase.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [SupabaseModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}