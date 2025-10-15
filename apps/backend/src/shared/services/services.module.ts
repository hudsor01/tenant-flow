/**
 * Shared Services Module
 *
 * Provides utility services that replace database functions
 * These services are available globally across the application
 */

import { Global, Module } from '@nestjs/common'
import { UtilityService } from './utility.service'

@Global()
@Module({
	imports: [],
	providers: [UtilityService],
	exports: [UtilityService]
})
export class ServicesModule {}
