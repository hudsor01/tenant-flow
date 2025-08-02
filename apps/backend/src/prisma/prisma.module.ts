import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MultiTenantPrismaService } from '../common/prisma/multi-tenant-prisma.service';

@Global()
@Module({
    providers: [PrismaService, MultiTenantPrismaService],
    exports: [PrismaService, MultiTenantPrismaService],
})
export class PrismaModule {}