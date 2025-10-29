import { Module } from '@nestjs/common'
import { EmailService } from './email.service'
import { EmailQueueService } from './email-queue.service'

@Module({
	providers: [EmailService, EmailQueueService],
	exports: [EmailService, EmailQueueService]
})
export class EmailModule {}
