import { Module } from '@nestjs/common'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { UnitsRepository } from './units.repository'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [],
	controllers: [UnitsController],
	providers: [UnitsService, UnitsRepository],
	exports: [UnitsService]
})
export class UnitsModule {}
