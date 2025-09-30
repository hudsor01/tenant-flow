/**
 * Shared Services Module
 *
 * Provides utility services that replace database functions
 * These services are available globally across the application
 */

import { Global, Module } from '@nestjs/common'
import { UtilityService } from './utility.service'
import { RepositoriesModule } from '../../repositories/repositories.module'

@Global()
@Module({
	imports: [RepositoriesModule],
	providers: [UtilityService],
	exports: [UtilityService]
})
export class ServicesModule {}