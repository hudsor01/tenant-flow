import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
	imports: [SupabaseModule],
	controllers: [UsersController],
	providers: [UsersService],
	exports: [UsersService]
})
export class UsersModule {}
