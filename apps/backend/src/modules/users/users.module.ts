import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { ProfileService } from './profile.service'
import { UserToursService } from './user-tours.service'
import { UserSessionsService } from './user-sessions.service'

@Module({
	imports: [SupabaseModule],
	controllers: [UsersController],
	providers: [UsersService, ProfileService, UserToursService, UserSessionsService],
	exports: [UsersService, ProfileService, UserToursService, UserSessionsService]
})
export class UsersModule {}
