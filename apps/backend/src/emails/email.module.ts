import { Module } from '@nestjs/common'
import { DirectEmailService } from './direct-email.service'

@Module({
  providers: [DirectEmailService],
  exports: [DirectEmailService]
})
export class EmailModule {}