import { Module } from '@nestjs/common'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [],
	controllers: [UnitsController],
	providers: [UnitsService],
	exports: [UnitsService]
})
export class UnitsModule {}
