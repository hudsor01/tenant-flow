import { Global, Module } from '@nestjs/common';
import { TypeSafeConfigModule } from '../common/config/config.module';
import { PrismaService } from './prisma.service';
import { MultiTenantPrismaService } from '../common/prisma/multi-tenant-prisma.service';

@Global()
@Module({
    imports: [TypeSafeConfigModule],
    providers: [PrismaService, MultiTenantPrismaService],
    exports: [PrismaService, MultiTenantPrismaService],
})
export class PrismaModule {}