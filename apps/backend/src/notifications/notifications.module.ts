import { Module } from '@nestjs/common'
import { SubscriptionNotificationService } from './subscription-notification.service'
import { SubscriptionEventListener } from './subscription-event.listener'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [
    PrismaModule,
    EmailModule
  ],
  providers: [
    SubscriptionNotificationService,
    SubscriptionEventListener
  ],
  exports: [
    SubscriptionNotificationService
  ]
})
export class NotificationsModule {}