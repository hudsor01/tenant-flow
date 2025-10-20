/**
 * Late Fees Module - Ultra-Native NestJS Pattern
 *
 * NO ABSTRACTIONS: Direct service registration, minimal imports
 * KISS: Simple module configuration
 * DRY: Reuse SupabaseService from @Global() SupabaseModule
 */

import { Module } from '@nestjs/common'
import { LateFeesController } from './late-fees.controller'
import { LateFeesService } from './late-fees.service'

@Module({
	imports: [],
	controllers: [LateFeesController],
	providers: [LateFeesService],
	exports: [LateFeesService]
})
export class LateFeesModule {}
