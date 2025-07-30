import { Module } from '@nestjs/common'
import { SubscriptionNotificationService } from './subscription-notification.service'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [
    PrismaModule,
    EmailModule
  ],
  providers: [
    SubscriptionNotificationService
  ],
  exports: [
    SubscriptionNotificationService
  ]
})
export class NotificationsModule {}