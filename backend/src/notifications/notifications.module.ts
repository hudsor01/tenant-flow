import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [],
	controllers: [NotificationsController],
	providers: [NotificationsService],
	exports: [NotificationsService]
})
export class NotificationsModule {}
