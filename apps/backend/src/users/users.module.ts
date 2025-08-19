import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { StorageModule } from '../storage/storage.module'
import { UserSupabaseRepository } from '../auth/user-supabase.repository'
import { SupabaseModule } from '../common/supabase/supabase.module'

@Module({
	imports: [StorageModule, SupabaseModule],
	controllers: [UsersController],
	providers: [UsersService, UserSupabaseRepository],
	exports: [UsersService, UserSupabaseRepository]
})
export class UsersModule {}
